"""应用配置：数据库路径、开关等"""
import os

# 数据库 URL，开发用 SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./goodluck.db")

# API 基路径（供前端配置用）
API_BASE = os.getenv("API_BASE", "http://localhost:8000")

# CORS 允许的源；部署时可设环境变量 CORS_ORIGINS=* 允许所有
_cors = os.getenv("CORS_ORIGINS", "")
CORS_ORIGINS = ["*"] if _cors == "*" else ["http://localhost:3000", "http://127.0.0.1:5500", "http://localhost:5500", "null"]
