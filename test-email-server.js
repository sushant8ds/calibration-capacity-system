// Simple test server to verify email functionality
require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3003;

app.use(express.json());

// Test email endpoint
app.post('/test-email', async (req, res) => {
  console.log('📧 Testing email functionality...');
  
  try {
    // Get email config from environment variables
    const emailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASSWORD,
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: process.env.EMAIL_TO
    };
    
    console.log('📧 Email config:', {
      host: emailConfig.host,
      port: emailConfig.port,
      user: emailConfig.user,
      password: emailConfig.password ? `${emailConfig.password.substring(0,4)}****${emailConfig.password.substring(emailConfig.password.length-4)}` : 'NOT SET',
      to: emailConfig.to
    });
    
    if (!emailConfig.user || !emailConfig.password || !emailConfig.to) {
      throw new Error(`Email configuration incomplete: user=${!!emailConfig.user}, password=${!!emailConfig.password}, to=${!!emailConfig.to}`);
    }
    
    console.log('📧 Creating transporter with auth...');
    
    // Create transporter with more detailed configuration
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Use Gmail service instead of manual SMTP
      auth: {
        user: emailConfig.user,
        pass: emailConfig.password
      }
    });
    
    console.log('📧 Verifying SMTP connection...');
    
    // Verify the connection first
    await transporter.verify();
    console.log('📧 ✅ SMTP connection verified successfully!');
    
    // Generate email content
    const subject = '🧪 Test Email from Calibration System';
    const html = `
      <h2>🧪 Test Email from Calibration System</h2>
      <p><strong>Message:</strong> This is a test email to verify the email system is working correctly!</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>From:</strong> ${emailConfig.from}</p>
      <p><strong>To:</strong> ${emailConfig.to}</p>
      <p>✅ If you received this email, the notification system is working perfectly!</p>
    `;
    
    console.log('📧 Sending email...');
    
    // Send email
    const info = await transporter.sendMail({
      from: emailConfig.from,
      to: emailConfig.to,
      subject: subject,
      html: html
    });
    
    console.log('📧 ✅ EMAIL SENT SUCCESSFULLY!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Email delivered to:', emailConfig.to);
    
    res.json({ 
      success: true, 
      message: 'Email sent successfully!',
      messageId: info.messageId,
      recipient: emailConfig.to,
      subject: subject
    });
    
  } catch (error) {
    console.error('📧 ❌ Email sending failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Email test server is running' });
});

// Simple HTML page for testing
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Email Test Server</title></head>
      <body>
        <h1>📧 Email Test Server</h1>
        <p>Click the button below to test email functionality:</p>
        <button onclick="testEmail()">Send Test Email</button>
        <div id="result"></div>
        
        <script>
          async function testEmail() {
            const result = document.getElementById('result');
            result.innerHTML = '<p>Sending email...</p>';
            
            try {
              const response = await fetch('/test-email', { method: 'POST' });
              const data = await response.json();
              
              if (data.success) {
                result.innerHTML = '<p style="color: green;">✅ ' + data.message + '</p><p>Message ID: ' + data.messageId + '</p>';
              } else {
                result.innerHTML = '<p style="color: red;">❌ ' + data.error + '</p>';
              }
            } catch (error) {
              result.innerHTML = '<p style="color: red;">❌ Error: ' + error.message + '</p>';
            }
          }
        </script>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log('🚀 Email Test Server running on port', PORT);
  console.log('📊 Open: http://localhost:' + PORT);
  console.log('✅ Server is ready!');
});