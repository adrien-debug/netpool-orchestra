#!/bin/bash

# Orchestra Railway Setup Script
# Configures Railway projects with environment variables from TOKENS-CONFIG.json

set -e

COLORS_RED='\033[0;31m'
COLORS_GREEN='\033[0;32m'
COLORS_YELLOW='\033[1;33m'
COLORS_BLUE='\033[0;34m'
COLORS_CYAN='\033[0;36m'
COLORS_NC='\033[0m'

log() {
  echo -e "${COLORS_CYAN}$1${COLORS_NC}"
}

log_success() {
  echo -e "${COLORS_GREEN}✅ $1${COLORS_NC}"
}

log_warning() {
  echo -e "${COLORS_YELLOW}⚠️  $1${COLORS_NC}"
}

log_error() {
  echo -e "${COLORS_RED}❌ $1${COLORS_NC}"
}

log_step() {
  echo -e "\n${COLORS_BLUE}[$1/$2] $3${COLORS_NC}"
}

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
  log_error "Railway CLI not found"
  echo "Install: npm install -g @railway/cli"
  echo "Or: brew install railway"
  exit 1
fi

log_success "Railway CLI found"

# Check if logged in
if ! railway whoami &> /dev/null; then
  log_warning "Not logged in to Railway"
  echo "Logging in..."
  railway login
fi

log_success "Logged in to Railway"

# Load tokens from TOKENS-CONFIG.json
TOKENS_CONFIG="config/TOKENS-CONFIG.json"

if [ ! -f "$TOKENS_CONFIG" ]; then
  log_error "TOKENS-CONFIG.json not found"
  exit 1
fi

log_success "TOKENS-CONFIG.json found"

# Parse tokens using Node.js
read_token() {
  local service=$1
  local token=$2
  node -e "
    const config = require('./$TOKENS_CONFIG');
    const value = config.tokens['$service']?.tokens?.['$token']?.value || '';
    console.log(value);
  "
}

log "\n🚀 Orchestra Railway Setup"
log "=========================="

# Orchestra Backend
log_step 1 2 "Setting up Orchestra Backend"

cd backend

# Initialize Railway project (if not already)
if [ ! -f ".railway" ]; then
  log "Initializing Railway project..."
  railway init
fi

log "Setting environment variables..."

# Required variables
railway variables set NODE_ENV=production
railway variables set PORT=3011

# Supabase
SUPABASE_URL=$(read_token "supabase" "url")
SUPABASE_SERVICE_KEY=$(read_token "supabase" "service")

if [ -n "$SUPABASE_URL" ]; then
  railway variables set SUPABASE_URL="$SUPABASE_URL"
  log_success "SUPABASE_URL set"
else
  log_warning "SUPABASE_URL not configured"
fi

if [ -n "$SUPABASE_SERVICE_KEY" ]; then
  railway variables set SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY"
  log_success "SUPABASE_SERVICE_KEY set"
else
  log_warning "SUPABASE_SERVICE_KEY not configured"
fi

# Stripe
STRIPE_SECRET=$(read_token "stripe" "secret")
STRIPE_WEBHOOK=$(read_token "stripe" "webhook")

if [ -n "$STRIPE_SECRET" ]; then
  railway variables set STRIPE_SECRET_KEY="$STRIPE_SECRET"
  log_success "STRIPE_SECRET_KEY set"
else
  log_warning "STRIPE_SECRET_KEY not configured"
fi

if [ -n "$STRIPE_WEBHOOK" ]; then
  railway variables set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK"
  log_success "STRIPE_WEBHOOK_SECRET set"
else
  log_warning "STRIPE_WEBHOOK_SECRET not configured"
fi

# GitHub
GITHUB_CLIENT_ID=$(read_token "github" "oauth_client_id")
GITHUB_CLIENT_SECRET=$(read_token "github" "oauth_client_secret")

if [ -n "$GITHUB_CLIENT_ID" ]; then
  railway variables set GITHUB_CLIENT_ID="$GITHUB_CLIENT_ID"
  log_success "GITHUB_CLIENT_ID set"
else
  log_warning "GITHUB_CLIENT_ID not configured"
fi

if [ -n "$GITHUB_CLIENT_SECRET" ]; then
  railway variables set GITHUB_CLIENT_SECRET="$GITHUB_CLIENT_SECRET"
  log_success "GITHUB_CLIENT_SECRET set"
else
  log_warning "GITHUB_CLIENT_SECRET not configured"
fi

# Sentry
SENTRY_DSN=$(read_token "sentry" "dsn")

if [ -n "$SENTRY_DSN" ]; then
  railway variables set SENTRY_DSN="$SENTRY_DSN"
  log_success "SENTRY_DSN set"
else
  log_warning "SENTRY_DSN not configured"
fi

# JWT Secret (generate if not exists)
JWT_SECRET=$(openssl rand -base64 32)
railway variables set JWT_SECRET="$JWT_SECRET"
log_success "JWT_SECRET generated and set"

# Frontend URL (to be updated after deployment)
railway variables set FRONTEND_URL="https://orchestra.vercel.app"
log_success "FRONTEND_URL set"

# Stripe Price IDs (from TOKENS-CONFIG.json)
STRIPE_PRICE_PRO=$(node -e "const c = require('../$TOKENS_CONFIG'); console.log(c.tokens.stripe?.products?.pro?.priceId || '');")
STRIPE_PRICE_TEAM=$(node -e "const c = require('../$TOKENS_CONFIG'); console.log(c.tokens.stripe?.products?.team?.priceId || '');")

if [ -n "$STRIPE_PRICE_PRO" ]; then
  railway variables set STRIPE_PRICE_PRO="$STRIPE_PRICE_PRO"
  log_success "STRIPE_PRICE_PRO set"
else
  log_warning "STRIPE_PRICE_PRO not configured"
fi

if [ -n "$STRIPE_PRICE_TEAM" ]; then
  railway variables set STRIPE_PRICE_TEAM="$STRIPE_PRICE_TEAM"
  log_success "STRIPE_PRICE_TEAM set"
else
  log_warning "STRIPE_PRICE_TEAM not configured"
fi

log_success "Orchestra Backend configured"

cd ..

log "\n✅ Railway setup complete!"
log "\nNext steps:"
log "1. Deploy: cd backend && railway up"
log "2. Get URL: railway domain"
log "3. Update FRONTEND_URL with actual domain"
log "4. Configure Stripe webhook with Railway URL"
