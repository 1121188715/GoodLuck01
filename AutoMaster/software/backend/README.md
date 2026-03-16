# 控制端后端（可选）

若控制端采用“前端 + 后端”分离方式，本目录用于放置后端服务代码；若采用执行端直连（设备自带 Web/WebSocket），可无需独立后端。

## 职责

- 提供 REST 或 WebSocket API，供前端（Web/App）调用，用于参数下发、运行控制与状态查询。
- 可选：作为代理与执行端（MCU）通信，将前端请求转发为设备协议（JSON），并转发设备状态给前端；或仅做会话/用户管理、历史记录等。

与 [docs/05-software.md](../../docs/05-software.md) 中功能一致：力度、频率、拍击范围等参数，开始/暂停/急停/单次拍击，状态与错误展示。

## 技术栈建议

- 轻量 API：FastAPI、Flask 等，本地或内网部署。
- 若需与设备直连：通过 TCP/WebSocket 或串口与执行端通信，协议与 [docs/04-electrical.md](../../docs/04-electrical.md)、[firmware/README.md](../../firmware/README.md) 一致。

当前为占位，是否采用独立后端取决于最终部署方式（直连设备 vs 经网关/云端）。
