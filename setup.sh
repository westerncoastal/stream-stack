#!/bin/bash
set -e

# --- 0. PATCH & MITIGATE (CVE-2026-31431) ---
echo "Applying Debian security patches and neutralizing AF_ALG..."
export DEBIAN_FRONTEND=noninteractive
apt update
# Block the exploit vector immediately while patching
echo "install algif_aead /bin/false" > /etc/modprobe.d/disable-algif.conf
modprobe -r algif_aead || true

# Upgrade kernel to the patched version
apt install -y linux-image-amd64
apt full-upgrade -y

# --- 1. GET KEYS ---
# (Using env vars passed from GitHub Actions)
STRIPE_KEY="${STRIPE_SECRET_KEY}"
STRIPE_WH="${STRIPE_WEBHOOK_SECRET}"

# --- 2. GET SERVER IP ---
SERVER_IP=$(curl -s https://api.ipify.org)

# --- 3. INSTALL DOCKER ---
apt install -y docker.io docker-compose-plugin git
systemctl enable --now docker

# --- 4. CLONE & DEPLOY ---
rm -rf /opt/stack
git clone https://github.com/westerncoastal/stream-stack.git /opt/stack
cd /opt/stack

# --- 5. CREATE ENV ---
cat <<EOF > .env
DOMAIN=$SERVER_IP
SERVER_IP=$SERVER_IP
STRIPE_KEY=$STRIPE_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WH
MYSQL_PASSWORD=$(openssl rand -hex 12)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 12)
EOF
chmod 600 .env

# --- 6. START ---
docker compose pull
docker compose up -d

echo "✅ Deployment Complete on http://$SERVER_IP"
# Trigger reboot to ensure patched kernel is active
echo "Rebooting to activate patched kernel..."
reboot
