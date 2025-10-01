from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from database import Base

class QueryLog(Base):
    __tablename__ = "query_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    state = Column(String, index=True)
    district = Column(String, index=True)
    case_number = Column(String, index=True)
    status = Column(String)
    raw_json_response = Column(Text)