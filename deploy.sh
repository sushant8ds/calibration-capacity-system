#!/bin/bash

echo "🚀 Deploying Calibration Management System..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit - Calibration Management System"
fi

echo "✅ Ready for deployment!"
echo ""
echo "📋 Next Steps:"
echo "1. Create GitHub repository: https://github.com/new"
echo "2. Name it: calibration-capacity-system"
echo "3. Run these commands:"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/calibration-capacity-system.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "4. Deploy on Render: https://render.com"
echo "   - Connect GitHub repo"
echo "   - Use settings from render.yaml"
echo "   - Click Deploy!"
echo ""
echo "🎉 Your app will be live at: https://calibration-capacity-system.onrender.com"