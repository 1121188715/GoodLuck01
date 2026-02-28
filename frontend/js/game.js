(function () {
  var state = {
    gameId: null,
    boardName: "",
    currentPosition: 0,
    cellCount: 0,
    cells: [],
    status: "playing",
  };

  var STEP_DELAY_MS = 380;
  var DICE_FAST_MS = 80;
  var DICE_SLOW_DELAYS = [140, 200, 320];

  function updateGameInfo() {
    document.getElementById("boardName").textContent = state.boardName || "--";
    document.getElementById("currentPos").textContent = state.currentPosition;
    document.getElementById("totalCells").textContent = state.cellCount;
    document.getElementById("gameStatus").textContent =
      state.status === "finished" ? "（已到达终点）" : "";
  }

  var defaultBoardId = 1;

  function showStartScreen(boards) {
    var list = document.getElementById("boardList");
    list.innerHTML = "";
    if (boards && boards.length) {
      defaultBoardId = boards[0].id;
    }
    var li = document.createElement("li");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "生成棋盘并开始游戏";
    btn.className = "roll-btn";
    btn.addEventListener("click", function () {
      startGame(defaultBoardId);
    });
    li.appendChild(btn);
    list.appendChild(li);
    document.getElementById("startScreen").classList.remove("hidden");
  }

  function hideStartScreen() {
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("restartBtn").style.display = "block";
    document.getElementById("refreshContentBtn").style.display = "inline-block";
  }

  function showStartScreenOnly() {
    document.getElementById("startScreen").classList.remove("hidden");
    document.getElementById("restartBtn").style.display = "none";
    document.getElementById("refreshContentBtn").style.display = "none";
  }

  function getLocalContent() {
    try {
      var raw = localStorage.getItem("goodluck_local_content");
      if (!raw) return { punishments: null, fate_items: null };
      var stored = JSON.parse(raw);
      return {
        punishments: stored.punishments && stored.punishments.length ? stored.punishments : null,
        fate_items: stored.fate_items && stored.fate_items.length ? stored.fate_items : null,
      };
    } catch (e) { return { punishments: null, fate_items: null }; }
  }

  function startGame(boardId) {
    var local = getLocalContent();
    var body = {
        board_id: boardId,
        cell_count: (function () {
          var el = document.getElementById("boardSizeInput");
          if (!el) return 20;
          var v = parseInt(el.value, 10);
          if (isNaN(v)) v = 20;
          if (v < 10) v = 10;
          if (v > 200) v = 200;
          return v;
        })(),
        difficulty: (function () {
          var sel = document.getElementById("difficultySelect");
          return sel ? sel.value : "hard";
        })(),
      };
    if (local.punishments) body.custom_punishments = local.punishments;
    if (local.fate_items) body.custom_fate_items = local.fate_items;
    window.api
      .post("/api/games", body)
      .then(function (data) {
        state.gameId = data.game_id;
        state.boardName = data.board_name;
        state.currentPosition = data.current_position;
        state.cellCount = data.cell_count;
        state.cells = data.cells || [];
        state.status = data.status;
        hideStartScreen();
        updateGameInfo();
        window.boardRender.render(state.cells, state.currentPosition);
        document.getElementById("rollBtn").disabled = state.status === "finished";
        document.getElementById("sideText").textContent = "";
        renderEvents(data.recent_events);
      })
      .catch(function (err) {
        alert("创建对局失败：" + (err.message || err));
      });
  }

  function renderEvents(events) {
    var ul = document.getElementById("recentEvents");
    ul.innerHTML = "";
    if (!events || !events.length) return;
    events.slice().reverse().forEach(function (ev) {
      var li = document.createElement("li");
      li.textContent = (ev.detail || ev.type || "") + " (格" + (ev.position ?? "") + ")";
      ul.appendChild(li);
    });
  }

  function setSideText(text) {
    document.getElementById("sideText").textContent = text || "";
  }

  /** 显示特效弹窗，点击确定后执行 callback */
  function showEffectModal(message, callback) {
    var modal = document.getElementById("effectModal");
    var textEl = document.getElementById("effectModalText");
    var btn = document.getElementById("effectModalBtn");
    textEl.textContent = message || "触发特效！";
    modal.classList.remove("hidden");
    function close() {
      modal.classList.add("hidden");
      btn.removeEventListener("click", close);
      if (callback) callback();
    }
    btn.addEventListener("click", close);
  }

  /** 开始骰子快速循环，返回 stopOn(finalDice, onDone)：在得到点数后减速并停在 finalDice，再执行 onDone */
  function startDiceCycle() {
    var diceEl = document.getElementById("diceDisplay");
    diceEl.classList.add("rolling");
    var cycle = 1;
    diceEl.textContent = cycle;
    var iv = setInterval(function () {
      cycle = (cycle % 6) + 1;
      diceEl.textContent = cycle;
    }, DICE_FAST_MS);
    return function stopOn(finalDice, onDone) {
      clearInterval(iv);
      var idx = 0;
      function slowTick() {
        if (idx < DICE_SLOW_DELAYS.length) {
          cycle = (cycle % 6) + 1;
          diceEl.textContent = cycle;
          setTimeout(slowTick, DICE_SLOW_DELAYS[idx]);
          idx++;
        } else {
          diceEl.textContent = finalDice;
          diceEl.classList.remove("rolling");
          if (onDone) onDone();
        }
      }
      setTimeout(slowTick, DICE_SLOW_DELAYS[0]);
    };
  }

  document.getElementById("rollBtn").addEventListener("click", function () {
    if (!state.gameId || state.status === "finished") return;
    var btn = document.getElementById("rollBtn");
    btn.disabled = true;
    var stopDice = startDiceCycle();
    window.api
      .post("/api/games/" + state.gameId + "/roll")
      .then(function (data) {
        var to = data.to_position;
        var finalPos = data.final_position;
        var effect = data.effect;
        var message = data.message;
        stopDice(data.dice, function () {
          window.boardRender.animatePiece(state.currentPosition, to, STEP_DELAY_MS, function () {
            if (effect && effect.type === "double_next") {
              showEffectModal(message || "下一次翻倍！接下来两次掷骰中，所有格子数字将翻倍。", function () {
                finishRoll(data);
              });
            } else if (effect && (effect.type === "advance" || effect.type === "retreat") && to !== finalPos) {
              showEffectModal(message || (effect.type === "advance" ? "前进 " + (effect.steps || 0) + " 格！" : "后退 " + (effect.steps || 0) + " 格！"), function () {
                window.boardRender.animatePiece(to, finalPos, STEP_DELAY_MS, function () {
                  finishRoll(data);
                });
              });
            } else {
              finishRoll(data);
            }
          });
        });
      })
      .catch(function (err) {
        document.getElementById("diceDisplay").classList.remove("rolling");
        document.getElementById("diceDisplay").textContent = "?";
        btn.disabled = false;
        alert("掷骰子失败：" + (err.message || err));
      });
  });

  function finishRoll(data) {
    state.currentPosition = data.final_position;
    if (data.cells && data.cells.length) {
      state.cells = data.cells;
      window.boardRender.render(state.cells, state.currentPosition);
    } else {
      window.boardRender.setPiecePosition(state.currentPosition);
    }
    if (data.side_text) setSideText(data.side_text);
    if (data.recent_events) renderEvents(data.recent_events);
    updateGameInfo();
    if (data.status != null) state.status = data.status;
    if (state.status === "finished") {
      setSideText((document.getElementById("sideText").textContent || "") + "\n恭喜到达终点！");
    }
    document.getElementById("rollBtn").disabled = state.status === "finished";
  }

  document.getElementById("restartBtn").addEventListener("click", function () {
    showStartScreenOnly();
  });

  document.getElementById("refreshContentBtn").addEventListener("click", function () {
    if (!state.gameId) return;
    window.api
      .get("/api/games/" + state.gameId + "?refresh_content=1")
      .then(function (data) {
        state.cells = data.cells || [];
        window.boardRender.render(state.cells, state.currentPosition);
      })
      .catch(function (err) {
        alert("刷新失败：" + (err.message || err));
      });
  });

  window.addEventListener("DOMContentLoaded", function () {
    document.getElementById("restartBtn").style.display = "none";
    document.getElementById("refreshContentBtn").style.display = "none";
    window.api
      .get("/api/boards")
      .then(function (data) {
        var boards = Array.isArray(data) ? data : (data && data.length ? data : []);
        if (boards.length === 0) {
          document.getElementById("boardList").innerHTML =
            "<li>暂无棋盘，请先启动后端并初始化数据</li>";
        } else {
          showStartScreen(boards);
        }
      })
      .catch(function () {
        document.getElementById("boardList").innerHTML =
          "<li>无法连接后端，请确认 API 地址 " + window.API_BASE + " 可访问</li>";
        document.getElementById("startScreen").classList.remove("hidden");
      });
  });
})();
