"""Excel file processing service"""

import shutil
from pathlib import Path
import pandas as pd
from fastapi import UploadFile, HTTPException
from app.core.config import settings


class ExcelService:
    """Service for Excel file processing"""
    
    @staticmethod
    async def process_excel(file: UploadFile, session_id: str) -> dict:
        """Process uploaded Excel file"""
        
        # Save file
        file_path = settings.UPLOAD_DIR / f"{session_id}_participants.xlsx"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Read and validate
        try:
            df = pd.read_excel(file_path)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read Excel file: {str(e)}")
        
        if "Name" not in df.columns or "Email" not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Excel must contain 'Name' and 'Email' columns. Found: {list(df.columns)}"
            )
        
        # Clean data
        df = df[["Name", "Email"]].dropna()
        
        # Preview data
        preview = df.head(5).to_dict("records")
        
        return {
            "excel_path": str(file_path),
            "participant_count": len(df),
            "preview": preview
        }
    
    @staticmethod
    def load_participants(excel_path: str) -> pd.DataFrame:
        """Load participants from Excel file"""
        df = pd.read_excel(excel_path)
        return df[["Name", "Email"]].dropna()
