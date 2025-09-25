# Hostinger VPS Deployment Guide for Racers.fun

## Prerequisites
- Hostinger VPS account with Ubuntu 20.04+
- Domain name configured with Hostinger DNS
- SSH access to your VPS

## Step 1: Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install git -y
```

## Step 2: Deploy Application

```bash
# Clone repository
git clone https://github.com/racersdotfun/racers-vercel-live.git
cd racers-vercel-live

# Copy production environment
cp env.production .env
# Edit .env with your actual values
nano .env

# Create SSL directory (for Let's Encrypt certificates)
mkdir -p nginx/ssl

# Get SSL certificates with Certbot
sudo apt install certbot -y
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
sudo chown -R $USER:$USER nginx/ssl/

# Update nginx.conf with your domain
sed -i 's/your-domain.com/your-actual-domain.com/g' nginx/nginx.conf

# Start services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps
```

## Step 3: Configure Automatic SSL Renewal

```bash
# Create renewal script
sudo tee /usr/local/bin/renew-ssl.sh > /dev/null <<EOF
#!/bin/bash
certbot renew --quiet
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /home/$USER/racers-vercel-live/nginx/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem /home/$USER/racers-vercel-live/nginx/ssl/key.pem
docker-compose -f /home/$USER/racers-vercel-live/docker-compose.production.yml restart nginx
EOF

sudo chmod +x /usr/local/bin/renew-ssl.sh

# Add to crontab for automatic renewal
echo "0 2 * * 0 /usr/local/bin/renew-ssl.sh" | sudo crontab -
```

## Step 4: Set up Monitoring

```bash
# Create monitoring script
tee ~/monitor-racers.sh > /dev/null <<EOF
#!/bin/bash
cd /home/$USER/racers-vercel-live

# Check if containers are running
if ! docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
    echo "Restarting services..."
    docker-compose -f docker-compose.production.yml restart
fi

# Clean up old containers and images
docker system prune -f
EOF

chmod +x ~/monitor-racers.sh

# Add to crontab to run every 5 minutes
echo "*/5 * * * * /home/$USER/monitor-racers.sh" | crontab -
```

## Step 5: Configure Firewall

```bash
# Install and configure UFW
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

## Step 6: Backup Setup

```bash
# Create backup script
tee ~/backup-racers.sh > /dev/null <<EOF
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/$USER/backups"

mkdir -p $BACKUP_DIR

# Backup database
docker exec racers-postgres pg_dump -U racers racers > $BACKUP_DIR/database_$DATE.sql

# Backup Redis data
docker exec racers-redis redis-cli BGSAVE
docker cp racers-redis:/data/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +7 -delete
EOF

chmod +x ~/backup-racers.sh

# Add to crontab for daily backups at 3 AM
echo "0 3 * * * /home/$USER/backup-racers.sh" | crontab -
```

## Maintenance Commands

```bash
# View logs
docker-compose -f docker-compose.production.yml logs -f

# Update application
git pull
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Restart services
docker-compose -f docker-compose.production.yml restart

# Clean up
docker system prune -f
```