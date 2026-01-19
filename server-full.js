// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { Database } = require('./dist/database/Database');
const { ExcelProcessor } = require('./dist/services/ExcelProcessor');
const { CapacityManager } = require('./dist/services/CapacityManager');
const { AlertManager } = require('./dist/services/AlertManager');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const EmailService = require('./email-service');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
console.log('📦 Initializing database...');
const database = new Database();
const emailService = new EmailService(database);

// Debug email configuration
console.log('📧 Email configuration:');
console.log(`  EMAIL_ENABLED: ${process.env.EMAIL_ENABLED}`);
console.log(`  EMAIL_HOST: ${process.env.EMAIL_HOST}`);
console.log(`  EMAIL_USER: ${process.env.EMAIL_USER}`);
console.log(`  EMAIL_TO: ${process.env.EMAIL_TO}`);

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

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Calibration & Production Capacity Management System',
    database: 'SQLite'
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Calibration & Production Capacity Management API',
    version: '1.0.0',
    status: 'Production Ready'
  });
});

// Upload endpoint
app.post('/api/upload/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    console.log(`📤 Processing upload: ${req.file.originalname}`);

    // Validate file
    const validation = ExcelProcessor.validateExcelFile(req.file.buffer);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: validation.errors });
    }

    // Parse Excel data
    const parseResult = ExcelProcessor.parseExcelData(req.file.buffer);
    if (parseResult.errors.length > 0 && parseResult.profiles.length === 0) {
      return res.status(400).json({ success: false, error: 'Parse failed', details: parseResult.errors });
    }

    const stats = { total_rows: parseResult.profiles.length, inserted: 0, updated: 0, skipped: 0, errors: [] };
    const now = new Date().toISOString();
    const thresholds = await database.getCapacityThresholds();

    // Process each profile
    for (const profile of parseResult.profiles) {
      try {
        const existing = await database.getGaugeProfileById(profile.gauge_id);
        
        if (existing) {
          stats.skipped++;
        } else {
          profile.last_modified_by = 'Excel Import';
          profile.created_at = now;
          profile.updated_at = now;
          await database.createGaugeProfile(profile);
          
          // Create audit entry
          await database.createAuditEntry({
            id: uuidv4(),
            gauge_id: profile.gauge_id,
            action: 'create',
            new_values: profile,
            user: 'Excel Import',
            timestamp: now
          });

          // Generate alerts
          const alerts = AlertManager.generateAlertsForGauge(profile, thresholds);
          for (const alert of alerts) {
            await database.createAlert(alert);
            
            // Send email notification for new alert
            try {
              const emailResult = await emailService.sendAlert(alert);
              if (emailResult.success) {
                console.log(`📧 Email notification sent for alert ${alert.id}`);
              }
            } catch (emailError) {
              console.error('📧 Email notification failed:', emailError.message);
            }
          }

          stats.inserted++;
        }
      } catch (error) {
        stats.errors.push(`${profile.gauge_id}: ${error.message}`);
      }
    }

    console.log(`✅ Import complete: ${stats.inserted} inserted, ${stats.skipped} skipped`);
    res.json({ success: true, message: 'Import successful', data: stats });
  } catch (error) {
    console.error('❌ Import error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all gauges
app.get('/api/gauges', async (req, res) => {
  try {
    const profiles = await database.getAllGaugeProfiles();
    const thresholds = await database.getCapacityThresholds();
    
    const enriched = profiles.map(p => CapacityManager.enrichGaugeProfile(p, thresholds));
    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new gauge
app.post('/api/gauges', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const profile = {
      ...req.body,
      created_at: now,
      updated_at: now
    };

    await database.createGaugeProfile(profile);

    // Create audit entry
    await database.createAuditEntry({
      id: uuidv4(),
      gauge_id: profile.gauge_id,
      action: 'create',
      new_values: profile,
      user: req.body.last_modified_by || 'System',
      timestamp: now
    });

    // Generate alerts
    const thresholds = await database.getCapacityThresholds();
    const alerts = AlertManager.generateAlertsForGauge(profile, thresholds);
    for (const alert of alerts) {
      await database.createAlert(alert);
      
      // Send email notification for new alert
      try {
        const emailResult = await emailService.sendAlert(alert);
        if (emailResult.success) {
          console.log(`📧 Email notification sent for alert ${alert.id}`);
        }
      } catch (emailError) {
        console.error('📧 Email notification failed:', emailError.message);
      }
    }

    const enriched = CapacityManager.enrichGaugeProfile(profile, thresholds);
    
    // Broadcast creation
    if (global.broadcast) {
      global.broadcast({ type: 'gauge_created', data: enriched });
    }

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single gauge
app.get('/api/gauges/:id', async (req, res) => {
  try {
    const profile = await database.getGaugeProfileById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Gauge not found' });
    }
    const thresholds = await database.getCapacityThresholds();
    const enriched = CapacityManager.enrichGaugeProfile(profile, thresholds);
    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update gauge
app.put('/api/gauges/:id', async (req, res) => {
  try {
    const existing = await database.getGaugeProfileById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Gauge not found' });
    }

    const updates = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    await database.updateGaugeProfile(req.params.id, updates);

    // Create audit entry
    await database.createAuditEntry({
      id: uuidv4(),
      gauge_id: req.params.id,
      action: 'update',
      old_values: existing,
      new_values: updates,
      user: req.body.last_modified_by || 'System',
      timestamp: updates.updated_at
    });

    // Regenerate alerts
    const thresholds = await database.getCapacityThresholds();
    const updated = await database.getGaugeProfileById(req.params.id);
    const alerts = AlertManager.generateAlertsForGauge(updated, thresholds);
    
    // Delete old alerts for this gauge
    const oldAlerts = await database.getAllAlerts();
    for (const alert of oldAlerts) {
      if (alert.gauge_id === req.params.id) {
        await database.deleteAlert(alert.id);
      }
    }
    
    // Create new alerts
    for (const alert of alerts) {
      await database.createAlert(alert);
      
      // Send email notification for new alert
      try {
        const emailResult = await emailService.sendAlert(alert);
        if (emailResult.success) {
          console.log(`📧 Email notification sent for alert ${alert.id}`);
        }
      } catch (emailError) {
        console.error('📧 Email notification failed:', emailError.message);
      }
    }

    const enriched = CapacityManager.enrichGaugeProfile(updated, thresholds);
    
    // Broadcast update
    if (global.broadcast) {
      global.broadcast({ type: 'gauge_updated', data: enriched });
    }

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete gauge
app.delete('/api/gauges/:id', async (req, res) => {
  try {
    const existing = await database.getGaugeProfileById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Gauge not found' });
    }

    await database.deleteGaugeProfile(req.params.id);

    // Create audit entry
    await database.createAuditEntry({
      id: uuidv4(),
      gauge_id: req.params.id,
      action: 'delete',
      old_values: existing,
      user: 'System',
      timestamp: new Date().toISOString()
    });

    // Delete associated alerts
    const alerts = await database.getAllAlerts();
    for (const alert of alerts) {
      if (alert.gauge_id === req.params.id) {
        await database.deleteAlert(alert.id);
      }
    }

    // Broadcast deletion
    if (global.broadcast) {
      global.broadcast({ type: 'gauge_deleted', data: { gauge_id: req.params.id } });
    }

    res.json({ success: true, message: 'Gauge deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const profiles = await database.getAllGaugeProfiles();
    const alerts = await database.getAllAlerts();
    const thresholds = await database.getCapacityThresholds();
    
    const stats = {
      total_gauges: profiles.length,
      safe_count: 0,
      near_limit_count: 0,
      calibration_required_count: 0,
      overdue_count: 0,
      recent_alerts: alerts.filter(a => !a.acknowledged).slice(0, 10)
    };

    profiles.forEach(profile => {
      const enriched = CapacityManager.enrichGaugeProfile(profile, thresholds);
      switch (enriched.status) {
        case 'safe': stats.safe_count++; break;
        case 'near_limit': stats.near_limit_count++; break;
        case 'calibration_required': stats.calibration_required_count++; break;
        case 'overdue': stats.overdue_count++; break;
      }
    });

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await database.getAllAlerts();
    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Acknowledge alert
app.put('/api/alerts/:id/acknowledge', async (req, res) => {
  try {
    console.log(`📢 Acknowledging alert: ${req.params.id}`);
    await database.acknowledgeAlert(req.params.id);
    console.log(`✅ Alert acknowledged successfully: ${req.params.id}`);
    
    // Broadcast acknowledgment
    if (global.broadcast) {
      global.broadcast({ type: 'alert_acknowledged', data: { alert_id: req.params.id } });
    }
    
    res.json({ success: true, message: 'Alert acknowledged' });
  } catch (error) {
    console.error(`❌ Error acknowledging alert ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export to Excel
app.get('/api/export/excel', async (req, res) => {
  try {
    const profiles = await database.getAllGaugeProfiles();
    const thresholds = await database.getCapacityThresholds();
    
    const enriched = profiles.map(p => CapacityManager.enrichGaugeProfile(p, thresholds));
    const buffer = ExcelProcessor.exportToExcel(enriched);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="gauge-export.xlsx"');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin endpoints
app.get('/api/admin/thresholds', async (req, res) => {
  try {
    const thresholds = await database.getCapacityThresholds();
    res.json({ success: true, data: thresholds });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/thresholds', async (req, res) => {
  try {
    await database.updateCapacityThresholds(req.body);
    res.json({ success: true, message: 'Thresholds updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/reset', async (req, res) => {
  try {
    await database.deleteAllGaugeProfiles();
    await database.deleteAllAlerts();
    
    // Broadcast reset
    if (global.broadcast) {
      global.broadcast({ type: 'system_reset', message: 'System has been reset' });
    }
    
    res.json({ success: true, message: 'System reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Email configuration endpoints
app.get('/api/email/status', async (req, res) => {
  try {
    const status = await emailService.testConnection();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/email/test', async (req, res) => {
  console.log('📧 Email test endpoint called');
  
  // Set a timeout for the response
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.log('📧 Email test timeout - sending timeout response');
      res.status(408).json({ 
        success: false, 
        error: 'Email test timed out after 30 seconds' 
      });
    }
  }, 30000);

  try {
    const testAlert = {
      id: 'test-' + Date.now(),
      gauge_id: 'TEST-001',
      type: 'test',
      severity: 'medium',
      message: 'This is a test email notification from the Calibration Management System',
      created_at: new Date().toISOString()
    };
    
    console.log('📧 Starting email test process');
    
    // Try to send email directly here instead of using email service
    try {
      console.log('📧 Attempting to require nodemailer');
      const nodemailer = require('nodemailer');
      console.log('📧 Nodemailer loaded successfully in server');
      console.log('📧 Available methods:', Object.keys(nodemailer));
      
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
      
      console.log('📧 Email config loaded:', {
        host: emailConfig.host,
        port: emailConfig.port,
        user: emailConfig.user ? 'SET' : 'NOT SET',
        password: emailConfig.password ? 'SET' : 'NOT SET',
        to: emailConfig.to
      });
      
      if (!emailConfig.user || !emailConfig.password || !emailConfig.to) {
        throw new Error(`Email configuration incomplete: user=${!!emailConfig.user}, password=${!!emailConfig.password}, to=${!!emailConfig.to}`);
      }
      
      console.log('📧 Creating transporter');
      // Create transporter
      const transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: {
          user: emailConfig.user,
          pass: emailConfig.password
        }
      });
      
      console.log('📧 Transporter created successfully');
      
      // Generate email content
      const subject = `⚠️ Calibration Alert: ${testAlert.gauge_id} - ${testAlert.type.toUpperCase()}`;
      const html = `
        <h2>🧪 Test Email from Calibration System</h2>
        <p><strong>Message:</strong> ${testAlert.message}</p>
        <p><strong>Alert ID:</strong> ${testAlert.id}</p>
        <p><strong>Time:</strong> ${new Date(testAlert.created_at).toLocaleString()}</p>
        <p>If you received this email, the notification system is working correctly!</p>
      `;
      
      console.log('📧 Attempting to send email');
      // Send email with timeout
      const info = await Promise.race([
        transporter.sendMail({
          from: emailConfig.from,
          to: emailConfig.to,
          subject: subject,
          html: html
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email sending timeout')), 25000)
        )
      ]);
      
      console.log('📧 EMAIL SENT SUCCESSFULLY:', info.messageId);
      clearTimeout(timeout);
      
      if (!res.headersSent) {
        res.json({ 
          success: true, 
          data: { 
            success: true, 
            message: 'Real email sent successfully!',
            messageId: info.messageId,
            recipient: emailConfig.to
          } 
        });
      }
      
    } catch (emailError) {
      console.error('📧 Direct email sending failed:', emailError.message);
      console.error('📧 Full error:', emailError);
      
      clearTimeout(timeout);
      
      if (!res.headersSent) {
        res.json({ 
          success: true, 
          data: { 
            success: false, 
            message: `Email sending failed: ${emailError.message}`,
            error: emailError.message
          } 
        });
      }
    }
  } catch (error) {
    console.error('📧 Email test endpoint error:', error);
    clearTimeout(timeout);
    
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

app.get('/api/email/summary', async (req, res) => {
  try {
    const alerts = await database.getAllAlerts();
    const pendingAlerts = alerts.filter(a => !a.acknowledged);
    
    const result = await emailService.sendDailySummary(pendingAlerts);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Email configuration endpoints
app.get('/api/email/config', async (req, res) => {
  try {
    const settings = await database.getEmailSettings();
    // Don't send password in response
    const safeSettings = { ...settings };
    delete safeSettings.smtp_password;
    res.json({ success: true, data: safeSettings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/email/config', async (req, res) => {
  try {
    const settings = req.body;
    await database.updateEmailSettings(settings);
    
    // Restart email service with new settings
    const newEmailService = new EmailService();
    
    res.json({ success: true, message: 'Email configuration updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Email settings management endpoints
app.get('/api/email/settings', async (req, res) => {
  try {
    const settings = await database.getEmailSettings();
    // Don't send password in response
    const safeSettings = { ...settings };
    delete safeSettings.smtp_password;
    res.json({ success: true, data: safeSettings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/email/settings', async (req, res) => {
  try {
    await database.updateEmailSettings(req.body);
    
    // Reinitialize email service with new settings
    const newEmailService = new EmailService(database);
    
    res.json({ success: true, message: 'Email settings updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Email recipient management endpoints
app.get('/api/email/recipients', async (req, res) => {
  try {
    const settings = await database.getEmailSettings();
    const recipients = settings.recipients ? settings.recipients.split(',').map(r => r.trim()).filter(r => r) : [];
    res.json({ success: true, data: recipients });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/email/recipients', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address required' });
    }
    
    const settings = await database.getEmailSettings();
    const currentRecipients = settings.recipients ? settings.recipients.split(',').map(r => r.trim()).filter(r => r) : [];
    
    if (currentRecipients.includes(email)) {
      return res.status(400).json({ success: false, error: 'Email already exists in recipients list' });
    }
    
    currentRecipients.push(email);
    const updatedSettings = { ...settings, recipients: currentRecipients.join(', ') };
    await database.updateEmailSettings(updatedSettings);
    
    res.json({ success: true, message: 'Recipient added successfully', data: currentRecipients });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/email/recipients/:email', async (req, res) => {
  try {
    const emailToRemove = decodeURIComponent(req.params.email);
    
    const settings = await database.getEmailSettings();
    const currentRecipients = settings.recipients ? settings.recipients.split(',').map(r => r.trim()).filter(r => r) : [];
    
    const updatedRecipients = currentRecipients.filter(email => email !== emailToRemove);
    const updatedSettings = { ...settings, recipients: updatedRecipients.join(', ') };
    await database.updateEmailSettings(updatedSettings);
    
    res.json({ success: true, message: 'Recipient removed successfully', data: updatedRecipients });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Start HTTP server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Capacity Management System running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
  console.log(`💾 Database: SQLite (capacity_system.db)`);
  console.log(`✅ Server is ready!`);
});

// WebSocket server setup
const wss = new WebSocket.Server({ 
  server,
  path: '/ws'
});

wss.on('connection', (ws, req) => {
  console.log('📡 WebSocket client connected from:', req.connection.remoteAddress);
  ws.send(JSON.stringify({ type: 'connected', message: 'Real-time updates active' }));
  
  ws.on('close', () => {
    console.log('📡 WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('📡 WebSocket error:', error);
  });
});

// Broadcast function
global.broadcast = (data) => {
  console.log('📡 Broadcasting to', wss.clients.size, 'clients:', data.type);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(data));
      } catch (error) {
        console.error('📡 Error broadcasting to client:', error);
      }
    }
  });
};

console.log('📡 WebSocket server initialized on path /ws');
