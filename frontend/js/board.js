(function () {
  /**
   * 根据格数规划网格大小。蛇形路径容量：rows*cols 中约一半为整行，一半为单格行。
   * 容量 ≈ ceil(rows/2)*cols + floor(rows/2)。令 rows=cols，解出最小方阵。
   */
  function planGridSize(cellCount) {
    if (cellCount <= 0) return { rows: 1, cols: 1 };
    var n = Math.max(1, Math.ceil(-1 + Math.sqrt(2 * cellCount + 2)));
    return { rows: n, cols: n };
  }

  /**
   * 蛇形路径（你给的坐标规律）：
   * 偶数行整行左→右，奇数行单格向下，再下一行整行右→左，再单格向下……依次类推。
   * 返回 [{r,c}, ...]，r、c 为 0-based。
   */
  function snakePathOrder(rows, cols, count) {
    var result = [];
    var r = 0;
    var c = 0;
    var dir = 1; /* 1 = 向右, -1 = 向左 */
    var i;
    for (i = 0; i < count; i++) {
      result.push({ r: r, c: c });
      if (r % 2 === 0) {
        if (dir === 1) {
          c++;
          if (c >= cols) {
            c = cols - 1;
            r++;
            dir = -1;
          }
        } else {
          c--;
          if (c < 0) {
            c = 0;
            r++;
            dir = 1;
          }
        }
      } else {
        r++;
      }
      if (r >= rows) break;
    }
    return result;
  }

  function renderBoard(cells, currentPosition) {
    var board = document.getElementById("board");
    board.innerHTML = "";
    if (!cells || !cells.length) return;
    var cellCount = cells.length;
    var grid = planGridSize(cellCount);
    var rows = grid.rows;
    var cols = grid.cols;
    var positions = snakePathOrder(rows, cols, cellCount);
    var cellSize = 92;
    board.className = "board board-snake";
    board.style.gridTemplateColumns = "repeat(" + cols + ", " + cellSize + "px)";
    board.style.gridTemplateRows = "repeat(" + rows + ", " + cellSize + "px)";
    board.dataset.rows = rows;
    board.dataset.cols = cols;
    var i, r, c, cell, div, type, text, parts, line1, line2;
    for (i = 0; i < cellCount; i++) {
      r = positions[i].r;
      c = positions[i].c;
      cell = cells[i];
      type = cell.cell_type || "normal";
      text = cell.display_text || "";
      div = document.createElement("div");
      div.className = "cell " + type;
      if (text === "下一次翻倍" || type === "double_next") {
        div.classList.add("double_next");
      }
      div.dataset.position = i;
      div.style.gridRow = (r + 1);
      div.style.gridColumn = (c + 1);
      parts = text.split(/\s+/);
      if (parts.length >= 2 && /^\d+$/.test(parts[parts.length - 1])) {
        line2 = parts.pop();
        line1 = parts.join(" ");
        div.appendChild(document.createElement("span")).className = "cell-line1";
        div.lastChild.textContent = line1;
        div.appendChild(document.createElement("span")).className = "cell-line2";
        div.lastChild.textContent = line2;
      } else {
        div.appendChild(document.createElement("span")).className = "cell-line1";
        div.lastChild.textContent = text;
      }
      if (i === currentPosition) {
        div.classList.add("current");
        var piece = document.createElement("div");
        piece.className = "piece";
        div.appendChild(piece);
      }
      board.appendChild(div);
    }
  }

  function setPiecePosition(position) {
    var board = document.getElementById("board");
    board.querySelectorAll(".cell").forEach(function (el) {
      el.classList.remove("current");
      el.querySelectorAll(".piece").forEach(function (p) {
        p.remove();
      });
    });
    var target = board.querySelector('[data-position="' + position + '"]');
    if (target) {
      target.classList.add("current");
      var piece = document.createElement("div");
      piece.className = "piece";
      target.appendChild(piece);
    }
  }

  function animatePiece(from, to, stepDelay, callback) {
    if (from === to) {
      if (callback) callback();
      return;
    }
    var step = to > from ? 1 : -1;
    var next = from + step;
    setPiecePosition(next);
    if (next === to) {
      if (callback) setTimeout(callback, stepDelay);
      else setTimeout(function () {}, stepDelay);
      return;
    }
    setTimeout(function () {
      animatePiece(next, to, stepDelay, callback);
    }, stepDelay);
  }

  function updatePiecePosition(cells, fromPos, toPos) {
    setPiecePosition(toPos);
  }

  window.boardRender = {
    render: renderBoard,
    updatePiece: updatePiecePosition,
    setPiecePosition: setPiecePosition,
    animatePiece: animatePiece,
  };
})();
