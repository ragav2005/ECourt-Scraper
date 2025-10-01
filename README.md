<div align="center">

# eCourts Case Insight

FastAPI + React application that automates structured retrieval, parsing, and visualization of public Indian eCourts case metadata. Designed to showcase full‑stack engineering skills: resilient scraping, API design, typed frontend, analytics, and production‑style logging.

## 1. Summary

This project simulates a mini vertical product: a user supplies jurisdiction + case identifiers, the system orchestrates a multi‑step flow against the eCourts public interface, normalizes heterogeneous HTML fragments into a consistent JSON schema, logs structured query events, and presents an analytical dashboard (success rates, volume, historical view).

**Key Themes:**

- Stateful scraping with token & cookie continuity
- HTML resiliency (multiple defensive parsing passes)
- Clean API surface (FastAPI + Pydantic v2 models)
- Observability (structured logging, IST timestamps, query log persistence)
- Frontend UX flow with progressive disclosure (wizard) + analytics panel

---

## 2. Core Features

| Area             | Highlights                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Session & Tokens | Lazy bootstrap, token refresh, retry & replay logic                                                                            |
| CAPTCHA Workflow | Backend proxies image to preserve session continuity                                                                           |
| Data Parsing     | Parties, acts, processes, history, interim orders, summary synthesis                                                           |
| Logging          | SQLite event log + real-time stats endpoint + IST timestamp formatting                                                         |
| Frontend UX      | Multi-step wizard, validation, error surfaces, dark-friendly styling                                                           |
| Resilience       | Graceful fallbacks when upstream layout shifts / missing blocks                                                                |
| PDF Attempt      | Architecture for interim order PDF proxy (currently returns 404 due to upstream gating; retained as demonstration of approach) |

---

## 3. Technology Stack

| Layer      | Tech                                                            |
| ---------- | --------------------------------------------------------------- |
| Backend    | FastAPI, Requests, BeautifulSoup4, SQLAlchemy, Pydantic v2      |
| Frontend   | React 19, React Router v7, TypeScript, Tailwind-esque utilities |
| Data Store | SQLite (lightweight, file based)                                |
| Tooling    | Vite, TypeScript, Structured logging customization              |

---

## 4. Architecture (Conceptual)

```
User → React Wizard → FastAPI API → Scraper Orchestrator → eCourts endpoints
                                                            ↓
                                              SQLite Query Log
                                                            ↓
                                             Analytics + Dashboard
```

Key design decisions:

1. Keep scraping logic isolated (`scraper.py`) for future replacement (e.g., headless browser, Playwright).
2. Stateless API facade + stateful internal session object for performance and continuity.
3. Defensive parsing rather than brittle single-pass CSS selectors.

---

## 5. Running Locally

### Backend

```bash
cd Backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Docs: http://localhost:8000/docs

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

UI: http://localhost:5173

---

## 6. Sample API Flow

1. GET /api/get-states
2. POST /api/get-districts
3. POST /api/get-court-complexes
4. POST /api/get-case-types
5. GET /api/captcha-url → then GET captcha-image
6. POST /api/submit-case
7. (Optional) Attempt /api/get-order-pdf (may 404 currently – documented limitation)

---

## 7. Data Model (Simplified Log)

```sql
CREATE TABLE query_logs (
   id INTEGER PRIMARY KEY,
   timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
   state TEXT,
   district TEXT,
   case_number TEXT,
   status TEXT,
   raw_json_response TEXT
);
```

---

## 8. Selected Highlights

| Topic             | Detail                                                                                |
| ----------------- | ------------------------------------------------------------------------------------- |
| Session Replay    | Replays last case context & viewHistory chain before sensitive calls                  |
| Resilient Parsing | Multi-table scanning, normalization & fallback heuristics                             |
| Logging TZ        | Custom formatter outputs IST consistently (HR-relevant: attention to ops detail)      |
| PDF R&D           | Structured multi-fallback design (direct path, context replay, alternative host path) |
| Future-Proofing   | Encapsulated scraping enables future headless browser swap                            |

Prerequisites

- Python 3.8+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Navigate to the Backend directory:

```bash
cd Backend
```

2. Create and activate virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Start the backend server:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the Frontend directory:

```bash
cd Frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Documentation

Once the backend is running, visit:

- **Interactive API Docs**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

### Key API Endpoints

- `POST /api/get-districts` - Get districts for a state
- `POST /api/get-court-complexes` - Get court complexes
- `POST /api/get-case-types` - Get case types
- `GET /api/captcha-image` - Get CAPTCHA image URL
- `POST /api/submit-case` - Submit case search
- `GET /api/query-logs` - Get query logs
- `GET /api/stats` - Get comprehensive statistics

## Usage Workflow

### 1. **Select State & District**

- Choose your state (currently supports Himachal Pradesh)
- Select district from dynamically loaded options
- Pick court complex

### 2. **Enter Case Details**

- Select case type
- Enter case number
- Specify registration year

### 3. **Solve CAPTCHA**

- View dynamically loaded CAPTCHA image
- Enter CAPTCHA text
- Refresh if needed

### 4. **View Results**

- Case information is displayed
- All queries are logged to database
- Success/failure tracking

### 5. **Analytics Dashboard**

- View query statistics
- Monitor success rates
- Access detailed logs

## Architecture

### Backend Architecture

```
FastAPI Application
├── API Layer (main.py)
├── Business Logic (scraper.py)
├── Data Layer (models.py, database.py)
├── Validation Layer (schemas.py)
└── SQLite Database (scraper.db)
```

### Frontend Architecture

```
React Application
├── Routing Layer (React Router v7)
├── Component Layer (Pages & Components)
├── State Management (React useState)
├── API Integration (Fetch API)
└── Styling (Tailwind CSS)
```

### Data Flow

1. **Frontend** → API Request → **Backend**
2. **Backend** → eCourts Website → Response
3. **Backend** → Database Logging → **Frontend**
4. **Frontend** → Display Results → User

## Technical Implementation

### Web Scraping Logic

Based on analysis of network requests from the eCourts website:

1. **Session Initialization**: Establish session with cookies
2. **Progressive Data Loading**:
   - Load districts based on state
   - Load court complexes based on district
   - Load case types based on complex
3. **CAPTCHA Handling**: Dynamic image loading and submission
4. **Case Submission**: Form data submission with validation
5. **Response Processing**: Parse and structure case information

### Database Schema

```sql
CREATE TABLE query_logs (
    id INTEGER PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    state VARCHAR(100),
    district VARCHAR(100),
    case_number VARCHAR(100),
    status VARCHAR(20),  -- 'Success' or 'Failed'
    raw_json_response TEXT
);
```

### Error Handling

- Comprehensive error logging
- User-friendly error messages
- Graceful degradation on network issues
- Database transaction safety

## Monitoring & Analytics

### Real-time Statistics

- Total queries executed
- Success/failure rates
- Most searched states
- Query performance metrics

### Logging Features

- All queries logged with timestamps
- Raw JSON responses stored
- Success/failure tracking
- Search pattern analysis

## Deployment

### Development

```bash
# Backend
cd Backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend (new terminal)
cd Frontend && npm run dev
```

### Production

```bash
# Backend
cd Backend && uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend
cd Frontend && npm run build && npm start
```
