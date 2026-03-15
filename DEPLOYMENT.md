# Deployment Guide

## Production Deployment

### Prerequisites
- Node.js v16+ installed
- Process manager (PM2 recommended)
- Reverse proxy (Nginx recommended)
- SSL certificate for HTTPS

### Step 1: Prepare the Application
```bash
# Clone and build
git clone <repository>
cd capacity-system
npm install
npm run build

# Set production environment
export NODE_ENV=production
```

### Step 2: Configure Environment
Create `.env` file:
```env
NODE_ENV=production
PORT=3001
DATABASE_PATH=/var/lib/capacity-system/capacity_system.db
```

### Step 3: Install PM2 and Start
```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'capacity-system',
    script: 'dist/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 4: Configure Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Step 5: Database Backup
```bash
# Create backup script
cat > backup.sh << EOF
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /var/lib/capacity-system/capacity_system.db /var/backups/capacity_system_$DATE.db
find /var/backups -name "capacity_system_*.db" -mtime +7 -delete
EOF

chmod +x backup.sh

# Add to crontab for daily backups
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

## Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY public/ ./public/

EXPOSE 3001

USER node

CMD ["node", "dist/server.js"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  capacity-system:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_PATH=/data/capacity_system.db
    volumes:
      - capacity_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  capacity_data:
```

### Build and Deploy
```bash
# Build image
docker build -t capacity-system .

# Run with docker-compose
docker-compose up -d

# Check logs
docker-compose logs -f capacity-system
```

## Monitoring and Maintenance

### Health Checks
```bash
# Application health
curl http://localhost:3001/health

# PM2 status
pm2 status

# System resources
pm2 monit
```

### Log Management
```bash
# PM2 logs
pm2 logs capacity-system

# Rotate logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Database Maintenance
```bash
# Check database size
ls -lh /var/lib/capacity-system/capacity_system.db

# Vacuum database (optimize)
sqlite3 /var/lib/capacity-system/capacity_system.db "VACUUM;"

# Check integrity
sqlite3 /var/lib/capacity-system/capacity_system.db "PRAGMA integrity_check;"
```

## Security Considerations

### File Permissions
```bash
# Set proper permissions
chown -R node:node /var/lib/capacity-system
chmod 600 /var/lib/capacity-system/capacity_system.db
chmod 700 /var/lib/capacity-system
```

### Firewall Configuration
```bash
# Allow only necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw deny 3001/tcp   # Block direct access to app
ufw enable
```

### SSL/TLS Configuration
- Use strong SSL ciphers
- Enable HSTS headers
- Implement proper certificate management
- Regular certificate renewal

## Performance Tuning

### Node.js Optimization
```bash
# Increase memory limit if needed
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable production optimizations
export NODE_ENV=production
```

### Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gauge_profiles_gauge_id ON gauge_profiles(gauge_id);
CREATE INDEX IF NOT EXISTS idx_alerts_gauge_id ON alerts(gauge_id);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_audit_entries_gauge_id ON audit_entries(gauge_id);
CREATE INDEX IF NOT EXISTS idx_audit_entries_timestamp ON audit_entries(timestamp);
```

### Nginx Optimization
```nginx
# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Enable caching for static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Troubleshooting

### Common Issues

1. **Database locked error**
   ```bash
   # Check for zombie processes
   ps aux | grep capacity-system
   # Kill if necessary and restart
   pm2 restart capacity-system
   ```

2. **WebSocket connection issues**
   - Check Nginx WebSocket configuration
   - Verify firewall settings
   - Check browser console for errors

3. **High memory usage**
   ```bash
   # Monitor memory usage
   pm2 monit
   # Restart if needed
   pm2 restart capacity-system
   ```

4. **File upload failures**
   - Check disk space
   - Verify file permissions
   - Check upload size limits

### Log Analysis
```bash
# Application logs
tail -f ~/.pm2/logs/capacity-system-out.log
tail -f ~/.pm2/logs/capacity-system-error.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx -f
```

## Backup and Recovery

### Automated Backup
```bash
#!/bin/bash
# backup-script.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/capacity-system"
DB_PATH="/var/lib/capacity-system/capacity_system.db"

# Create backup directory
mkdir -p $BACKUP_DIR

# Stop application
pm2 stop capacity-system

# Create backup
cp $DB_PATH $BACKUP_DIR/capacity_system_$DATE.db

# Compress backup
gzip $BACKUP_DIR/capacity_system_$DATE.db

# Start application
pm2 start capacity-system

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: capacity_system_$DATE.db.gz"
```

### Recovery Process
```bash
# Stop application
pm2 stop capacity-system

# Restore database
gunzip -c /var/backups/capacity-system/capacity_system_YYYYMMDD_HHMMSS.db.gz > /var/lib/capacity-system/capacity_system.db

# Set permissions
chown node:node /var/lib/capacity-system/capacity_system.db
chmod 600 /var/lib/capacity-system/capacity_system.db

# Start application
pm2 start capacity-system

# Verify recovery
curl http://localhost:3001/health
```

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (HAProxy/Nginx)
- Implement session affinity for WebSocket connections
- Consider Redis for session storage
- Database clustering for high availability

### Vertical Scaling
- Monitor CPU and memory usage
- Increase server resources as needed
- Optimize database queries
- Implement caching strategies

---

**Deployment Status**: Ready for Production  
**Last Updated**: January 2026