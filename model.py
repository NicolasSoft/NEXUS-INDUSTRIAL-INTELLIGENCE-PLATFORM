from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    ENGINEER = "engineer"
    OPERATOR = "operator"
    VIEWER = "viewer"

class TelemetryData(BaseModel):
    device_id: str
    temperature: float = Field(..., ge=-50, le=150)
    vibration: float = Field(..., ge=0, le=1)
    rpm: int = Field(..., ge=0, le=10000)
    pressure: Optional[float] = None
    power_consumption: Optional[float] = None
    timestamp: datetime
    anomaly: bool = False
    anomaly_score: Optional[float] = None
    health_score: Optional[float] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class User(BaseModel):
    username: str
    email: EmailStr
    password: Optional[str] = None
    hashed_password: Optional[str] = None
    role: UserRole = UserRole.OPERATOR
    scopes: List[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

class Alert(BaseModel):
    id: str
    severity: str  # "low", "medium", "high", "critical"
    type: str  # "anomaly", "security", "maintenance", "performance"
    device_id: Optional[str] = None
    message: str
    timestamp: datetime
    acknowledged: bool = False
    data: Optional[Dict[str, Any]] = None

class Device(BaseModel):
    id: str
    name: str
    type: str
    location: str
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    status: str = "online"
    last_seen: datetime
    firmware_version: str
    metadata: Optional[Dict[str, Any]] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 3600
    refresh_token: Optional[str] = None

class SecurityEvent(BaseModel):
    id: str
    event_type: str
    severity: str
    source_ip: Optional[str]
    description: str
    timestamp: datetime
    resolved: bool = False

class PredictiveMaintenance(BaseModel):
    device_id: str
    remaining_life_hours: float
    failure_probability: float
    recommended_action: str
    urgency: str  # "low", "medium", "high"
    estimated_cost: Optional[float] = None