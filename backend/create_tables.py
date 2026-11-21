
from app.core.database import engine, Base
from app.models import Inspection, Detection

print("Creating SiteGuard AI database tables...")

Base.metadata.create_all(bind=engine)

print("Database tables created successfully!")
