# AutoMaster 软件控制端架构

## 1. 形态

- **优先**：**Web 控制页**，响应式布局，在手机或平板上通过浏览器使用；与执行端同局域网时访问设备自带 Wi-Fi 热点或同一路由器下的设备 IP。
- **可选**：轻量 **App**（如 WebView 壳 + 同一套 Web 页面），或独立原生/跨平台 App，便于图标与推送；功能与 Web 版一致。

---

## 2. 功能

| 功能 | 说明 |
|------|------|
| 参数设置 | 力度档位（如 1–5）、拍击频率（如 0.2–1 Hz）、拍击区域（左右/远近范围或网格） |
| 运行控制 | 开始、暂停、急停；可选“单次拍击”测试 |
| 状态显示 | 当前模式（空闲/运行）、当前频率、错误信息、限位触发轴 |

所有参数与状态与执行端协议一致，见 [04-electrical.md](04-electrical.md) 与 `firmware/README.md`。

---

## 3. 与执行端交互

- **传输**：基于 TCP/WebSocket 或 BLE GATT，发送 JSON 指令、接收 JSON 状态。
- **指令示例**：
  - 设置参数：`{"cmd":"set","force":2,"freq":0.5,"range":{"left_mm":0,"right_mm":400,"near_mm":0,"far_mm":300}}`
  - 开始：`{"cmd":"start"}`
  - 暂停：`{"cmd":"pause"}`
  - 急停：`{"cmd":"stop"}`
  - 单次拍击：`{"cmd":"single_hit"}`
- **状态示例**：`{"status":"running","freq":0.5,"force_level":2,"limit_triggered":[]}`；错误时 `status":"error"` 并附带错误码或文案。
- 具体字段名、单位、枚举值在实现时与固件对齐并写入接口文档。

---

## 4. 部署

- **本地局域网**：执行端（如 ESP32）提供 Wi-Fi 热点或接入路由器，控制端通过 IP + 端口访问 Web 页或 WebSocket；无需公网与云端。
- **可选**：若需远程查看状态或简单控制，可在执行端或家庭网关侧做内网穿透或云端转发，由后续迭代决定。

---

## 5. 技术栈建议与文档

- **后端**（若需）：轻量 API 服务（如 FastAPI、Flask）跑在本地或执行端，提供 REST/WebSocket；或执行端直接提供静态页 + WebSocket，无独立后端。见 `software/backend/README.md`。
- **前端**：单页或简单多页，HTML + CSS + JS，或 Vue/React 等；与 `software/frontend/README.md` 对应，便于后续实现与 `docs/05-software.md` 一致。
