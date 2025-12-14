# Certificate Mailing System

A modern web application for automating personalized certificate generation and distribution with feedback collection. Perfect for managing events, workshops, hackathons, and conferences.

## Overview

This platform streamlines the entire certificate distribution workflow - from participant management to certificate generation, email delivery, and feedback collection. Built with React and FastAPI, it provides a complete solution for event organizers.

## Key Features

### Certificate Management
- **Custom Design Editor**: Visual certificate designer with real-time preview
- **Dynamic Text Placement**: Customize name position, font, size, and color
- **Template Upload**: Support for custom certificate backgrounds
- **Bulk Generation**: Process multiple participants automatically

### Participant Management
- **Excel Import**: Upload participant lists via Excel files
- **Status Tracking**: Monitor email delivery and feedback status for each participant
- **Bulk Operations**: Send certificates to all participants or resend to specific ones
- **Individual Actions**: Resend certificates or feedback requests per participant

### Email System
- **Dual Email Templates**: Separate templates for feedback requests and certificate delivery
- **Gmail Integration**: Send emails through your Gmail account with app password
- **Email Testing**: Test your email configuration before bulk sending
- **Customizable Content**: Edit subject lines and email body for both feedback and certificate emails

### Feedback Collection
- **Online Forms**: Participants submit feedback through web forms
- **Real-time Updates**: Track submission status in the dashboard
- **Feedback Management**: View and analyze participant responses
- **Optional Mode**: Choose to send certificates with or without feedback requests

### Admin Dashboard
- **User Management**: View all registered users and their activity
- **Platform Statistics**: Total users, events, certificates sent, and feedback received
- **User Analytics**: Per-user event count and certificate metrics
- **Account Management**: Delete user accounts (preserves admin accounts)

## Technology Stack

### Frontend
- React 18 with TypeScript
- Framer Motion for animations
- React Router for navigation
- Lucide React for icons

### Backend
- FastAPI (Python)
- MongoDB with Motor (async driver)
- Pillow for image processing
- JWT authentication

## User Roles

### Regular User
- Create and manage events
- Upload participant lists
- Design certificates
- Send certificates and feedback requests
- View participant status and feedback
- Configure email settings

### Admin User
- All regular user capabilities
- Access admin dashboard
- View platform statistics
- Manage user accounts
- Monitor system-wide activity

## Workflow

1. **Event Setup**: Create an event and upload participant Excel file
2. **Certificate Design**: Customize certificate template, fonts, and text placement
3. **Email Configuration**: Set up Gmail credentials and customize email templates
4. **Feedback Setup** (Optional): Enable feedback collection and customize the feedback email
5. **Preview & Test**: Preview certificates and test email configuration
6. **Send**: Distribute certificates and/or feedback requests to participants
7. **Monitor**: Track delivery status and feedback submissions
8. **Analyze**: Review feedback responses from participants

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Secure admin routes
- Email validation
- MongoDB injection protection
- Environment variable configuration

## Database Collections

- **users**: User accounts and authentication
- **events**: Event information and settings
- **participants**: Participant data and status tracking
- **feedback**: Participant feedback responses

---

**Built for event organizers who need a reliable, automated certificate distribution system.**
