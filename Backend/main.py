from fastapi import FastAPI, Depends, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List
import json
from datetime import datetime, timezone, timedelta
import random
import logging
from contextlib import asynccontextmanager

from database import get_db, create_tables
from models import QueryLog
from schemas import (
    StateRequest, DistrictRequest, CaseTypeRequest, CaseSubmissionRequest,
    CaseDetailsRequest, QueryLogResponse, StatsResponse, DistrictResponse, 
    CourtComplexResponse, CaseTypeResponse, CaseSubmissionResponse, 
    CaseDetailsResponse, StateResponse, OrderPdfRequest
)
from scraper import ECourtScraper
logger = logging.getLogger(__name__)

# --- IST Logging Setup -----------------------------------------------------
# Ensures ALL application log timestamps are emitted in IST (UTC+05:30)
IST_TZ = timezone(timedelta(hours=5, minutes=30))

class ISTFormatter(logging.Formatter):
    def formatTime(self, record, datefmt=None):
        dt = datetime.fromtimestamp(record.created, IST_TZ)
        if datefmt:
            return dt.strftime(datefmt)
        return dt.strftime('%Y-%m-%dT%H:%M:%S%z')

def configure_ist_logging():
    fmt = '%(asctime)s | %(levelname)s | %(name)s | %(message)s'
    datefmt = '%Y-%m-%d %H:%M:%S%z'
    formatter = ISTFormatter(fmt=fmt, datefmt=datefmt)
    # Update root handlers
    root = logging.getLogger()
    for h in root.handlers:
        try:
            h.setFormatter(formatter)
        except Exception:
            pass
    # Update uvicorn related loggers if already created
    for lname in ('uvicorn', 'uvicorn.error', 'uvicorn.access'):
        lg = logging.getLogger(lname)
        for h in lg.handlers:
            try:
                h.setFormatter(formatter)
            except Exception:
                pass
    # If no handlers (direct script run), add one
    if not root.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(formatter)
        root.addHandler(handler)
    root.setLevel(logging.INFO)

configure_ist_logging()

state_name_cache = {}
district_name_cache = {}

def get_state_name(code: str):
    if code in state_name_cache:
        return state_name_cache[code]
    states, _ = scraper.get_states()
    for s in states:
        state_name_cache[s['value']] = s['text']
    return state_name_cache.get(code, code)

def get_district_name(state_code: str, dist_code: str):
    key = (state_code, dist_code)
    if key in district_name_cache:
        return district_name_cache[key]
    dists, _ = scraper.get_districts(state_code)
    for d in dists:
        district_name_cache[(state_code, d['value'])] = d['text']
    return district_name_cache.get(key, dist_code)


create_tables()
scraper = ECourtScraper()

@asynccontextmanager
async def lifespan(app: FastAPI):
    scraper.warm_session()
    yield

app = FastAPI(title="eCourts Scraper API - Optimized", version="1.0.0", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


 

@app.get("/")
async def root():
    return {"message": "eCourts Scraper API - Optimized for Performance", "status": "ready"}

@app.get("/api/get-states", response_model=StateResponse)
async def get_states():
    """Get list of available states with performance monitoring"""
    try:
        states, app_token = scraper.get_states()
        return StateResponse(states=states, app_token=app_token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching states: {str(e)}")

@app.post("/api/get-districts", response_model=DistrictResponse)
async def get_districts(request: StateRequest):
    """Get districts for a state with performance monitoring"""
    try:
        districts, app_token = scraper.get_districts(request.state_code)
        return DistrictResponse(districts=districts, app_token=app_token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching districts: {str(e)}")

@app.post("/api/get-court-complexes", response_model=CourtComplexResponse)
async def get_court_complexes(request: DistrictRequest):
    """Get court complexes for a district with performance monitoring"""
    try:
        complexes, app_token = scraper.get_court_complexes(request.state_code, request.dist_code)
        return CourtComplexResponse(complexes=complexes, app_token=app_token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching court complexes: {str(e)}")

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "session_initialized": scraper._session_initialized,
        "app_token_available": bool(scraper.app_token),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/get-case-types", response_model=CaseTypeResponse)
async def get_case_types(request: CaseTypeRequest):
    """Get case types for the selected state/district/court complex."""
    try:
        case_types, app_token = scraper.get_case_types(
            state_code=request.state_code,
            dist_code=request.dist_code,
            court_complex_code=request.court_complex_code,
            est_code=request.est_code or "",
            search_type=request.search_type or "c_no"
        )
        return CaseTypeResponse(case_types=case_types, app_token=app_token or scraper.app_token or "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching case types: {str(e)}")

@app.get("/api/captcha-url")
async def get_captcha_url():
    """Return a backend-relative CAPTCHA image URL (frontend then fetches image)."""
    
    rand = ''.join(random.choices('0123456789abcdef', k=16))
    return {"captcha_url": f"/api/captcha-image?rand={rand}"}

@app.get("/api/captcha-image")
async def get_captcha_image(rand: str = ""):
    """Proxy the CAPTCHA image through the backend to retain session cookies."""
    try:
        
        url = scraper.get_captcha_image_url()
        img_resp = scraper.session.get(url, timeout=15)
        if img_resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Upstream CAPTCHA HTTP {img_resp.status_code}")
        content_type = img_resp.headers.get('Content-Type', 'image/png')
        return Response(content=img_resp.content, media_type=content_type)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching CAPTCHA: {e}")

@app.post("/api/submit-case", response_model=CaseSubmissionResponse)
async def submit_case(request: CaseSubmissionRequest, db: Session = Depends(get_db)):
    """Submit case details (with CAPTCHA) and return structured case status/details."""
    try:
        result_dict, app_token = scraper.submit_case_status(
            state_code=request.state_code,
            dist_code=request.dist_code,
            court_complex_code=request.court_complex_code,
            case_type=request.case_type,
            case_no=request.case_no,
            rgyear=request.rgyear,
            captcha_code=request.captcha_code,
            est_code=request.est_code or "null"
        )

        
        try:
            status = 'Success' if result_dict.get('success') else 'Failed'
            case_number_log = result_dict.get('case_status_data', {}).get('case_number') or f"{request.case_type} {request.case_no}/{request.rgyear}" 
            state_name = get_state_name(request.state_code)
            district_name = get_district_name(request.state_code, request.dist_code)
            log_entry = QueryLog(
                state=state_name,
                district=district_name,
                case_number=case_number_log,
                status=status,
                raw_json_response=json.dumps(result_dict)[:65000]
            )
            db.add(log_entry)
            db.commit()
        except Exception as e:
            logger.warning(f"query log persist failed: {e}")

        return CaseSubmissionResponse(
            success=bool(result_dict.get('success')),
            message=result_dict.get('message', ''),
            case_status_data=result_dict.get('case_status_data'),
            raw_html=result_dict.get('raw_html'),
            captcha_html=result_dict.get('captcha_html'),
            app_token=app_token or scraper.app_token
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"submit_case error: {e}")
        raise HTTPException(status_code=500, detail="Error submitting case")

@app.post("/api/get-case-details", response_model=CaseDetailsResponse)
async def get_case_details(request: CaseDetailsRequest):
    """Get detailed case info (invokes viewHistory equivalent)."""
    try:
        details_dict, app_token = scraper.get_case_details(
            court_code=request.court_code,
            state_code=request.state_code,
            dist_code=request.dist_code,
            court_complex_code=request.court_complex_code,
            case_no=request.case_no,
            cino=request.cino,
            search_flag=request.search_flag or 'CScaseNumber',
            search_by=request.search_by or 'CScaseNumber'
        )
        return CaseDetailsResponse(
            success=bool(details_dict.get('success')),
            message=details_dict.get('message', ''),
            case_details=details_dict.get('case_details'),
            raw_html=details_dict.get('raw_html'),
            app_token=app_token or scraper.app_token
        )
    except Exception as e:
        logger.warning(f"get_case_details error: {e}")
        raise HTTPException(status_code=500, detail="Error fetching case details")

@app.post("/api/get-order-pdf")
async def get_order_pdf(req: OrderPdfRequest):
    """Fetch an interim order PDF using the raw displayPdf() argument captured from upstream HTML.
    Returns PDF bytes streamed to client. Frontend can either trigger a download or open a new tab.
    """
    try:
        pdf_bytes, filename, _ = scraper.fetch_order_pdf(req.pdf_request)
        if not pdf_bytes:
            snippet = (req.pdf_request[:120] + '...') if len(req.pdf_request) > 120 else req.pdf_request
            raise HTTPException(status_code=404, detail=f"PDF not available for request fragment: {snippet}")
        safe_filename = filename or 'order.pdf'
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=\"{safe_filename}\""
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"get_order_pdf error: {e}")
        raise HTTPException(status_code=500, detail="Error fetching PDF")

@app.post("/api/clear-cache")
async def clear_cache():
    """Clear any internal cached data (case types etc.)."""
    try:
        global scraper
        scraper = ECourtScraper()
        return {"success": True, "message": "Caches cleared and session reset"}
    except Exception as e:
        logger.warning(f"clear_cache error: {e}")
        return {"success": False, "message": "Failed to clear cache"}

@app.post("/api/warm-session")
async def warm_session():
    """Explicitly warm the scraper session (refresh tokens/cookies)."""
    ok = scraper.warm_session()
    return {"success": ok, "app_token": scraper.app_token}

@app.get("/api/query-logs", response_model=List[QueryLogResponse])
async def get_query_logs(limit: int = 50, db: Session = Depends(get_db)):
    """Return recent query logs (default limit=50)."""
    try:
        limit = max(1, min(limit, 500))
        logs = db.query(QueryLog).order_by(QueryLog.timestamp.desc()).limit(limit).all()
        return logs
    except Exception as e:
        logger.warning(f"query logs error: {e}")
        raise HTTPException(status_code=500, detail="Error fetching query logs")

@app.get("/api/stats", response_model=StatsResponse)
async def get_stats(db: Session = Depends(get_db)):
    """Return aggregated usage statistics."""
    try:
        total = db.query(func.count(QueryLog.id)).scalar() or 0
        successful = db.query(func.count(QueryLog.id)).filter(QueryLog.status == 'Success').scalar() or 0
        failed = total - successful
        success_rate = round((successful / total) * 100, 2) if total else 0.0
        
        state_counts = (
            db.query(QueryLog.state, func.count(QueryLog.id).label('cnt'))
            .group_by(QueryLog.state)
            .order_by(desc('cnt'))
            .limit(10)
            .all()
        )
        most_searched_states = [ { 'state': row[0], 'count': row[1] } for row in state_counts ]
        return StatsResponse(
            total_queries=total,
            successful_queries=successful,
            failed_queries=failed,
            success_rate=success_rate,
            most_searched_states=most_searched_states
        )
    except Exception as e:
        logger.warning(f"stats error: {e}")
        raise HTTPException(status_code=500, detail="Error generating stats")

@app.post("/api/reset-logs")
async def reset_logs(db: Session = Depends(get_db)):
    try:
        db.query(QueryLog).delete()
        db.commit()
        return {"success": True, "message": "Logs cleared"}
    except Exception as e:
        logger.warning(f"reset_logs error: {e}")
        raise HTTPException(status_code=500, detail="Error clearing logs")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
