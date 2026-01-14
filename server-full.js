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

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
console.log('📦 Initializing database...');
const database = new Database();

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

// WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('📡 WebSocket client connected');
  ws.send(JSON.stringify({ type: 'connected', message: 'Real-time updates active' }));
  
  ws.on('close', () => {
    console.log('📡 WebSocket client disconnected');
  });
});

// Broadcast function
global.broadcast = (data) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

console.log('📡 WebSocket server initialized');
