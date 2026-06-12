#!/usr/bin/env bash
# Msaidizi — Docker-based Linode setup
# Run as root on a fresh Ubuntu 22.04:  bash setup.sh

set -euo pipefail

APP_DIR="/opt/msaidizi"
REPO_URL="YOUR_GIT_REPO_URL"   # e.g. https://github.com/lidede/msaidizi.git

echo "==> Installing Docker"
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "==> Installing nginx + certbot (for HTTPS)"
apt-get install -y -qq nginx certbot python3-certbot-nginx

echo "==> Getting code"
if [ -d "$APP_DIR" ]; then
  git -C "$APP_DIR" pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi

echo "==> Writing .env (edit before continuing)"
if [ ! -f "$APP_DIR/backend/.env" ]; then
  cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
fi

echo ""
echo "*** Edit $APP_DIR/backend/.env and add your GREENPT_API_KEY, then run: ***"
echo ""
echo "    cd $APP_DIR && docker compose up -d --build"
echo ""
echo "Then configure nginx:"
echo "    cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/msaidizi"
echo "    ln -sf /etc/nginx/sites-available/msaidizi /etc/nginx/sites-enabled/msaidizi"
echo "    rm -f /etc/nginx/sites-enabled/default"
echo "    nginx -t && systemctl reload nginx"
