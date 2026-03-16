# GoodLuck 部署指南（华为云 / 阿里云等 Ubuntu 22.04）

## 一、云服务器配置要求

### 1. 购买云服务器
- 镜像：**Ubuntu 22.04**
- 配置：1核2G 起步，1M 带宽即可
- 安全组：放通 **22（SSH）**、**80（HTTP）** 端口  
  （华为云/阿里云均在控制台「安全组」中添加入方向规则）

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

## 三、上传项目到服务器（可放在任意目录）

项目**不要求**必须放在 `/var/www/GoodLuck`，可放在任意目录，例如 `/root/GoodLuck`、`/home/ubuntu/GoodLuck` 等。

**方式 A：Git（推荐）**
```bash
apt install -y git
# 示例：放在 /root 下
cd /root
git clone <你的仓库地址> GoodLuck
cd GoodLuck
```

**方式 B：本地上传**
- 在本地把整个 GoodLuck 文件夹打包成 zip
- 用 WinSCP、FileZilla 等工具上传到服务器任意目录（如 `/root`）
- 在服务器上解压：`unzip GoodLuck.zip`，得到包含 `backend`、`frontend`、`deploy` 的 GoodLuck 目录

---

## 四、一键部署（支持任意项目路径）

在**项目根目录**下执行（即能看到 `backend`、`frontend`、`deploy` 的目录）：

```bash
cd /root/GoodLuck   # 换成你实际的项目路径
sudo bash deploy/deploy.sh
```

**若希望显式指定项目路径**（例如脚本不在当前目录时）：

```bash
sudo bash /root/GoodLuck/deploy/deploy.sh /root/GoodLuck
```

脚本会自动识别项目路径，并将 Nginx、systemd 中的路径替换为实际目录，无需修改配置文件。  
脚本会完成：安装依赖、配置 Nginx、启动后端服务。

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

## 六、域名与 HTTPS 配置（详细步骤）

### 6.1 前置条件

- 已有一台可公网访问的服务器（如阿里云 ECS），且 80、443 端口已在安全组放通。
- 已拥有一个域名（在国内需完成备案后再用 80/443；仅用 IP 可跳过域名与 HTTPS）。

---

### 6.2 域名解析（把域名指到你的服务器）

1. **登录域名服务商控制台**  
   例如：阿里云「云解析 DNS」、腾讯云 DNSPod、华为云解析等。

2. **添加 A 记录**
   - **记录类型**：`A`
   - **主机记录**：
     - 用根域名访问：填 `@`
     - 用子域名访问（如 `game.xxx.com`）：填 `game`（或你想要的子域名）
   - **记录值**：填你**阿里云服务器的公网 IP**
   - **TTL**：默认 600 或 10 分钟即可

3. **等待生效**  
   通常几分钟内生效，最多可能 10 分钟～几小时。可用下面命令在本地测是否已指到服务器：
   ```bash
   ping 你的域名
   # 或
   nslookup 你的域名
   ```
   若返回的 IP 是你服务器的公网 IP，说明解析已生效。

---

### 6.3 在 Nginx 里配置域名（仅 HTTP 时）

当前 Nginx 若还在用 IP，改为用域名访问时：

1. **编辑站点配置**
   ```bash
   sudo nano /etc/nginx/sites-available/goodluck
   ```
2. **改 `server_name`**  
   把原来的 IP 或 `YOUR_DOMAIN_OR_IP` 改成你的域名，例如：
   ```nginx
   server_name game.example.com;   # 或 www.example.com、@ 对应的域名等
   ```
3. **检查并重载 Nginx**
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```
4. 浏览器访问 **http://你的域名**，应能打开 GoodLuck 页面。

---

### 6.4 配置 HTTPS（推荐用 Let’s Encrypt + Certbot）

使用 Let’s Encrypt 免费证书，由 Certbot 自动修改 Nginx 配置并续期。

#### 步骤 1：安装 Certbot（Nginx 插件）

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

#### 步骤 2：确认 Nginx 已用域名且 80 可访问

- 在 Nginx 里 `server_name` 已设为你的域名（见 6.3）。
- 本机或外网能通过 **http://你的域名** 正常打开页面。
- 服务器安全组已放通 **80** 和 **443**。

Let’s Encrypt 会先通过 80 端口访问你的域名做验证，若 80 不通会失败。

#### 步骤 3：申请证书并让 Certbot 自动改 Nginx

```bash
sudo certbot --nginx -d 你的域名
```

例如域名为 `game.example.com`：

```bash
sudo certbot --nginx -d game.example.com
```

若有多个域名（如同时用 `www.example.com` 和 `example.com`）：

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

按提示操作：

1. 输入邮箱（用于到期提醒与恢复）。
2. 同意服务条款（选 Y）。
3. 是否接收推广邮件随意。
4. Certbot 会自动在 Nginx 里增加 443 的 `server` 块、配置 SSL、并设置 HTTP 跳转到 HTTPS。

#### 步骤 4：验证 HTTPS

- 浏览器访问 **https://你的域名**，应能正常打开且显示小锁。
- 若仍用 HTTP 访问，应自动跳转到 HTTPS。

#### 步骤 5：证书自动续期（默认已配置）

Certbot 会加一个定时任务自动续期，可检查：

```bash
sudo systemctl status certbot.timer
# 或
sudo certbot renew --dry-run
```

`--dry-run` 不真续期，只测续期流程是否正常。

---

### 6.5 配置完成后可选调整

- **只允许 HTTPS 访问**  
  Certbot 一般已配置「HTTP 跳转到 HTTPS」，无需再改。
- **改 Nginx 其它配置**  
  修改后执行：
  ```bash
  sudo nginx -t && sudo systemctl reload nginx
  ```
- **证书路径（供参考，Certbot 已自动写好）**
  - 证书：`/etc/letsencrypt/live/你的域名/fullchain.pem`
  - 私钥：`/etc/letsencrypt/live/你的域名/privkey.pem`

---

### 6.6 简要检查清单

| 项目 | 说明 |
|------|------|
| 域名 A 记录 | 已指向服务器公网 IP，`ping`/`nslookup` 正常 |
| Nginx `server_name` | 已改为你的域名，`nginx -t` 通过并已 reload |
| 安全组 | 80、443 已放通 |
| Certbot | 已安装并执行 `certbot --nginx -d 你的域名` |
| 访问 | https://你的域名 可打开且为 HTTPS |

---

## 七、故障排查

### 7.1 外网无法通过 IP 访问（服务正常但浏览器打不开）

**现象**：`systemctl status nginx` 和 `systemctl status goodluck` 都是 active，但用 `http://你的公网IP` 无法打开。

按下面顺序在服务器上排查：

#### ① 本机能否访问（先确认 Nginx 和站点根目录正常）

在服务器上执行：

```bash
# 本机请求 Nginx，应返回 HTML
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/
# 期望输出 200

# 确认前端目录存在且有 index.html
ls -la /var/www/GoodLuck/frontend/index.html
```

若 `curl` 不是 200，或 `index.html` 不存在，说明 Nginx 配置或 `root` 路径有问题。  
若本机 `curl` 是 200，则问题多半在**防火墙或安全组**。

#### ② 阿里云安全组（最常见原因）

- 登录 **阿里云控制台** → **ECS** → 你的实例 → **安全组** → **配置规则** → **入方向**。
- 确认有一条规则：**端口 80**，**授权对象** 为 `0.0.0.0/0`（或至少包含你要访问的客户端 IP）。
- 没有则**手动添加**：协议类型 TCP，端口 80，授权对象 0.0.0.0/0，保存。

改完后无需重启服务器，保存规则即可生效。

#### ③ 服务器本机防火墙（UFW）

若启用了 UFW，需放行 80：

```bash
sudo ufw status
# 若为 active，则添加并重载：
sudo ufw allow 80/tcp
sudo ufw reload
sudo ufw status
```

#### ④ 确认 80 端口在监听

```bash
sudo ss -tlnp | grep :80
# 或
sudo netstat -tlnp | grep :80
```

应能看到 nginx 在监听 `0.0.0.0:80` 或 `*:80`。

#### ⑤ 确认 Nginx 实际使用的配置

```bash
sudo nginx -T 2>/dev/null | head -50
```

确认其中有 `listen 80 default_server` 以及 `root /var/www/GoodLuck/frontend`（或你实际部署路径）。

---

### 7.2 故障排查速查表

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| 外网无法通过 IP 访问 | 安全组未放通 80 | 阿里云 ECS → 安全组 → 入方向 → 添加 80 端口，0.0.0.0/0 |
| 外网无法通过 IP 访问 | 服务器 UFW 拦截 | `sudo ufw allow 80/tcp` 后 `sudo ufw reload` |
| 本机 curl 127.0.0.1 非 200 | root 路径错误或缺少 index.html | 检查 `root` 与 `/var/www/GoodLuck/frontend` 是否存在 |
| 域名无法访问、解析不到 | DNS 未生效或 A 记录错误 | 检查 A 记录是否指向服务器公网 IP；`ping 你的域名` 看是否解析正确 |
| Certbot 报错 challenge failed | 80 端口外网不可达或 Nginx 未用该域名 | 先保证 http://你的域名 或 http://IP 能访问；检查安全组 80 已放通 |
| HTTPS 证书过期 | 自动续期未执行 | `sudo certbot renew --dry-run` 测试；检查 `certbot.timer` 是否启用 |
| No such file or directory | 项目路径不对或未在项目根执行 | 先 `cd` 到项目根再执行 `sudo bash deploy/deploy.sh`，或传入路径：`sudo bash deploy/deploy.sh /实际路径/GoodLuck` |
| 502 Bad Gateway | 后端未启动 | `sudo systemctl restart goodluck` |
| 修改后未生效 | 缓存或未重启 | 清除浏览器缓存，`sudo systemctl restart goodluck` |
