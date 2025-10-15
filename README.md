# Certificate Generator

A Python-based tool to automatically generate personalized certificates from an Excel participant list and send them via email. Perfect for events, workshops, hackathons, and conferences.

## Features

- **Bulk Certificate Generation**: Process multiple participants from an Excel file
- **Dual Format Output**: Generate both PNG images and print-ready PDF certificates
- **Email Integration**: Automatically send certificates via Gmail SMTP
- **Font Management**: Downloads Google Fonts automatically with system font fallbacks
- **Template-Based**: Uses a customizable certificate template image
- **Error Handling**: Robust error handling with detailed logging
- **Debug Mode**: Test email functionality without sending real emails

## Prerequisites

- Python 3.13 or higher
- Gmail account with App Password (for email sending)
- Excel file with participant data (Name and Email columns)
- Certificate template image (JPG format)

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   pip install pandas pillow reportlab python-dotenv
   ```

## Setup

1. **Environment Variables**: Copy `.env.example` to `.env` and fill in your Gmail credentials:
   ```bash
   SENDER_EMAIL="your_email@gmail.com"
   GMAIL_APP_PASSWORD="your_gmail_app_password"
   ```

2. **Participant Data**: Place your Excel file (`participants.xlsx`) in the `participants/` directory with columns:
   - `Name`: Participant's full name
   - `Email`: Participant's email address

3. **Certificate Template**: Place your template image (`certificate_template.jpg`) in the `template/` directory

## Usage

Run the certificate generator:
```bash
python certficates.py
```

For testing without sending emails, modify the script to set `USE_DEBUG_SMTP = True` (requires a local SMTP server like MailHog).

## Configuration

### Font Settings
The script automatically downloads Google Fonts. You can change the preferred font in the script:
```python
PREFERRED_FONT = "Playfair Display"  # Options: Playfair Display, Cinzel, Great Vibes, Cormorant Garamond
```

### Positioning
Adjust text position and size in the script:
```python
TEXT_Y_POSITION = 475  # Vertical position of the name
FONT_SIZE = 60         # Font size
TEXT_COLOR = "black"   # Text color
```

### Output Directories
Certificates are saved in:
- `certificates_png/`: PNG format certificates
- `certificates_pdf/`: PDF format certificates

## Dependencies

- `pandas`: Excel file processing
- `pillow`: Image manipulation
- `reportlab`: PDF generation
- `python-dotenv`: Environment variable management

## Project Structure

```
Certificate_Gen/
├── certficates.py          # Main certificate generation script
├── main.py                 # Basic entry point (placeholder)
├── pyproject.toml          # Project configuration
├── .env.example            # Environment variables template
├── participants/           # Participant data directory
│   └── participants.xlsx   # Excel file with participant list
├── template/               # Template directory
│   └── certificate_template.jpg  # Certificate template image
├── certificates_png/       # Generated PNG certificates
├── certificates_pdf/       # Generated PDF certificates
└── fonts/                  # Downloaded Google Fonts
```

## Gmail Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password: https://support.google.com/accounts/answer/185833
3. Use the App Password in your `.env` file (not your regular password)

## Troubleshooting

- **Font Issues**: The script falls back to system fonts if Google Fonts can't be downloaded
- **Email Errors**: Verify your Gmail credentials and App Password
- **Template Not Found**: Ensure the template image is in JPG format in the `template/` directory
- **Excel Errors**: Check that your Excel file has 'Name' and 'Email' columns

## License

This project is open source. Feel free to modify and distribute.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.
