"""Font management utilities"""

import os
import urllib.request
from pathlib import Path
from PIL import ImageFont
from app.core.config import settings


# System font mappings for common fonts
SYSTEM_FONT_PATHS = {
    # macOS paths
    "Georgia": ["/System/Library/Fonts/Georgia.ttf", "/Library/Fonts/Georgia.ttf"],
    "Times New Roman": ["/System/Library/Fonts/Times.ttc", "/Library/Fonts/Times New Roman.ttf"],
    "Palatino Linotype": ["/System/Library/Fonts/Palatino.ttc", "/Library/Fonts/Palatino.ttf"],
    "Book Antiqua": ["/Library/Fonts/Book Antiqua.ttf"],
    "Garamond": ["/System/Library/Fonts/Supplemental/Garamond.ttf", "/Library/Fonts/Garamond.ttf"],
    "Arial": ["/System/Library/Fonts/Supplemental/Arial.ttf", "/Library/Fonts/Arial.ttf"],
    "Helvetica": ["/System/Library/Fonts/Helvetica.ttc"],
    "Verdana": ["/System/Library/Fonts/Supplemental/Verdana.ttf", "/Library/Fonts/Verdana.ttf"],
    "Trebuchet MS": ["/System/Library/Fonts/Supplemental/Trebuchet MS.ttf", "/Library/Fonts/Trebuchet MS.ttf"],
    "Century Gothic": ["/Library/Fonts/Century Gothic.ttf"],
    "Lucida Sans": ["/Library/Fonts/Lucida Sans.ttf"],
    "Courier New": ["/System/Library/Fonts/Supplemental/Courier New.ttf", "/Library/Fonts/Courier New.ttf"],
    "Brush Script MT": ["/System/Library/Fonts/Supplemental/Brush Script.ttf", "/Library/Fonts/Brush Script MT.ttf"],
    "Copperplate": ["/System/Library/Fonts/Supplemental/Copperplate.ttc", "/System/Library/Fonts/Copperplate.ttc", "/Library/Fonts/Copperplate.ttf"],
    "Papyrus": ["/System/Library/Fonts/Supplemental/Papyrus.ttc", "/Library/Fonts/Papyrus.ttf"],
}


def download_google_font(font_name: str, url: str) -> str | None:
    """Download a Google Font and save it locally."""
    font_filename = f"{font_name.replace(' ', '_')}.ttf"
    font_path = settings.FONTS_DIR / font_filename
    
    if font_path.exists():
        return str(font_path)
    
    try:
        urllib.request.urlretrieve(url, str(font_path))
        return str(font_path)
    except Exception as e:
        print(f"Failed to download {font_name}: {e}")
        return None


def get_font(font_name: str = "Georgia", size: int = 60) -> ImageFont.FreeTypeFont:
    """Load font from system or Google Fonts."""
    
    # First try system font paths for this font
    if font_name in SYSTEM_FONT_PATHS:
        for path in SYSTEM_FONT_PATHS[font_name]:
            if os.path.exists(path):
                try:
                    return ImageFont.truetype(path, size)
                except Exception:
                    continue
    
    # Try Google Fonts
    if font_name in settings.GOOGLE_FONTS:
        font_path = download_google_font(font_name, settings.GOOGLE_FONTS[font_name])
        if font_path:
            try:
                return ImageFont.truetype(font_path, size)
            except Exception:
                pass
    
    # Try generic system fonts as fallback
    for path in settings.SYSTEM_FONTS:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    
    # Fallback to default
    print(f"Warning: Could not load font '{font_name}', using default")
    return ImageFont.load_default()


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
