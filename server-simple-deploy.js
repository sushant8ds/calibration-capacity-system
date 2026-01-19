// Simplified server for deployment without TypeScript compilation
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 10000;

// Hardcoded email configuration for automatic deployment
const EMAIL_CONFIG = {
  enabled: true,
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  user: 'sushantds2003@gmail.com',
  password: 'cebuquciloqihhdo',
  from: 'sushantds2003@gmail.com',
  to: '01fe23bcs086@kletech.ac.in'
};

console.log('📦 Initializing database...');
console.log('📧 Email configuration:');
console.log(`  EMAIL_ENABLED: ${EMAIL_CONFIG.enabled}`);
console.log(`  EMAIL_HOST: ${EMAIL_CONFIG.host}`);
console.log(`  EMAIL_USER: ${EMAIL_CONFIG.user}`);
console.log(`  EMAIL_TO: ${EMAIL_CONFIG.to}`);

// Initialize SQLite database
const db = new sqlite3.Database('./capacity_system.db');

// Create tables
db.serialize(() => {
  // Gauge profiles table
  db.run(`CREATE TABLE IF NOT EXISTS gauge_profiles (
    gauge_id TEXT PRIMARY KEY,
    gauge_type TEXT,
    location TEXT,
    last_calibration_date TEXT,
    calibration_interval_months INTEGER,
    next_calibration_date TEXT,
    capacity_percentage REAL,
    notes TEXT,
    last_modified_by TEXT,
    created_at TEXT,
    updated_at TEXT
  )`);

  // Alerts table
  db.run(`CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    gauge_id TEXT,
    type TEXT,
    severity TEXT,
    message TEXT,
    acknowledged INTEGER DEFAULT 0,
    created_at TEXT,
    FOREIGN KEY (gauge_id) REFERENCES gauge_profiles (gauge_id)
  )`);

  // Email settings table
  db.run(`CREATE TABLE IF NOT EXISTS email_settings (
    id INTEGER PRIMARY KEY,
    enabled INTEGER DEFAULT 1,
    smtp_host TEXT DEFAULT 'smtp.gmail.com',
    smtp_port INTEGER DEFAULT 587,
    smtp_secure INTEGER DEFAULT 0,
    smtp_user TEXT,
    smtp_password TEXT,
    from_email TEXT,
    recipients TEXT,
    created_at TEXT,
    updated_at TEXT
  )`);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Email service
async function sendEmail(alert) {
  try {
    console.log('📧 Sending email notification...');
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_CONFIG.user,
        pass: EMAIL_CONFIG.password
      }
    });

    const subject = `⚠️ Calibration Alert: ${alert.gauge_id} - ${alert.type.toUpperCase()}`;
    const html = `
      <h2>🚨 Calibration Alert</h2>
      <p><strong>Gauge ID:</strong> ${alert.gauge_id}</p>
      <p><strong>Alert Type:</strong> ${alert.type}</p>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      <p><strong>Message:</strong> ${alert.message}</p>
      <p><strong>Time:</strong> ${new Date(alert.created_at).toLocaleString()}</p>
      <p>Please take appropriate action to address this calibration issue.</p>
    `;

    const info = await transporter.sendMail({
      from: EMAIL_CONFIG.from,
      to: EMAIL_CONFIG.to,
      subject: subject,
      html: html
    });

    console.log('📧 ✅ EMAIL SENT SUCCESSFULLY:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('📧 ❌ Email sending failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Calibration & Production Capacity Management System',
    database: 'SQLite',
    email: EMAIL_CONFIG.enabled ? 'Enabled' : 'Disabled'
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Calibration & Production Capacity Management API',
    version: '1.0.0',
    status: 'Production Ready',
    email: 'Configured and Ready'
  });
});

// Test email endpoint
app.post('/api/email/test', async (req, res) => {
  console.log('📧 Email test endpoint called');
  
  try {
    const testAlert = {
      id: 'test-' + Date.now(),
      gauge_id: 'TEST-001',
      type: 'test',
      severity: 'medium',
      message: 'This is a test email notification from the Calibration Management System',
      created_at: new Date().toISOString()
    };
    
    const result = await sendEmail(testAlert);
    
    if (result.success) {
      res.json({ 
        success: true, 
        data: { 
          success: true, 
          message: 'Email sent successfully!',
          messageId: result.messageId,
          recipient: EMAIL_CONFIG.to
        } 
      });
    } else {
      res.json({ 
        success: true, 
        data: { 
          success: false, 
          message: `Email sending failed: ${result.error}`,
          error: result.error
        } 
      });
    }
    
  } catch (error) {
    console.error('📧 Email test endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all gauges
app.get('/api/gauges', (req, res) => {
  db.all('SELECT * FROM gauge_profiles ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      res.json({ success: true, data: rows });
    }
  });
});

// Create new gauge
app.post('/api/gauges', (req, res) => {
  const now = new Date().toISOString();
  const profile = {
    gauge_id: req.body.gauge_id,
    gauge_type: req.body.gauge_type,
    location: req.body.location,
    last_calibration_date: req.body.last_calibration_date,
    calibration_interval_months: req.body.calibration_interval_months,
    next_calibration_date: req.body.next_calibration_date,
    capacity_percentage: req.body.capacity_percentage,
    notes: req.body.notes,
    last_modified_by: req.body.last_modified_by || 'System',
    created_at: now,
    updated_at: now
  };

  const stmt = db.prepare(`INSERT INTO gauge_profiles 
    (gauge_id, gauge_type, location, last_calibration_date, calibration_interval_months, 
     next_calibration_date, capacity_percentage, notes, last_modified_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  stmt.run([
    profile.gauge_id, profile.gauge_type, profile.location, profile.last_calibration_date,
    profile.calibration_interval_months, profile.next_calibration_date, profile.capacity_percentage,
    profile.notes, profile.last_modified_by, profile.created_at, profile.updated_at
  ], function(err) {
    if (err) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      // Check if alert needed
      const nextCalDate = new Date(profile.next_calibration_date);
      const today = new Date();
      const daysUntil = Math.ceil((nextCalDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntil <= 0) {
        // Create overdue alert
        const alert = {
          id: uuidv4(),
          gauge_id: profile.gauge_id,
          type: 'calibration_overdue',
          severity: 'high',
          message: `Gauge ${profile.gauge_id} calibration is ${Math.abs(daysUntil)} days overdue`,
          created_at: now
        };
        
        const alertStmt = db.prepare('INSERT INTO alerts (id, gauge_id, type, severity, message, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        alertStmt.run([alert.id, alert.gauge_id, alert.type, alert.severity, alert.message, alert.created_at]);
        alertStmt.finalize();
        
        // Send email notification
        sendEmail(alert);
      }
      
      res.json({ success: true, data: profile });
    }
  });
  
  stmt.finalize();
});

// Get alerts
app.get('/api/alerts', (req, res) => {
  db.all('SELECT * FROM alerts ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      res.json({ success: true, data: rows });
    }
  });
});

// Main page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Calibration Management System</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #333; text-align: center; }
          .status { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { background: #007cba; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
          .button:hover { background: #005a87; }
          .result { margin: 20px 0; padding: 15px; border-radius: 5px; }
          .success { background: #d4edda; color: #155724; }
          .error { background: #f8d7da; color: #721c24; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🧪 Calibration & Production Capacity Management System</h1>
          
          <div class="status">
            <h3>✅ System Status</h3>
            <p>📊 <strong>Database:</strong> SQLite Connected</p>
            <p>📧 <strong>Email:</strong> Gmail Configured (sushantds2003@gmail.com → 01fe23bcs086@kletech.ac.in)</p>
            <p>🚀 <strong>Server:</strong> Running on Port ${PORT}</p>
            <p>⏰ <strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div>
            <h3>🧪 Test Email System</h3>
            <button class="button" onclick="testEmail()">Send Test Email</button>
            <div id="emailResult"></div>
          </div>
          
          <div>
            <h3>📊 API Endpoints</h3>
            <p><strong>Health Check:</strong> <a href="/health">/health</a></p>
            <p><strong>API Info:</strong> <a href="/api">/api</a></p>
            <p><strong>Gauges:</strong> <a href="/api/gauges">/api/gauges</a></p>
            <p><strong>Alerts:</strong> <a href="/api/alerts">/api/alerts</a></p>
          </div>
        </div>
        
        <script>
          async function testEmail() {
            const result = document.getElementById('emailResult');
            result.innerHTML = '<p>Sending email...</p>';
            
            try {
              const response = await fetch('/api/email/test', { method: 'POST' });
              const data = await response.json();
              
              if (data.success && data.data.success) {
                result.innerHTML = '<div class="result success">✅ ' + data.data.message + '<br>Message ID: ' + data.data.messageId + '</div>';
              } else {
                result.innerHTML = '<div class="result error">❌ ' + (data.data.message || data.error) + '</div>';
              }
            } catch (error) {
              result.innerHTML = '<div class="result error">❌ Error: ' + error.message + '</div>';
            }
          }
        </script>
      </body>
    </html>
  `);
});

// Start HTTP server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Capacity Management System running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
  console.log(`💾 Database: SQLite (capacity_system.db)`);
  console.log(`📧 Email: Configured and Ready`);
  console.log(`✅ Server is ready!`);
});

// WebSocket server setup
const wss = new WebSocket.Server({ 
  server,
  path: '/ws'
});

wss.on('connection', (ws, req) => {
  console.log('📡 WebSocket client connected');
  ws.send(JSON.stringify({ type: 'connected', message: 'Real-time updates active' }));
  
  ws.on('close', () => {
    console.log('📡 WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('📡 WebSocket error:', error);
  });
});

console.log('📡 WebSocket server initialized on path /ws');
