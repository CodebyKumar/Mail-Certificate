"""Run the FastAPI application with uvicorn"""

import os
import uvicorn

if __name__ == "__main__":
    # Get port from environment variable or use default
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=True if os.getenv("ENV") != "production" else False,
        log_level="info"
    )
