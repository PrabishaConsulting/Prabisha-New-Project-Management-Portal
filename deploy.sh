#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Move to project directory
cd /var/www/pm

# Pull latest changes
echo "📥 Pulling latest changes from git..."
git fetch origin
git reset --hard origin/main

# Load nvm if available to ensure correct Node version
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Check Node.js version
REQUIRED_NODE_VERSION="20.9.0"
CURRENT_NODE_VERSION=$(node -v | sed 's/v//')

echo "📌 Current Node version: v$CURRENT_NODE_VERSION"
echo "📌 Required Node version: v$REQUIRED_NODE_VERSION"

# Compare versions
if [ "$(printf '%s\n' "$REQUIRED_NODE_VERSION" "$CURRENT_NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_NODE_VERSION" ]; then
    echo "⚠️  Node.js version is too old. Please upgrade to v20.9.0 or higher."
    echo "💡 Run: nvm install 20 && nvm use 20 && nvm alias default 20"
    exit 1
fi

# Ensure pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

echo "📌 pnpm version: $(pnpm -v)"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --ignore-scripts

# Sync database schema
echo "🗄️ Syncing database schema..."
pnpm prisma db push

# Clean old Prisma clients
echo "🧹 Cleaning old Prisma clients..."
rm -rf app/generated/client
rm -rf node_modules/.prisma

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
pnpm prisma generate

# Verify Prisma client was generated
if [ -d "app/generated/client" ]; then
    echo "✅ Prisma client generated successfully at app/generated/client"
    ls -la app/generated/client/ | head -5
else
    echo "❌ ERROR: Prisma client not found at app/generated/client"
    exit 1
fi

# Build the application
echo "🏗️ Building application..."
pnpm build

# Cleanup any leftover build workers
echo "🧹 Cleaning up build workers..."
pkill -9 -f "jest-worker/processChild.js" || true

# Flush PM2 logs
echo "🧾 Flushing PM2 logs..."
pm2 flush

# Check if PM2 service exists, if not start it, otherwise restart
echo "🔍 Checking PM2 service status..."
if pm2 describe pm-3039 > /dev/null 2>&1; then
    echo "🔁 Restarting existing PM2 process..."
    PORT=3039 pm2 restart pm-3039 --update-env
else
    echo "🚀 Starting new PM2 process on port 3039..."
    PORT=3039 pm2 start pnpm --name "pm-3039" -- start
    pm2 save
fi

echo "✅ Deployment completed successfully!"
