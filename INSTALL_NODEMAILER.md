# How to Install Nodemailer

## Method 1: Using npm (Recommended)

1. **Open Terminal/Command Prompt**
2. **Navigate to the capacity-system folder**:
   ```bash
   cd /Users/sushant/Desktop/NEW\ DANA\ /capacity-system
   ```
3. **Install nodemailer**:
   ```bash
   npm install nodemailer
   ```
4. **Restart the server**:
   ```bash
   npm start
   ```

## Method 2: Using yarn (Alternative)

1. **Open Terminal/Command Prompt**
2. **Navigate to the capacity-system folder**:
   ```bash
   cd /Users/sushant/Desktop/NEW\ DANA\ /capacity-system
   ```
3. **Install nodemailer**:
   ```bash
   yarn add nodemailer
   ```
4. **Restart the server**:
   ```bash
   npm start
   ```

## Method 3: Check if npm is available

Run this command to check if npm is working:
```bash
npm --version
```

If npm is not available, you may need to install Node.js from: https://nodejs.org/

## After Installation

Once nodemailer is installed:

1. **Update your .env file** with your Gmail App Password
2. **Restart the server**
3. **Test the email functionality** - it should now send real emails instead of just logging them

## Current Status

✅ Server is running on http://localhost:3002
✅ Email configuration is set up correctly
⚠️ Nodemailer needs to be installed for actual email sending
✅ Fallback logging is working (emails are logged to console)

## Gmail App Password Setup

Don't forget to:
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password for "Mail"
3. Update the EMAIL_PASSWORD in your .env file with the 16-character App Password