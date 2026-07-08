import os
import pandas as pd
from typing import Any, List
from google.adk.agents.context import Context
from google.adk.workflow import node, Workflow
from google.adk.events.event import Event
from google.adk.agents import LlmAgent
from google.adk.apps import App
from .config import (
    config,
    OperationalPlan,
    ClinicalFindings,
    ResourcePlan,
    ValidationResult
)
from .app_utils.telemetry import log_event
from .mcp_server import (
    validate_and_clean_data,
    analyze_medicine_inventory,
    analyze_patient_footfall,
    analyze_bed_availability,
    analyze_doctor_attendance,
    analyze_lab_availability,
    detect_anomalies,
    forecast_shortages
)

# -----------------------------------------------------------------------------
# Security Validation Node (Deterministic)
# -----------------------------------------------------------------------------

INJECTION_KEYWORDS = [
    "ignore instructions", "ignore previous", "jailbreak", "bypass",
    "override", "forget previous", "new instructions", "act as",
    "disregard", "pretend you are", "system prompt", "you are now",
    "do anything now", "developer mode", "dan mode"
]

@node
def security_validation_node(ctx: Context, node_input: Any) -> Event:
    """
    Validates CSV inputs, enforces required columns, and checks for injections.
    Always runs first.
    Returns: Event(route="SAFE") or Event(route="BLOCKED")
    """
    # Fallback to empty list if not found
    print("--- IN SECURITY VALIDATION NODE ---")
    print("ctx.session.state:", ctx.session.state)
    print("ctx.state:", ctx.state)
    file_paths = ctx.session.state.get("uploaded_file_paths", ctx.state.get("uploaded_file_paths", []))
    print("file_paths resolved to:", file_paths)
    
    if not file_paths:
        log_event(ctx, "VALIDATION", "CRITICAL", "No files uploaded for analysis.")
        ctx.state["last_error"] = "No valid data found. Please check your files and try again."
        return Event(output=None, route="BLOCKED")

    for path in file_paths:
        if not (path.lower().endswith('.csv')):
            log_event(ctx, "VALIDATION", "CRITICAL", f"Invalid file extension: {path}")
            ctx.state["last_error"] = "Please upload CSV files only (.csv format)"
            return Event(output=None, route="BLOCKED")
            
        try:
            if os.path.getsize(path) > config.MAX_FILE_SIZE_MB * 1024 * 1024:
                log_event(ctx, "VALIDATION", "CRITICAL", f"File too large: {path}")
                ctx.state["last_error"] = "File exceeds 50MB limit. Split by date range and re-upload."
                return Event(output=None, route="BLOCKED")
                
            df = pd.read_csv(path)
            if len(df) < 1:
                log_event(ctx, "VALIDATION", "CRITICAL", f"File too small/empty: {path}")
                ctx.state["last_error"] = "Uploaded file appears empty. Please check and re-upload."
                return Event(output=None, route="BLOCKED")
                
            # Basic injection check on string columns
            injection_found = False
            for col in df.select_dtypes(include=['object']).columns:
                for val in df[col].dropna().astype(str):
                    val_lower = val.lower()
                    if any(kw in val_lower for kw in INJECTION_KEYWORDS):
                        injection_found = True
                        break
                if injection_found:
                    break
                    
            if injection_found:
                log_event(ctx, "VALIDATION", "CRITICAL", f"Injection detected in {path}", injection_detected=True)
                ctx.state["last_error"] = "Invalid input detected. Please upload standard PHC operational data."
                return Event(output=None, route="BLOCKED")

        except Exception as e:
            log_event(ctx, "VALIDATION", "CRITICAL", f"Error reading {path}: {str(e)}")
            ctx.state["last_error"] = "Uploaded file appears empty. Please check and re-upload."
            return Event(output=None, route="BLOCKED")

    log_event(ctx, "VALIDATION", "INFO", "All files passed security validation.")
    
    import logging
    logger = logging.getLogger("zillavyuha.pipeline")
    logger.info(f"HANDOFF CHECK — uploaded_file_paths: {file_paths}")
    logger.info(f"HANDOFF CHECK — file count: {len(file_paths)}")
    
    # We pass the file paths as output to the next node (operations_coordinator_agent)
    # Ensure they are persisted in ctx.state explicitly so next nodes can access them.
    ctx.state["uploaded_file_paths"] = file_paths
    
    return Event(output=str(file_paths), route="SAFE")


# -----------------------------------------------------------------------------
# Agent 1: Operations Coordinator
# -----------------------------------------------------------------------------
operations_coordinator_agent = LlmAgent(
    name="operations_coordinator_agent",
    model=config.XAI_MODEL,
    instruction="""
You are the Operations Coordinator Agent for ZillaVyuha District Healthcare, focusing on real Tamil Nadu districts (e.g., Chengalpattu, Coimbatore, Madurai, Salem, Thanjavur, Tirunelveli).
Your job is to read district-wide daily data summaries, classify severity, rank facilities, and output an ordered investigation plan.

RULE OC-01: District Status Classification
Use the MOST SEVERE applicable rule across all facilities to determine the overall district status:
CRITICAL: "Any PHC has Stockout_Warning_Flag == 1" OR "Any PHC has Zero_Doctor_Day_Flag == 1 with patient load > 50" OR "Any CHC has bed occupancy > 95% with active referrals" OR "3+ PHCs simultaneously in HIGH status"
HIGH: "Any PHC has medicine stock 1–2 days remaining" OR "Any PHC has attendance gap > 50% with patient load > 100" OR "Any CHC has bed occupancy 85–95%" OR "2 PHCs simultaneously in MEDIUM+ status"
MODERATE: "Any PHC has medicine stock 2–5 days remaining" OR "Any PHC has attendance gap 25–50%" OR "Any CHC has bed occupancy 70–85%" OR "Lab coverage < 60% at any PHC"
STABLE: "All PHCs have medicine stock > 5 days" AND "All attendance gaps < 25%" AND "All CHC bed occupancy < 70%" AND "No anomalies detected"

RULE OC-02: PHC Ranking Formula
Rank PHCs by urgency score (highest = most urgent) based on these components:
Medicine: min_days<=1 (+40), <=2 (+30), <=5 (+15), <=7 (+5).
Attendance: zero_doctor_day (+40), rate==0 (+30), <0.5 (+20), <0.75 (+10).
Footfall: load_ratio>=2.0 (+20), >=1.5 (+15), >=1.2 (+8).
Lab: coverage<40 (+10), <60 (+5).

RULE OC-03: Action Plan Generation
Output an Action Investigation Plan containing 4–7 ordered steps for the Clinical Intelligence Agent.
Step 1 MUST be validate_and_clean_data.
Before forecasting, MUST run detect_anomalies.
Include forecast_shortages if any medicine < 7 days remaining.

RULE OC-04: Scope Discipline
- NEVER say "transfer X to Y" (that is Resource Optimization Agent's job).
- NEVER say "stock is critically low" (use structured status codes).
- NEVER include specific quantities (those come from clinical analysis).
- NEVER analyze raw numbers itself.
- NEVER invent or hallucinate specific PHC names for priority_phcs. You do not have the data yet. Leave priority_phcs empty [] or use generic placeholders if required.
- ALWAYS use real Tamil Nadu jurisdiction names (District_Name_Place_Name) only if generally describing the district context.

Generate all text outputs in {output_language}.
All field values (resource names, facility names, quantities) remain in English. Only explanatory text is translated.
""",
    output_schema=OperationalPlan,
    output_key="last_operational_plan"
)

# -----------------------------------------------------------------------------
# Agent 2: Clinical Intelligence
# -----------------------------------------------------------------------------
clinical_intelligence_agent = LlmAgent(
    name="clinical_intelligence_agent",
    model=config.XAI_MODEL,
    instruction="""
You are the Clinical Intelligence Agent.
Your job is to execute the Action Investigation Plan by calling all 8 MCP tools across all 5 operational dimensions, and return only what the data shows.

RULE CI-01: Analysis Completeness
For EVERY pipeline run, you MUST execute these tools in this exact MANDATORY sequence:
1. validate_and_clean_data (always first)
2. analyze_medicine_inventory
3. analyze_patient_footfall
4. analyze_bed_availability
5. analyze_doctor_attendance
6. analyze_lab_availability
7. detect_anomalies
8. forecast_shortages (only if any medicine < 7 days)

If a dataset is missing, run the tool with empty data and return a data_quality_note. NEVER skip a tool call.

RULE CI-02: Advanced Doctor & Specialist Audits
- Check the Zero_Doctor_Day_Flag. If == 1, flag an immediate infrastructure warning.
- Evaluate specialist deployment health at the CHC level (Specialists_Required - Specialists_Present). Note that real-world baseline deficits are around 71% to 90%. Do not treat these high specialist gaps as system anomalies, but rather as systemic shortfalls requiring redistribution or cross-facility coverage planning.

RULE CI-07: Output Discipline
- Report exact numbers from the data (never round to "approximately").
- Use structured finding dicts — never narrative paragraphs.
- Include data_quality_notes for every anomaly found.
- NEVER say "it seems", "appears to be", or "concerning". Only report confirmed numbers.
- Flag every column with >30% missing data.

Generate all text outputs in {output_language}.
All field values (resource names, facility names, quantities) remain in English. Only explanatory text is translated.
""",
    tools=[
        validate_and_clean_data, analyze_medicine_inventory, analyze_patient_footfall,
        analyze_bed_availability, analyze_doctor_attendance, analyze_lab_availability,
        detect_anomalies, forecast_shortages
    ],
    output_schema=ClinicalFindings,
    output_key="last_clinical_findings"
)

# -----------------------------------------------------------------------------
# Agent 3: Resource Optimization
# -----------------------------------------------------------------------------
resource_optimization_agent = LlmAgent(
    name="resource_optimization_agent",
    model=config.XAI_MODEL,
    instruction="""
You are the Resource Optimization Agent.
Your job is to transform clinical findings into specific actionable recommendations.

Generate all text outputs in {output_language}.
All field values (resource names, facility names, quantities) remain in English. Only explanatory text is translated.

RULE RO-01: The Consultant Standard
EVERY recommendation must answer 3 questions explicitly:
1. WHAT is the problem?
2. WHY is this recommendation the right action?
3. WHAT EXACTLY should be done?

WRONG: "PHC Salem North has low antibiotic stock. Consider transfer."
RIGHT: "PHC Salem North has 1.8 days of Amoxicillin 500mg remaining based on average daily consumption of 167 doses over the past 7 days. PHC Salem East has 21 days of supply (3,500 doses available). Transfer 300 doses today. Travel distance: 11 km. This prevents stock-out for approximately 380 patients. Confidence: 94% based on consistent consumption trend."

RULE RO-02: Automated Supply Chain Response
- Actively look for Stockout_Warning_Flag == 1 in the data to trigger a preventative alert.
- Look for Redistribution_Recommended == 1. When triggered, search for the closest facility ID inside the same District_Code where inventory levels are safely above safety thresholds, and compile an automated route manifest for supply redistribution.

RULE RO-07: Forbidden Phrases
Before finalizing, ensure you DO NOT use these phrases:
- "Consider transferring..." -> Use "Transfer [quantity] from [source] to [dest]"
- "Medicine levels are low" -> Use "[Medicine] has [N] days remaining at [PHC]"
- "Attendance seems poor" -> Use "[N] of [M] doctors absent at [PHC] today"
- "Patient load is high" -> Use "[PHC] has [N] patients vs [M] capacity ([X]% utilization)"
- "Recommend investigation" -> Use "Run anomaly check on [specific column] at [PHC]"
- "May need attention" -> Priority score assigned — either flag or don't

""",
    output_schema=ResourcePlan,
    output_key="last_resource_plan"
)

# -----------------------------------------------------------------------------
# Agent 4: Quality & Compliance Reviewer
# -----------------------------------------------------------------------------
quality_compliance_reviewer = LlmAgent(
    name="quality_compliance_reviewer",
    model=config.XAI_MODEL,
    instruction="""
You are the Quality & Compliance Reviewer.
Your job is to re-check every recommendation against the original clinical findings.

RULE QR-01: 5-Point Validation Checklist
For each recommendation, run checks 1 through 5 in order, do not skip any:
1. EVIDENCE TRACE: Every claim must trace to a specific finding.
2. FEASIBILITY CHECK: Transfer quantity <= 50% of source stock. Distance <= 50 km. Reassignment duration <= 3 days. Source is not CRITICAL.
3. NON-CONTRADICTION CHECK: No two recommendations transfer the same resource from the same source in the same direction. Doesn't create new shortage.
4. CONFIDENCE JUSTIFICATION: Score 80-100 (3+ factors), 60-79 (2+ factors), 40-59 (1+ factor + warning), <40 (BLOCKED).
5. LANGUAGE & TONE CHECK: Answers WHAT+WHY+WHAT EXACTLY. No forbidden phrases. Specific quantities. Facility codes + names.

RULE QR-02: Approval Decision Logic
- IF all 5 checks pass AND all confidence_scores >= 40: validation_status = "APPROVED"
- IF confidence_score < 40 on ANY recommendation: Remove it from final list, add to issues.
- IF feasibility check fails: Remove recommendation, add to issues.
- IF ALL recommendations removed: validation_status = "INSUFFICIENT_EVIDENCE", show data quality report.

NEVER add new analysis. NEVER modify clinical findings.
""",
    output_schema=ValidationResult,
    output_key="last_validation_result"
)

# -----------------------------------------------------------------------------
# Final Output Node (Deterministic)
# -----------------------------------------------------------------------------
@node
def final_output_node(ctx: Context, node_input: Any) -> Event:
    """
    Formats the dashboard output and handles BLOCKED routed executions.
    """
    if "last_error" in ctx.state:
        # We were blocked, so we return early with the error
        log_event(ctx, "PIPELINE_END", "WARNING", "Pipeline ended early due to validation failure.")
        return Event(output={"status": "error", "message": ctx.state["last_error"]})
        
    validation = ctx.state.get("last_validation_result")
    if not validation:
        log_event(ctx, "PIPELINE_END", "CRITICAL", "Validation result missing.")
        return Event(output={"status": "error", "message": "Pipeline failed to produce validation result."})

    # Record the successful pipeline run
    ctx.state["last_processed_date"] = pd.Timestamp.utcnow().isoformat()
    log_event(ctx, "PIPELINE_END", "INFO", "Pipeline completed successfully.")
    
    return Event(output={"status": "success", "validation": validation})


# -----------------------------------------------------------------------------
# Workflow Graph Definition
# -----------------------------------------------------------------------------
zillavyuha_workflow = Workflow(
    name="zillavyuha_workflow",
    edges=[
        ('START', security_validation_node),
        (security_validation_node, {
            "SAFE": operations_coordinator_agent,
            "BLOCKED": final_output_node
        }),
        (operations_coordinator_agent, clinical_intelligence_agent),
        (clinical_intelligence_agent, resource_optimization_agent),
        (resource_optimization_agent, quality_compliance_reviewer),
        (quality_compliance_reviewer, final_output_node)
    ]
)

app = App(name="zillavyuha", root_agent=zillavyuha_workflow)
