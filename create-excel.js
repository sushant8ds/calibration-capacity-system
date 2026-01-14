const XLSX = require('xlsx');
const fs = require('fs');

// Read the CSV data
const csvData = fs.readFileSync('test-50-gauges.csv', 'utf8');
const lines = csvData.trim().split('\n');
const headers = lines[0].split(',');

// Convert to array of objects
const data = lines.slice(1).map(line => {
  const values = line.split(',');
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = values[index];
  });
  return obj;
});

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(data);

// Set column widths for better readability
const columnWidths = [
  { wch: 15 }, // Gauge ID
  { wch: 20 }, // Gauge Type
  { wch: 25 }, // Calibration frequency
  { wch: 20 }, // Last calibration date
  { wch: 15 }, // Monthly usage
  { wch: 18 }, // Produced quantity
  { wch: 18 }, // Maximum capacity
  { wch: 20 }  // Last modified by
];
worksheet['!cols'] = columnWidths;

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Gauge Profiles');

// Write to Excel file
XLSX.writeFile(workbook, 'test-50-gauges.xlsx');
console.log('Excel file created: test-50-gauges.xlsx');