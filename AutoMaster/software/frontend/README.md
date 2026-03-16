# 控制端前端

Web 控制页或 App 前端，供用户设置拍击力度、频率、范围等参数，执行开始/暂停/急停与单次拍击，并查看运行状态与错误信息。

## 职责

- 与 [docs/05-software.md](../../docs/05-software.md) 功能对应：参数设置、运行控制、状态显示。
- 若存在独立后端：通过 REST/WebSocket 与后端通信；若直连执行端：通过 Wi-Fi 连接设备 IP，使用设备提供的 WebSocket 或 HTTP API，协议与 [docs/04-electrical.md](../../docs/04-electrical.md)、[firmware/README.md](../../firmware/README.md) 一致。

## 技术栈建议

- **Web**：单页或简单多页，HTML + CSS + JS；或 Vue/React 等，响应式布局以支持手机与平板。
- **App**：可选 WebView 壳加载同一套 Web 页，或独立原生/跨平台实现，功能与 Web 版一致。

当前为占位，具体页面与交互在软件架构与协议定稿后在此目录下实现。
