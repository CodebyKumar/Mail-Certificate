"""Template processing service"""

import shutil
from pathlib import Path
from datetime import datetime
from PIL import Image, ImageDraw
from fastapi import UploadFile
from app.core.config import settings
from app.utils.fonts import get_font, hex_to_rgb


class TemplateService:
    """Service for template processing"""
    
    @staticmethod
    async def process_template(file: UploadFile, session_id: str) -> dict:
        """Process uploaded template file"""
        
        try:
            # Save uploaded file
            file_path = settings.UPLOAD_DIR / f"{session_id}_template_{file.filename}"
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            # Determine format
            if file.filename.lower().endswith(".pdf"):
                template_format = "pdf"
            else:
                template_format = "image"
            
            # Convert to image for preview
            if template_format == "pdf":
                try:
                    from pdf2image import convert_from_path
                    images = convert_from_path(str(file_path), dpi=150)
                    img = images[0]
                except ImportError:
                    raise Exception("pdf2image not installed. Install with: uv add pdf2image")
                except Exception as e:
                    raise Exception(f"Failed to convert PDF: {str(e)}. Make sure poppler is installed.")
            else:
                img = Image.open(file_path)
            
            # Save preview
            preview_path = settings.STATIC_DIR / f"{session_id}_preview.png"
            img.save(preview_path, "PNG")
            
            return {
                "template_path": str(file_path),
                "template_format": template_format,
                "width": img.width,
                "height": img.height,
                "preview_url": f"/static/{session_id}_preview.png?t={datetime.now().timestamp()}"
            }
        except Exception as e:
            # Clean up on error
            if 'file_path' in locals() and file_path.exists():
                file_path.unlink()
            raise e
    
    @staticmethod
    async def generate_preview(
        session_data: dict,
        text: str,
        x: int,
        y: int,
        font_name: str,
        font_size: int,
        color: str,
        session_id: str
    ) -> str:
        """Generate preview with positioned text"""
        
        template_path = session_data["template_path"]
        template_format = session_data["template_format"]
        
        # Load template
        if template_format == "pdf":
            from pdf2image import convert_from_path
            images = convert_from_path(template_path, dpi=150)
            img = images[0].convert("RGB")
        else:
            img = Image.open(template_path).convert("RGB")
        
        # Draw text
        draw = ImageDraw.Draw(img)
        font = get_font(font_name, font_size)
        color_rgb = hex_to_rgb(color)
        
        # Calculate text width and center it horizontally
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        centered_x = (img.width - text_width) // 2
        
        # Draw centered text at the specified Y position
        draw.text((centered_x, y), text, font=font, fill=color_rgb)
        
        # Save preview
        preview_path = settings.STATIC_DIR / f"{session_id}_text_preview.png"
        img.save(preview_path, "PNG")
        
        return f"/static/{session_id}_text_preview.png?t={datetime.now().timestamp()}"
