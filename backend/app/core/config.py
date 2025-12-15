"""Certificate Mailing Machine API Configuration"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from pathlib import Path


class Settings(BaseSettings):
    """Application settings"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    # API Info
    APP_NAME: str = "Certificate Mailing Machine API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]
    
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "certmailer"
    # Allow skipping DB connection on startup (useful for local preview without Atlas)
    SKIP_DB_ON_STARTUP: bool = False
    
    # JWT Authentication
    JWT_SECRET: str = "change-this-secret-key-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_DAYS: int = 7
    
    # Encryption for app passwords
    ENCRYPTION_KEY: str = ""
    
    # Frontend URL
    FRONTEND_URL: str = "http://localhost:5173"
    
    # Directories
    BASE_DIR: Path = Path(__file__).parent.parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    OUTPUT_DIR: Path = BASE_DIR / "output"
    STATIC_DIR: Path = BASE_DIR / "static"
    FONTS_DIR: Path = BASE_DIR / "fonts"
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB
    
    # PDF Generation
    PDF_DPI: int = 300
    
    # Google Fonts
    GOOGLE_FONTS: dict[str, str] = {
        "Playfair Display": "https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf",
        "Cinzel": "https://github.com/google/fonts/raw/main/ofl/cinzel/Cinzel%5Bwght%5D.ttf",
        "Great Vibes": "https://github.com/google/fonts/raw/main/ofl/greatvibes/GreatVibes-Regular.ttf",
        "Cormorant Garamond": "https://github.com/google/fonts/raw/main/ofl/cormorantgaramond/CormorantGaramond-Bold.ttf",
        "Roboto": "https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Bold.ttf",
        "Bebas Neue": "https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf",
        "Oswald": "https://github.com/google/fonts/raw/main/ofl/oswald/Oswald%5Bwght%5D.ttf",
        "Montserrat": "https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf",
        "Press Start 2P": "https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf",
        "Silkscreen": "https://github.com/google/fonts/raw/main/ofl/silkscreen/Silkscreen-Regular.ttf",
        "Orbitron": "https://github.com/google/fonts/raw/main/ofl/orbitron/Orbitron%5Bwght%5D.ttf",
        "Poppins": "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf",
    }
    
    # System Fonts (fallback)
    SYSTEM_FONTS: list[str] = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf",
        "/Library/Fonts/Georgia.ttf",
        "C:/Windows/Fonts/times.ttf",
        "C:/Windows/Fonts/timesbd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    ]


settings = Settings(_env_file=Path(__file__).parent.parent.parent / ".env")

# Create required directories
for directory in [settings.UPLOAD_DIR, settings.OUTPUT_DIR, settings.STATIC_DIR, settings.FONTS_DIR]:
    directory.mkdir(exist_ok=True, parents=True)
