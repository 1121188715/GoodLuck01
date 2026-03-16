#!/bin/bash
# GoodLuck 一键部署脚本（支持华为云/阿里云等 Ubuntu 22.04）
# 用法一：在项目根目录执行（推荐）：sudo bash deploy/deploy.sh
# 用法二：指定项目路径：sudo bash deploy/deploy.sh /path/to/GoodLuck

set -e
# 若传入第一个参数则作为项目目录，否则使用脚本所在目录的上级（即项目根）
PROJECT_DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"

if [ ! -d "$PROJECT_DIR/backend" ] || [ ! -d "$PROJECT_DIR/frontend" ]; then
    echo "错误：未找到项目目录（需包含 backend 和 frontend）。"
    echo "当前使用的路径: $PROJECT_DIR"
    echo "请确保在项目根目录执行，或传入正确路径：sudo bash deploy/deploy.sh /path/to/GoodLuck"
    exit 1
fi
echo "项目目录: $PROJECT_DIR"

echo "=== 1. 安装系统依赖 ==="
apt update
apt install -y python3 python3-pip python3-venv nginx git

echo "=== 2. 安装 Node.js 18 ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

echo "=== 3. 检查项目结构 ==="
# 已在上方检查过 backend/frontend

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
# 替换 nginx 配置中的占位符：域名/IP 与项目路径
# 若无法获取公网 IP（如国内网络），用 _ 表示接受任意 Host，便于用 IP 访问
IP_OR_DOMAIN=$(curl -s --connect-timeout 3 ifconfig.me 2>/dev/null || true)
if [ -z "$IP_OR_DOMAIN" ] || [ "$IP_OR_DOMAIN" = "localhost" ]; then
    IP_OR_DOMAIN="_"
fi
sed -e "s|YOUR_DOMAIN_OR_IP|$IP_OR_DOMAIN|g" -e "s|/var/www/GoodLuck|$PROJECT_DIR|g" "$PROJECT_DIR/deploy/nginx.conf" > /tmp/goodluck-nginx.conf
cp /tmp/goodluck-nginx.conf /etc/nginx/sites-available/goodluck
ln -sf /etc/nginx/sites-available/goodluck /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl reload nginx

echo "=== 7. 配置 systemd 服务 ==="
# 将模板中的 /var/www/GoodLuck 替换为实际项目路径
sed "s|/var/www/GoodLuck|$PROJECT_DIR|g" "$PROJECT_DIR/deploy/goodluck.service" > /etc/systemd/system/goodluck.service
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
