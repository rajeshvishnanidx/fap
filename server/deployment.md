# Deployment Guide

## Server Requirements
- Node.js (v16 or higher)
- Nginx (for reverse proxy)
- PM2 (for process management)
- Git
- MongoDB Atlas account (cloud cluster)

## Step 1: Server Setup
```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

## Step 2: MongoDB Atlas Setup
1. Log in to MongoDB Atlas (https://cloud.mongodb.com)
2. Create or select your cluster
3. Set up network access:
   - Go to Network Access
   - Add your server's IP address
   - Optionally, add `0.0.0.0/0` to allow access from anywhere (less secure)
4. Create a database user:
   - Go to Database Access
   - Add new database user
   - Set username and a strong password
   - Set appropriate permissions (readWrite)
5. Get your connection string:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user's password
   - Replace `<dbname>` with your database name

## Step 3: Clone and Setup Application
```bash
# Create application directory
mkdir -p /var/www/fap
cd /var/www/fap

# Clone your repository
git clone <your-repo-url> .

# Install dependencies for server
cd server
npm install

# Install dependencies for client
cd ../client
npm install

# Build the client application
npm run build
```

## Step 4: Environment Configuration
Create `.env` file in the server directory:
```bash
cd /var/www/fap/server
nano .env
```

Add the following configuration:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<dbname>?retryWrites=true&w=majority
JWT_SECRET=your_secure_jwt_secret
ENCRYPTION_KEY=your_secure_encryption_key
NODE_ENV=production
```

## Step 5: Setup PM2 for Server
```bash
# Start server with PM2
cd /var/www/fap/server
pm2 start src/index.js --name "fap-server"
pm2 save
pm2 startup
```

## Step 6: Configure Nginx
Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/fap
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;  # Replace with your server's public IP address

    # Client files
    location / {
        root /var/www/fap/client/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/fap /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 7: Client Configuration
Update the client's production environment file:
```bash
cd /var/www/fap/client
nano .env.production
```

Add the following (replace with your server's IP):
```env
REACT_APP_API_URL=http://YOUR_SERVER_IP/api
GENERATE_SOURCEMAP=false
```

Then rebuild the client:
```bash
npm run build
```

## Step 8: Firewall Configuration
```bash
# Allow necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw enable
```

## Maintenance Commands

### Update Application
```bash
cd /var/www/fap
git pull
cd client
npm install
npm run build
cd ../server
npm install
pm2 restart fap-server
```

### View Logs
```bash
# View server logs
pm2 logs fap-server

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Database Backups
MongoDB Atlas provides automated backups for M10 clusters and above. For M0 (free) or M2 clusters:
1. Use MongoDB Atlas UI to create manual backups
2. Or use mongodump with your Atlas connection string:
```bash
# Create backup
mongodump --uri="mongodb+srv://<username>:<password>@<cluster-url>/<dbname>" --out=/var/backups/mongodb/$(date +"%Y-%m-%d")

# Restore backup
mongorestore --uri="mongodb+srv://<username>:<password>@<cluster-url>/<dbname>" /var/backups/mongodb/YYYY-MM-DD
```

## Security Recommendations
1. Use strong passwords for MongoDB Atlas users
2. Restrict MongoDB Atlas network access to your server's IP
3. Enable MongoDB Atlas authentication and encryption
4. Keep system and packages updated
5. Configure firewall rules properly
6. Regularly monitor logs for suspicious activity
7. Enable MongoDB Atlas audit logging if available
8. Regularly rotate database access credentials
9. Use environment variables for sensitive information
10. Consider setting up a domain name with SSL in the future for better security

## Additional Security Notes
Since you're using an IP address without SSL:
1. Be aware that traffic will not be encrypted between client and server
2. Consider this setup for development/testing only
3. For production use, it's strongly recommended to:
   - Set up a proper domain name
   - Configure SSL/TLS encryption
   - Use HTTPS for all communications

## Troubleshooting
1. Check server logs: `pm2 logs fap-server`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check MongoDB Atlas monitoring dashboard for database issues
4. Verify MongoDB Atlas connection: `node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(err => console.error(err))"`
5. Verify Nginx status: `sudo systemctl status nginx`
6. Check PM2 status: `pm2 status`
7. Check MongoDB Atlas network access settings if connection fails
8. Test API access: `curl http://YOUR_SERVER_IP/api/health-check`
9. Verify client can access server: `curl http://YOUR_SERVER_IP` 