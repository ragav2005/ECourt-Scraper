from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class StateResponse(BaseModel):
    states: List[dict]
    app_token: str

class StateRequest(BaseModel):
    state_code: str

class DistrictRequest(BaseModel):
    state_code: str
    dist_code: str

class CaseTypeRequest(BaseModel):
    state_code: str
    dist_code: str
    court_complex_code: str
    est_code: Optional[str] = ""
    search_type: str = "c_no"

class CaseSubmissionRequest(BaseModel):
    state_code: str
    dist_code: str
    court_complex_code: str
    case_type: str
    case_no: str
    rgyear: str
    captcha_code: str
    est_code: Optional[str] = "null"

class QueryLogResponse(BaseModel):
    id: int
    timestamp: datetime
    state: str
    district: str
    case_number: str
    status: str
    raw_json_response: Optional[str] = None

    class Config:
        from_attributes = True

class StatsResponse(BaseModel):
    total_queries: int
    successful_queries: int
    failed_queries: int
    success_rate: float
    most_searched_states: List[dict]

class DistrictOption(BaseModel):
    value: str
    text: str

class CourtComplexOption(BaseModel):
    value: str
    text: str

class CaseTypeOption(BaseModel):
    value: str
    text: str

class DistrictResponse(BaseModel):
    districts: List[DistrictOption]
    app_token: str

class CourtComplexResponse(BaseModel):
    complexes: List[CourtComplexOption]
    app_token: str

class CaseTypeResponse(BaseModel):
    case_types: List[CaseTypeOption]
    app_token: str

class CaseSubmissionResponse(BaseModel):
    success: bool
    message: str
    case_status_data: Optional[dict] = None
    raw_html: Optional[str] = None
    captcha_html: Optional[str] = None
    app_token: Optional[str] = None

class CaseDetailsRequest(BaseModel):
    court_code: str
    state_code: str
    dist_code: str
    court_complex_code: str
    case_no: str
    cino: str
    search_flag: Optional[str] = "CScaseNumber"
    search_by: Optional[str] = "CScaseNumber"

class CaseDetailsResponse(BaseModel):
    success: bool
    message: str
    case_details: Optional[dict] = None
    raw_html: Optional[str] = None
    app_token: Optional[str] = None

class OrderPdfRequest(BaseModel):
        """Request model for fetching an interim order PDF.
        The pdf_request string is the raw argument captured from the upstream
        displayPdf('...') attribute (e.g.:
            "home/display_pdf&normal_v=1&case_val=Hindu~Marriage~Act/0000133/2025&cCode=1&appFlag=&filename=/orders/2025/200100001332025_1.pdf&court_code=1")
        We transform this into a POST to the ecourts endpoint while preserving the active session.
        """
        pdf_request: str
