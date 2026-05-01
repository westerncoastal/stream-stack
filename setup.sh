#!/bin/bash
set -e

# --- 1. GET KEYS SECURELY ---
# If you are using an automated cloud-config, you should pass these 
# as Environment Variables in the Cherry Servers panel.
# If running manually, this will prompt you.

if [ -z "$STRIPE_SECRET_KEY" ]; then
    read -p "Enter Stripe Secret Key (sk_live_...): " STRIPE_SECRET_KEY
fi

if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
    read -p "Enter Stripe Webhook Secret (whsec_...): " STRIPE_WEBHOOK_SECRET
fi

# --- 2. DYNAMIC IP DISCOVERY ---
SERVER_IP=$(curl -s https://api.ipify.org)

# --- 3. INSTALLATION ---
apt update && apt install -y docker.io docker-compose-plugin git
systemctl enable --now docker

# --- 4. REPOSITORY SETUP ---
# Using HTTPS for easier cloning in automated scripts
rm -rf /opt/stack
git clone https://github.com/westerncoastal/stream-stack.git /opt/stack
cd /opt/stack

# --- 5. SECURE ENVIRONMENT FILE ---
# We create a .env file that is ignored by git
cat <<EOF > .env
DOMAIN=$SERVER_IP
SERVER_IP=$SERVER_IP
STRIPE_KEY=$STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
EOF

# Ensure only the root user can read this file
chmod 600 .env

# --- 6. PATCH PLAYER ---
if [ -f "player/index.html" ]; then
    sed -i "s/YOUR_SERVER_IP/$SERVER_IP/g" player/index.html
fi

# --- 7. LAUNCH ---
docker compose up -d

echo "Done! Access your player at http://$SERVER_IP"
