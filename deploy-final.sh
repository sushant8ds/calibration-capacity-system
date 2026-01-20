#!/bin/bash

echo "🚀 Final Deployment Script"
echo "=========================="

echo "📦 Adding all files to git..."
git add .

echo "📝 Committing changes..."
git commit -m "Fix: Simplified server for deployment with hardcoded email config"

echo "🚀 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Deployment pushed to GitHub!"
echo ""
echo "🎯 Next Steps:"
echo "1. Go to your Render dashboard"
echo "2. Watch for automatic redeploy"
echo "3. Test the deployed system"
echo ""
echo "📧 Email system is ready with:"
echo "   From: sushantds2003@gmail.com"
echo "   To: 01fe23bcs086@kletech.ac.in"
echo ""
echo "🌐 Your system will be available at your Render URL"
echo "🧪 Test email functionality via the web dashboard"