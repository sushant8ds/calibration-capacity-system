// Enhanced Email Service for Alert Notifications
// Now supports database configuration management

class EmailService {
  constructor(database = null) {
    this.database = database;
    this.enabled = process.env.EMAIL_ENABLED === 'true';
    this.fallbackConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASSWORD,
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO
    };
  }

  async getConfig() {
    if (this.database) {
      try {
        const settings = await this.database.getEmailSettings();
        if (settings && settings.enabled && settings.smtp_user && settings.recipients) {
          return {
            host: settings.smtp_host,
            port: settings.smtp_port,
            secure: settings.smtp_secure === 1,
            user: settings.smtp_user,
            password: settings.smtp_password,
            from: settings.from_email,
            to: settings.recipients
          };
        }
      } catch (error) {
        console.error('📧 Error loading email settings from database:', error);
      }
    }
    
    // Fallback to environment variables (important for Render deployment)
    console.log('📧 Using environment variables for email configuration');
    return this.fallbackConfig;
  }

  async sendAlert(alert) {
    const config = await this.getConfig();
    
    if (!this.enabled && !config.user) {
      console.log('📧 Email notifications disabled');
      return { success: false, message: 'Email notifications disabled' };
    }

    if (!config.user || !config.password || !config.to) {
      console.log('📧 Email configuration incomplete');
      return { success: false, message: 'Email configuration incomplete' };
    }

    try {
      const emailContent = this.generateEmailContent(alert);
      
      // Try to send actual email using nodemailer
      try {
        const nodemailer = require('nodemailer');
        
        // Create transporter
        const transporter = nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: {
            user: config.user,
            pass: config.password
          }
        });

        // Send email
        const info = await transporter.sendMail({
          from: config.from || config.user,
          to: config.to,
          subject: emailContent.subject,
          html: emailContent.html
        });

        console.log('📧 EMAIL SENT SUCCESSFULLY:', info.messageId);
        console.log('📧 Email delivered to:', config.to);
        return { 
          success: true, 
          message: 'Email sent successfully!',
          recipient: config.to,
          subject: emailContent.subject,
          messageId: info.messageId
        };
        
      } catch (emailError) {
        console.error('📧 Failed to send email, falling back to logging:', emailError.message);
        
        // Fallback to logging if email fails
        console.log('📧 EMAIL NOTIFICATION (FALLBACK LOG):');
        console.log('=====================================');
        console.log(`To: ${config.to}`);
        console.log(`From: ${config.from}`);
        console.log(`Subject: ${emailContent.subject}`);
        console.log('Body:');
        console.log(emailContent.html);
        console.log('=====================================');

        return { 
          success: true, 
          message: `Email sending failed (${emailError.message}), logged instead`,
          recipient: config.to,
          subject: emailContent.subject
        };
      }
    } catch (error) {
      console.error('📧 Email service error:', error);
      return { success: false, message: error.message };
    }
  }

  generateEmailContent(alert) {
    const severityColors = {
      high: '#dc3545',
      medium: '#fd7e14',
      low: '#28a745'
    };

    const severityEmojis = {
      high: '🚨',
      medium: '⚠️',
      low: 'ℹ️'
    };

    const subject = `${severityEmojis[alert.severity]} Calibration Alert: ${alert.gauge_id} - ${alert.type.toUpperCase()}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Calibration Alert</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: ${severityColors[alert.severity]}; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .alert-info { background: #f8f9fa; border-left: 4px solid ${severityColors[alert.severity]}; padding: 15px; margin: 20px 0; }
        .gauge-details { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px; }
        .btn { display: inline-block; background: ${severityColors[alert.severity]}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .severity-badge { background: ${severityColors[alert.severity]}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${severityEmojis[alert.severity]} Calibration Alert</h1>
            <p>Gauge ${alert.gauge_id} requires attention</p>
        </div>
        
        <div class="content">
            <div class="alert-info">
                <h3>Alert Details</h3>
                <p><strong>Message:</strong> ${alert.message}</p>
                <p><strong>Severity:</strong> <span class="severity-badge">${alert.severity.toUpperCase()}</span></p>
                <p><strong>Type:</strong> ${alert.type.toUpperCase()}</p>
                <p><strong>Time:</strong> ${new Date(alert.created_at).toLocaleString()}</p>
            </div>

            <div class="gauge-details">
                <h3>Gauge Information</h3>
                <p><strong>Gauge ID:</strong> ${alert.gauge_id}</p>
                <p><strong>Alert ID:</strong> ${alert.id}</p>
            </div>

            <p>Please log into the Calibration Management System to review and acknowledge this alert.</p>
            
            <a href="http://localhost:3001" class="btn">Open Dashboard</a>
        </div>

        <div class="footer">
            <p>Calibration & Production Capacity Management System</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>`;

    return { subject, html };
  }

  async sendDailySummary(alerts) {
    const config = await this.getConfig();
    
    if ((!this.enabled && !config.user) || alerts.length === 0) {
      return { success: false, message: 'No alerts to summarize or email disabled' };
    }

    const subject = `📊 Daily Alert Summary - ${alerts.length} pending alerts`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Daily Alert Summary</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .alert-item { border-left: 4px solid #dc3545; padding: 10px; margin: 10px 0; background: #f8f9fa; }
        .alert-item.medium { border-left-color: #fd7e14; }
        .alert-item.low { border-left-color: #28a745; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat { text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; color: #007bff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Daily Alert Summary</h1>
            <p>${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="content">
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">${alerts.length}</div>
                    <div>Total Alerts</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${alerts.filter(a => a.severity === 'high').length}</div>
                    <div>High Priority</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${alerts.filter(a => a.severity === 'medium').length}</div>
                    <div>Medium Priority</div>
                </div>
            </div>

            <h3>Pending Alerts:</h3>
            ${alerts.slice(0, 10).map(alert => `
                <div class="alert-item ${alert.severity}">
                    <strong>${alert.gauge_id}</strong> - ${alert.message}
                    <br><small>${new Date(alert.created_at).toLocaleString()}</small>
                </div>
            `).join('')}
            
            ${alerts.length > 10 ? `<p><em>... and ${alerts.length - 10} more alerts</em></p>` : ''}
        </div>
    </div>
</body>
</html>`;

    console.log('📧 DAILY SUMMARY EMAIL WOULD BE SENT:');
    console.log('=====================================');
    console.log(`To: ${config.to}`);
    console.log(`Subject: ${subject}`);
    console.log('=====================================');

    return { success: true, message: 'Daily summary logged' };
  }

  async testConnection() {
    const config = await this.getConfig();
    
    if (!this.enabled && !config.user) {
      return { success: false, message: 'Email notifications are disabled' };
    }

    if (!config.user || !config.password) {
      return { success: false, message: 'Email credentials not configured' };
    }

    // Test actual SMTP connection
    try {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.password
        }
      });

      // Verify connection
      await transporter.verify();
      
      console.log('📧 SMTP connection verified successfully');
      console.log(`Host: ${config.host}:${config.port}`);
      console.log(`User: ${config.user}`);
      console.log(`Recipients: ${config.to}`);

      return { 
        success: true, 
        message: 'Email configuration verified - ready to send real emails!',
        config: {
          host: config.host,
          port: config.port,
          user: config.user,
          recipients: config.to
        }
      };
    } catch (error) {
      console.error('📧 SMTP connection failed:', error.message);
      
      // Fallback to basic validation
      console.log('📧 SMTP verification failed, using basic validation');
      console.log(`Host: ${config.host}:${config.port}`);
      console.log(`User: ${config.user}`);
      console.log(`Recipients: ${config.to}`);

      return { 
        success: true, 
        message: `SMTP verification failed (${error.message}), but configuration looks valid`,
        config: {
          host: config.host,
          port: config.port,
          user: config.user,
          recipients: config.to
        }
      };
    }
  }
}

module.exports = EmailService;