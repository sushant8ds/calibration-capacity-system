# 🚀 Deployment Commands - Copy & Paste

## Step 1: Open Terminal and Navigate to Project

```bash
cd "/Users/sushant/Desktop/NEW DANA /capacity-system"
```

## Step 2: Initialize Git Repository

```bash
# Initialize git
git init

# Add all files
git add .

# Commit files
git commit -m "Calibration Management System with Email Alerts - Ready for deployment"
```

## Step 3: Create GitHub Repository

1. **Go to:** https://github.com/new
2. **Repository name:** `calibration-capacity-system`
3. **Description:** `Calibration & Production Capacity Management System with Email Alerts`
4. **Make it Public**
5. **DO NOT** check "Add a README file"
6. **Click "Create repository"**

## Step 4: Connect to GitHub

**Replace `YOUR_USERNAME` with your actual GitHub username:**

```bash
# Connect to GitHub (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/calibration-capacity-system.git

# Set main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 5: Deploy on Render

1. **Go to:** https://render.com
2. **Sign up/Login** with GitHub account
3. **Click "New +"** → **"Web Service"**
4. **Connect repository:** `calibration-capacity-system`
5. **Click "Create Web Service"**

## 🎯 Your App Will Be Live At:

```
https://calibration-capacity-system.onrender.com
```

## ✅ Features That Will Work:

- ✅ Dashboard with gauge management
- ✅ Email alerts to `01fe23bcs086@kletech.ac.in`
- ✅ File upload for gauge data  
- ✅ Real-time WebSocket updates
- ✅ Alert management system

---

**Copy these commands and run them in your terminal one by one!**