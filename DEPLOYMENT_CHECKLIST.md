# 📋 Render Deployment Checklist

## ✅ Pre-Deployment Checklist

### Files Ready
- [x] `server-full.js` - Production server with all features
- [x] `package.json` - Updated with `npm start` → `node server-full.js`
- [x] `render.yaml` - Render configuration file
- [x] `.gitignore` - Excludes node_modules, .env, database files
- [x] `dist/` folder - TypeScript compiled (run `npm run build`)
- [x] `public/` folder - Frontend files
- [x] All dependencies in `package.json`

### Code Verification
- [x] Server uses `process.env.PORT` for dynamic port
- [x] CORS enabled for cross-origin requests
- [x] Health check endpoint at `/health`
- [x] Static files served from `public/`
- [x] WebSocket server configured
- [x] Database initialization on startup

## 🚀 Deployment Steps

### Step 1: Prepare Repository
```bash
# Navigate to project
cd capacity-system

# Run preparation script
./prepare-deploy.sh

# Or manually:
npm run build
git add .
git commit -m "Deploy to Render"
```

### Step 2: Push to GitHub
```bash
# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Render
1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub repository
4. Configure:
   - **Name**: `calibration-capacity-system`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `NODE_ENV` = `production`
     - `PORT` = `10000`

### Step 4: Wait for Deployment
- Initial deploy: 3-5 minutes
- Watch build logs for errors
- Look for "✅ Server is ready!" message

### Step 5: Verify Deployment
Test these URLs (replace with your Render URL):
- [ ] `https://your-app.onrender.com` - Dashboard loads
- [ ] `https://your-app.onrender.com/health` - Returns OK status
- [ ] `https://your-app.onrender.com/api` - Returns API info
- [ ] Upload Excel file - Works correctly
- [ ] WebSocket connection - Shows "Connected"

## 🔍 Post-Deployment Verification

### Functional Tests
- [ ] Dashboard displays correctly
- [ ] Excel upload works
- [ ] Gauge data displays in table
- [ ] Dashboard statistics update
- [ ] Alerts are generated
- [ ] Export to Excel works
- [ ] Real-time updates via WebSocket
- [ ] Mobile responsive design works

### Performance Tests
- [ ] Page loads in < 3 seconds
- [ ] API responses < 1 second
- [ ] File upload handles 50+ rows
- [ ] No console errors in browser

## ⚠️ Known Limitations (Free Tier)

### Render Free Tier
- ✅ 750 hours/month (enough for 1 service)
- ⚠️ App sleeps after 15 min inactivity
- ⚠️ First request after sleep: ~30 seconds
- ⚠️ Ephemeral storage (database resets on deploy)
- ✅ Free SSL certificate
- ✅ WebSocket support

### Solutions
- **Sleep Issue**: Upgrade to paid plan ($7/month)
- **Database Persistence**: 
  - Option 1: Paid plan with persistent disk
  - Option 2: External database (PostgreSQL, MongoDB Atlas)
  - Option 3: Accept data loss on redeploy (for testing)

## 🐛 Troubleshooting

### Build Fails
**Symptom**: Deployment fails during build
**Check**:
- [ ] All dependencies in `package.json`
- [ ] `npm run build` works locally
- [ ] No TypeScript errors
- [ ] Build logs for specific error

**Fix**:
```bash
# Test locally
npm install
npm run build
npm start
```

### App Won't Start
**Symptom**: Build succeeds but app doesn't run
**Check**:
- [ ] `server-full.js` exists
- [ ] Start command is `npm start`
- [ ] `package.json` has correct start script
- [ ] Runtime logs for errors

**Fix**: Check Render logs for error messages

### Database Empty After Deploy
**Symptom**: No data after redeployment
**Cause**: Ephemeral storage on free tier
**Solutions**:
1. Accept data loss (testing only)
2. Upgrade to paid plan with persistent disk
3. Use external database service
4. Keep test data file to re-upload

### WebSocket Not Connecting
**Symptom**: "Real-time connection lost" message
**Check**:
- [ ] WebSocket server initialized in code
- [ ] Browser console for connection errors
- [ ] Render supports WebSocket (it does)

**Fix**: Check browser console, verify WebSocket URL

### Slow First Load
**Symptom**: First request takes 30+ seconds
**Cause**: Free tier app sleeping
**Solutions**:
1. Accept delay (free tier limitation)
2. Upgrade to paid plan (no sleep)
3. Use external uptime monitor to ping app

## 📊 Monitoring

### Render Dashboard
- View real-time logs
- Monitor CPU/memory usage
- Check deployment history
- View metrics

### Health Monitoring
Set up external monitoring:
- UptimeRobot (free)
- Pingdom
- StatusCake

Ping URL: `https://your-app.onrender.com/health`

## 🎯 Production Recommendations

### For Serious Use
1. **Upgrade Plan**: $7/month Starter plan
   - No sleep time
   - Persistent disk (1GB)
   - More resources

2. **External Database**: 
   - PostgreSQL on Render
   - MongoDB Atlas (free tier)
   - Supabase (free tier)

3. **Custom Domain**:
   - Add in Render settings
   - Update DNS records
   - Free SSL included

4. **Monitoring**:
   - Set up error tracking (Sentry)
   - Add analytics (Google Analytics)
   - Monitor uptime

5. **Backups**:
   - Regular database exports
   - Store in cloud storage
   - Automated backup script

## ✅ Deployment Complete!

Once all checks pass:
- [ ] Share URL with team
- [ ] Document any custom configurations
- [ ] Set up monitoring
- [ ] Plan for data persistence
- [ ] Consider upgrade path

## 🆘 Support

- **Render Docs**: https://render.com/docs
- **Community**: https://community.render.com
- **Status**: https://status.render.com

---

**Last Updated**: January 2026
**Version**: 1.0.0
**Status**: ✅ Ready for Deployment
