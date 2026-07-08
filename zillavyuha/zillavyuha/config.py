import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Optional

load_dotenv()

class Config:
    XAI_MODEL: str = os.getenv("XAI_MODEL", "xai/grok-2-1212")
    XAI_API_KEY: str = os.getenv("XAI_API_KEY", "")
    PORT: int = int(os.getenv("PORT", "8090"))
    FRONTEND_PORT: int = int(os.getenv("FRONTEND_PORT", "7860"))
    MCP_SERVER_PORT: int = int(os.getenv("MCP_SERVER_PORT", "8091"))
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

config = Config()

# -----------------------------------------------------------------------------
# Agent Output Schemas (Pydantic)
# -----------------------------------------------------------------------------

class OperationalPlan(BaseModel):
    district_status: str          # "CRITICAL" | "HIGH" | "MODERATE" | "STABLE"
    priority_phcs: list[str]      # ranked PHC codes needing attention
    action_plan: list[str]        # ordered steps for Clinical Intelligence Agent
    focus_dimensions: list[str]   # which of 5 dimensions to prioritize
    summary: str                  # one-paragraph district status summary

class ClinicalFindings(BaseModel):
    medicine_findings: list[dict]   # per PHC per drug
    footfall_findings: list[dict]   # per PHC daily counts
    bed_findings: list[dict]        # per CHC occupancy
    attendance_findings: list[dict] # per PHC per day
    lab_findings: list[dict]        # per PHC test coverage
    anomalies: list[dict]           # statistical outliers
    forecasts: list[dict]           # predicted shortage dates
    data_quality_notes: list[str]   # missing data warnings

class Recommendation(BaseModel):
    recommendation_id: str
    action: str                  # "Transfer" | "Reassign" | "Alert" | "Investigate"
    from_facility: str           # source PHC/CHC name + code
    to_facility: str             # destination PHC/CHC name + code
    resource_type: str           # "Medicine" | "Doctor" | "Nurse" | "Equipment"
    resource_name: str           # exact name e.g. "Amoxicillin 500mg"
    quantity: str                # "300 tablets" | "1 physician" | "2 nurses"
    reason: str                  # evidence-based explanation
    patients_protected: int      # estimated patients who benefit
    distance_km: float           # travel distance
    confidence_score: int        # 0-100
    priority: str                # "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    action_deadline: str         # "Today" | "Within 48 hours" | "This week"
    evidence: list[str]          # specific data points from clinical findings

class ResourcePlan(BaseModel):
    recommendations: list[Recommendation]
    critical_count: int
    high_count: int
    district_summary: str

class ValidationResult(BaseModel):
    validation_status: str        # "APPROVED" | "REVISION_REQUIRED" | "INSUFFICIENT_EVIDENCE"
    checks_passed: list[str]
    checks_failed: list[str]
    issues: list[str]
    confidence_assessment: str    # "justified" | "overstated" | "understated"
    final_recommendations: list[Recommendation]
    disclaimer: Optional[str] = None
