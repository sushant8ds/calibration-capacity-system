const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3002;

// Serve static files
app.use(express.static('.'));

// Download endpoint for Excel file
app.get('/download/test-50-gauges.xlsx', (req, res) => {
  const filePath = path.join(__dirname, 'test-50-gauges.xlsx');
  
  if (fs.existsSync(filePath)) {
    res.download(filePath, 'test-50-gauges.xlsx', (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).send('Error downloading file');
      }
    });
  } else {
    res.status(404).send('File not found');
  }
});

// Download endpoint for CSV file
app.get('/download/test-50-gauges.csv', (req, res) => {
  const filePath = path.join(__dirname, 'test-50-gauges.csv');
  
  if (fs.existsSync(filePath)) {
    res.download(filePath, 'test-50-gauges.csv', (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).send('Error downloading file');
      }
    });
  } else {
    res.status(404).send('File not found');
  }
});

// Simple download page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Download Test Files</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .download-btn { 
                display: inline-block; 
                padding: 12px 24px; 
                margin: 10px; 
                background: #007bff; 
                color: white; 
                text-decoration: none; 
                border-radius: 5px; 
                font-size: 16px;
            }
            .download-btn:hover { background: #0056b3; }
            .info { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <h1>📊 Calibration System Test Files</h1>
        
        <div class="info">
            <h3>Available Downloads:</h3>
            <p><strong>50-Gauge Test Dataset</strong> - Comprehensive test data with various gauge types and scenarios</p>
        </div>
        
        <h2>Download Files:</h2>
        <a href="/download/test-50-gauges.xlsx" class="download-btn">
            📥 Download Excel File (.xlsx)
        </a>
        
        <a href="/download/test-50-gauges.csv" class="download-btn">
            📥 Download CSV File (.csv)
        </a>
        
        <div class="info">
            <h3>File Details:</h3>
            <ul>
                <li><strong>Rows:</strong> 50 gauge records + header</li>
                <li><strong>Columns:</strong> 8 required fields</li>
                <li><strong>Gauge Types:</strong> Pressure, Temperature, Flow, Level, Vibration, Torque</li>
                <li><strong>Test Scenarios:</strong> Safe, Near Limit, Calibration Required, Overdue</li>
            </ul>
        </div>
        
        <div class="info">
            <h3>How to Use:</h3>
            <ol>
                <li>Download the Excel file (.xlsx recommended)</li>
                <li>Start your calibration system: <code>npm start</code></li>
                <li>Go to <a href="http://localhost:3001">http://localhost:3001</a></li>
                <li>Upload the downloaded file</li>
                <li>Test all system features with the 50 gauge dataset</li>
            </ol>
        </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Download server running at http://localhost:${PORT}`);
  console.log('Available downloads:');
  console.log(`- Excel: http://localhost:${PORT}/download/test-50-gauges.xlsx`);
  console.log(`- CSV: http://localhost:${PORT}/download/test-50-gauges.csv`);
});