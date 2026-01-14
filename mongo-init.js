// MongoDB initialization script
db = db.getSiblingDB('capacity_management');

// Create application user
db.createUser({
  user: 'capacity_user',
  pwd: 'capacity_pass',
  roles: [
    {
      role: 'readWrite',
      db: 'capacity_management'
    }
  ]
});

// Create collections with indexes
db.createCollection('gauges');
db.createCollection('alerts');
db.createCollection('audit_logs');
db.createCollection('capacity_thresholds');
db.createCollection('users');

// Create indexes for better performance
db.gauges.createIndex({ "gauge_id": 1 }, { unique: true });
db.gauges.createIndex({ "status": 1 });
db.gauges.createIndex({ "next_calibration_date": 1 });

db.alerts.createIndex({ "gauge_id": 1 });
db.alerts.createIndex({ "status": 1 });
db.alerts.createIndex({ "created_at": -1 });

db.audit_logs.createIndex({ "gauge_id": 1 });
db.audit_logs.createIndex({ "timestamp": -1 });

db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });

// Insert default capacity thresholds
db.capacity_thresholds.insertOne({
  threshold_id: 'default',
  near_limit_percentage: 80,
  calibration_warning_days: 30,
  overdue_threshold_days: 0,
  created_at: new Date(),
  updated_at: new Date()
});

// Insert default admin user (password: admin123)
db.users.insertOne({
  user_id: 'admin',
  username: 'admin',
  email: 'admin@capacity.local',
  password_hash: '$2b$10$8K1p/a0dCVWHxqRtd8.K9.YNqYpZXvT8Q5/X5/X5/X5/X5/X5/X5/X5',
  role: 'admin',
  first_name: 'System',
  last_name: 'Administrator',
  created_at: new Date(),
  updated_at: new Date()
});

print('Database initialized successfully');