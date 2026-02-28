#!/bin/bash
# GoodLuck 华为云 Ubuntu 22.04 一键部署脚本
# 在服务器上以 root 或 sudo 运行：bash deploy/deploy.sh

set -e
PROJECT_DIR="/var/www/GoodLuck"

echo "=== 1. 安装系统依赖 ==="
apt update
apt install -y python3 python3-pip python3-venv nginx git

echo "=== 2. 安装 Node.js 18 ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

echo "=== 3. 创建项目目录 ==="
mkdir -p /var/www
# 若已通过 git clone 或 scp 上传，可跳过克隆；否则需要先 clone
if [ ! -d "$PROJECT_DIR" ]; then
    echo "项目目录不存在。请先将项目上传到 $PROJECT_DIR 或修改脚本中的 git clone 地址后重试。"
    exit 1
fi

echo "=== 4. 后端虚拟环境与依赖 ==="
cd "$PROJECT_DIR/backend"
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

echo "=== 5. 初始化数据库 ==="
.venv/bin/python -c "
import asyncio
from app.db import init_db
asyncio.run(init_db())
print('数据库初始化完成')
"

echo "=== 6. 配置 Nginx ==="
# 替换 nginx 配置中的占位符为服务器 IP 或域名
IP_OR_DOMAIN=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")
sed "s/YOUR_DOMAIN_OR_IP/$IP_OR_DOMAIN/g" "$PROJECT_DIR/deploy/nginx.conf" > /tmp/goodluck-nginx.conf
cp /tmp/goodluck-nginx.conf /etc/nginx/sites-available/goodluck
ln -sf /etc/nginx/sites-available/goodluck /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl reload nginx

echo "=== 7. 配置 systemd 服务 ==="
cp "$PROJECT_DIR/deploy/goodluck.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable goodluck
systemctl restart goodluck

echo "=== 8. 设置目录权限 ==="
chown -R www-data:www-data "$PROJECT_DIR"

echo ""
echo "=== 部署完成 ==="
echo "访问地址: http://$IP_OR_DOMAIN"
echo "后端服务: systemctl status goodluck"
echo "Nginx: systemctl status nginx"
