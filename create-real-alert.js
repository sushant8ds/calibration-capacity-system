// Create a real calibration alert and send email
const fetch = require('node-fetch');

async function createRealAlert() {
  try {
    console.log('🚨 Creating real calibration alert...');
    
    // Create a gauge with overdue calibration
    const gaugeData = {
      gauge_id: 'URGENT-001',
      gauge_type: 'Pressure Gauge',
      location: 'Production Line A',
      last_calibration_date: '2023-01-15',
      calibration_interval_months: 12,
      next_calibration_date: '2024-01-15',
      status: 'overdue',
      capacity_percentage: 95,
      notes: 'URGENT: Critical pressure gauge requires immediate calibration - safety risk!',
      last_modified_by: 'System Alert Generator'
    };
    
    console.log('📊 Creating gauge with overdue calibration...');
    
    // Create the gauge (this will automatically generate alerts)
    const response = await fetch('http://localhost:3004/api/gauges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gaugeData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Gauge created successfully!');
      console.log('📧 Alert emails should be sent automatically!');
      console.log('🎯 Gauge ID:', result.data.gauge_id);
      console.log('⚠️ Status:', result.data.status);
      console.log('📅 Days overdue:', result.data.days_until_calibration);
    } else {
      console.error('❌ Failed to create gauge:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error creating alert:', error.message);
  }
}

// Run the alert creation
createRealAlert();