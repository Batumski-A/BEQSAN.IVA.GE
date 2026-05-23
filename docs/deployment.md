# BEQSAN — Deployment Guide

Status as of 2026-05-21: **deploy pipeline scaffolded, not yet wired to a live server.** Lasha needs to provision BATUMSKI and add the secrets/variables listed below before the GitHub Action can push to production.

## Current state

- ✅ `.github/workflows/build.yml` — builds BACK + FRONT on every push to `main`, uploads artifacts (no deploy).
- ✅ `.github/workflows/deploy.yml` — manual `workflow_dispatch` deploy via rsync + SSH. Skeleton complete; needs secrets.
- ✅ Admin panel consolidated at `https://beqsan.iva.ge/adminpanel`, gated by username/password (single account, Phase 1).
- ❌ No server provisioned yet — DNS for `beqsan.iva.ge` + `api.beqsan.iva.ge` not pointed at production IP.
- ❌ No systemd unit or nginx config on the production host.
- ❌ No SSH key pair created.

## What to do to actually deploy

### 1. Pick + prepare the host (BATUMSKI or other)

```bash
# On the production server (assumes Ubuntu/Debian):
sudo apt update
sudo apt install -y nginx rsync
sudo apt install -y dotnet-runtime-8.0 aspnetcore-runtime-8.0
sudo mkdir -p /opt/beqsan/api /opt/beqsan/data /var/www/beqsan /etc/beqsan
sudo chown -R deploy:deploy /opt/beqsan /var/www/beqsan
```

### 2. Create the systemd unit at `/etc/systemd/system/beqsan-api.service`

```ini
[Unit]
Description=BEQSAN API
After=network.target

[Service]
Type=simple
User=beqsan
WorkingDirectory=/opt/beqsan/api
EnvironmentFile=/etc/beqsan/api.env
ExecStart=/usr/bin/dotnet /opt/beqsan/api/BEQSAN.Api.dll
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now beqsan-api
```

### 3. Create `/etc/beqsan/api.env` (NEVER commit this)

```
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://127.0.0.1:5000
Database__ConnectionString=Data Source=/opt/beqsan/data/beqsan.db;Foreign Keys=True
Storage__LocalRoot=/opt/beqsan/data/uploads

AdminAuth__Username=<choose a username — e.g. roman>
AdminAuth__Password=<long random password, 20+ chars>
Social__AdminToken=<long random hex string, 32+ chars>
Social__Encryption__Key=<base64-encoded 32 bytes — `openssl rand -base64 32`>

# Meta / Social — fill once Roman has approved the FB app
Social__Meta__AppId=
Social__Meta__AppSecret=
Social__Meta__RedirectUri=https://beqsan.iva.ge/adminpanel/social/callback
Social__Meta__WebhookVerifyToken=

# AI — fill once KIE.ai key is provisioned
Social__Ai__ApiKey=
```

```bash
sudo chmod 600 /etc/beqsan/api.env
sudo chown beqsan:beqsan /etc/beqsan/api.env
```

### 4. nginx vhosts at `/etc/nginx/sites-available/beqsan.conf`

```nginx
server {
    listen 443 ssl http2;
    server_name beqsan.iva.ge;
    root /var/www/beqsan;
    index index.html;

    # SPA fallback — admin pages are client-side routed
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Long-cache hashed assets
    location /assets/ {
        expires 1y;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    # ssl_certificate ... ;  # via certbot
}

server {
    listen 443 ssl http2;
    server_name api.beqsan.iva.ge;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
    }

    # ssl_certificate ... ;
}

server {
    listen 80;
    server_name beqsan.iva.ge api.beqsan.iva.ge;
    return 301 https://$host$request_uri;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/beqsan.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d beqsan.iva.ge -d api.beqsan.iva.ge
sudo nginx -t && sudo systemctl reload nginx
```

### 5. Create a deploy user + SSH key

```bash
# On the server
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG www-data deploy
# Allow deploy to restart only the api service
echo "deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart beqsan-api" \
    | sudo tee /etc/sudoers.d/beqsan-deploy

# On your local machine
ssh-keygen -t ed25519 -f ~/.ssh/beqsan_deploy -C "beqsan-deploy"
ssh-copy-id -i ~/.ssh/beqsan_deploy.pub deploy@beqsan.iva.ge
```

### 6. Add the secrets/variables in GitHub

GitHub repo → Settings → Secrets and variables → Actions:

**Secrets** (encrypted, never logged):
- `DEPLOY_HOST` — `beqsan.iva.ge`
- `DEPLOY_USER` — `deploy`
- `DEPLOY_SSH_KEY` — the contents of `~/.ssh/beqsan_deploy` (the private key)
- `DEPLOY_SSH_PORT` — `22` (or whatever)

**Variables** (plaintext, visible in logs):
- `DEPLOY_BACK_PATH` — `/opt/beqsan/api`
- `DEPLOY_FRONT_PATH` — `/var/www/beqsan`
- `VITE_API_BASE` — `https://api.beqsan.iva.ge`

### 7. First deploy

GitHub → Actions → "deploy" → Run workflow → main → both checkboxes on.

The workflow will:
1. Build BACK (.NET publish) + FRONT (Vite build)
2. rsync to the server
3. Restart the systemd unit
4. Poll `/api/v1/health` until 200 (60 s timeout)

### 8. Verify

- `https://beqsan.iva.ge` — public site (Home, configurator, …)
- `https://beqsan.iva.ge/adminpanel` — redirects to `/adminpanel/login`
- Log in with the `AdminAuth__Username` / `AdminAuth__Password` you set in step 3
- `https://api.beqsan.iva.ge/api/v1/health` — should return `{ "isSuccess": true, "value": { "status": "Healthy" } }`

## Rolling back

```bash
# On the server
sudo systemctl stop beqsan-api
# previous publish lives in /opt/beqsan/api.previous/ if you backed it up
sudo rsync -a --delete /opt/beqsan/api.previous/ /opt/beqsan/api/
sudo systemctl start beqsan-api
```

For the SPA, you can re-deploy the last known-good commit by running the deploy workflow from a tag.

## Open questions before going live

- Domain delegation: who controls the `iva.ge` DNS zone? Need an A record for `beqsan` and `api.beqsan`.
- SSL certificates: Let's Encrypt via certbot (free) — handled in step 4.
- Database backup cadence: SQLite at `/opt/beqsan/data/beqsan.db`. Hourly `sqlite3 .backup` to a sibling file + daily off-host copy is the minimum.
- Log retention: Serilog writes to `/opt/beqsan/data/logs/*.log` with 14-day rolling. OK for now; tighten or expand once we know what we need.
