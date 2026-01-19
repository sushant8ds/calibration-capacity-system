// Test if nodemailer can be required
console.log('Testing nodemailer import...');

try {
  const nodemailer = require('nodemailer');
  console.log('✅ Nodemailer imported successfully!');
  console.log('Available methods:', Object.keys(nodemailer));
} catch (error) {
  console.log('❌ Failed to import nodemailer:', error.message);
  
  // Try alternative paths
  console.log('Trying alternative paths...');
  
  try {
    const nodemailer = require('./node_modules/nodemailer');
    console.log('✅ Nodemailer found in ./node_modules/nodemailer');
  } catch (error2) {
    console.log('❌ Not found in ./node_modules/nodemailer');
    
    try {
      const nodemailer = require('../node_modules/nodemailer');
      console.log('✅ Nodemailer found in ../node_modules/nodemailer');
    } catch (error3) {
      console.log('❌ Not found in ../node_modules/nodemailer');
      console.log('Final error:', error3.message);
    }
  }
}