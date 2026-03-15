#!/bin/bash
echo "🚨 Creating real calibration alert..."

curl -X POST http://localhost:3004/api/gauges \
  -H "Content-Type: application/json" \
  -d '{
    "gauge_id": "URGENT-001",
    "gauge_type": "Pressure Gauge", 
    "location": "Production Line A",
    "last_calibration_date": "2023-01-15",
    "calibration_interval_months": 12,
    "next_calibration_date": "2024-01-15", 
    "status": "overdue",
    "capacity_percentage": 95,
    "notes": "URGENT: Critical pressure gauge requires immediate calibration - safety risk!",
    "last_modified_by": "System Alert Generator"
  }'

echo ""
echo "✅ Alert created! Check your email at 01fe23bcs086@kletech.ac.in"