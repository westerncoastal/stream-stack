#!/bin/bash
set -e

apt update
apt install -y docker.io docker-compose git

systemctl enable docker
systemctl start docker

# clone repo
git clone https://github.com/YOURNAME/stream-stack.git /opt/stack

cd /opt/stack

mkdir -p hls

docker compose up -d
