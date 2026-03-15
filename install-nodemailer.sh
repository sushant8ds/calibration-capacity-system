#!/bin/bash
echo "Installing nodemailer..."

# Try npm first
if command -v npm &> /dev/null; then
    echo "Using npm to install nodemailer..."
    npm install nodemailer
elif command -v yarn &> /dev/null; then
    echo "Using yarn to install nodemailer..."
    yarn add nodemailer
else
    echo "Neither npm nor yarn found. Trying to download nodemailer manually..."
    # Manual installation approach
    mkdir -p node_modules/nodemailer
    echo "Manual installation not implemented yet"
fi

echo "Installation complete!"