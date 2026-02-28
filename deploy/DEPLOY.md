# GoodLuck 华为云 Ubuntu 22.04 部署指南

## 一、你需要在华为云控制台完成的操作

### 1. 购买云服务器
- 镜像：**Ubuntu 22.04**
- 配置：1核2G 起步，1M 带宽即可
- 安全组：放通 **22（SSH）**、**80（HTTP）** 端口

### 2. 获取登录信息
- 公网 IP：在控制台查看
- 登录方式：密钥对 或 密码（创建时设置）

---

## 二、首次登录服务器

```bash
# 使用密钥登录（示例）
ssh -i 你的密钥.pem root@你的公网IP

# 或使用密码登录
ssh root@你的公网IP
```

---

## 三、上传项目到服务器

**方式 A：Git（推荐）**
```bash
apt install -y git
cd /var/www
git clone <你的仓库地址> GoodLuck
cd GoodLuck
```

**方式 B：本地上传**
- 在本地把整个 GoodLuck 文件夹打包成 zip
- 用 WinSCP、FileZilla 等工具上传到 `/var/www/`
- 在服务器上解压：`unzip GoodLuck.zip`

---

## 四、一键部署

```bash
cd /var/www/GoodLuck
sudo bash deploy/deploy.sh
```

脚本会自动完成：安装依赖、配置 Nginx、启动后端服务。

---

## 五、部署完成后

### 访问地址
在浏览器打开：**http://你的公网IP**

### 常用命令
```bash
# 查看后端服务状态
sudo systemctl status goodluck

# 重启后端
sudo systemctl restart goodluck

# 查看 Nginx 状态
sudo systemctl status nginx

# 查看后端日志
sudo journalctl -u goodluck -f
```

---

## 六、可选：绑定域名

1. 在域名服务商处添加 A 记录，指向服务器公网 IP
2. 编辑 Nginx 配置：
   ```bash
   sudo nano /etc/nginx/sites-available/goodluck
   # 将 server_name 后面的 IP 改为你的域名
   sudo nginx -t && sudo systemctl reload nginx
   ```
3. 如需 HTTPS，可安装 certbot：
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d 你的域名
   ```

---

## 七、故障排查

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| 无法访问 | 安全组未放通 80 | 在华为云控制台放通 80 |
| 502 Bad Gateway | 后端未启动 | `sudo systemctl restart goodluck` |
| 修改后未生效 | 缓存或未重启 | 清除浏览器缓存，`sudo systemctl restart goodluck` |
