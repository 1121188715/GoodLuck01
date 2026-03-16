# 固件（执行端）

下位机/执行端固件，运行于主控 MCU（如 ESP32/STM32），负责接收控制端指令、驱动电机、读取限位与可选传感器，并上报状态。

## 职责

- 接收并解析控制端指令（JSON 或约定二进制格式），见 [docs/04-electrical.md](../docs/04-electrical.md) 与 [docs/05-software.md](../docs/05-software.md)。
- 挥动轴、左右轴、远近轴的运动控制（PWM、STEP/DIR 或伺服协议）。
- 限位开关处理：触发时立即停止对应轴并上报。
- 可选：编码器/电流反馈、闭环或力度/过流保护。
- 通信：Wi-Fi（TCP/WebSocket）、BLE 或 USB 串口，与软件控制端协议一致。

## 协议对应

- 指令：`set`（力度、频率、范围）、`start`、`pause`、`stop`、`single_hit` 等，字段与单位与 `docs/05-software.md` 中约定一致。
- 状态：`status`、`freq`、`force_level`、`limit_triggered`、错误码等，便于控制端显示与告警。

详细报文格式在实现时在本目录或 `docs/` 下单独文档化（如 `protocol.md`），便于前后端与固件对齐。

## 工程结构建议

- **ESP32**：ESP-IDF 或 Arduino 框架；若需内置 Web 控制页，可提供 HTTP + WebSocket 或仅 TCP/WebSocket 供前端连接。
- **STM32**：STM32Cube 或 HAL；通信可经 UART 转 Wi-Fi 模块或 USB CDC，协议与上述一致。

当前为占位，具体工程与源码在电气方案与协议定稿后在此目录下按模块添加。
