# 🚀 Deploy to Render NOW - Quick Guide

## 3 Simple Steps to Deploy

### Step 1: Push to GitHub (2 minutes)
```bash
cd capacity-system
git init
git add .
git commit -m "Deploy calibration system"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2: Deploy on Render (3 minutes)
1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Fill in:
   - Build: `npm install && npm run build`
   - Start: `npm start`
   - Add env var: `NODE_ENV` = `production`
5. Click **"Create Web Service"**

### Step 3: Access Your App (1 minute)
Your app will be live at: `https://your-app-name.onrender.com`

## ✅ Everything is Ready!

All deployment files are configured:
- ✅ `render.yaml` - Render config
- ✅ `server-full.js` - Production server  
- ✅ `package.json` - Correct start command
- ✅ `.gitignore` - Clean repo
- ✅ TypeScript compiled

## 📖 Need More Details?

- **Full Guide**: See `RENDER_DEPLOYMENT.md`
- **Checklist**: See `DEPLOYMENT_CHECKLIST.md`
- **Help Script**: Run `./prepare-deploy.sh`

## 🎉 That's It!

Your Calibration & Production Capacity Management System will be live in ~5 minutes!

**Free Tier**: Perfect for testing and demos
**Paid Tier**: $7/month for production use (no sleep, persistent storage)
