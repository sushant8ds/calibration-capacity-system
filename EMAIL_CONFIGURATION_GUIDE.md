# Email Configuration Guide

This guide explains how to set up email notifications for the Calibration & Production Capacity Management System.

## Overview

The system now supports database-driven email configuration, allowing you to manage email settings directly from the web interface without needing to restart the server or modify environment variables.

## Features

- **Web-based Configuration**: Configure email settings through the dashboard
- **Multiple Recipients**: Send alerts to multiple email addresses
- **Test Functionality**: Test your configuration before saving
- **Secure Storage**: Email settings are stored securely in the database
- **Fallback Support**: Falls back to environment variables if database config is not available

## Setup Instructions

### Method 1: Web Interface (Recommended)

1. **Open the Dashboard**
   - Navigate to your system dashboard
   - Click the "Email Config" button in the System Controls section

2. **Configure Email Settings**
   - **Enable Email Notifications**: Check this box to activate email alerts
   - **SMTP Host**: Usually `smtp.gmail.com` for Gmail
   - **SMTP Port**: Usually `587` for Gmail with STARTTLS
   - **Email Address**: Your sending email address (e.g., `alerts@yourcompany.com`)
   - **App Password**: For Gmail, use an App Password (see Gmail setup below)
   - **From Email**: The email address that appears in the "From" field
   - **Recipients**: Comma-separated list of email addresses to receive alerts

3. **Test Configuration**
   - Click "Test Configuration" to send a test email
   - Verify that the test email is received by all recipients

4. **Save Configuration**
   - Click "Save Configuration" to store the settings
   - The system will immediately start using the new configuration

### Method 2: Environment Variables (Fallback)

If you prefer to use environment variables, create or update your `.env` file:

```env
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=alerts@yourcompany.com
EMAIL_TO=admin@company.com,manager@company.com
```

## Gmail Setup

### Creating a Gmail App Password

1. **Enable 2-Factor Authentication**
   - Go to your Google Account settings
   - Navigate to Security → 2-Step Verification
   - Enable 2-factor authentication if not already enabled

2. **Generate App Password**
   - Go to Security → 2-Step Verification → App passwords
   - Select "Mail" as the app and "Other" as the device
   - Enter "Calibration System" as the device name
   - Copy the generated 16-character password

3. **Use in Configuration**
   - Use your Gmail address as the "Email Address"
   - Use the 16-character app password as the "App Password"
   - Set SMTP Host to `smtp.gmail.com` and Port to `587`

### Gmail Settings Summary
- **SMTP Host**: `smtp.gmail.com`
- **SMTP Port**: `587`
- **Security**: STARTTLS (not SSL)
- **Authentication**: Your Gmail address and App Password

## Other Email Providers

### Outlook/Hotmail
- **SMTP Host**: `smtp-mail.outlook.com`
- **SMTP Port**: `587`
- **Security**: STARTTLS

### Yahoo Mail
- **SMTP Host**: `smtp.mail.yahoo.com`
- **SMTP Port**: `587` or `465`
- **Security**: STARTTLS or SSL

### Custom SMTP Server
- Contact your IT administrator for SMTP settings
- Usually requires host, port, username, and password

## Email Types

The system sends three types of emails:

### 1. Alert Notifications
- Sent automatically when new alerts are created
- Includes alert details, severity, and gauge information
- Contains direct link to the dashboard

### 2. Test Emails
- Sent when you click "Test Email" or "Test Configuration"
- Used to verify email configuration is working
- Contains sample alert information

### 3. Daily Summary
- Can be sent manually via "Email Status" → "Send Summary"
- Contains summary of all pending (unacknowledged) alerts
- Includes statistics and top alerts

## Troubleshooting

### Common Issues

1. **"Email configuration incomplete"**
   - Ensure all required fields are filled
   - Check that email address and password are correct

2. **"Authentication failed"**
   - For Gmail, ensure you're using an App Password, not your regular password
   - Verify 2-factor authentication is enabled for Gmail
   - Check that the email address and password are correct

3. **"Connection timeout"**
   - Verify SMTP host and port settings
   - Check firewall settings
   - Ensure internet connectivity

4. **Emails not received**
   - Check spam/junk folders
   - Verify recipient email addresses are correct
   - Test with a single recipient first

### Testing Steps

1. **Test Email Configuration**
   - Use the "Test Configuration" button in the Email Config modal
   - Check server logs for detailed error messages

2. **Check Email Status**
   - Use the "Email Status" button to verify configuration
   - Shows current settings and connection status

3. **Send Test Alert**
   - Use the "Test Email" button to send a sample alert
   - Verifies end-to-end email functionality

## Security Considerations

- **App Passwords**: Always use app-specific passwords for Gmail
- **Database Storage**: Email passwords are stored in the database (consider encryption for production)
- **Environment Variables**: Alternative method for sensitive credentials
- **Access Control**: Limit access to email configuration to authorized users

## Production Deployment

For production deployment:

1. **Use Environment Variables**: Consider using environment variables for sensitive data
2. **Enable Encryption**: Implement database encryption for stored passwords
3. **Monitor Logs**: Set up log monitoring for email delivery issues
4. **Backup Configuration**: Include email settings in your backup strategy

## API Endpoints

The system provides these email-related API endpoints:

- `GET /api/email/settings` - Retrieve current email settings
- `PUT /api/email/settings` - Update email settings
- `GET /api/email/status` - Check email configuration status
- `POST /api/email/test` - Send test email
- `GET /api/email/summary` - Send daily summary email

## Support

If you encounter issues:

1. Check the server logs for detailed error messages
2. Verify your email provider's SMTP settings
3. Test with a simple email client first
4. Contact your IT administrator for corporate email settings

## Next Steps

After setting up email notifications:

1. **Test thoroughly** with different alert types
2. **Configure recipients** based on your organization's needs
3. **Set up monitoring** to ensure emails are being delivered
4. **Train users** on acknowledging alerts to reduce email volume
5. **Consider scheduling** daily summary emails for management reports