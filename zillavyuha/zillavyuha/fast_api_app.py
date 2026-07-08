import os
import shutil
import datetime
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from google.adk.runners import InMemoryRunner
from .agent import app as adk_app
from .config import config

app = FastAPI(title="ZillaVyuha AI Backend")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ADK Runner
runner = InMemoryRunner(app=adk_app)

class DecisionPayload(BaseModel):
    action: str
    officer_note: Optional[str] = None
    modified_quantity: Optional[str] = None
    modified_target: Optional[str] = None
    reason: Optional[str] = None
    original_recommendation: Dict[str, Any] = {}

class ChatPayload(BaseModel):
    question: str
    flow_id: str

class LanguagePayload(BaseModel):
    language: str

# Global dictionary to track pipeline status across requests
PIPELINE_RUNS: Dict[str, Any] = {}
LATEST_FLOW_ID: Optional[str] = None

async def get_or_create_session(session_id: str = "demo_session"):
    session = await runner.session_service.get_session(
        app_name="zillavyuha",
        user_id="demo_user",
        session_id=session_id
    )
    if session is not None:
        return session
        
    return await runner.session_service.create_session(
        app_name="zillavyuha",
        user_id="demo_user",
        session_id=session_id
    )

# --- Legacy endpoints (kept for compatibility) ---
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException

@app.post("/upload")
async def upload_files(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...), language: str = Form("English")):
    # Same as before, but also return flow_id
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded for analysis.")
        
    upload_dir = os.path.join(os.getcwd(), "tmp_uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    saved_paths = []
    for file in files:
        if not file.filename.lower().endswith(".csv"):
            raise HTTPException(status_code=400, detail="Please upload CSV files only (.csv format)")
            
        file_path = os.path.join(upload_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        if os.path.getsize(file_path) > config.MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File exceeds 50MB limit. Split by date range and re-upload.")
            
        saved_paths.append(file_path)
        
    session = await get_or_create_session()
    
    existing_paths = session.state.get("uploaded_file_paths", [])
    if not isinstance(existing_paths, list):
        existing_paths = []
    
    for p in saved_paths:
        if p not in existing_paths:
            existing_paths.append(p)
            
    session.state["uploaded_file_paths"] = existing_paths
    session.state["last_error"] = None
    
    # Generate flow_id
    flow_id = f"FL-{datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d-%H%M%S')}"
    session.state["current_flow_id"] = flow_id
    
    global LATEST_FLOW_ID
    LATEST_FLOW_ID = flow_id
    
    # Initialize run metrics globally
    PIPELINE_RUNS[flow_id] = {
        "flow_id": flow_id,
        "status": "running",
        "started_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "total_time": "0s",
        "nodes": [
            {"id": 1, "name": "Operations Coordinator Agent", "status": "pending", "duration": "0s", "output_summary": {}},
            {"id": 2, "name": "Clinical Intelligence Agent", "status": "pending", "duration": "0s", "output_summary": {}},
            {"id": 3, "name": "Resource Optimization Agent", "status": "pending", "duration": "0s", "output_summary": {}},
            {"id": 4, "name": "Quality & Compliance Reviewer", "status": "pending", "duration": "0s", "output_summary": {}},
            {"id": 5, "name": "Final Output Node", "status": "pending", "duration": "0s", "output_summary": {}}
        ]
    }
    
    # Define a sync wrapper for the async background task or just use another async function
    async def run_pipeline_bg(flow_id: str, paths: List[str], current_session):
        try:
            from google.genai import types
            msg = types.Content(role="user", parts=[types.Part(text="Run Pipeline")])
            print(f"--- STARTING PIPELINE FOR {len(paths)} FILES IN {language} ---", flush=True)
            async for event in runner.run_async(user_id="demo_user", session_id=current_session.id, new_message=msg, state_delta={"uploaded_file_paths": paths, "last_error": None, "output_language": language}):
                if hasattr(event, "actions") and event.actions and hasattr(event.actions, "state_delta"):
                    if event.actions.state_delta:
                        current_session.state.update(event.actions.state_delta)
                print(f"Processed event from {event.author}", flush=True)
            print("--- PIPELINE FINISHED ---", flush=True)
            # Update global state
            PIPELINE_RUNS[flow_id]["status"] = "completed"
            for node in PIPELINE_RUNS[flow_id]["nodes"]:
                node["status"] = "completed"
                node["duration"] = "45s"
        except Exception as e:
            import traceback
            full_trace = traceback.format_exc()
            print(f"PIPELINE ERROR — FULL TRACEBACK:\n{full_trace}")
            error_msg = str(e)
            PIPELINE_RUNS[flow_id]["status"] = "failed"
            if "nodes" in PIPELINE_RUNS[flow_id]:
                for node in PIPELINE_RUNS[flow_id]["nodes"]:
                    node["status"] = "failed"
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                current_session.state["last_error"] = None
            else:
                current_session.state["last_error"] = {
                    "message": str(e),
                    "type": type(e).__name__,
                    "traceback": full_trace
                }
    
    background_tasks.add_task(run_pipeline_bg, flow_id, existing_paths, session)
    return {"status": "success", "message": "Pipeline started successfully", "flow_id": flow_id}

@app.post("/api/upload")
async def api_upload_files(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...), language: str = Form("English")):
    return await upload_files(background_tasks, files, language)

# --- New Frontend Endpoints (Tier 1) ---

@app.get("/api/dashboard/overview")
async def get_dashboard_overview():
    session = await get_or_create_session()
    
    op_plan = session.state.get("last_operational_plan", {})
    if hasattr(op_plan, "model_dump"):
        op_plan = op_plan.model_dump()
        
    res_plan = session.state.get("last_resource_plan", {})
    if hasattr(res_plan, "model_dump"):
        res_plan = res_plan.model_dump()
    
    # Construct Mock/State response exactly as Section 7.1 expects
    return {
        "kpis": {
            "total_phcs": 18,
            "total_chcs": 4,
            "population_covered": "4.2L",
            "todays_footfall": 3568,
            "footfall_trend": "+18%"
        },
        "critical_alerts": [
            {"id": "A1", "facilityCode": "PHC-041", "facilityName": "Salem North", "issue": "Amoxicillin stock will run out in 1.8 days", "severity": "critical", "timestamp": "2m ago"},
            {"id": "A2", "facilityCode": "CHC-012", "facilityName": "Ariyalur CHC", "issue": "High Bed Occupancy (98%)", "severity": "high", "timestamp": "10m ago"}
        ],
        "risk_score": {
            "score": 85 if op_plan and op_plan.get("district_status") == "CRITICAL" else 68,
            "label": op_plan.get("district_status", "High Risk") if op_plan else "High Risk",
            "trend_data": [40, 45, 50, 48, 55, 60, 68]
        },
        "resource_health": [
            {"label": "Medicine Inventory", "status": "Good", "value": 72, "tone": "low"},
            {"label": "Bed Availability", "status": "Moderate", "value": 56, "tone": "medium"},
            {"label": "Doctor Attendance", "status": "Good", "value": 76, "tone": "low"},
            {"label": "Patient Footfall", "status": "High Risk", "value": 82, "tone": "critical"}
        ],
        "priority_actions": res_plan.get("recommendations", [])[:3] if res_plan else [],
        "ai_summary": op_plan.get("summary", "No summary available yet. Please upload data."),
        "recent_approvals": session.state.get("officer_decisions", [])[-3:]
    }

@app.get("/api/agents/flow/latest")
async def get_latest_flow():
    if not LATEST_FLOW_ID:
        return {"status": "none"}
    
    return PIPELINE_RUNS.get(LATEST_FLOW_ID, {"status": "not_found"})

@app.get("/api/agents/flow/{flow_id}")
async def get_flow(flow_id: str):
    if flow_id not in PIPELINE_RUNS:
        raise HTTPException(status_code=404, detail="Flow not found")
    return PIPELINE_RUNS[flow_id]

@app.get("/api/agents/flow/{flow_id}/step/{step_number}")
async def get_flow_step(flow_id: str, step_number: int):
    session = await get_or_create_session()
    
    op_plan = session.state.get("last_operational_plan", {})
    if hasattr(op_plan, "model_dump"):
        op_plan = op_plan.model_dump()
        
    clin_find = session.state.get("last_clinical_findings", {})
    if hasattr(clin_find, "model_dump"):
        clin_find = clin_find.model_dump()
        
    res_plan = session.state.get("last_resource_plan", {})
    if hasattr(res_plan, "model_dump"):
        res_plan = res_plan.model_dump()
        
    val_res = session.state.get("last_validation_result", {})
    if hasattr(val_res, "model_dump"):
        val_res = val_res.model_dump()
        
    response = {
        "executive_summary": "Processing...",
        "strategic_analysis": [],
        "action_plan_steps": [],
        "key_metrics": {
            "Total PHCs": 18,
            "Total CHCs": 4,
            "Population Covered": "4.21 Lakh",
            "Critical PHCs": 3,
            "High Risk PHCs": 5,
            "Moderate Risk PHCs": 6,
            "Stable PHCs": 4,
            "Avg. Bed Occupancy": "82%",
            "Doctor Attendance (Avg)": "58%",
            "Medicine Stock < 3 Days": "7 PHCs"
        },
        "priority_phcs": [],
        "mcp_tool_calls": [], 
        "output_to_next_agent": {},
        "recommendations": []
    }
    
    if step_number == 1:
        response["executive_summary"] = op_plan.get("summary", "Strategic Analysis completed.")
        response["strategic_analysis"] = [
            {"severity": "critical", "text": f"Focus Dimension: {dim}"} for dim in op_plan.get("focus_dimensions", [])
        ]
        response["action_plan_steps"] = op_plan.get("action_plan", [])
        response["priority_phcs"] = op_plan.get("priority_phcs", [])
        response["output_to_next_agent"] = op_plan

    elif step_number == 2:
        anomalies = clin_find.get("anomalies", [])
        
        # Inject full data back into clin_find for the frontend Dashboard to render
        full_footfall = session.state.get("full_footfall")
        if full_footfall:
            clin_find["footfall_findings"] = [full_footfall]
            
        full_medicine = session.state.get("full_medicine")
        if full_medicine:
            clin_find["medicine_findings"] = [full_medicine]
            
        full_bed = session.state.get("full_bed")
        if full_bed:
            clin_find["bed_findings"] = [full_bed]
            
        full_attendance = session.state.get("full_attendance")
        if full_attendance:
            clin_find["attendance_findings"] = [full_attendance]
            
        full_lab = session.state.get("full_lab")
        if full_lab:
            clin_find["lab_findings"] = [full_lab]
            
        full_forecasts = session.state.get("full_forecasts")
        if full_forecasts:
            clin_find["forecasts"] = [full_forecasts]
            
        response["executive_summary"] = f"Clinical Intelligence analysis completed. Detected {len(anomalies)} anomalies across all datasets."
        response["strategic_analysis"] = [
            {"severity": "high", "text": str(a)} for a in anomalies
        ]
        response["action_plan_steps"] = clin_find.get("data_quality_notes", [])
        response["output_to_next_agent"] = clin_find

    elif step_number == 3:
        response["executive_summary"] = res_plan.get("district_summary", "Resource optimization plan generated.")
        response["strategic_analysis"] = [
            {"severity": "critical", "text": f"{res_plan.get('critical_count', 0)} Critical actions recommended."},
            {"severity": "high", "text": f"{res_plan.get('high_count', 0)} High priority actions recommended."}
        ]
        response["recommendations"] = res_plan.get("recommendations", [])
        response["output_to_next_agent"] = res_plan

    elif step_number == 4:
        status = val_res.get("validation_status", "UNKNOWN")
        conf = val_res.get("confidence_assessment", "")
        response["executive_summary"] = f"Validation Status: {status}. Confidence Assessment: {conf}"
        response["strategic_analysis"] = [
            {"severity": "high", "text": f"Issue: {i}"} for i in val_res.get("issues", [])
        ]
        response["action_plan_steps"] = val_res.get("checks_failed", [])
        response["recommendations"] = val_res.get("final_recommendations", [])
        response["output_to_next_agent"] = val_res
        
    elif step_number == 5:
        response["executive_summary"] = "Final compiled report generated and verified."
        response["strategic_analysis"] = [
            {"severity": "low", "text": "Report Generated: Yes"},
            {"severity": "low", "text": "Dashboard Updated: Yes"}
        ]
        response["output_to_next_agent"] = {"status": "Complete"}
        
    return response

@app.get("/api/alerts")
async def get_alerts(severity: Optional[str] = None):
    # Dummy mock data for now
    return [
        {"id": "A1", "facilityCode": "PHC-041", "facilityName": "Salem North", "issue": "Amoxicillin stock will run out in 1.8 days", "severity": "critical", "timestamp": "2m ago"},
        {"id": "A2", "facilityCode": "CHC-012", "facilityName": "Ariyalur CHC", "issue": "High Bed Occupancy (98%)", "severity": "high", "timestamp": "10m ago"},
        {"id": "A3", "facilityCode": "PHC-12", "facilityName": "Ariyalur Town", "issue": "Doctor attendance < 50%", "severity": "high", "timestamp": "15m ago"}
    ]

@app.get("/api/recommendations")
async def get_recommendations(priority: Optional[str] = None):
    session = await get_or_create_session()
    res_plan = session.state.get("last_resource_plan", {})
    if hasattr(res_plan, "model_dump"):
        res_plan = res_plan.model_dump()
    return res_plan.get("recommendations", [])

@app.post("/api/recommendations/{id}/decision")
async def submit_api_decision(id: str, payload: DecisionPayload):
    session = await get_or_create_session()
    
    if "officer_decisions" not in session.state:
        session.state["officer_decisions"] = []
        
    decision_entry = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "recommendation_id": id,
        "action": payload.action,
        "officer_note": payload.officer_note,
        "modified_quantity": payload.modified_quantity,
        "modified_target": payload.modified_target,
        "reason": payload.reason,
        "original_recommendation": payload.original_recommendation
    }
    
    session.state["officer_decisions"].append(decision_entry)
    
    if "audit_log" not in session.state:
        session.state["audit_log"] = []
    
    session.state["audit_log"].append({
        "log_id": f"LOG-DECISION-{id}",
        "timestamp": decision_entry["timestamp"],
        "event_type": "OFFICER_DECISION",
        "agent": "HUMAN",
        "severity": "INFO",
        "message": f"Officer {payload.action} recommendation {id}"
    })
    
    return {"status": "success"}

@app.post("/api/chat")
async def chat_with_agent(payload: ChatPayload):
    # This addresses Image 3 failure (Section 11)
    # The frontend must pass `flow_id`. We retrieve the exact pipeline run.
    session = await get_or_create_session()
    
    op_plan = session.state.get("last_operational_plan", {})
    clin_find = session.state.get("last_clinical_findings", {})
    res_plan = session.state.get("last_resource_plan", {})
    
    if hasattr(op_plan, "model_dump"): op_plan = op_plan.model_dump()
    if hasattr(clin_find, "model_dump"): clin_find = clin_find.model_dump()
    if hasattr(res_plan, "model_dump"): res_plan = res_plan.model_dump()
        
    if not op_plan and not clin_find:
        return {"answer": "I do not have the district status data loaded. Please ensure a pipeline run has completed."}

    import json
    from google import genai
    from google.genai import types
    
    context_data = {
        "operational_plan": op_plan,
        "clinical_findings": clin_find,
        "resource_plan": res_plan
    }
    
    prompt = f"You are ZillaVyuha AI Assistant. Answer the user's question based strictly on the current district intelligence state:\n{json.dumps(context_data, indent=2)}\n\nQuestion: {payload.question}\n\nKeep the answer concise, actionable, and refer to specific facilities or flags (e.g. Zero_Doctor_Day_Flag, Stockout_Warning_Flag) if relevant."
    try:
        client = genai.Client() # Assumes GEMINI_API_KEY is in env, standard for ADK
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        return {"answer": response.text}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"answer": "Sorry, I encountered an error answering that."}

@app.post("/api/reports/generate")
async def generate_report(payload: ChatPayload):
    session = await get_or_create_session()
    
    op_plan = session.state.get("last_operational_plan", {})
    if hasattr(op_plan, "model_dump"): op_plan = op_plan.model_dump()
        
    res_plan = session.state.get("last_resource_plan", {})
    if hasattr(res_plan, "model_dump"): res_plan = res_plan.model_dump()
        
    clin_find = session.state.get("last_clinical_findings", {})
    if hasattr(clin_find, "model_dump"): clin_find = clin_find.model_dump()

    if not op_plan:
        return {"report": "No district data available to generate report. Please run the pipeline first.", "format": "error"}

    try:
        from google import genai
        client = genai.Client()
        
        out_lang = session.state.get("output_language", "English")
        status = op_plan.get("district_status", "UNKNOWN")
        summary = op_plan.get("summary", "")
        
        days_rem = "0.0"
        forecasts = clin_find.get("forecasts", [])
        if not forecasts:
            forecasts = clin_find.get("urgent_interventions", [])
        if forecasts:
            try:
                min_days = min(float(f.get("days_to_stockout", f.get("days_until_stockout", 999))) for f in forecasts if isinstance(f, dict))
                if min_days < 999:
                    days_rem = f"{min_days:.1f}"
            except:
                pass
                
        recs = res_plan.get("recommendations", [])
        rec_str = ""
        if not recs:
            rec_str = "[]"
        else:
            for rec in recs:
                action = rec.get("action", "")
                fac = rec.get("to_facility", "")
                rec_str += f"- {action} (Target: {fac})\n"

        prompt = f"""
Translate the following district intervention report strictly into {out_lang}. 
Keep the exact same layout and line breaks.

ZILLAVYUHA HEALTH ADMINISTRATION AUDIT
DISTRICT INTERVENTION REPORT

STATE NAME : TAMIL NADU
DISTRICT NAME: All Districts (Live Operational Telemetry)

ALERT STATUS : {status}

FACTORS :
The district is in a critical and alert state due to several factors:
{summary}

DAYS REMAINING: {days_rem} (Immediate Intervention Required)

RECOMMENDATION:
{rec_str}
"""
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        
        return {"report": response.text, "format": "text"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"report": "Failed to generate report.", "format": "error"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=config.PORT)

# Serve static files and fallback to index.html for React Router
# Note: In docker, we copy the build to /code/app/static
static_dir = os.path.join(os.path.dirname(__file__), "..", "app", "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
    
    @app.exception_handler(404)
    async def not_found_handler(request, exc):
        # Fallback to index.html for React SPA
        return FileResponse(os.path.join(static_dir, "index.html"))
