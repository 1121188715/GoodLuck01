# GoodLuck 更新日志

## v1.0.1.0 (2025-02-28)

### 新功能

#### 1. 挑战格（语音数 1-20）

- **位置**：棋盘上随机 1 格，显示「挑战」
- **流程**：落子 → 弹窗 → 开始录音 → 从 1 数到 20 → 确认提交 → 展示转写与判定 → 确定 → 提交结果
- **校验规则**：
  - 数字 1-20 不缺不少、顺序正确
  - 支持阿拉伯数字与中文数字（一二三…二十）
  - 支持连续数字串如「123456789」拆分为 1-9
  - 支持全角数字自动转半角
  - 多余非数字字符不得超过 5 个
- **结果**：成功无惩罚；失败后退 2 格
- **技术**：Web Speech API（SpeechRecognition），需 Chrome/Edge 和 HTTPS 或 localhost

**相关文件**：

- `backend/app/services/game_service.py`：棋盘生成时增加挑战格；`submit_challenge_result`
- `backend/app/services/cell_effect.py`：`effect_type="challenge"`
- `backend/app/api/games.py`：`POST /api/games/{id}/challenge-result`
- `frontend/js/game.js`：`validateCount1To20`、`showChallengeModal`、语音录制与校验

#### 2. 链式效果（前进/后退后再触发特殊格）

- **逻辑**：落子到前进/后退格后，移动到新格；若新格仍有特殊效果（如退回起点、直达终点），继续触发，直至无位置变化或达到上限 20 次
- **示例**：后退 2 格 → 落在退回起点格 → 先后退 2 格，再触发退回起点，棋子移动到 0
- **实现**：`pos_by_pos` 按位置查找格子，循环处理直到无位置变化
- **调试**：`chain_triggered`、`effect_chain_count` 标记链式效果，弹窗显示「链式效果已触发」

**相关文件**：

- `backend/app/services/game_service.py`：`roll_dice` 中链式效果循环
- `frontend/js/game.js`：对 `back_to_start`、`jump_to_end` 的动画与弹窗处理

#### 3. 本地数据库（修改仅影响本机）

- 修改数据库 → 保存到 localStorage，不再 PUT 到服务器
- 开局时优先用本地数据，若不存在则请求 `/api/database` 默认数据

### 修复与优化

- 挑战格校验：等待 `rec.onend` 后再校验，避免转写未完成
- 连续数字「123456789」按单数字 1-9 拆分解析
- 链式效果：使用 `pos_by_pos` 字典查找格子，避免遍历或加载问题

### 版本标记

- 页面左下角显示 `v1.0.1.0`
- 修改位置：`frontend/index.html` 中 `#appVersion`

---

## v1.0.0.x 历史

- v1.0.0.1：本地数据库、版本标记
- v1.0.0.2：版本号更新
- v1.0.0.3：挑战格布置、退回起点/直达终点样式
- v1.0.0.4：挑战格校验（连续数字拆分）
- v1.0.0.5：挑战格校验延后到 `onend`、全角数字支持
- v1.0.0.6：链式效果首次实现
- v1.0.0.7：链式效果 `back_to_start`/`jump_to_end` 类型、挑战格多余字符限 5 个
- v1.0.0.8：链式效果用 `pos_by_pos` 查找
- v1.0.0.9：链式效果调试弹窗（`chain_triggered`）
