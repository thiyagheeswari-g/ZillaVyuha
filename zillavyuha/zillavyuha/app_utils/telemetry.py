import datetime
from typing import Optional, List
from google.adk.agents.context import Context

def log_event(
    ctx: Context,
    event_type: str,
    severity: str,
    message: str,
    agent: Optional[str] = None,
    tool: Optional[str] = None,
    phc_codes_affected: Optional[List[str]] = None,
    data_quality_issues: Optional[List[str]] = None,
    recommendation_id: Optional[str] = None,
    officer_action: Optional[str] = None,
    confidence_score: Optional[int] = None
) -> None:
    """
    Log an audit event to the session state (ctx.state['audit_log']).
    Follows Rule AC-02 format.
    """
    if "audit_log" not in ctx.state:
        ctx.state["audit_log"] = []
    
    sequence = len(ctx.state["audit_log"]) + 1
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    log_entry = {
        "log_id": f"LOG-{timestamp[:10].replace('-', '')}-{sequence:03d}",
        "timestamp": timestamp,
        "event_type": event_type,
        "agent": agent,
        "tool": tool,
        "phc_codes_affected": phc_codes_affected or [],
        "severity": severity,
        "message": message,
        "data_quality_issues": data_quality_issues or [],
        "recommendation_id": recommendation_id,
        "officer_action": officer_action,
        "confidence_score": confidence_score
    }
    
    ctx.state["audit_log"].append(log_entry)

def get_audit_logs(ctx: Context) -> List[dict]:
    return ctx.state.get("audit_log", [])
