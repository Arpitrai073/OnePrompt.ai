#!/usr/bin/env bash
set -euo pipefail

echo "==> Updating system packages"
sudo apt-get update -y
sudo apt-get upgrade -y

echo "==> Installing Docker, nginx, git, node"
sudo apt-get install -y ca-certificates curl gnupg git nginx
sudo install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
fi
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker "$USER" || true

# Node for frontend build
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> Creating app directories"
sudo mkdir -p /var/www/oneprompt/frontend
sudo mkdir -p /opt/oneprompt
sudo chown -R "$USER":"$USER" /opt/oneprompt /var/www/oneprompt

echo "==> Setup complete"
echo "Next:"
echo "1) Clone repo into /opt/oneprompt"
echo "2) Create backend/.env and secrets/serviceAccountKey.json"
echo "3) Start backend with docker compose"
echo "4) Build frontend and copy to /var/www/oneprompt/frontend"
echo "5) Copy deploy/nginx.conf to /etc/nginx/sites-available/oneprompt"
echo "Log out and back in once so Docker group applies."
