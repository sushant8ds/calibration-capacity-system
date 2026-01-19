const fs = require('fs');
const path = require('path');

console.log('🔧 Updating email configuration for auto-deployment...');

// Update server-full.js
const serverFile = path.join(__dirname, 'server-full.js');
let serverContent = fs.readFileSync(serverFile, 'utf8');

// Add hardcoded email config after the imports
const emailConfigCode = `
// Hardcoded email configuration for automatic deployment
const HARDCODED_EMAIL_CONFIG = {
  EMAIL_ENABLED: 'true',
  EMAIL_HOST: 'smtp.gmail.com',
  EMAIL_PORT: '587',
  EMAIL_SECURE: 'false',
  EMAIL_USER: 'sushantds2003@gmail.com',
  EMAIL_PASSWORD: 'cebuquciloqihhdo',
  EMAIL_FROM: 'sushantds2003@gmail.com',
  EMAIL_TO: '01fe23bcs086@kletech.ac.in'
};

// Set environment variables if not already set
Object.keys(HARDCODED_EMAIL_CONFIG).forEach(key => {
  if (!process.env[key]) {
    process.env[key] = HARDCODED_EMAIL_CONFIG[key];
  }
});
`;

// Insert after the EmailService require line
if (!serverContent.includes('HARDCODED_EMAIL_CONFIG')) {
  serverContent = serverContent.replace(
    "const EmailService = require('./email-service');",
    "const EmailService = require('./email-service');" + emailConfigCode
  );
  fs.writeFileSync(serverFile, serverContent);
  console.log('✅ Updated server-full.js with hardcoded email config');
}

// Update email-service.js
const emailServiceFile = path.join(__dirname, 'email-service.js');
let emailServiceContent = fs.readFileSync(emailServiceFile, 'utf8');

// Update the constructor to always enable email and provide fallbacks
const newConstructor = `  constructor(database = null) {
    this.database = database;
    this.enabled = true; // Always enabled for auto-deployment
    
    // Hardcoded fallback configuration for automatic deployment
    this.fallbackConfig = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      user: 'sushantds2003@gmail.com',
      password: 'cebuquciloqihhdo',
      from: 'sushantds2003@gmail.com',
      to: '01fe23bcs086@kletech.ac.in'
    };
  }`;

if (!emailServiceContent.includes('Always enabled for auto-deployment')) {
  emailServiceContent = emailServiceContent.replace(
    /constructor\(database = null\) \{[\s\S]*?\}/,
    newConstructor
  );
  fs.writeFileSync(emailServiceFile, emailServiceContent);
  console.log('✅ Updated email-service.js with hardcoded fallbacks');
}

// Update .env file
const envFile = path.join(__dirname, '.env');
const envContent = `# Email Configuration for Gmail Alerts - HARDCODED FOR AUTO DEPLOYMENT
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=sushantds2003@gmail.com
EMAIL_PASSWORD=cebuquciloqihhdo
EMAIL_FROM=sushantds2003@gmail.com
EMAIL_TO=01fe23bcs086@kletech.ac.in

# These values are also hardcoded in server files for automatic deployment
`;

fs.writeFileSync(envFile, envContent);
console.log('✅ Updated .env with hardcoded configuration');

console.log('');
console.log('🎉 Email configuration updated successfully!');
console.log('📧 Email will work automatically: sushantds2003@gmail.com → 01fe23bcs086@kletech.ac.in');
console.log('');
console.log('🚀 Now run these commands to deploy:');
console.log('   git add .');
console.log('   git commit -m "Auto-deploy: Hardcoded email configuration"');
console.log('   git push origin main');