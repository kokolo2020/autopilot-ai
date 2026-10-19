#!/usr/bin/env bash
# Autopilot live executor installer (KuCoin futures, My picks). Ubuntu 22.04/24.04, run as root:
#   bash <(curl -fsSL https://auto-pilotai.netlify.app/live/install.sh)
# Safe to re-run: it updates the program and keeps your keys.
set -euo pipefail
SITE="https://auto-pilotai.netlify.app/live"
[ "$(id -u)" = 0 ] || { echo "Run as root (sudo -i first)"; exit 1; }
echo "== 1/6 System packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg ufw debian-keyring debian-archive-keyring apt-transport-https openssl >/dev/null
echo "== 2/6 Node.js 20"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
node -v
echo "== 3/6 Caddy (HTTPS)"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy >/dev/null
fi
echo "== 4/6 Program"
mkdir -p /opt/kclive
curl -fsSL "$SITE/server.mjs?$(date +%s)" -o /opt/kclive/server.mjs.new
node --check /opt/kclive/server.mjs.new && mv /opt/kclive/server.mjs.new /opt/kclive/server.mjs
cat > /usr/local/bin/kclive-setkeys <<'KEYS'
#!/usr/bin/env bash
# Enter (or replace) the KuCoin API key. Input is hidden and stored only in /etc/kclive.env (root only).
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Run with sudo"; exit 1; }
touch /etc/kclive.env; chmod 600 /etc/kclive.env
read -rp  "KuCoin API key: " K </dev/tty
read -rsp "KuCoin API secret (hidden): " S </dev/tty; echo
read -rsp "KuCoin API passphrase (hidden): " P </dev/tty; echo
grep -v -E '^(KC_KEY|KC_SECRET|KC_PASSPHRASE)=' /etc/kclive.env > /etc/kclive.env.tmp || true
printf 'KC_KEY=%s\nKC_SECRET=%s\nKC_PASSPHRASE=%s\n' "$K" "$S" "$P" >> /etc/kclive.env.tmp
mv /etc/kclive.env.tmp /etc/kclive.env; chmod 600 /etc/kclive.env
systemctl restart kclive && echo "Saved. The service restarted with the new key."
KEYS
chmod 755 /usr/local/bin/kclive-setkeys
touch /etc/kclive.env; chmod 600 /etc/kclive.env
grep -q '^LIVE_KEY=' /etc/kclive.env || echo "LIVE_KEY=$(openssl rand -hex 16)" >> /etc/kclive.env
grep -q '^KC_KEY_VERSION=' /etc/kclive.env || echo "KC_KEY_VERSION=3" >> /etc/kclive.env
grep -q '^ALLOW_ORIGIN=' /etc/kclive.env || echo "ALLOW_ORIGIN=https://auto-pilotai.netlify.app" >> /etc/kclive.env
echo "== 5/6 Service"
cat > /etc/systemd/system/kclive.service <<'UNIT'
[Unit]
Description=Autopilot live executor (KuCoin futures)
After=network-online.target
Wants=network-online.target
[Service]
EnvironmentFile=/etc/kclive.env
ExecStart=/usr/bin/node /opt/kclive/server.mjs
DynamicUser=yes
StateDirectory=kclive
Restart=always
RestartSec=5
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now kclive >/dev/null 2>&1
systemctl restart kclive
echo "== 6/6 HTTPS address and firewall"
IP=$(curl -fsS https://api.ipify.org)
HOST="$(echo "$IP" | tr . -).sslip.io"
cat > /etc/caddy/Caddyfile <<CADDY
$HOST {
  reverse_proxy 127.0.0.1:8787
}
CADDY
systemctl reload caddy || systemctl restart caddy
ufw allow 22/tcp >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ufw --force enable >/dev/null
LK=$(grep '^LIVE_KEY=' /etc/kclive.env | cut -d= -f2)
sleep 4
echo
echo "================ DONE ================"
echo "Server IP (put this in the KuCoin API key IP whitelist): $IP"
echo "Dashboard server address:  https://$HOST"
echo "Dashboard live key:        $LK"
grep -q '^KC_KEY=' /etc/kclive.env && echo "KuCoin key: already saved" || echo "Next: create the KuCoin API key, then run:  sudo kclive-setkeys"
echo "Health check: $(curl -fsS https://$HOST/health 2>/dev/null || echo 'HTTPS certificate is still being issued, try again in a minute')"
