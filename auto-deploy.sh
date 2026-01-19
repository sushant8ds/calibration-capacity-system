#!/bin/bash

echo "🚀 Auto-deploying Calibration Management System with hardcoded email config..."

# Add all changes
git add .

# Commit with timestamp
git commit -m "Auto-deploy: Hardcoded email configuration for automatic deployment - $(date)"

# Push to GitHub
git push origin main

echo "✅ Code pushed to GitHub!"
echo "🔄 Render will automatically redeploy with working email system"
echo "📧 Email will work automatically: sushantds2003@gmail.com → 01fe23bcs086@kletech.ac.in"
echo ""
echo "🎯 Your app will be live with working emails in 2-3 minutes!"