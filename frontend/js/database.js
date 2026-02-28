(function () {
  var modal, punishmentsBody, fateItemsBody;
  var data = { punishments: [], content_pools: [] };
  var fatePoolIdx = 0;

  function openModal() {
    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  var STORAGE_KEY = "goodluck_local_content";

  function loadFromLocal() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var stored = JSON.parse(raw);
      if (!stored.punishments || !stored.punishments.length) return null;
      return stored;
    } catch (e) { return null; }
  }

  function saveToLocal() {
    var payload = {
      punishments: data.punishments.map(function (p) { return p.name || ""; }).filter(Boolean),
      fate_items: (fatePoolIdx >= 0 && data.content_pools[fatePoolIdx] && data.content_pools[fatePoolIdx].items)
        ? data.content_pools[fatePoolIdx].items.map(function (i) { return i.text || ""; }).filter(Boolean)
        : [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function loadData() {
    var local = loadFromLocal();
    if (local) {
      data.punishments = (local.punishments || []).map(function (n) { return { id: null, name: n, description: null, weight: 1 }; });
      data.content_pools = [{ id: null, name: "命运", items: (local.fate_items || []).map(function (t) { return { id: null, text: t, weight: 1 }; }) }];
      fatePoolIdx = 0;
      render();
      openModal();
      return;
    }
    fetch((window.API_BASE || "") + "/api/database", { cache: "no-store" })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        var res = json.data || json;
        data.punishments = res.punishments || [];
        data.content_pools = res.content_pools || [];
        var idx = data.content_pools.findIndex(function (p) {
          return p.name === "命运" || (p.name && p.name.indexOf("命运") >= 0);
        });
        fatePoolIdx = idx >= 0 ? idx : (data.content_pools.length ? 0 : -1);
        render();
        openModal();
      })
      .catch(function (err) {
        alert("加载数据库失败：" + (err.message || String(err)));
      });
  }

  function render() {
    punishmentsBody.innerHTML = "";
    data.punishments.forEach(function (item, idx) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        (idx + 1) +
        "</td><td><input type='text' class='db-input' data-kind='punishment' data-idx='" +
        idx +
        "' value='" +
        (item.name || "").replace(/'/g, "&#39;") +
        "' /></td><td><button type='button' class='db-del-btn' data-kind='punishment' data-idx='" +
        idx +
        "'>删除</button></td>";
      punishmentsBody.appendChild(tr);
    });

    var fateItems = [];
    if (fatePoolIdx >= 0 && fatePoolIdx < data.content_pools.length) {
      fateItems = data.content_pools[fatePoolIdx].items || [];
    }
    fateItemsBody.innerHTML = "";
    fateItems.forEach(function (item, idx) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        (idx + 1) +
        "</td><td><input type='text' class='db-input' data-kind='fate' data-idx='" +
        idx +
        "' value='" +
        (item.text || "").replace(/'/g, "&#39;").replace(/"/g, "&quot;") +
        "' /></td><td><button type='button' class='db-del-btn' data-kind='fate' data-idx='" +
        idx +
        "'>删除</button></td>";
      fateItemsBody.appendChild(tr);
    });
  }

  function collectFromDom() {
    document.querySelectorAll(".db-input[data-kind='punishment']").forEach(function (el) {
      var idx = parseInt(el.dataset.idx, 10);
      if (idx >= 0 && idx < data.punishments.length) {
        data.punishments[idx].name = el.value.trim() || "未命名";
      }
    });
    document.querySelectorAll(".db-input[data-kind='fate']").forEach(function (el) {
      var idx = parseInt(el.dataset.idx, 10);
      var pool = fatePoolIdx >= 0 ? data.content_pools[fatePoolIdx] : null;
      if (pool && pool.items && idx >= 0 && idx < pool.items.length) {
        pool.items[idx].text = el.value.trim() || "";
      }
    });
  }

  function saveData() {
    collectFromDom();
    saveToLocal();
    alert("已保存到本地，仅在你当前设备/浏览器生效");
    closeModal();
  }

  function addPunishment() {
    data.punishments.push({ id: null, name: "", description: null, weight: 1 });
    render();
  }

  function addFateItem() {
    if (fatePoolIdx < 0 || fatePoolIdx >= data.content_pools.length) {
      data.content_pools.push({ id: null, name: "命运", items: [] });
      fatePoolIdx = data.content_pools.length - 1;
    }
    var pool = data.content_pools[fatePoolIdx];
    if (!pool.items) pool.items = [];
    pool.items.push({ id: null, text: "", weight: 1 });
    render();
  }

  function removeItem(kind, idx) {
    if (kind === "punishment" && idx >= 0 && idx < data.punishments.length) {
      data.punishments.splice(idx, 1);
    } else if (kind === "fate" && fatePoolIdx >= 0 && fatePoolIdx < data.content_pools.length) {
      var pool = data.content_pools[fatePoolIdx];
      if (pool && pool.items && idx >= 0 && idx < pool.items.length) {
        pool.items.splice(idx, 1);
      }
    }
    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    modal = document.getElementById("databaseModal");
    punishmentsBody = document.getElementById("punishmentsBody");
    fateItemsBody = document.getElementById("fateItemsBody");

    document.getElementById("editDatabaseBtn").addEventListener("click", function () {
      loadData();
    });

    document.getElementById("databaseModalClose").addEventListener("click", closeModal);
    document.getElementById("databaseCancelBtn").addEventListener("click", closeModal);

    document.getElementById("databaseSaveBtn").addEventListener("click", saveData);

    document.getElementById("addPunishmentBtn").addEventListener("click", addPunishment);
    document.getElementById("addFateItemBtn").addEventListener("click", addFateItem);

    modal.addEventListener("click", function (e) {
      var btn = e.target.closest(".db-del-btn");
      if (btn) {
        removeItem(btn.dataset.kind, parseInt(btn.dataset.idx, 10));
      }
    });
  });
})();
