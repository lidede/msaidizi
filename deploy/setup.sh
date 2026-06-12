#!/usr/bin/env bash
# Msaidizi — one-shot Linode setup script
# Run as root on a fresh Ubuntu 22.04 Nanode:
#   bash setup.sh

set -euo pipefail

APP_USER="msaidizi"
APP_DIR="/opt/msaidizi"
REPO_URL="YOUR_GIT_REPO_URL"   # e.g. https://github.com/you/msaidizi.git

echo "==> Installing system packages"
apt-get update -qq
apt-get install -y -qq git nginx python3 python3-pip python3-venv nodejs npm certbot python3-certbot-nginx

echo "==> Creating app user"
id -u $APP_USER &>/dev/null || useradd -m -s /bin/bash $APP_USER

echo "==> Cloning repo"
if [ -d "$APP_DIR" ]; then
  git -C "$APP_DIR" pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi
chown -R $APP_USER:$APP_USER "$APP_DIR"

echo "==> Setting up Python venv & installing backend"
sudo -u $APP_USER bash -c "
  cd $APP_DIR/backend
  python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
"

echo "==> Building frontend"
cd "$APP_DIR/frontend"
npm ci --silent
npm run build

echo "==> Writing .env (edit this file to add your GREENPT_API_KEY)"
if [ ! -f "$APP_DIR/backend/.env" ]; then
  cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
  echo "    *** Edit $APP_DIR/backend/.env and add your GREENPT_API_KEY ***"
fi

echo "==> Installing systemd service"
cp "$APP_DIR/deploy/msaidizi.service" /etc/systemd/system/msaidizi.service
systemctl daemon-reload
systemctl enable msaidizi
systemctl restart msaidizi

echo "==> Configuring nginx"
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/msaidizi
ln -sf /etc/nginx/sites-available/msaidizi /etc/nginx/sites-enabled/msaidizi
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "Done! App is running."
echo ""
echo "Next steps:"
echo "  1. Edit $APP_DIR/backend/.env — add your GREENPT_API_KEY"
echo "  2. Run: systemctl restart msaidizi"
echo "  3. Once you have a domain, run: certbot --nginx -d yourdomain.com"
echo ""
echo "Visit: http://$(curl -s ifconfig.me)"
