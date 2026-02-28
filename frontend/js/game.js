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
    var usingLocalContent = !!(local.punishments && local.punishments.length) || !!(local.fate_items && local.fate_items.length);
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
        document.getElementById("sideText").textContent = usingLocalContent ? "本局使用本地自定义内容" : "";
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

  /** 校验语音转文字：数字 1-20 顺序基本正确、错误数<2、多余文字≤10 即成功（兼容同音字/识别误差） */
  function validateCount1To20(text) {
    if (!text || typeof text !== "string") return false;
    var s = text.trim().replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); });
    if (!s.length) return false;
    var nums = [];
    var cnMap = { 二十: 20, 十九: 19, 十八: 18, 十七: 17, 十六: 16, 十五: 15, 十四: 14, 十三: 13, 十二: 12, 十一: 11, 十: 10, 九: 9, 八: 8, 七: 7, 六: 6, 五: 5, 四: 4, 三: 3, 二: 2, 一: 1 };
    var re = /二十|十九|十八|十七|十六|十五|十四|十三|十二|十一|十|九|八|七|六|五|四|三|二|一|\d+/g;
    var m;
    while ((m = re.exec(s)) !== null) {
      if (cnMap[m[0]] !== undefined) {
        nums.push(cnMap[m[0]]);
      } else if (/^\d+$/.test(m[0])) {
        var n = parseInt(m[0], 10);
        if (n >= 1 && n <= 20) {
          nums.push(n);
        } else if (n > 20 && /^[1-9]+$/.test(m[0])) {
          for (var j = 0; j < m[0].length; j++) {
            var d = parseInt(m[0][j], 10);
            if (d >= 1 && d <= 9) nums.push(d);
          }
        }
      }
    }
    if (nums.length < 18 || nums.length > 22) return false;
    /* 多余文字不超过 10 个 */
    var numRe = /二十|十九|十八|十七|十六|十五|十四|十三|十二|十一|十|九|八|七|六|五|四|三|二|一|\d+/g;
    var numMatches = s.match(numRe);
    var numChars = numMatches ? numMatches.join("").length : 0;
    var extraChars = Math.max(0, s.replace(/\s/g, "").length - numChars);
    if (extraChars > 10) return false;
    /* 错误数字 < 2：编辑距离（缺失/多余/替换）不超过 2 即通过 */
    var dp = [];
    var i, j;
    for (i = 0; i <= 20; i++) {
      dp[i] = [];
      for (j = 0; j <= nums.length; j++) dp[i][j] = 999;
    }
    dp[0][0] = 0;
    for (j = 1; j <= nums.length; j++) dp[0][j] = j;
    for (i = 1; i <= 20; i++) dp[i][0] = i;
    for (i = 0; i < 20; i++) {
      for (j = 0; j < nums.length; j++) {
        var cost = nums[j] === i + 1 ? 0 : 1;
        dp[i + 1][j + 1] = Math.min(dp[i + 1][j + 1], dp[i][j] + cost);
        dp[i + 1][j] = Math.min(dp[i + 1][j], dp[i][j] + 1);
        dp[i][j + 1] = Math.min(dp[i][j + 1], dp[i][j] + 1);
      }
    }
    return dp[20][nums.length] < 2;
  }

  /** 提交挑战结果并关闭弹窗 */
  function submitChallengeAndClose(modal, startBtn, submitBtn, confirmBtn, success, rollData, callback) {
    modal.classList.add("hidden");
    startBtn.onclick = null;
    submitBtn.onclick = null;
    confirmBtn.onclick = null;
    startBtn.classList.remove("hidden");
    confirmBtn.classList.add("hidden");
    window.api
      .post("/api/games/" + state.gameId + "/challenge-result", { success: success })
      .then(function (res) {
        var d = res;
        d.side_text = d.message || "";
        if (callback) callback(d);
      })
      .catch(function (err) {
        alert("提交挑战结果失败：" + (err.message || err));
        if (callback) callback({ final_position: rollData.final_position, side_text: "挑战格（提交失败）", recent_events: rollData.recent_events, status: state.status, cells: rollData.cells });
      });
  }

  /** 显示挑战格弹窗：优先 Vosk 离线识别，不可用时回退 Web Speech API；校验 1~20 */
  function showChallengeModal(rollData, callback) {
    var modal = document.getElementById("challengeModal");
    var hint = document.getElementById("challengeHint");
    var statusEl = document.getElementById("challengeStatus");
    var transcriptEl = document.getElementById("challengeTranscript");
    var resultEl = document.getElementById("challengeResult");
    var startBtn = document.getElementById("challengeStartBtn");
    var submitBtn = document.getElementById("challengeSubmitBtn");
    var confirmBtn = document.getElementById("challengeConfirmBtn");
    var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    hint.textContent = window.isSecureContext
      ? "点击下方按钮开始录音，或使用手动输入（可配合手机键盘的语音转文字）。"
      : "HTTP 下麦克风不可用，请使用手动输入（可配合手机键盘的语音转文字）。";
    statusEl.textContent = "";
    transcriptEl.textContent = "";
    resultEl.textContent = "";
    resultEl.classList.add("hidden");
    var manualWrap = document.getElementById("challengeManualWrap");
    var manualInput = document.getElementById("challengeManualInput");
    var manualBtn = document.getElementById("challengeManualBtn");
    manualWrap.classList.add("hidden");
    if (manualInput) manualInput.value = "";
    if (window.isSecureContext) {
      startBtn.classList.remove("hidden");
    } else {
      startBtn.classList.add("hidden");
    }
    manualBtn.classList.remove("hidden");
    submitBtn.classList.add("hidden");
    confirmBtn.classList.add("hidden");
    modal.classList.remove("hidden");

    var transcript = "";
    var voskSession = null;
    var manualMode = false;

    manualBtn.onclick = function () {
      manualMode = true;
      if (voskSession && voskSession.stop) {
        voskSession.stop();
        voskSession = null;
      } else if (voskSession && voskSession.type === "webspeech" && voskSession.rec) {
        voskSession.rec.stop();
        voskSession = null;
      }
      startBtn.classList.add("hidden");
      manualBtn.classList.add("hidden");
      manualWrap.classList.remove("hidden");
      submitBtn.classList.remove("hidden");
      statusEl.textContent = "在输入框中输入或使用手机键盘语音转文字，然后点击确认提交。";
    };

    startBtn.onclick = function () {
      if (!window.isSecureContext) {
        statusEl.textContent = "HTTP 下麦克风不可用，请使用手动输入。";
        return;
      }
      transcript = "";
      transcriptEl.textContent = "";
      resultEl.classList.add("hidden");
      statusEl.textContent = "正在准备语音识别...";
      startBtn.disabled = true;

      function tryVoskFirst() {
        if (!window.voskSpeech || !window.voskSpeech.isAvailable()) return false;
        statusEl.textContent = "正在加载 Vosk 模型（约 15 秒超时，超时将使用浏览器识别）...";
        return window.voskSpeech.loadModel(15000)
          .then(function (data) {
            if (!data || !data.model) return null;
            statusEl.textContent = "正在录音...请从 1 数到 20";
            startBtn.classList.add("hidden");
            submitBtn.classList.remove("hidden");
            startBtn.disabled = false;
            return window.voskSpeech.startRecording(
              data.model,
              function (partial) {
                transcriptEl.textContent = (transcript ? transcript + " " : "") + partial;
              },
              function (text) {
                transcript = (transcript ? transcript + " " : "") + text;
                transcriptEl.textContent = transcript;
              }
            );
          })
          .then(function (session) {
            if (session) {
              voskSession = session;
              return true;
            }
            return false;
          })
          .catch(function () { return false; });
      }

      function useWebSpeech() {
        if (!Recognition) {
          statusEl.textContent = "语音识别不可用，将视为挑战成功。";
          startBtn.disabled = false;
          return;
        }
        statusEl.textContent = "正在录音...请从 1 数到 20";
        startBtn.classList.add("hidden");
        submitBtn.classList.remove("hidden");
        startBtn.disabled = false;
        var rec = new Recognition();
        rec.continuous = true;
        rec.lang = "zh-CN";
        rec.interimResults = false;
        rec.onresult = function (e) {
          for (var i = e.resultIndex; i < e.results.length; i++) {
            transcript += e.results[i][0].transcript;
          }
          transcriptEl.textContent = transcript;
        };
        rec.onerror = function (e) {
          statusEl.textContent = "录音出错：" + (e.error || "未知错误");
        };
        rec.start();
        voskSession = { type: "webspeech", rec: rec };
      }

      var p = tryVoskFirst();
      if (p && typeof p.then === "function") {
        p.then(function (used) {
          if (!used) useWebSpeech();
        });
      } else {
        useWebSpeech();
      }
    };

    submitBtn.onclick = function () {
      submitBtn.disabled = true;

      function finish(finalTranscript) {
        var success = validateCount1To20(finalTranscript);
        statusEl.textContent = "转写结果：";
        transcriptEl.textContent = finalTranscript || "（无识别内容）";
        resultEl.textContent = success ? "判定：挑战成功！" : "判定：挑战失败，将后退 2 格。";
        resultEl.classList.remove("hidden");
        submitBtn.classList.add("hidden");
        submitBtn.disabled = false;
        confirmBtn.classList.remove("hidden");
        if (manualMode && manualWrap) manualWrap.classList.add("hidden");
        confirmBtn.onclick = function () {
          submitChallengeAndClose(modal, startBtn, submitBtn, confirmBtn, success, rollData, callback);
        };
      }

      if (manualMode && manualInput) {
        statusEl.textContent = "校验中...";
        var val = (manualInput.value || "").trim();
        finish(val);
        return;
      }

      statusEl.textContent = "转写处理中，请稍候...";
      if (voskSession && voskSession.stop) {
        var finalTranscript = voskSession.getLastTranscript ? voskSession.getLastTranscript() : transcript;
        voskSession.stop();
        voskSession = null;
        finish(finalTranscript || transcriptEl.textContent);
      } else if (voskSession && voskSession.type === "webspeech" && voskSession.rec) {
        voskSession.rec.onend = function () {
          voskSession.rec.onend = null;
          finish(transcript);
        };
        voskSession.rec.stop();
      } else {
        finish(transcript);
      }
    };
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
            } else if (effect && effect.type === "challenge") {
              state.currentPosition = to;
              window.boardRender.setPiecePosition(to);
              showChallengeModal(data, function (result) {
                if (!result.success && result.final_position !== undefined && result.final_position < state.currentPosition) {
                  window.boardRender.animatePiece(state.currentPosition, result.final_position, STEP_DELAY_MS, function () {
                    finishRoll(result);
                  });
                } else {
                  finishRoll(result);
                }
              });
            } else if (to !== finalPos && (effect && (effect.type === "advance" || effect.type === "retreat" || effect.type === "back_to_start" || effect.type === "jump_to_end"))) {
              var msg = message || (effect && effect.type === "advance" ? "前进 " + (effect.steps || 0) + " 格！" : effect && effect.type === "retreat" ? "后退 " + (effect.steps || 0) + " 格！" : effect && effect.type === "back_to_start" ? "退回起点！" : "直达终点！");
              if (data.chain_triggered) {
                msg = "【链式效果已触发】从格" + to + " 移动到格" + finalPos + "\n\n" + msg;
              } else {
                msg = msg + "\n\n（从格" + to + " 到格" + finalPos + "）";
              }
              showEffectModal(msg, function () {
                window.boardRender.animatePiece(to, finalPos, STEP_DELAY_MS, function () {
                  finishRoll(data);
                });
              });
            } else if (to !== finalPos) {
              if (data.chain_triggered) {
                alert("【链式效果已触发】从格" + to + " 移动到格" + finalPos);
              }
              window.boardRender.animatePiece(to, finalPos, STEP_DELAY_MS, function () {
                finishRoll(data);
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
