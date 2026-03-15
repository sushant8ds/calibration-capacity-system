// Simplified server for deployment without TypeScript compilation
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const { Resend } = require('resend');
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
  user: 'sushantds2003@gmail.com',
  from: 'onboarding@resend.dev',
  to: 'sushantds2003@gmail.com',
  resendApiKey: process.env.RESEND_API_KEY || ''
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
  db.run(`CREATE TABLE IF NOT EXISTS gauge_profiles (
    gauge_id TEXT PRIMARY KEY,
    gauge_type TEXT,
    calibration_frequency INTEGER,
    last_calibration_date TEXT,
    monthly_usage REAL,
    produced_quantity REAL,
    max_capacity REAL,
    remaining_capacity REAL,
    capacity_percentage REAL,
    status TEXT,
    next_calibration_date TEXT,
    location TEXT,
    notes TEXT,
    last_modified_by TEXT,
    created_at TEXT,
    updated_at TEXT
  )`);

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

  // Persist recipients in a simple table
  db.run(`CREATE TABLE IF NOT EXISTS email_recipients (
    email TEXT PRIMARY KEY
  )`);

  // Seed default recipient if table is empty
  db.get('SELECT COUNT(*) as cnt FROM email_recipients', (err, row) => {
    if (!err && row.cnt === 0) {
      db.run('INSERT OR IGNORE INTO email_recipients (email) VALUES (?)', [EMAIL_CONFIG.to]);
    }
  });

  // Migrate existing gauge_profiles table — silently ignore duplicate column errors
  const migrationCols = [
    'calibration_frequency INTEGER',
    'monthly_usage REAL',
    'produced_quantity REAL',
    'max_capacity REAL',
    'remaining_capacity REAL',
    'status TEXT'
  ];
  migrationCols.forEach(col => {
    db.run(`ALTER TABLE gauge_profiles ADD COLUMN ${col}`, (_err) => { /* ignore duplicate */ });
  });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads (single declaration)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Email service using Resend (works on Render free tier - uses HTTPS not SMTP)
async function sendEmail(alert) {
  try {
    if (!EMAIL_CONFIG.resendApiKey) {
      console.error('📧 ❌ RESEND_API_KEY not set');
      return { success: false, error: 'RESEND_API_KEY not configured. Add it in Render dashboard → Environment.' };
    }
    console.log('📧 Sending email via Resend...');
    const resend = new Resend(EMAIL_CONFIG.resendApiKey);

    // Load recipients from DB
    const toList = await new Promise((resolve) => {
      db.all('SELECT email FROM email_recipients', (err, rows) => {
        if (err || !rows || rows.length === 0) resolve([EMAIL_CONFIG.to]);
        else resolve(rows.map(r => r.email));
      });
    });

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: toList,
      subject: `⚠️ Calibration Alert: ${alert.gauge_id} - ${alert.type.toUpperCase()}`,
      html: `
        <h2>🚨 Calibration Alert</h2>
        <p><strong>Gauge ID:</strong> ${alert.gauge_id}</p>
        <p><strong>Alert Type:</strong> ${alert.type}</p>
        <p><strong>Severity:</strong> ${alert.severity}</p>
        <p><strong>Message:</strong> ${alert.message}</p>
        <p><strong>Time:</strong> ${new Date(alert.created_at).toLocaleString()}</p>
        <p>Please take appropriate action to address this calibration issue.</p>
      `
    });

    if (error) {
      console.error('📧 ❌ Resend error:', error);
      return { success: false, error: error.message };
    }
    console.log('📧 ✅ EMAIL SENT via Resend:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('📧 ❌ Email sending failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ─── API ROUTES ───────────────────────────────────────────────────────────────

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
  if (!user) return res.status(401).json({ success: false, error: 'Invalid username or password' });
  const token = generateToken();
  activeSessions.set(token, user);
  const { password: _, ...safeUser } = user;
  res.json({ success: true, data: { token, user: safeUser } });
});

app.get('/api/auth/me', (req, res) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token || !activeSessions.has(token)) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const { password: _, ...safeUser } = activeSessions.get(token);
  res.json({ success: true, data: safeUser });
});

app.post('/api/auth/logout', (req, res) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (token) activeSessions.delete(token);
  res.json({ success: true });
});

// Test email
app.post('/api/email/test', async (req, res) => {
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
    res.json({ success: true, data: { success: true, message: 'Email sent successfully!' } });
  } else {
    res.json({ success: true, data: { success: false, message: `Failed: ${result.error}` } });
  }
});

// Gauges
app.get('/api/gauges', (req, res) => {
  db.all('SELECT * FROM gauge_profiles ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: rows });
  });
});

app.post('/api/gauges', (req, res) => {
  const now = new Date().toISOString();
  const f = calcGaugeFields(req.body);
  const profile = {
    gauge_id: req.body.gauge_id,
    gauge_type: req.body.gauge_type,
    location: req.body.location || '',
    last_calibration_date: f.lastCalStr,
    calibration_frequency: f.calibFreq,
    next_calibration_date: f.nextCalDate,
    produced_quantity: f.producedQty,
    max_capacity: f.maxCapacity,
    remaining_capacity: f.remaining,
    capacity_percentage: f.capacityPct,
    status: f.status,
    notes: req.body.notes || '',
    last_modified_by: req.body.last_modified_by || 'Web Interface',
    created_at: now,
    updated_at: now
  };

  db.run(`INSERT OR REPLACE INTO gauge_profiles 
    (gauge_id, gauge_type, location, last_calibration_date, calibration_frequency,
     next_calibration_date, produced_quantity, max_capacity, remaining_capacity,
     capacity_percentage, status, notes, last_modified_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [profile.gauge_id, profile.gauge_type, profile.location, profile.last_calibration_date,
     profile.calibration_frequency, profile.next_calibration_date, profile.produced_quantity,
     profile.max_capacity, profile.remaining_capacity, profile.capacity_percentage,
     profile.status, profile.notes, profile.last_modified_by, profile.created_at, profile.updated_at],
    function(err) {
      if (err) return res.status(500).json({ success: false, error: err.message });

      if (f.daysUntilCal < 0) {
        const alert = {
          id: uuidv4(),
          gauge_id: profile.gauge_id,
          type: 'calibration_overdue',
          severity: 'high',
          message: `Gauge ${profile.gauge_id} calibration is ${Math.abs(f.daysUntilCal)} days overdue`,
          created_at: now
        };
        db.run('INSERT OR IGNORE INTO alerts (id, gauge_id, type, severity, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [alert.id, alert.gauge_id, alert.type, alert.severity, alert.message, alert.created_at]);
        sendEmail(alert);
      }

      res.json({ success: true, data: profile });
    });
});

// Alerts
app.get('/api/alerts', (req, res) => {
  db.all('SELECT * FROM alerts ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: rows });
  });
});

// Dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
  db.all('SELECT * FROM gauge_profiles', (err, gauges) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    db.all('SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY created_at DESC LIMIT 10', (err2, alerts) => {
      if (err2) return res.status(500).json({ success: false, error: err2.message });
      const today = new Date();
      const stats = {
        total_gauges: gauges.length,
        safe_count: 0,
        near_limit_count: 0,
        calibration_required_count: 0,
        overdue_count: 0,
        recent_alerts: alerts,
        upcoming_calibrations: []
      };
      gauges.forEach(g => {
        const s = g.status || 'safe';
        if (s === 'overdue') stats.overdue_count++;
        else if (s === 'calibration_required') stats.calibration_required_count++;
        else if (s === 'near_limit') stats.near_limit_count++;
        else stats.safe_count++;
      });
      res.json({ success: true, data: stats });
    });
  });
});

// Helper: calculate gauge status and derived fields
function calcGaugeFields(row) {
  const calibFreq = parseInt(row['Calibration frequency (months)'] || row.calibration_frequency || row['Calibration Interval (Months)'] || 12);
  const lastCalStr = row['Last calibration date'] || row.last_calibration_date || row['Last Calibration Date'] || '';
  const monthlyUsage = parseFloat(row['Monthly usage'] || row.monthly_usage || 0);
  const producedQty = parseFloat(row['Produced quantity'] || row.produced_quantity || 0);
  const maxCapacity = parseFloat(row['Maximum capacity'] || row.max_capacity || row['Max Capacity'] || 1);

  // Calculate next calibration date
  let nextCalDate = '';
  if (lastCalStr) {
    const lastCal = new Date(lastCalStr);
    if (!isNaN(lastCal.getTime())) {
      const next = new Date(lastCal);
      next.setMonth(next.getMonth() + calibFreq);
      nextCalDate = next.toISOString().split('T')[0];
    }
  }

  // Calculate remaining capacity and percentage
  const remaining = Math.max(0, maxCapacity - producedQty);
  const capacityPct = maxCapacity > 0 ? (producedQty / maxCapacity) * 100 : 0;

  // Calculate status
  const today = new Date();
  const daysUntilCal = nextCalDate ? Math.ceil((new Date(nextCalDate) - today) / 86400000) : 999;
  let status = 'safe';
  if (daysUntilCal < 0) status = 'overdue';
  else if (daysUntilCal <= 30) status = 'calibration_required';
  else if (capacityPct >= 80) status = 'near_limit';

  return { calibFreq, lastCalStr, monthlyUsage, producedQty, maxCapacity, remaining, capacityPct, nextCalDate, status, daysUntilCal };
}

// Excel import
app.post('/api/upload/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  try {
    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    const now = new Date().toISOString();
    const stats = { total_rows: rows.length, inserted: 0, updated: 0, skipped: 0, errors: [] };

    const stmt = db.prepare(`INSERT OR REPLACE INTO gauge_profiles 
      (gauge_id, gauge_type, calibration_frequency, last_calibration_date, monthly_usage,
       produced_quantity, max_capacity, remaining_capacity, capacity_percentage, status,
       next_calibration_date, location, notes, last_modified_by, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    rows.forEach((row, i) => {
      const id = row['Gauge ID'] || row.gauge_id;
      if (!id) { stats.errors.push(`Row ${i + 2}: missing Gauge ID`); return; }

      const f = calcGaugeFields(row);
      const modifiedBy = row['Last modified by'] || row.last_modified_by || 'Excel Import';

      stmt.run([
        id,
        row['Gauge Type'] || row.gauge_type || '',
        f.calibFreq,
        f.lastCalStr,
        f.monthlyUsage,
        f.producedQty,
        f.maxCapacity,
        f.remaining,
        f.capacityPct,
        f.status,
        f.nextCalDate,
        row.location || '',
        row.notes || '',
        modifiedBy,
        now, now
      ], function(err) {
        if (err) stats.errors.push(`Row ${i + 2}: ${err.message}`);
        else if (this.changes > 0) stats.inserted++;
        else stats.skipped++;
      });

      // Create alert if overdue
      if (f.daysUntilCal < 0) {
        const alert = {
          id: uuidv4(),
          gauge_id: id,
          type: 'calibration_overdue',
          severity: 'high',
          message: `Gauge ${id} calibration is ${Math.abs(f.daysUntilCal)} days overdue`,
          created_at: now
        };
        db.run('INSERT OR IGNORE INTO alerts (id, gauge_id, type, severity, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [alert.id, alert.gauge_id, alert.type, alert.severity, alert.message, alert.created_at]);
        sendEmail(alert);
      }
    });

    stmt.finalize(() => res.json({ success: true, message: 'Import successful', data: stats }));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete gauge
app.delete('/api/gauges/:id', (req, res) => {
  db.run('DELETE FROM gauge_profiles WHERE gauge_id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

// Update gauge
app.put('/api/gauges/:id', (req, res) => {
  const now = new Date().toISOString();
  const f = calcGaugeFields(req.body);
  const g = req.body;
  db.run(`UPDATE gauge_profiles SET gauge_type=?, location=?, last_calibration_date=?, calibration_frequency=?, next_calibration_date=?, produced_quantity=?, max_capacity=?, remaining_capacity=?, capacity_percentage=?, status=?, notes=?, last_modified_by=?, updated_at=? WHERE gauge_id=?`,
    [g.gauge_type, g.location || '', f.lastCalStr, f.calibFreq, f.nextCalDate, f.producedQty, f.maxCapacity, f.remaining, f.capacityPct, f.status, g.notes || '', g.last_modified_by || 'Web Interface', now, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true });
    });
});

// Acknowledge alert
app.put('/api/alerts/:id/acknowledge', (req, res) => {
  db.run('UPDATE alerts SET acknowledged = 1 WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

// Export Excel
app.get('/api/export/excel', (req, res) => {
  db.all('SELECT * FROM gauge_profiles', (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    try {
      const XLSX = require('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Gauges');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="gauge-profiles-${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buf);
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
});

// Admin thresholds (simple in-memory store)
let thresholds = { near_limit_percentage: 80, calibration_warning_months: 1 };
app.get('/api/admin/thresholds', (req, res) => res.json({ success: true, data: thresholds }));
app.put('/api/admin/thresholds', (req, res) => {
  thresholds = { ...thresholds, ...req.body };
  res.json({ success: true, data: thresholds });
});

// Admin reset
app.post('/api/admin/reset', (req, res) => {
  db.serialize(() => {
    db.run('DELETE FROM gauge_profiles');
    db.run('DELETE FROM alerts', () => res.json({ success: true }));
  });
});


// Email status
app.get('/api/email/status', (req, res) => {
  db.all('SELECT email FROM email_recipients', (err, rows) => {
    const recipients = rows ? rows.map(r => r.email).join(', ') : EMAIL_CONFIG.to;
    const hasKey = !!EMAIL_CONFIG.resendApiKey;
    res.json({ success: true, data: { success: hasKey, config: { user: EMAIL_CONFIG.user, recipients }, message: hasKey ? 'Email configured' : 'RESEND_API_KEY not set in Render environment' } });
  });
});

// Email settings
app.get('/api/email/settings', (req, res) => {
  res.json({ success: true, data: { enabled: 1, smtp_host: 'resend.com (HTTPS)', smtp_port: 443, smtp_user: EMAIL_CONFIG.user, from_email: EMAIL_CONFIG.from } });
});
app.put('/api/email/settings', (req, res) => res.json({ success: true }));

// Email recipients - DB-persisted
app.get('/api/email/recipients', (req, res) => {
  db.all('SELECT email FROM email_recipients', (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: rows.map(r => r.email) });
  });
});
app.post('/api/email/recipients', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ success: false, error: 'Invalid email' });
  db.run('INSERT OR IGNORE INTO email_recipients (email) VALUES (?)', [email], function(err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    db.all('SELECT email FROM email_recipients', (_e, rows) => {
      res.json({ success: true, data: rows ? rows.map(r => r.email) : [] });
    });
  });
});
app.delete('/api/email/recipients/:email', (req, res) => {
  const email = decodeURIComponent(req.params.email);
  db.run('DELETE FROM email_recipients WHERE email = ?', [email], function(err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    db.all('SELECT email FROM email_recipients', (_e, rows) => {
      res.json({ success: true, data: rows ? rows.map(r => r.email) : [] });
    });
  });
});

// Email summary
app.get('/api/email/summary', async (req, res) => {
  const alert = { id: 'summary-' + Date.now(), gauge_id: 'SYSTEM', type: 'daily_summary', severity: 'low', message: 'Daily summary report', created_at: new Date().toISOString() };
  const result = await sendEmail(alert);
  res.json({ success: true, data: { message: result.success ? 'Summary sent!' : result.error } });
});

// Excel template download
app.get('/api/upload/template', (req, res) => {
  try {
    const XLSX = require('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([
      ['gauge_id', 'gauge_type', 'location', 'last_calibration_date', 'calibration_interval_months', 'next_calibration_date', 'capacity_percentage', 'notes'],
      ['GAUGE-001', 'Pressure', 'Lab A', '2024-01-01', 12, '2025-01-01', 75, 'Sample gauge']
    ]);
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

// ─── SERVE VANILLA JS FRONTEND ───────────────────────────────────────────────
// NOTE: This must come AFTER all API routes
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Capacity Management System running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
  console.log(`💾 Database: SQLite (capacity_system.db)`);
  console.log(`📧 Email: Configured and Ready`);
  console.log(`✅ Server is ready!`);
});

// WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

console.log('📡 WebSocket server initialized on path /ws');

// Verify Resend API key on startup
(async () => {
  if (!EMAIL_CONFIG.resendApiKey) {
    console.error('📧 ❌ RESEND_API_KEY env var not set - email will not work');
  } else {
    console.log('📧 ✅ Resend API key configured - email ready');
  }
})();

wss.on('connection', (ws) => {
  console.log('📡 WebSocket client connected');
  ws.send(JSON.stringify({ type: 'connected', message: 'Real-time updates active' }));
  ws.on('close', () => console.log('📡 WebSocket client disconnected'));
  ws.on('error', (err) => console.error('📡 WebSocket error:', err));
});
