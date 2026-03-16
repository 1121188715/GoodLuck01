# AutoMaster 电气与通信架构

## 1. 主控

- **推荐**：**ESP32 开发板**（成本与可拓展性优先），负责：
  - 接收控制端指令（Wi-Fi + TCP/WebSocket，或 BLE，或 USB 串口）
  - 解析参数（力度、频率、拍击范围等）与命令（开始、暂停、急停）
  - 驱动挥动轴（PWM + 方向）、左右/远近轴（STEP/DIR）
  - 读取限位开关、可选编码器或电流采样，实现安全限位与力度保护
- **备选**：STM32 + 串口 Wi-Fi 模块，适合对多轴实时性要求更高的扩展。具体型号见 [hardware/electrical/bom_electrical.md](../hardware/electrical/bom_electrical.md)。

---

## 2. 驱动

- **挥动轴**：直流有刷 → H 桥或直流驱动板；步进 → 步进驱动器（STEP/DIR）；伺服 → 伺服驱动器（脉冲/串口/CAN）。
- **左右轴 / 远近轴**：步进驱动器或直流+编码器驱动板；若与挥动轴共用主控，需保证 GPIO/定时器资源足够（至少 3 轴控制 + 限位输入）。
- **供电**：电机与主控共地；电机电源与逻辑电源可分离（如 24 V 电机、3.3/5 V 逻辑），注意共地与隔离。

---

## 3. 传感器

- **限位开关**：各轴至少一端或两端限位，防止机械超程；接入 MCU 数字输入，触发时立即停止该轴并上报状态。
- **可选**：编码器（位置/速度反馈）、电流采样（力矩或过流保护），用于闭环或力度/安全保护。

---

## 4. 通信与协议

- **控制端 ↔ 执行端**：
  - **Wi-Fi**：执行端开 TCP 服务或 WebSocket，控制端（App/Web）连接后发送 JSON 指令、接收状态。适合局域网内手机与网页控制。
  - **BLE**：低功耗、适合手机直连，需在 App 或固件中实现 GATT 服务与特征值定义。
  - **USB 串口**：调试与有线控制，协议可复用同一套 JSON 或自定义帧格式。
- **协议约定**（与 [05-software.md](05-software.md) 对齐）：
  - 指令示例：`{"cmd":"set","force":2,"freq":0.5,"range":{...}}`、`{"cmd":"start"}`、`{"cmd":"stop"}`。
  - 状态上报：`{"status":"idle|running|error","freq":0.5,"limit_triggered":[]}`。
  - 具体字段与错误码在固件与软件实现时统一文档化，见 `firmware/README.md`。

---

## 5. 文档与实现

- **具体选型与 BOM**：主控（推荐 ESP32）、挥动轴直流电机与 H 桥、左右/远近步进与驱动器、电源与限位见 [hardware/electrical/bom_electrical.md](../hardware/electrical/bom_electrical.md)。
- 固件架构与协议实现见 `firmware/README.md`。
