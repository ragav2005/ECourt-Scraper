# Backend Overview

Portfolio-focus: this backend demonstrates production‑style API design around a stateful scraping core while remaining intentionally lean (no over‑engineering of infra for a single-user demo scenario).

## Feature Summary

| Category                  | Implemented                                             |
| ------------------------- | ------------------------------------------------------- |
| Session + Token Lifecycle | Yes – lazy init, replay, refresh, retry                 |
| CAPTCHA Handling          | Proxied image (user solves)                             |
| Case Data Normalization   | Multi-table + heuristic parsing                         |
| Logging & Analytics       | SQLite persisted query log + stats endpoint             |
| Timezone Handling         | IST log formatter for recruiter readability             |
| PDF Proxy R&D             | Endpoint & fallbacks present (upstream gating persists) |

## File Layout

```
Backend/
├── main.py             # FastAPI app setup, CORS, API routers
├── database.py         # SQLite connection, session, and table creation
├── models.py           # SQLAlchemy model for the query_logs table
├── schemas.py          # Pydantic schemas for API request/response
├── scraper.py          # Core web scraping logic
├── requirements.txt    # Python dependencies
└── README.md          # This file
```

## Key API Endpoints (Representative)

| Endpoint                                               | Purpose                                        |
| ------------------------------------------------------ | ---------------------------------------------- |
| GET /api/get-states                                    | Retrieve available states (cached)             |
| POST /api/get-districts                                | District options by state                      |
| POST /api/get-court-complexes                          | Court complexes for selection path             |
| POST /api/get-case-types                               | Case types (depends on prior context)          |
| GET /api/captcha-url + /api/captcha-image              | CAPTCHA fetch within session                   |
| POST /api/submit-case                                  | Orchestrates full case listing retrieval       |
| POST /api/get-order-pdf                                | (Experimental) attempt interim order PDF fetch |
| GET /api/health                                        | Basic service state snapshot                   |
| (Not shown in root README) /api/stats, /api/query-logs | Observability & analytics                      |

## Database Schema

### QueryLog Table

- `id` (Integer, Primary Key)
- `timestamp` (DateTime, default: current time)
- `state` (String, indexed)
- `district` (String, indexed)
- `case_number` (String, indexed)
- `status` (String) - "Success" or "Failed"
- `raw_json_response` (Text) - Full JSON response

## Installation (Local)

1. Create and activate virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Start the server:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Usage / Docs

Base URL: http://localhost:8000

Swagger UI: /docs | ReDoc: /redoc

## High-Level Flow

1. Initialize session implicitly
2. Progressive option hydration (districts → complexes → types)
3. CAPTCHA retrieval (image only – user solves)
4. Submission & parse
5. (Optional) Details enrichment (viewHistory)
6. Persist log row
7. Serve structured JSON to frontend
