import pandas as pd
import numpy as np
import re
import traceback
from typing import Dict, List, Any
from google.adk.tools import ToolContext

def standardize_phc_code(code: str) -> str:
    if pd.isna(code):
        return code
    code = str(code).strip().upper().replace(" ", "").replace("_", "-")
    match = re.match(r'([A-Z]+)-?(\d+)', code)
    if match:
        facility_type, number = match.groups()
        return f"{facility_type}-{int(number):03d}"
    return code

def _detect_dataset_type(columns: List[str]) -> str:
    cols = set(c.lower() for c in columns)
    if "doctors_sanctioned" in cols and "specialists_required" in cols and "patient_footfall_opd" not in cols: return "master"
    if "patient_footfall_opd" in cols or "paracetamol_stock_level" in cols: return "daily_operations"
    return "unknown"

def validate_and_clean_data(tool_context: ToolContext = None, file_paths: List[str] = None, options: Dict = None) -> Dict[str, Any]:
    import logging
    logger = logging.getLogger("zillavyuha.pipeline")
    
    options = options or {}
    
    # IGNORE file_paths from the LLM, as it hallucinates them based on priority_phcs.
    # Always pull the actual uploaded paths from the session state or tmp_uploads.
    actual_paths = []
    if tool_context and hasattr(tool_context, 'session') and tool_context.session:
        actual_paths = tool_context.session.state.get("uploaded_file_paths", [])
    if not actual_paths and tool_context:
        actual_paths = tool_context.state.get("uploaded_file_paths", [])
        
    # Ultimate fallback: scan tmp_uploads directory
    if not actual_paths:
        import os
        upload_dir = os.path.join(os.getcwd(), "tmp_uploads")
        if os.path.exists(upload_dir):
            actual_paths = [os.path.join(upload_dir, f) for f in os.listdir(upload_dir) if f.endswith('.csv')]
            
    file_paths = actual_paths
    
    cleaned_datasets = {}
    quality_report = {}
    errors = []
    warnings = []
    files_processed = 0

    master_df = None
    ops_df = None

    for file_path in file_paths:
        try:
            encodings_to_try = ["utf-8", "utf-8-sig", "latin-1", "cp1252"]
            df = None
            for enc in encodings_to_try:
                try:
                    df = pd.read_csv(file_path, encoding=enc)
                    break
                except UnicodeDecodeError:
                    continue
            
            if df is None:
                errors.append(f"Could not decode {file_path}")
                continue

            df.columns = (df.columns.astype(str).str.strip().str.lower().str.replace(r'[\s\-]+', '_', regex=True))
            dataset_type = _detect_dataset_type(df.columns.tolist())
            
            if dataset_type == "master":
                df['facility_id'] = df['facility_id'].apply(standardize_phc_code)
                master_df = df
            elif dataset_type == "daily_operations":
                df['facility_id'] = df['facility_id'].apply(standardize_phc_code)
                ops_df = df
            else:
                warnings.append(f"Skipping unknown dataset: {file_path}")
        except Exception as e:
            errors.append(f"Exception processing {file_path}: {str(e)}")
            
    if master_df is not None and ops_df is not None:
        # Avoid duplicate columns on merge by removing overlap
        overlap_cols = [c for c in master_df.columns if c in ops_df.columns and c != 'facility_id']
        master_df_clean = master_df.drop(columns=overlap_cols)
        
        merged_df = pd.merge(ops_df, master_df_clean, on='facility_id', how='left')
        
        if 'total_beds' not in merged_df.columns:
            def get_beds(ftype):
                ft = str(ftype).upper()
                if 'CHC' in ft: return 100
                elif 'PHC' in ft: return 30
                elif 'HOSPITAL' in ft: return 500
                return 0
            merged_df['total_beds'] = merged_df['facility_type'].apply(get_beds)

        # Clean numeric
        numeric_cols = [
            'patient_footfall_opd', 'patient_footfall_ipd', 'beds_occupied', 
            'doctors_present', 'specialists_present',
            'paracetamol_stock_level', 'paracetamol_daily_consumption',
            'amoxicillin_stock_level', 'amoxicillin_daily_consumption',
            'metformin_stock_level', 'metformin_daily_consumption',
            'total_beds', 'doctors_sanctioned', 'specialists_required'
        ]
        
        for col in numeric_cols:
            if col in merged_df.columns:
                merged_df[col] = pd.to_numeric(merged_df[col], errors='coerce').fillna(0)
                
        # Boolean flags
        if 'zero_doctor_day_flag' in merged_df.columns:
            merged_df['zero_doctor_day_flag'] = merged_df['zero_doctor_day_flag'].fillna(0).astype(int)
        if 'stockout_warning_flag' in merged_df.columns:
            merged_df['stockout_warning_flag'] = merged_df['stockout_warning_flag'].fillna(0).astype(int)
        if 'redistribution_recommended' in merged_df.columns:
            merged_df['redistribution_recommended'] = merged_df['redistribution_recommended'].fillna(0).astype(int)
            
        if 'date' in merged_df.columns:
            merged_df['date'] = pd.to_datetime(merged_df['date'], errors='coerce')
            merged_df['date'] = merged_df['date'].dt.strftime('%Y-%m-%d')
            
        cleaned_datasets["merged_operations"] = merged_df.to_dict(orient="records")
        quality_report["merged_operations"] = f"Merged {len(merged_df)} daily records with master."
        files_processed = 2
    else:
        errors.append("Missing either master or daily_operations dataset.")

    res = {
        "quality_report": quality_report,
        "files_processed": files_processed,
        "errors": errors,
        "warnings": warnings
    }
    if tool_context is not None:
        tool_context.state["cleaned_datasets"] = cleaned_datasets
    return res

def analyze_medicine_inventory(tool_context: ToolContext, phc_codes: List[str] = None) -> Dict[str, Any]:
    import logging
    logger = logging.getLogger("zillavyuha.pipeline")
    try:
        data = tool_context.state.get("cleaned_datasets", {}).get("merged_operations", [])
        logger.info(f"analyze_medicine_inventory: got {len(data)} records")
        if not data: return {"error": "Empty dataset"}
        df = pd.DataFrame(data)
        
        inventory_by_phc = {}
        critical = []
        excess = []
        
        for phc, group in df.groupby('facility_id'):
            latest = group.sort_values('date').iloc[-1]
            
            meds = [
                ('Paracetamol', 'paracetamol_stock_level', 'paracetamol_daily_consumption'),
                ('Amoxicillin', 'amoxicillin_stock_level', 'amoxicillin_daily_consumption'),
                ('Metformin', 'metformin_stock_level', 'metformin_daily_consumption')
            ]
            
            phc_items = []
            for name, stock_col, cons_col in meds:
                stock = float(latest.get(stock_col, 0))
                cons = float(latest.get(cons_col, 0))
                days = stock / cons if cons > 0 else 999.0
                status = 'CRITICAL' if days <= 2 else 'LOW' if days <= 7 else 'ADEQUATE' if days <= 30 else 'EXCESS'
                
                item_dict = {
                    "medicine_name": name,
                    "current_stock": stock,
                    "avg_daily_consumption": cons,
                    "days_remaining": days,
                    "status": status,
                    "phc_code": phc,
                    "district": latest.get('district_name_place_name', '')
                }
                phc_items.append(item_dict)
                
                if status == 'CRITICAL': critical.append(item_dict)
                elif status == 'EXCESS': excess.append(item_dict)
                
            inventory_by_phc[phc] = phc_items
            
        full_res = {
            "inventory_by_phc": inventory_by_phc,
            "critical_shortages": critical,
            "excess_inventory": excess
        }
        tool_context.state["full_medicine"] = full_res
        
        return {
            "summary": f"Analyzed inventory for {len(inventory_by_phc)} facilities.",
            "critical_shortages_count": len(critical),
            "critical_shortages_sample": critical[:10],
            "excess_inventory_count": len(excess)
        }
    except Exception as e:
        return {"error": f"Failed analyzing medicine inventory: {str(e)}"}

def analyze_patient_footfall(tool_context: ToolContext, date_range: str = None) -> Dict[str, Any]:
    try:
        data = tool_context.state.get("cleaned_datasets", {}).get("merged_operations", [])
        if not data: return {"error": "Empty dataset"}
        df = pd.DataFrame(data)
        
        df['total_footfall'] = df['patient_footfall_opd'] + df['patient_footfall_ipd']
        
        footfall_by_phc = {}
        overloaded = []
        
        for phc, group in df.groupby('facility_id'):
            latest = group.sort_values('date').iloc[-1]
            footfall = float(latest['total_footfall'])
            # Since capacity is absent, we can use doctors_sanctioned * 50 as a proxy capacity, or just report footfall.
            capacity = max(float(latest.get('doctors_sanctioned', 1) * 50), 1)
            utilization = footfall / capacity
            
            footfall_by_phc[phc] = {
                "today_count": footfall,
                "capacity": capacity,
                "utilization_rate": utilization,
                "spike_detected": utilization > 1.8,
                "district": latest.get('district_name_place_name', '')
            }
            if utilization > 1.2: overloaded.append(phc)
                
        full_res = {
            "footfall_by_phc": footfall_by_phc,
            "overloaded_phcs": overloaded,
            "underutilized_phcs": []
        }
        tool_context.state["full_footfall"] = full_res
        
        return {
            "summary": f"Analyzed footfall for {len(footfall_by_phc)} facilities.",
            "overloaded_count": len(overloaded),
            "overloaded_sample": overloaded[:10]
        }
    except Exception as e:
        return {"error": f"Failed analyzing patient footfall: {str(e)}"}

def analyze_bed_availability(tool_context: ToolContext) -> Dict[str, Any]:
    try:
        data = tool_context.state.get("cleaned_datasets", {}).get("merged_operations", [])
        if not data: return {"error": "Empty dataset"}
        df = pd.DataFrame(data)
        
        bed_status = {}
        critical = []
        for facility, group in df.groupby('facility_id'):
            latest = group.sort_values('date').iloc[-1]
            
            # Avoid divide by zero for PHCs without beds
            total = float(latest.get('total_beds', 0))
            if total == 0: continue
            
            occ = float(latest.get('beds_occupied', 0))
            rate = occ / total
            
            bed_status[facility] = {
                "total_beds": total,
                "occupied": occ,
                "available": total - occ,
                "occupancy_rate": rate,
                "district": latest.get('district_name_place_name', '')
            }
            if rate >= 0.95: critical.append(facility)
            
        full_res = {
            "bed_status_by_phc": bed_status,
            "critical_shortages": critical,
            "underutilized": []
        }
        tool_context.state["full_bed"] = full_res
        
        return {
            "summary": f"Analyzed beds for {len(bed_status)} facilities.",
            "critical_shortages_count": len(critical),
            "critical_shortages_sample": critical[:10]
        }
    except Exception as e:
        return {"error": f"Failed analyzing bed availability: {str(e)}"}

def analyze_doctor_attendance(tool_context: ToolContext) -> Dict[str, Any]:
    try:
        data = tool_context.state.get("cleaned_datasets", {}).get("merged_operations", [])
        if not data: return {"error": "Empty dataset"}
        df = pd.DataFrame(data)
        
        attendance_by_phc = {}
        critical = []
        
        for phc, group in df.groupby('facility_id'):
            latest = group.sort_values('date').iloc[-1]
            sanctioned = float(latest.get('doctors_sanctioned', 1))
            present = float(latest.get('doctors_present', 0))
            
            spec_req = float(latest.get('specialists_required', 0))
            spec_pres = float(latest.get('specialists_present', 0))
            
            zero_day = int(latest.get('zero_doctor_day_flag', 0)) == 1
            rate = present / max(sanctioned, 1)
            
            info = {
                "sanctioned": sanctioned,
                "present": present,
                "absent": sanctioned - present,
                "attendance_rate": rate,
                "zero_doctor_day_flag": zero_day,
                "specialist_deficit": spec_req - spec_pres,
                "district": latest.get('district_name_place_name', '')
            }
            attendance_by_phc[phc] = info
            
            if zero_day or rate < 0.5:
                critical.append({"phc_code": phc, **info})
                
        full_res = {
            "attendance_by_phc": attendance_by_phc,
            "critical_gaps": critical,
            "high_load_understaffed": []
        }
        tool_context.state["full_attendance"] = full_res
        
        return {
            "summary": f"Analyzed attendance for {len(attendance_by_phc)} facilities.",
            "critical_gaps_count": len(critical),
            "critical_gaps_sample": critical[:10]
        }
    except Exception as e:
        return {"error": f"Failed analyzing doctor attendance: {str(e)}"}

def analyze_lab_availability(tool_context: ToolContext) -> Dict[str, Any]:
    try:
        data = tool_context.state.get("cleaned_datasets", {}).get("merged_operations", [])
        if not data: return {"error": "Empty dataset"}
        df = pd.DataFrame(data)
        
        lab_status = {}
        critical = []
        
        for phc, group in df.groupby('facility_id'):
            latest = group.sort_values('date').iloc[-1]
            status_text = str(latest.get('test_availability_audit', '')).strip()
            
            is_functional = (status_text == 'Fully Functional')
            coverage = 100.0 if is_functional else 0.0
            
            lab_status[phc] = {
                "available_tests": ["All"] if is_functional else [],
                "missing_tests": ["Critical Tests Offline"] if not is_functional else [],
                "coverage_pct": coverage,
                "audit_text": status_text,
                "district": latest.get('district_name_place_name', '')
            }
            if not is_functional:
                critical.append({"phc_code": phc, "audit_text": status_text})
                
        full_res = {
            "lab_status_by_phc": lab_status,
            "critical_missing": critical
        }
        tool_context.state["full_lab"] = full_res
        
        return {
            "summary": f"Analyzed lab status for {len(lab_status)} facilities.",
            "critical_missing_count": len(critical),
            "critical_missing_sample": critical[:10]
        }
    except Exception as e:
        return {"error": f"Failed analyzing lab availability: {str(e)}"}

def detect_anomalies(tool_context: ToolContext, dataset_type: str = None, columns: List[str] = None, method: str = "iqr") -> Dict[str, Any]:
    try:
        data = tool_context.state.get("cleaned_datasets", {}).get("merged_operations", [])
        if not data: return {"error": "Empty dataset"}
        df = pd.DataFrame(data)
        
        anomalies = []
        check_cols = ['patient_footfall_opd', 'patient_footfall_ipd', 'beds_occupied']
        for col in check_cols:
            if col in df.columns:
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                outliers = df[(df[col] < (Q1 - 1.5 * IQR)) | (df[col] > (Q3 + 1.5 * IQR))]
                for _, row in outliers.iterrows():
                    anomalies.append({
                        "phc_code": row.get('facility_id', 'unknown'),
                        "column": col,
                        "value": row[col]
                    })
                    
        tool_context.state["full_anomalies"] = anomalies
        
        return {
            "anomaly_count": len(anomalies),
            "severity": "high" if len(anomalies) > 100 else "medium" if len(anomalies) > 10 else "low",
            "anomalies_sample": anomalies[:10]
        }
    except Exception as e:
        return {"error": f"Failed detecting anomalies: {str(e)}"}

def forecast_shortages(tool_context: ToolContext, forecast_days: int = 7) -> Dict[str, Any]:
    try:
        data = tool_context.state.get("cleaned_datasets", {}).get("merged_operations", [])
        if not data: return {"error": "Empty dataset"}
        df = pd.DataFrame(data)
        
        forecasts = []
        urgent = []
        
        for phc, group in df.groupby('facility_id'):
            latest = group.sort_values('date').iloc[-1]
            current_date = pd.to_datetime(latest.get('date', pd.Timestamp.now()))
            
            meds = [
                ('Paracetamol', 'paracetamol_stock_level', 'paracetamol_daily_consumption'),
                ('Amoxicillin', 'amoxicillin_stock_level', 'amoxicillin_daily_consumption'),
                ('Metformin', 'metformin_stock_level', 'metformin_daily_consumption')
            ]
            
            phc_forecast = {"phc_code": phc, "predictions": []}
            for name, stock_col, cons_col in meds:
                stock = float(latest.get(stock_col, 0))
                cons = float(latest.get(cons_col, 0))
                if cons > 0:
                    days_remaining = stock / cons
                    stockout_date = current_date + pd.Timedelta(days=days_remaining)
                    phc_forecast["predictions"].append({
                        "item": name,
                        "stockout_date": stockout_date.strftime('%Y-%m-%d'),
                        "days_to_stockout": days_remaining,
                        "confidence": 0.85
                    })
                    if days_remaining <= forecast_days:
                        urgent.append({
                            "phc_code": phc,
                            "item": name,
                            "days_to_stockout": days_remaining
                        })
                        
            if phc_forecast["predictions"]:
                forecasts.append(phc_forecast)
                
        full_res = {
            "forecasts_by_phc": forecasts,
            "urgent_interventions": urgent
        }
        tool_context.state["full_forecasts"] = full_res
        
        return {
            "summary": f"Generated forecasts for {len(forecasts)} facilities.",
            "urgent_interventions_count": len(urgent),
            "urgent_interventions_sample": urgent[:10]
        }
    except Exception as e:
        return {"error": f"Failed forecasting shortages: {str(e)}"}
