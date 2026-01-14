# 🚀 Deploy to Render - Step by Step Guide

## Prerequisites
- GitHub account
- Render account (free tier available at https://render.com)
- Your code pushed to a GitHub repository

## Step 1: Prepare Your Repository

### 1.1 Initialize Git (if not already done)
```bash
cd capacity-system
git init
git add .
git commit -m "Initial commit - Calibration Capacity Management System"
```

### 1.2 Create GitHub Repository
1. Go to https://github.com/new
2. Create a new repository (e.g., `calibration-capacity-system`)
3. **Do NOT** initialize with README, .gitignore, or license

### 1.3 Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/calibration-capacity-system.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy on Render

### 2.1 Sign Up / Log In to Render
1. Go to https://render.com
2. Sign up or log in (you can use your GitHub account)

### 2.2 Create New Web Service
1. Click **"New +"** button in the top right
2. Select **"Web Service"**
3. Connect your GitHub repository:
   - Click **"Connect account"** if first time
   - Select your `calibration-capacity-system` repository
   - Click **"Connect"**

### 2.3 Configure Web Service

Fill in the following settings:

**Basic Settings:**
- **Name**: `calibration-capacity-system` (or your preferred name)
- **Region**: Choose closest to you (e.g., Oregon, Frankfurt)
- **Branch**: `main`
- **Root Directory**: `capacity-system` (if your code is in a subdirectory)
- **Runtime**: `Node`

**Build & Deploy:**
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

**Instance Type:**
- Select **"Free"** (or paid plan if you prefer)

**Advanced Settings (Optional):**
- **Health Check Path**: `/health`
- **Auto-Deploy**: `Yes` (recommended)

### 2.4 Environment Variables
Click **"Advanced"** and add these environment variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |

### 2.5 Deploy
1. Click **"Create Web Service"**
2. Render will start building and deploying your application
3. Wait 3-5 minutes for the first deployment

## Step 3: Verify Deployment

### 3.1 Check Build Logs
- Watch the build logs in real-time
- Look for:
  ```
  📦 Initializing database...
  🚀 Capacity Management System running on port 10000
  ✅ Server is ready!
  ```

### 3.2 Access Your Application
Once deployed, Render will provide a URL like:
```
https://calibration-capacity-system.onrender.com
```

Test these endpoints:
- **Dashboard**: `https://your-app.onrender.com`
- **Health Check**: `https://your-app.onrender.com/health`
- **API**: `https://your-app.onrender.com/api`

## Step 4: Test Your Deployed Application

### 4.1 Open Dashboard
Visit your Render URL in a browser

### 4.2 Upload Test Data
1. Download the test Excel file from your local setup
2. Upload it through the web interface
3. Verify gauges appear in the dashboard

### 4.3 Check Real-time Updates
- WebSocket connection should show "Connected"
- Dashboard should update in real-time

## 🔧 Troubleshooting

### Build Fails
**Issue**: Build command fails
**Solution**: 
- Check that `package.json` is in the correct directory
- Verify all dependencies are listed in `package.json`
- Check build logs for specific errors

### Application Won't Start
**Issue**: Deploy succeeds but app doesn't start
**Solution**:
- Check that `server-full.js` exists
- Verify `npm start` command in package.json
- Check runtime logs for errors

### Database Issues
**Issue**: SQLite database not persisting
**Solution**:
- Render's free tier has ephemeral storage
- Database resets on each deploy
- For persistent storage, consider:
  - Upgrading to paid plan with persistent disk
  - Using external database (PostgreSQL, MongoDB Atlas)

### WebSocket Connection Fails
**Issue**: Real-time updates not working
**Solution**:
- Render supports WebSockets on all plans
- Check browser console for connection errors
- Verify WebSocket URL matches your Render URL

## 📊 Post-Deployment

### Monitor Your Application
1. **Logs**: View real-time logs in Render dashboard
2. **Metrics**: Check CPU, memory usage
3. **Health**: Monitor `/health` endpoint

### Custom Domain (Optional)
1. Go to your service settings
2. Click "Custom Domains"
3. Add your domain and follow DNS instructions

### SSL Certificate
- Render provides free SSL certificates automatically
- Your app will be accessible via HTTPS

## 🎉 Success!

Your Calibration & Production Capacity Management System is now live!

**Share your URL**: `https://your-app.onrender.com`

### Next Steps:
- Upload your production gauge data
- Configure capacity thresholds
- Set up monitoring and alerts
- Share with your team

## 💡 Tips

### Free Tier Limitations
- App sleeps after 15 minutes of inactivity
- First request after sleep takes ~30 seconds
- 750 hours/month free (enough for one service)

### Upgrade Benefits
- No sleep time
- Persistent disk storage
- More CPU and memory
- Custom domains
- Priority support

## 🆘 Need Help?

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **GitHub Issues**: Create an issue in your repository

---

**Deployment Status**: ✅ Ready to Deploy
**Estimated Time**: 5-10 minutes
**Cost**: Free (with limitations) or $7/month for Starter plan
