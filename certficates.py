import os
import pandas as pd
from PIL import Image, ImageDraw, ImageFont
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
import urllib.request
import io

# -----------------------------
# CONFIGURATION
# -----------------------------

load_dotenv()
EXCEL_FILE = "Certificate_Gen/participants.xlsx"
TEMPLATE_FILE = "Certificate_Gen/certificate_template.jpg"
OUTPUT_DIR_PNG = "Certificate_Gen/certificates_png"
OUTPUT_DIR_PDF = "Certificate_Gen/certificates_pdf"

SENDER_EMAIL = os.environ.get("SENDER_EMAIL")
APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD")
USE_DEBUG_SMTP = False

# Google Fonts CDN - Download these fonts automatically
GOOGLE_FONTS = {
    "Playfair Display": "https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf",
    "Cinzel": "https://github.com/google/fonts/raw/main/ofl/cinzel/Cinzel%5Bwght%5D.ttf",
    "Great Vibes": "https://github.com/google/fonts/raw/main/ofl/greatvibes/GreatVibes-Regular.ttf",
    "Cormorant Garamond": "https://github.com/google/fonts/raw/main/ofl/cormorantgaramond/CormorantGaramond-Bold.ttf",
}

PREFERRED_FONT = "Playfair Display"  # Elegant serif font for certificates

# Fallback font paths
FONT_PATHS = [
    # macOS
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf",
    "/Library/Fonts/Georgia.ttf",
    # Windows
    "C:/Windows/Fonts/times.ttf",
    "C:/Windows/Fonts/timesbd.ttf",
    "C:/Windows/Fonts/georgia.ttf",
    "C:/Windows/Fonts/georgiai.ttf",
    # Linux
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
]

# Certificate text positioning
TEXT_Y_POSITION = 475  # Adjust this based on your template
FONT_SIZE = 60
TEXT_COLOR = "black"  # Can also use RGB tuple like (0, 0, 0)

# PDF Configuration for printing
PDF_DPI = 300  # High quality for printing

# -----------------------------
# HELPER FUNCTIONS
# -----------------------------

def download_google_font(font_name, url):
    """Download a Google Font and save it locally."""
    fonts_dir = "Certificate_Gen/fonts"
    os.makedirs(fonts_dir, exist_ok=True)
    
    font_filename = f"{font_name.replace(' ', '_')}.ttf"
    font_path = os.path.join(fonts_dir, font_filename)
    
    if os.path.exists(font_path):
        return font_path
    
    try:
        print(f"Downloading {font_name} from Google Fonts...")
        urllib.request.urlretrieve(url, font_path)
        print(f"✓ Downloaded {font_name}")
        return font_path
    except Exception as e:
        print(f"Warning: Could not download {font_name}: {e}")
        return None


def get_font(size=FONT_SIZE):
    """Try to load a Google Font first, then fallback to system fonts."""
    
    # Try to download and use preferred Google Font
    if PREFERRED_FONT in GOOGLE_FONTS:
        font_path = download_google_font(PREFERRED_FONT, GOOGLE_FONTS[PREFERRED_FONT])
        if font_path:
            try:
                font = ImageFont.truetype(font_path, size)
                print(f"✓ Using Google Font: {PREFERRED_FONT}")
                return font
            except Exception as e:
                print(f"Warning: Could not load downloaded font: {e}")
    
    # Try other Google Fonts
    for font_name, url in GOOGLE_FONTS.items():
        if font_name == PREFERRED_FONT:
            continue
        font_path = download_google_font(font_name, url)
        if font_path:
            try:
                font = ImageFont.truetype(font_path, size)
                print(f"✓ Using Google Font: {font_name}")
                return font
            except Exception as e:
                print(f"Warning: Could not load {font_name}: {e}")
    
    # Fallback to system fonts
    for path in FONT_PATHS:
        if os.path.exists(path):
            try:
                font = ImageFont.truetype(path, size)
                print(f"✓ Loaded system font: {path}")
                return font
            except Exception as e:
                print(f"Warning: Could not load font {path}: {e}")
                continue
    
    print("Warning: No TrueType fonts found, using default font")
    return ImageFont.load_default()


def generate_certificate(name, template_path, output_path_png, output_path_pdf, font):
    """Generate a personalized certificate with the given name and convert to PDF."""
    # Open template
    cert = Image.open(template_path).convert("RGB")
    draw = ImageDraw.Draw(cert)

    # Calculate centered position
    bbox = draw.textbbox((0, 0), name, font=font)
    text_width = bbox[2] - bbox[0]
    x = (cert.width - text_width) // 2
    y = TEXT_Y_POSITION

    # Draw text
    draw.text((x, y), name, font=font, fill=TEXT_COLOR)

    # Save certificate as PNG
    cert.save(output_path_png, "PNG")
    print(f"  → Certificate image saved: {output_path_png}")
    
    # Convert PNG to PDF with print-friendly settings
    convert_to_printable_pdf(output_path_png, output_path_pdf, cert.width, cert.height)
    print(f"  → Certificate PDF created: {output_path_pdf}")


def convert_to_printable_pdf(png_path, pdf_path, img_width, img_height):
    """Convert PNG image to PDF keeping the original dimensions."""
    
    # Create PDF with same dimensions as image
    c = canvas.Canvas(pdf_path, pagesize=(img_width, img_height))
    
    # Draw image at original size
    c.drawImage(png_path, 0, 0, width=img_width, height=img_height)
    
    # Set PDF metadata
    c.setTitle("Participation Certificate")
    c.setAuthor("AI Brewery")
    c.setSubject("Certificate of Participation")
    
    # Save PDF
    c.save()


def send_certificate(name, email, pdf_filename):
    """Send certificate PDF via email."""
    msg = EmailMessage()
    msg["Subject"] = "Your Participation Certificate"
    msg["From"] = SENDER_EMAIL
    msg["To"] = email
    
    msg.set_content(
        f"Hello {name},\n\n"
        f"Congratulations! Please find attached your participation certificate.\n\n"
        f"We appreciate your involvement and hope to see you again soon.\n\n"
        f"Best regards,\n"
        f"AI Brewery"
    )

    # Attach certificate PDF
    with open(pdf_filename, "rb") as f:
        file_data = f.read()
        msg.add_attachment(
            file_data,
            maintype="application",
            subtype="pdf",
            filename=f"SIT_Internal_Hackathon_For_SIH25_{name.replace(' ', '_')}.pdf"
        )

    # Send email
    if USE_DEBUG_SMTP:
        print(f"  → [DEBUG MODE] Would send to {email}")
        with smtplib.SMTP("localhost", 1025) as smtp:
            smtp.send_message(msg)
    else:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(SENDER_EMAIL, APP_PASSWORD)
            smtp.send_message(msg)
        print(f"  → Email sent to {email}")


# -----------------------------
# MAIN SCRIPT
# -----------------------------

def main():
    print("=" * 60)
    print("CERTIFICATE GENERATOR & EMAIL SENDER")
    print("=" * 60)
    
    # Validate configuration
    if not SENDER_EMAIL:
        print("\n❌ ERROR: SENDER_EMAIL not set in environment!")
        print("Set it by running: export SENDER_EMAIL='your_email@gmail.com'")
        return
    
    if not USE_DEBUG_SMTP and not APP_PASSWORD:
        print("\n❌ ERROR: GMAIL_APP_PASSWORD not set in environment!")
        print("Set it by running: export GMAIL_APP_PASSWORD='your_app_password'")
        return

    # Check files exist
    if not os.path.exists(EXCEL_FILE):
        print(f"\n❌ ERROR: Excel file not found: {EXCEL_FILE}")
        return
    
    if not os.path.exists(TEMPLATE_FILE):
        print(f"\n❌ ERROR: Template file not found: {TEMPLATE_FILE}")
        return

    # Create output directories
    os.makedirs(OUTPUT_DIR_PNG, exist_ok=True)
    os.makedirs(OUTPUT_DIR_PDF, exist_ok=True)
    print(f"\n📁 PNG output directory: {OUTPUT_DIR_PNG}")
    print(f"📁 PDF output directory: {OUTPUT_DIR_PDF}")

    # Load Excel data
    try:
        data = pd.read_excel(EXCEL_FILE)
        print(f"📊 Loaded {len(data)} participants from {EXCEL_FILE}")
    except Exception as e:
        print(f"\n❌ ERROR loading Excel file: {e}")
        return

    # Validate columns
    if "Name" not in data.columns or "Email" not in data.columns:
        print("\n❌ ERROR: Excel file must contain 'Name' and 'Email' columns")
        print(f"Found columns: {list(data.columns)}")
        return

    # Get font
    font = get_font(FONT_SIZE)
    print(f"✓ Font size: {FONT_SIZE}")
    print(f"✓ PDF format: Original image dimensions (1:1 conversion)")

    # Process each participant
    print(f"\n{'─' * 60}")
    print("PROCESSING CERTIFICATES")
    print(f"{'─' * 60}\n")
    
    success_count = 0
    error_count = 0

    for idx, row in data.iterrows():
        name = None
        try:
            # Get and validate data
            name = str(row["Name"]).strip()
            email = str(row["Email"]).strip()

            if not name or name.lower() == "nan":
                print(f"⚠️  Row {idx + 2}: Skipping - empty name")
                error_count += 1
                continue

            if not email or email.lower() == "nan" or "@" not in email:
                print(f"⚠️  Row {idx + 2}: Skipping {name} - invalid email: {email}")
                error_count += 1
                continue

            print(f"Processing: {name} ({email})")

            # Generate certificate (PNG and PDF in separate folders)
            safe_name = name.replace('/', '_').replace('\\', '_')
            filename_png = os.path.join(OUTPUT_DIR_PNG, f"{safe_name}.png")
            filename_pdf = os.path.join(OUTPUT_DIR_PDF, f"{safe_name}.pdf")
            
            # Generate certificate with all required arguments
            generate_certificate(name, TEMPLATE_FILE, filename_png, filename_pdf, font)

            # Send email with PDF
            send_certificate(name, email, filename_pdf)
            
            print(f"✅ Successfully processed {name}\n")
            success_count += 1

        except Exception as e:
            import traceback
            print(f"❌ Failed for {name if name else f'row {idx + 2}'}: {e}")
            print(traceback.format_exc())
            error_count += 1

    # Summary
    print(f"{'=' * 60}")
    print("SUMMARY")
    print(f"{'=' * 60}")
    print(f"✅ Successful: {success_count}")
    print(f"❌ Failed: {error_count}")
    print(f"📊 Total: {len(data)}")
    print(f"\n✓ PNG certificates saved in: {OUTPUT_DIR_PNG}")
    print(f"✓ PDF certificates saved in: {OUTPUT_DIR_PDF}")
    print("=" * 60)


if __name__ == "__main__":
    main()