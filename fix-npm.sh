#!/bin/bash
echo "Fixing npm installation issues..."

# Remove corrupted node_modules
echo "Removing corrupted node_modules..."
rm -rf node_modules
rm -f package-lock.json

# Clean npm cache
echo "Cleaning npm cache..."
npm cache clean --force

# Reinstall all dependencies
echo "Reinstalling all dependencies..."
npm install

echo "Installation complete!"
echo "Now starting the server..."
npm start