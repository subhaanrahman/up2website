#!/bin/bash
# Deploy up2 app to NAS via Docker
# NAS: 192.168.1.126 | User: Haan

NAS_USER="Haan"
NAS_HOST="192.168.1.126"
REPO_PATH="/volume2/git/up2.git"
DEPLOY_PATH="/volume2/projects/up2"

echo "=== Deploying up2 to NAS ==="
echo ""

# Step 1: Push latest code to NAS git remote
echo "[1/3] Pushing latest code to NAS..."
git push nas main
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to push to NAS. Run ./setup-nas-remote.sh first."
    exit 1
fi

echo ""

# Step 2: SSH into NAS and clone/pull the repo to a working directory
echo "[2/3] Setting up app on NAS..."
ssh ${NAS_USER}@${NAS_HOST} "
    if [ -d '${DEPLOY_PATH}' ]; then
        echo 'Pulling latest changes...'
        cd '${DEPLOY_PATH}' && git pull
    else
        echo 'Cloning repo for the first time...'
        mkdir -p /volume2/projects
        git clone '${REPO_PATH}' '${DEPLOY_PATH}'
    fi
"

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to set up repo on NAS."
    exit 1
fi

echo ""

# Step 3: Build and start the container
echo "[3/3] Building and starting Docker container..."
ssh ${NAS_USER}@${NAS_HOST} "
    cd '${DEPLOY_PATH}' && docker compose up -d --build
"

if [ $? -ne 0 ]; then
    echo "ERROR: Docker compose failed."
    exit 1
fi

echo ""
echo "=== Done! ==="
echo ""
echo "Your app should be running at:"
echo "  Local:   http://192.168.1.126:8080"
echo ""
echo "To redeploy after changes:"
echo "  ./deploy-to-nas.sh"
