#!/bin/bash
set -e

# --- 1. GET KEYS ---
if [ -z "$STRIPE_SECRET_KEY" ]; then
    read -p "Enter Stripe Secret Key (sk_live_...): " STRIPE_SECRET_KEY
fi

if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
    read -p "Enter Stripe Webhook Secret (whsec_...): " STRIPE_WEBHOOK_SECRET
fi

# --- 2. GET SERVER IP ---
SERVER_IP=$(curl -s https://api.ipify.org)

# --- 3. INSTALL DOCKER ---
apt update && apt install -y docker.io docker-compose-plugin git
systemctl enable --now docker

# --- 4. CLONE REPO ---
rm -rf /opt/stack
git clone https://github.com/westerncoastal/stream-stack.git /opt/stack
cd /opt/stack

# --- 5. CREATE ENV FILE ---
cat <<EOF > .env
DOMAIN=$SERVER_IP
SERVER_IP=$SERVER_IP
STRIPE_KEY=$STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
MYSQL_PASSWORD=$(openssl rand -hex 12)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 12)
EOF

chmod 600 .env

# --- 6. PATCH PLAYER ---
if [ -f "player/index.html" ]; then
    sed -i "s/YOUR_SERVER_IP/$SERVER_IP/g" player/index.html
fi

# --- 7. START SERVICES ---
docker compose pull
docker compose up -d

# --- 8. AUTO UPDATE SERVICE ---
cat <<EOF > /usr/local/bin/update-stack.sh
#!/bin/bash
cd /opt/stack || exit 1
git fetch origin main
git reset --hard origin/main
docker compose pull
docker compose up -d
EOF

chmod +x /usr/local/bin/update-stack.sh

# run every minute
(crontab -l 2>/dev/null; echo "*/1 * * * * /usr/local/bin/update-stack.sh") | crontab -

echo "✅ Done! Access your player at http://$SERVER_IP"
