import os
import pandas as pd
import pytest
from zillavyuha.mcp_server import (
    validate_and_clean_data,
    analyze_medicine_inventory,
    analyze_patient_footfall,
    analyze_bed_availability,
    analyze_doctor_attendance,
    analyze_lab_availability,
    detect_anomalies,
    forecast_shortages
)

@pytest.fixture
def temp_medicine_csv(tmp_path):
    df = pd.DataFrame({
        "phc_code": ["PHC 41", "PHC_42", "invalid", "PHC-043"],
        "medicine_name": ["Amoxicillin", "Paracetamol", "Zinc", "Iron"],
        "current_stock": [100, -50, 200, 300],
        "date": ["2026-07-04", "2026-07-04", "2026-07-04", "2026-07-04"],
        "avg_daily_consumption": [10, 5, 20, 0]
    })
    path = tmp_path / "phc_medicine.csv"
    df.to_csv(path, index=False)
    return str(path)

@pytest.fixture
def empty_csv(tmp_path):
    path = tmp_path / "empty.csv"
    pd.DataFrame().to_csv(path, index=False)
    return str(path)

def test_validate_and_clean_data_valid(temp_medicine_csv):
    res = validate_and_clean_data([temp_medicine_csv])
    assert "errors" in res
    assert "warnings" in res
    assert "cleaned_datasets" in res
    
    # Check dataset was parsed
    assert "medicine" in res["cleaned_datasets"]
    med_data = res["cleaned_datasets"]["medicine"]
    
    # Check negative stock was corrected
    paracetamol_row = next((r for r in med_data if r["medicine_name"] == "Paracetamol"), None)
    assert paracetamol_row is not None
    assert paracetamol_row["current_stock"] == 0.0

    # Check PHC code standardizing
    codes = [r["phc_code"] for r in med_data]
    assert "PHC-041" in codes
    assert "PHC-042" in codes

def test_validate_and_clean_data_empty(empty_csv):
    res = validate_and_clean_data([empty_csv])
    assert "Failed to read" in res["errors"][0]

def test_analyze_medicine_inventory():
    data = [
        {"phc_code": "PHC-001", "medicine_name": "Drug A", "current_stock": 100, "avg_daily_consumption": 10},
        {"phc_code": "PHC-001", "medicine_name": "Drug B", "current_stock": 5, "avg_daily_consumption": 10},
    ]
    res = analyze_medicine_inventory(data)
    assert "error" not in res
    assert "critical_shortages" in res
    assert len(res["critical_shortages"]) == 1
    assert res["critical_shortages"][0]["medicine_name"] == "Drug B"

def test_analyze_patient_footfall():
    data = [
        {"phc_code": "PHC-001", "date": "2026-07-04", "patient_count": 120, "capacity": 50},
        {"phc_code": "PHC-002", "date": "2026-07-04", "patient_count": 20, "capacity": 50}
    ]
    res = analyze_patient_footfall(data)
    assert "error" not in res
    assert "PHC-001" in res["overloaded_phcs"]
    assert "PHC-002" in res["underutilized_phcs"]
    assert res["footfall_by_phc"]["PHC-001"]["spike_detected"] is True

def test_error_handling_empty_dataset():
    # Tools should return an error dict when data is empty
    res = analyze_medicine_inventory([])
    assert "error" in res

def test_detect_anomalies():
    data = [{"phc_code": f"PHC-{i:03d}", "patient_count": 50} for i in range(1, 10)]
    data.append({"phc_code": "PHC-010", "patient_count": 5000}) # outlier
    res = detect_anomalies(data, ["patient_count"])
    assert "error" not in res
    assert res["anomaly_count"] > 0
    assert res["anomalies"][0]["phc_code"] == "PHC-010"

def test_forecast_shortages():
    data = [
        {"phc_code": "PHC-001", "medicine_name": "Drug A", "current_stock": 30, "avg_daily_consumption": 10, "date": "2026-07-01"}
    ]
    res = forecast_shortages(data, {})
    assert "error" not in res
    assert len(res["urgent_forecasts"]) == 1
    assert res["urgent_forecasts"][0]["days_until_stockout"] == 3.0
    assert res["urgent_forecasts"][0]["stockout_date"] == "2026-07-04"
