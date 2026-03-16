# 电气相关文档

本目录用于存放 AutoMaster 电气接线、主控与驱动方案说明。

## 设计文档索引

- 电气与通信架构（主控、驱动、传感器、通信协议）：见项目根目录 [docs/04-electrical.md](../../docs/04-electrical.md)。
- 电机选型与接口（电压、STEP/DIR、PWM 等）：见 [docs/03-motor-selection.md](../../docs/03-motor-selection.md)。
- 固件与协议实现：见 [firmware/README.md](../../firmware/README.md)。

## 本目录文件

- **[bom_electrical.md](bom_electrical.md)**：电气 BOM 与选型（ESP32 主控、挥动轴直流电机与 H 桥、左右/远近步进与驱动器、电源、限位等），成本与可拓展性优先。

## 选型摘要（与 docs 一致）

- **主控**：推荐 ESP32；备选 STM32 + 串口 Wi-Fi 模块。
- **驱动**：挥动轴 12 V 直流 + L298N/TB6612；左右/远近 NEMA17 + A4988/TMC2208。
- **传感器**：各轴限位开关 4–6 个；可选电流采样做力度/过流保护。
- **通信**：ESP32 内置 Wi-Fi（TCP/WebSocket），协议见 `docs/04-electrical.md` 与 `firmware/README.md`。

可在此目录下补充接线图说明（如 `wiring.md`），命名建议带版本或日期。
