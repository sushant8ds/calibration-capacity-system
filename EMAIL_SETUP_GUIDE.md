# Email Notification Setup Guide

## Overview
This guide will help you set up email notifications for gauge calibration alerts.

## Prerequisites
1. A Gmail account (or any SMTP email service)
2. App Password for Gmail (if using Gmail)

## Step 1: Get Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Click on "Security" in the left sidebar
3. Enable "2-Step Verification" if not already enabled
4. Search for "App passwords" in the search bar
5. Click "App passwords"
6. Select "Mail" and "Other (Custom name)"
7. Enter "Calibration System" as the name
8. Click "Generate"
9. Copy the 16-character password (save it securely)

## Step 2: Configure Environment Variables

Create or update your `.env` file in the `capacity-system` folder:

```env
# Email Configuration
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password-here
EMAIL_FROM=your-email@gmail.com
EMAIL_TO=recipient@example.com

# You can add multiple recipients separated by commas
# EMAIL_TO=user1@example.com,user2@example.com,user3@example.com
```

## Step 3: Install Nodemailer

Run this command in the `capacity-system` folder:

```bash
npm install nodemailer
```

## Step 4: Restart the Server

After configuring the environment variables, restart your server:

```bash
node server-full.js
```

## Email Notification Features

Once configured, the system will automatically send emails when:

1. **New alerts are created** - When a gauge reaches critical capacity or calibration is overdue
2. **High severity alerts** - Immediate notification for critical issues
3. **Daily summary** - Optional daily digest of all pending alerts

## Email Content

Emails will include:
- Gauge ID and Type
- Alert severity (High/Medium/Low)
- Alert message
- Timestamp
- Direct link to the dashboard

## Troubleshooting

### Emails not sending?

1. **Check environment variables** - Make sure all EMAIL_* variables are set correctly
2. **Verify app password** - Gmail app passwords are 16 characters without spaces
3. **Check server logs** - Look for email-related error messages
4. **Test SMTP connection** - Try sending a test email from the settings page

### Using other email providers?

**Outlook/Hotmail:**
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

**Yahoo:**
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

**Custom SMTP:**
```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-username
EMAIL_PASSWORD=your-password
```

## Security Notes

- Never commit `.env` file to version control
- Use app-specific passwords, not your main account password
- Regularly rotate your email passwords
- Limit email recipients to authorized personnel only

## Support

For issues or questions, check the server logs or contact your system administrator.
