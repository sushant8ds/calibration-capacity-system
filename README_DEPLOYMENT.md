# Quick Deploy to Render

## 🚀 One-Click Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## 📋 Quick Steps

### 1. Push to GitHub
```bash
cd capacity-system
git init
git add .
git commit -m "Deploy calibration system"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 2. Deploy on Render
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Use these settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Add `NODE_ENV=production`

### 3. Access Your App
Your app will be live at: `https://your-app-name.onrender.com`

## ✅ Files Ready for Deployment
- ✅ `render.yaml` - Render configuration
- ✅ `server-full.js` - Production server
- ✅ `package.json` - Updated with correct start command
- ✅ `.gitignore` - Excludes unnecessary files
- ✅ All dependencies listed

## 🎯 What Gets Deployed
- Full-featured calibration management system
- SQLite database (resets on redeploy - use external DB for persistence)
- Real-time WebSocket updates
- Excel import/export functionality
- Complete dashboard and API

## 📝 Important Notes
- **Free Tier**: App sleeps after 15 min inactivity
- **Database**: SQLite data is ephemeral (resets on deploy)
- **For Production**: Consider paid plan with persistent disk or external database

## 🔗 Useful Links
- [Full Deployment Guide](./RENDER_DEPLOYMENT.md)
- [Render Documentation](https://render.com/docs)
- [Application Documentation](./README.md)
