from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, func
from app.database import Base


class MonitoredServerModel(Base):
    __tablename__ = "monitored_servers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    hostname = Column(String(255), nullable=False)
    ip_address = Column(String(64), nullable=False, index=True)
    server_type = Column(String(100), nullable=False)
    environment = Column(String(50), nullable=False)
    traffic_source = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="active")
    description = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False
    )

    def __repr__(self):
        return f"<MonitoredServer(id={self.id}, name='{self.name}', ip='{self.ip_address}')>"
