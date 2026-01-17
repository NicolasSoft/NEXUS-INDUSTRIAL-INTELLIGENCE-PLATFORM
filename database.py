from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/iot_platform")

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

class TelemetryDB(Base):
    __tablename__ = "telemetry"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    temperature = Column(Float)
    vibration = Column(Float)
    rpm = Column(Integer)
    pressure = Column(Float, nullable=True)
    power_consumption = Column(Float, nullable=True)
    timestamp = Column(DateTime)
    anomaly = Column(Boolean, default=False)
    anomaly_score = Column(Float, nullable=True)
    health_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

async def init_db():
    """Inicializar banco de dados"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db() -> AsyncSession:
    """Obter sessão do banco de dados"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise