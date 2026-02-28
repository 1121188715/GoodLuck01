(function () {
  // 开发时连本地后端；部署后与页面同域，用相对路径
  window.API_BASE = window.API_BASE || (
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? "http://localhost:8000"
      : ""
  );

  window.api = {
    async get(path) {
      const res = await fetch(window.API_BASE + path);
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "请求失败");
      return json.data;
    },
    async post(path, body) {
      const res = await fetch(window.API_BASE + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "请求失败");
      return json.data;
    },
    async put(path, body) {
      const res = await fetch(window.API_BASE + path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "请求失败");
      return json.data;
    },
  };
})();
