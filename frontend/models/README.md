# Vosk 语音识别模型

挑战格使用 Vosk 进行离线语音转文字，以改善移动端体验。需将模型文件放在此目录。

## 获取中文模型

1. 下载：https://alphacephei.com/vosk/models 中的 **vosk-model-small-cn-0.22**（约 42MB）
2. 解压后得到 `vosk-model-small-cn-0.22` 文件夹
3. 打包为 tar.gz：
   ```bash
   mv vosk-model-small-cn-0.22 model
   tar czvf model.tar.gz model
   ```
4. 将 `model.tar.gz` 放入本目录（即 `frontend/models/model.tar.gz`）
5. 确保 Web 服务器可访问 `/models/model.tar.gz`

## 可选：英文模型

若希望用英文 "one two three... twenty"，可改用 `vosk-model-small-en-us-0.15`（约 40MB），步骤同上。
