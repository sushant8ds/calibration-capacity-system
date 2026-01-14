#!/bin/bash

echo "🚀 Preparing Calibration System for Render Deployment"
echo "=================================================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing Git repository..."
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi

# Check if .gitignore exists
if [ ! -f .gitignore ]; then
    echo "❌ .gitignore not found!"
    exit 1
else
    echo "✅ .gitignore found"
fi

# Check if package.json exists
if [ ! -f package.json ]; then
    echo "❌ package.json not found!"
    exit 1
else
    echo "✅ package.json found"
fi

# Check if server-full.js exists
if [ ! -f server-full.js ]; then
    echo "❌ server-full.js not found!"
    exit 1
else
    echo "✅ server-full.js found"
fi

# Build the project
echo ""
echo "🔨 Building TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Add all files
echo ""
echo "📝 Staging files for commit..."
git add .

# Show status
echo ""
echo "📊 Git Status:"
git status --short

echo ""
echo "✅ Ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Commit your changes:"
echo "   git commit -m 'Prepare for Render deployment'"
echo ""
echo "2. Add your GitHub remote:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
echo ""
echo "3. Push to GitHub:"
echo "   git push -u origin main"
echo ""
echo "4. Deploy on Render:"
echo "   - Go to https://dashboard.render.com"
echo "   - Click 'New +' → 'Web Service'"
echo "   - Connect your GitHub repository"
echo "   - Use settings from RENDER_DEPLOYMENT.md"
echo ""
echo "📖 Full guide: See RENDER_DEPLOYMENT.md"
