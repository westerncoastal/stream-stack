#!/bin/bash
set -e

apt update
apt install -y docker.io docker-compose-plugin git

systemctl enable docker
systemctl start docker

# clone repo (SSH version)
git clone git@github.com:westerncoastal/stream-stack.git /opt/stack

cd /opt/stack

mkdir -p hls ads ssai

docker compose up -d
