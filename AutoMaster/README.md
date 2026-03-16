# AutoMaster

便携式自动拍打机及配套软件控制系统。设备可简易安装于地面或床边，末端夹持柳条或木板，模拟人手用力挥动拍击后背等部位，支持力度/频率/拍击范围可调，并通过机械与软件实现平直、均匀的拍打效果。

## 当前阶段

**基础设计 v1**：已完成目录结构、设计文档、硬件选型与挥动机构 A/B 两套 BOM（含估价）。固件与软件控制端尚未编码。

**下次继续前**：可先看 [docs/进度与讨论总结.md](docs/进度与讨论总结.md)，快速回顾讨论结论与待办。

## 目录说明

| 路径 | 说明 |
|------|------|
| [docs/](docs/) | 设计文档：总览、机械、电机选型、电气与通信、软件架构 |
| [hardware/mechanical/](hardware/mechanical/) | 机械草图、尺寸说明（文本或示意图） |
| [hardware/electrical/](hardware/electrical/) | 电气接线、主控与驱动方案说明 |
| [firmware/](firmware/) | 下位机/执行端固件架构与协议 |
| [software/backend/](software/backend/) | 可选上位机后端 API |
| [software/frontend/](software/frontend/) | Web 控制页或 App 前端 |

## 如何阅读与迭代

1. **先读文档**：从 [docs/01-overview.md](docs/01-overview.md) 了解系统与需求，再按需阅读 [02-mechanical.md](docs/02-mechanical.md)、[03-motor-selection.md](docs/03-motor-selection.md)、[04-electrical.md](docs/04-electrical.md)、[05-software.md](docs/05-software.md)。
2. **讨论与修改**：可针对某篇文档提出修改意见（如机械方案、电机型号、协议字段），在 `docs/` 中更新后同步到 `hardware/`、`firmware/`、`software/` 的 README。
3. **实现阶段**：在机械与电机方案基本确定后，再细化电气接线与固件/软件实现，并在此仓库中逐步增加代码与图纸说明（不强制提交 CAD/PCB 源文件，可仅描述接口与规格）。

本仓库中 AutoMaster 为独立子项目，与同仓库下其他项目（如 GoodLuck）无代码耦合。
