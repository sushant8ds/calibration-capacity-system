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
const crypto = require('crypto');

// Simple token store (in-memory)
const activeSessions = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Default admin credentials
const DEFAULT_USERS = [
  { user_id: 'admin', username: 'admin', password: 'admin123', role: 'admin', email: 'admin@system.local', first_name: 'System', last_name: 'Administrator' }
];

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

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = DEFAULT_USERS.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid username or password' });
  }
  const token = generateToken();
  activeSessions.set(token, user);
  const { password: _, ...safeUser } = user;
  res.json({ success: true, data: { token, user: safeUser } });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const { password: _, ...safeUser } = activeSessions.get(token);
  res.json({ success: true, data: safeUser });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) activeSessions.delete(token);
  res.json({ success: true });
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

// Dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
  db.all('SELECT * FROM gauge_profiles', (err, gauges) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    db.all('SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY created_at DESC LIMIT 10', (err2, alerts) => {
      if (err2) return res.status(500).json({ success: false, error: err2.message });
      const today = new Date();
      const stats = { total_gauges: gauges.length, safe_count: 0, near_limit_count: 0, calibration_required_count: 0, overdue_count: 0, recent_alerts: alerts, upcoming_calibrations: [] };
      gauges.forEach(g => {
        const days = g.next_calibration_date ? Math.ceil((new Date(g.next_calibration_date) - today) / 86400000) : 999;
        if (days < 0) stats.overdue_count++;
        else if (days <= 30) stats.calibration_required_count++;
        else if (days <= 90) stats.near_limit_count++;
        else stats.safe_count++;
      });
      res.json({ success: true, data: stats });
    });
  });
});

// Upload/import Excel
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
app.post('/api/upload/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  try {
    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    const now = new Date().toISOString();
    const stats = { total_rows: rows.length, inserted: 0, skipped: 0, errors: [] };
    const stmt = db.prepare(`INSERT OR IGNORE INTO gauge_profiles (gauge_id, gauge_type, location, last_calibration_date, calibration_interval_months, next_calibration_date, capacity_percentage, notes, last_modified_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    rows.forEach((row, i) => {
      const id = row.gauge_id || row['Gauge ID'] || row['gauge_id'];
      if (!id) { stats.errors.push(`Row ${i+2}: missing gauge_id`); return; }
      stmt.run([id, row.gauge_type||row['Gauge Type']||'', row.location||row['Location']||'', row.last_calibration_date||row['Last Calibration Date']||'', row.calibration_interval_months||row['Calibration Interval (Months)']||12, row.next_calibration_date||row['Next Calibration Date']||'', row.capacity_percentage||row['Capacity %']||0, row.notes||row['Notes']||'', 'Excel Import', now, now], function(err) {
        if (err) stats.errors.push(`Row ${i+2}: ${err.message}`);
        else if (this.changes > 0) stats.inserted++;
        else stats.skipped++;
      });
    });
    stmt.finalize(() => res.json({ success: true, message: 'Import successful', data: stats }));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload template download
app.get('/api/upload/template', (req, res) => {
  try {
    const XLSX = require('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([['gauge_id','gauge_type','location','last_calibration_date','calibration_interval_months','next_calibration_date','capacity_percentage','notes'],['GAUGE-001','Pressure','Lab A','2024-01-01',12,'2025-01-01',75,'Sample gauge']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gauges');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="gauge-import-template.xlsx"');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve React frontend
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
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
