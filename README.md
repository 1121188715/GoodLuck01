# GoodLuck 单人飞行棋

网页版单人飞行棋：棋盘路径 + 骰子驱动棋子移动 + 格子文案与互动效果。

## 运行方式

### 后端

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API 文档：http://localhost:8000/docs  
- 首次启动会自动建表并插入一条测试棋盘（20 格，含前进/后退/命运格）。

### 前端

用浏览器打开 `frontend/index.html`，或使用静态服务器（避免 file:// 跨域时可将 API 改为同源或后端代理）：

```bash
cd frontend
# 若已安装 Python：
python -m http.server 5500
```

浏览器访问 http://localhost:5500 ，在页面中选择棋盘后即可掷骰子游戏。  
若前端与后端不同端口，需在后端配置 CORS（已默认允许常见本地端口）。

### API 基地址

前端默认请求 `http://localhost:8000`。若后端端口不同，在打开页面之前可在控制台或 `frontend/js/app.js` 中设置 `window.API_BASE = "http://你的地址:端口"`。

## 项目结构

- `backend/`：FastAPI + SQLite，棋盘/格子/对局/文案池与掷骰子、格子效果逻辑。
- `frontend/`：单页 HTML + CSS + JS，棋盘渲染、掷骰子、侧边栏文案与记录。

详见设计计划文档。
