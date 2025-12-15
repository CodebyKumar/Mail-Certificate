"""Main FastAPI application"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection

# Import routers
from app.api import auth, users, events, participants, send, admin, feedback
from app.api import certificates  # Keep legacy endpoints for backward compatibility


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - connect/disconnect database"""
    try:
        await connect_to_mongo()
    except Exception as e:
        print(f"Warning: Failed to connect to MongoDB during startup: {e}")
        print("Application will continue without database connection")
    yield
    await close_mongo_connection()


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,
)

# Mount static files
app.mount("/static", StaticFiles(directory=str(settings.STATIC_DIR)), name="static")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(participants.router, prefix="/api/events", tags=["participants"])
app.include_router(send.router, prefix="/api/events", tags=["send"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["feedback"])

# Legacy endpoints for backward compatibility
app.include_router(certificates.router, prefix="/api", tags=["legacy"])


@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    # Include DB status for easier debugging
    from app.core.database import db
    db_status = db.db is not None
    return {"status": "healthy", "db_connected": db_status}


# For deployment
if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=False
    )
