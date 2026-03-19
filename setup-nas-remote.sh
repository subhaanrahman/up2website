#!/bin/bash
# Setup script to create a bare git repo on NAS and add it as a remote
# NAS: 192.168.1.126 | User: Haan

NAS_USER="Haan"
NAS_HOST="192.168.1.126"
REPO_NAME="up2"
NAS_GIT_DIR="/volume 2/git/${REPO_NAME}.git"
NAS_GIT_DIR_URL="/volume%202/git/${REPO_NAME}.git"

echo "=== Setting up git repo on NAS ==="
echo ""
echo "NAS:  ${NAS_USER}@${NAS_HOST}"
echo "Path: ${NAS_GIT_DIR}"
echo ""

# Step 1: Create the bare repo on the NAS via SSH
echo "[1/3] Creating bare git repository on NAS..."
ssh ${NAS_USER}@${NAS_HOST} "mkdir -p '${NAS_GIT_DIR}' && cd '${NAS_GIT_DIR}' && git init --bare"

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Could not connect to NAS or create repo."
    echo ""
    echo "Troubleshooting:"
    echo "  - Make sure SSH is enabled on your NAS"
    echo "  - Verify you can connect: ssh ${NAS_USER}@${NAS_HOST}"
    echo "  - If the path is wrong, edit NAS_GIT_DIR in this script"
    echo "    Common NAS paths:"
    echo "      Synology:  /volume 2/git/${REPO_NAME}.git"
    echo "      TrueNAS:   /mnt/pool/git/${REPO_NAME}.git"
    echo "      OpenWrt:   /opt/git/${REPO_NAME}.git"
    exit 1
fi

echo ""

# Step 2: Add NAS as a remote
echo "[2/3] Adding NAS as git remote 'nas'..."
git remote add nas ssh://${NAS_USER}@${NAS_HOST}${NAS_GIT_DIR_URL} 2>/dev/null

if [ $? -ne 0 ]; then
    echo "Remote 'nas' already exists. Updating URL..."
    git remote set-url nas ssh://${NAS_USER}@${NAS_HOST}${NAS_GIT_DIR_URL}
fi

echo ""

# Step 3: Push to NAS
echo "[3/3] Pushing all branches to NAS..."
git push nas --all
git push nas --tags

echo ""
echo "=== Done! ==="
echo ""
echo "Your NAS remote is set up. You can now use:"
echo "  git push nas main      # push to NAS"
echo "  git pull nas main      # pull from NAS"
echo "  git remote -v          # verify remotes"
