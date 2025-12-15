"""Certificate generation service"""

import smtplib
from email.message import EmailMessage
from pathlib import Path
from PIL import Image, ImageDraw
from reportlab.pdfgen import canvas
from app.utils.fonts import get_font, hex_to_rgb


class CertificateService:
    """Service for certificate generation and email delivery"""
    
    @staticmethod
    def generate_certificate(
        template_path: str,
        template_format: str,
        name: str,
        text_x: int,
        text_y: int,
        font_name: str,
        font_size: int,
        text_color: str,
        output_png: Path,
        output_pdf: Path
    ) -> tuple[Path, Path]:
        """Generate a certificate for a participant with center-aligned name"""
        
        # Load template
        if template_format == "pdf":
            from pdf2image import convert_from_path
            images = convert_from_path(template_path, dpi=300)
            cert = images[0].convert("RGB")
        else:
            cert = Image.open(template_path).convert("RGB")
        
        # Draw text
        draw = ImageDraw.Draw(cert)
        font = get_font(font_name, font_size)
        color_rgb = hex_to_rgb(text_color)
        
        # Calculate text bounding box for centering
        bbox = draw.textbbox((0, 0), name, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Center the text horizontally on the certificate
        centered_x = (cert.width - text_width) // 2
        
        # Adjust Y position so text_y is the CENTER of the text (matching preview behavior)
        # PIL draws from top-left, so subtract half the text height
        adjusted_y = text_y - (text_height // 2)
        
        # Draw centered text at the adjusted Y position
        draw.text((centered_x, adjusted_y), name, font=font, fill=color_rgb)
        
        # Save PNG
        cert.save(output_png, "PNG")
        
        # Create PDF
        c = canvas.Canvas(str(output_pdf), pagesize=(cert.width, cert.height))
        c.drawImage(str(output_png), 0, 0, width=cert.width, height=cert.height)
        c.setTitle("Certificate of Participation")
        c.save()
        
        return output_png, output_pdf
    
    @staticmethod
    def send_certificate(
        name: str,
        email: str,
        pdf_path: Path,
        sender_email: str,
        app_password: str,
        subject: str = "Your Participation Certificate",
        body: str = "Congratulations! Please find attached your participation certificate.",
        event_name: str = ""
    ) -> None:
        """Send certificate via email"""
        
        msg = EmailMessage()
        
        # Replace {name} and {event_name} placeholders in subject and body
        email_subject = subject.replace("{name}", name).replace("{event_name}", event_name)
        email_body = body.replace("{name}", name).replace("{event_name}", event_name)
        
        msg["Subject"] = email_subject
        msg["From"] = sender_email
        msg["To"] = email
        
        # Use complete user-provided content without adding extra text
        msg.set_content(email_body)
        
        with open(pdf_path, "rb") as f:
            msg.add_attachment(
                f.read(),
                maintype="application",
                subtype="pdf",
                filename=f"Certificate_{name.replace(' ', '_')}.pdf"
            )
        
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(sender_email, app_password)
            smtp.send_message(msg)
    
    @staticmethod
    def send_email(
        to_email: str,
        sender_email: str,
        app_password: str,
        subject: str,
        body: str
    ) -> None:
        """Send a plain text email (no attachments)"""
        
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = sender_email
        msg["To"] = to_email
        msg.set_content(body)
        
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(sender_email, app_password)
            smtp.send_message(msg)
