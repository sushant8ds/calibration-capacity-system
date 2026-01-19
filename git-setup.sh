#!/bin/bash

echo "🚀 Setting up Git repository for deployment..."
echo ""

# Check if we're in the right directory
if [ ! -f "server-full.js" ]; then
    echo "❌ Error: Please run this script from the capacity-system directory"
    echo "   cd '/Users/sushant/Desktop/NEW DANA /capacity-system'"
    exit 1
fi

echo "📁 Current directory: $(pwd)"
echo ""

# Initialize git repository
echo "📦 Initializing Git repository..."
git init

# Add all files
echo "📋 Adding all files to git..."
git add .

# Check git status
echo "📊 Git status:"
git status

# Commit files
echo "💾 Committing files..."
git commit -m "Calibration Management System with Email Alerts - Ready for deployment"

echo ""
echo "✅ Git repository setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Create GitHub repository at: https://github.com/new"
echo "2. Name it: calibration-capacity-system"
echo "3. After creating, run these commands:"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/calibration-capacity-system.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "4. Then deploy on Render: https://render.com"
echo ""
echo "🎉 Your system is ready for deployment!"