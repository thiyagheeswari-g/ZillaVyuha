import re

with open('zillavyuha/mcp_server.py', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('from typing import Dict, List, Any', 'from typing import Dict, List, Any\nfrom google.adk.tools import ToolContext')

code = code.replace('def validate_and_clean_data(file_paths: List[str], options: Dict = None) -> Dict[str, Any]:', 'def validate_and_clean_data(file_paths: List[str], tool_context: ToolContext = None, options: Dict = None) -> Dict[str, Any]:')
code = code.replace('    return {\n        "cleaned_datasets": cleaned_datasets,\n        "quality_report": quality_report,\n        "files_processed": files_processed,\n        "errors": errors,\n        "warnings": warnings\n    }', '    res = {\n        "cleaned_datasets": cleaned_datasets,\n        "quality_report": quality_report,\n        "files_processed": files_processed,\n        "errors": errors,\n        "warnings": warnings\n    }\n    if tool_context is not None:\n        tool_context.state["cleaned_datasets"] = cleaned_datasets\n    return res')

code = code.replace('def analyze_medicine_inventory(data: Dict[str, Any], phc_codes: List[str] = None) -> Dict[str, Any]:\n    """Computes days-of-supply remaining and classifies stock status."""\n    try:', 'def analyze_medicine_inventory(tool_context: ToolContext, phc_codes: List[str] = None) -> Dict[str, Any]:\n    """Computes days-of-supply remaining and classifies stock status."""\n    try:\n        data = tool_context.state.get("cleaned_datasets", {}).get("medicine", [])')

code = code.replace('def analyze_patient_footfall(data: Dict[str, Any], date_range: str = None) -> Dict[str, Any]:\n    """Computes utilization ratio, trend, and flags spikes."""\n    try:', 'def analyze_patient_footfall(tool_context: ToolContext, date_range: str = None) -> Dict[str, Any]:\n    """Computes utilization ratio, trend, and flags spikes."""\n    try:\n        data = tool_context.state.get("cleaned_datasets", {}).get("footfall", [])')

code = code.replace('def analyze_bed_availability(data: Dict[str, Any]) -> Dict[str, Any]:\n    """Computes occupancy rate per CHC, flags CRITICAL at >=95%."""\n    try:', 'def analyze_bed_availability(tool_context: ToolContext) -> Dict[str, Any]:\n    """Computes occupancy rate per CHC, flags CRITICAL at >=95%."""\n    try:\n        data = tool_context.state.get("cleaned_datasets", {}).get("beds", [])')

code = code.replace('def analyze_doctor_attendance(data: Dict[str, Any]) -> Dict[str, Any]:\n    """Computes attendance rate, flags understaffed combination."""\n    try:', 'def analyze_doctor_attendance(tool_context: ToolContext) -> Dict[str, Any]:\n    """Computes attendance rate, flags understaffed combination."""\n    try:\n        data = tool_context.state.get("cleaned_datasets", {}).get("attendance", [])')

code = code.replace('def analyze_lab_availability(data: Dict[str, Any]) -> Dict[str, Any]:\n    """Computes essential-test coverage percentage."""\n    try:', 'def analyze_lab_availability(tool_context: ToolContext) -> Dict[str, Any]:\n    """Computes essential-test coverage percentage."""\n    try:\n        data = tool_context.state.get("cleaned_datasets", {}).get("labs", [])')

code = code.replace('def detect_anomalies(data: Dict[str, Any], columns: List[str], method: str = "iqr") -> Dict[str, Any]:\n    """Runs IQR outlier detection."""\n    try:', 'def detect_anomalies(tool_context: ToolContext, dataset_type: str, columns: List[str], method: str = "iqr") -> Dict[str, Any]:\n    """Runs IQR outlier detection."""\n    try:\n        data = tool_context.state.get("cleaned_datasets", {}).get(dataset_type, [])')

code = code.replace('def forecast_shortages(inventory_data: Dict[str, Any], consumption_data: Dict[str, Any], forecast_days: int = 7) -> Dict[str, Any]:\n    """Projects stockout dates based on consumption."""\n    try:', 'def forecast_shortages(tool_context: ToolContext, forecast_days: int = 7) -> Dict[str, Any]:\n    """Projects stockout dates based on consumption."""\n    try:\n        inventory_data = tool_context.state.get("cleaned_datasets", {}).get("medicine", [])')

with open('zillavyuha/mcp_server.py', 'w', encoding='utf-8') as f:
    f.write(code)
print('Replaced successfully')
