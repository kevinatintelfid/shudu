(function () {
  "use strict";
  const byId = id => document.getElementById(id);
  const storageKey = "shudu.game.v1";
  const bestKey = "shudu.best.v1";
  let game = null;
  let selected = 0;
  let pencil = false;
  let paused = false;
  let busy = false;
  let storageAvailable = true;
  let previousTick = performance.now();
  let lastSave = 0;
  let best = {};
  const cells = [];
  const pad = [];
  const newDialog = byId("new-dialog");
  const winDialog = byId("win-dialog");

  function icons() { lucide.createIcons(); }
  function formatTime(seconds) {
    const whole = Math.floor(seconds);
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor(whole % 3600 / 60);
    return (hours ? hours + ":" : "") + String(minutes).padStart(2, "0") + ":" + String(whole % 60).padStart(2, "0");
  }
  function locked() { return !game || paused || busy || Sudoku.complete(game); }
  function say(message) { byId("announcement").textContent = message; }

  function save() {
    if (!game) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...game, history: [], future: [] }));
      storageAvailable = true;
    } catch {
      storageAvailable = false;
    }
    byId("save-status").textContent = storageAvailable ? "Saved on this device" : "Progress not saved (storage unavailable)";
  }

  function tick() {
    const now = performance.now();
    if (game && !locked() && !newDialog.open && !winDialog.open) game.elapsed += (now - previousTick) / 1000;
    previousTick = now;
    updateClock();
  }

  function paintStars(id, count) {
    byId(id).querySelectorAll("svg").forEach((star, index) => star.classList.toggle("unearned", index >= count));
    byId(id).setAttribute("aria-label", count + " out of 3 stars");
  }

  function updateClock() {
    if (!game) return;
    byId("timer").textContent = formatTime(game.elapsed);
    const rating = Sudoku.rating(game);
    paintStars("pace-stars", rating.stars);
    byId("pace-label").textContent = ["", "One-star pace", "Two-star pace", "Three-star pace"][rating.stars];
    byId("target-time").textContent = formatTime(Sudoku.levels[game.level].par) + " target";
  }

  function render() {
    const isLocked = locked();
    const finished = game && Sudoku.complete(game);
    const cover = byId("board-cover");
    cover.hidden = Boolean(game && !paused && !busy);
    cover.classList.toggle("loading", busy);
    byId("cover-title").textContent = busy ? "Finding your puzzle" : paused ? "A moment to pause." : "Ready for a puzzle?";
    byId("cover-icon").innerHTML = '<i data-lucide="' + (busy ? "loader-circle" : "pause") + '"></i>';
    byId("resume").hidden = !paused || busy;
    byId("board").inert = paused || busy || !game;
    byId("board").setAttribute("aria-hidden", String(paused || busy || !game));
    byId("pause").disabled = !game || busy || finished;
    byId("pause").setAttribute("aria-label", paused ? "Resume game" : "Pause game");
    byId("pause").title = paused ? "Resume game" : "Pause game";
    byId("pause").innerHTML = '<i data-lucide="' + (paused ? "play" : "pause") + '"></i>';
    byId("new-game").disabled = busy;
    byId("difficulty").disabled = busy;
    byId("number-mode").disabled = isLocked;
    byId("notes-mode").disabled = isLocked;
    byId("number-mode").setAttribute("aria-pressed", String(!pencil));
    byId("notes-mode").setAttribute("aria-pressed", String(pencil));
    byId("undo").disabled = isLocked || !game.history.length;
    byId("redo").disabled = isLocked || !game.future.length;
    byId("erase").disabled = isLocked || Boolean(game.givens[selected]) || (!game.board[selected] && !game.notes[selected].length);
    byId("hint").disabled = isLocked;
    if (game) {
      const conflicts = Sudoku.conflicts(game);
      cells.forEach((cell, index) => {
        const value = game.board[index];
        cell.className = "cell" + (game.givens[index] ? " given" : "") + (index === selected ? " selected" : "") +
          (Sudoku.peers[selected].includes(index) ? " peer" : "") +
          (value && value === game.board[selected] ? " same" : "") + (conflicts[index] ? " conflict" : "");
        cell.tabIndex = index === selected ? 0 : -1;
        cell.setAttribute("aria-selected", String(index === selected));
        cell.setAttribute("aria-readonly", String(Boolean(game.givens[index]) || finished));
        cell.setAttribute("aria-invalid", String(conflicts[index]));
        const noteLabel = game.notes[index].length ? ", notes " + game.notes[index].join(", ") : "";
        cell.setAttribute("aria-label", "Row " + (Math.floor(index / 9) + 1) + ", column " + (index % 9 + 1) + ", " + (value || "empty") +
          (game.givens[index] ? ", given" : "") + noteLabel + (conflicts[index] ? ", conflict" : ""));
        cell.replaceChildren();
        if (value) cell.textContent = value;
        else if (game.notes[index].length) {
          const notes = document.createElement("span");
          notes.className = "notes-grid";
          notes.setAttribute("aria-hidden", "true");
          for (let number = 1; number <= 9; number++) {
            const note = document.createElement("span");
            note.className = "note";
            note.textContent = game.notes[index].includes(number) ? number : "";
            notes.append(note);
          }
          cell.append(notes);
        }
      });
      const filled = game.board.filter(Boolean).length;
      byId("filled-count").textContent = filled + " / 81 filled";
      byId("percent").textContent = Math.round(filled / 81 * 100) + "%";
      byId("completion-fill").style.width = filled / 81 * 100 + "%";
      byId("completion-fill").parentElement.setAttribute("aria-valuenow", filled);
      byId("current-level").textContent = Sudoku.levels[game.level].label;
      byId("puzzle-state").textContent = finished ? "Completed" : paused ? "Paused" : "In progress";
      byId("hint-count").textContent = game.hints;
      byId("best-score").textContent = best[game.level] ? best[game.level].toLocaleString() + " pts" : "--";
      pad.forEach((button, index) => {
        const remaining = Math.max(0, 9 - game.board.filter(value => value === index + 1).length);
        button.querySelector(".remaining").textContent = remaining;
        button.setAttribute("aria-label", (pencil ? "Note " : "Enter ") + (index + 1) + ", " + remaining + " remaining");
        button.classList.toggle("exhausted", remaining === 0);
      });
    }
    pad.forEach(button => { button.disabled = isLocked || Boolean(game.givens[selected]); });
    icons();
    updateClock();
  }

  function finish() {
    const rating = Sudoku.rating(game);
    best[game.level] = Math.max(best[game.level] || 0, rating.score);
    try { localStorage.setItem(bestKey, JSON.stringify(best)); } catch { storageAvailable = false; }
    byId("final-score").textContent = rating.score.toLocaleString();
    byId("final-level").textContent = Sudoku.levels[game.level].label;
    byId("final-time").textContent = formatTime(game.elapsed);
    byId("final-hints").textContent = game.hints + (game.hints ? " (+" + game.hints * 60 + "s)" : "");
    byId("final-adjusted").textContent = formatTime(rating.adjusted);
    paintStars("win-stars", rating.stars);
    say("Puzzle complete. " + rating.stars + " stars, " + rating.score + " points.");
    winDialog.showModal();
  }

  function changed() {
    const conflicts = Sudoku.conflicts(game).filter(Boolean).length;
    say(conflicts ? "A number repeats in a row, column, or box." : "");
    if (Sudoku.complete(game)) finish();
    save();
    render();
  }

  function choose(index, focus = true) {
    if (!game || paused || busy) return;
    selected = index;
    render();
    if (focus) cells[selected].focus({ preventScroll: true });
  }

  function input(value) {
    tick();
    if (locked()) return;
    if (Sudoku.enter(game, selected, value, pencil && value !== 0)) changed();
  }

  function setMode(notes) {
    if (locked()) return;
    pencil = notes;
    render();
  }

  function pause(value) {
    tick();
    if (!game || busy || Sudoku.complete(game)) return;
    paused = value;
    render();
    save();
    if (paused) byId("resume").focus({ preventScroll: true });
    else cells[selected].focus({ preventScroll: true });
  }

  async function startGame() {
    if (busy) return;
    tick();
    busy = true;
    say("");
    render();
    try {
      game = await Sudoku.generate(byId("difficulty").value);
      selected = game.givens.findIndex(value => !value);
      pencil = false;
      paused = document.hidden;
      save();
    } catch (error) {
      say(error.message);
    } finally {
      busy = false;
      previousTick = performance.now();
      render();
    }
  }

  function requestNew() {
    if (busy) return;
    if (game && !Sudoku.complete(game) && (game.history.length || game.board.some((value, index) => value !== game.givens[index]) || game.notes.some(notes => notes.length))) {
      tick();
      newDialog.showModal();
    } else startGame();
  }

  for (let row = 0; row < 9; row++) {
    const rowElement = document.createElement("div");
    rowElement.className = "board-row";
    rowElement.setAttribute("role", "row");
    rowElement.setAttribute("aria-rowindex", row + 1);
    for (let column = 0; column < 9; column++) {
      const index = row * 9 + column;
      const cell = document.createElement("button");
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-colindex", column + 1);
      cell.dataset.index = index;
      cell.tabIndex = -1;
      cell.addEventListener("click", () => choose(index));
      rowElement.append(cell);
      cells.push(cell);
    }
    byId("board").append(rowElement);
  }
  for (let value = 1; value <= 9; value++) {
    const button = document.createElement("button");
    button.className = "number-key";
    button.dataset.value = value;
    button.innerHTML = '<span>' + value + '</span><span class="remaining" aria-hidden="true">9</span>';
    button.addEventListener("click", () => input(value));
    byId("number-pad").append(button);
    pad.push(button);
  }

  byId("number-mode").addEventListener("click", () => setMode(false));
  byId("notes-mode").addEventListener("click", () => setMode(true));
  byId("erase").addEventListener("click", () => input(0));
  ["undo", "redo"].forEach(direction => byId(direction).addEventListener("click", () => {
    tick();
    if (!locked() && Sudoku.travel(game, direction)) changed();
  }));
  byId("hint").addEventListener("click", () => {
    tick();
    if (locked()) return;
    const index = Sudoku.hint(game, selected);
    if (index >= 0) { selected = index; changed(); }
  });
  byId("pause").addEventListener("click", () => pause(!paused));
  byId("resume").addEventListener("click", () => pause(false));
  byId("new-game").addEventListener("click", requestNew);
  byId("cancel-new").addEventListener("click", () => newDialog.close());
  byId("confirm-new").addEventListener("click", () => { newDialog.close(); startGame(); });
  byId("close-win").addEventListener("click", () => winDialog.close());
  byId("play-again").addEventListener("click", () => { winDialog.close(); startGame(); });
  newDialog.addEventListener("close", () => { previousTick = performance.now(); });
  document.addEventListener("keydown", event => {
    if (newDialog.open || winDialog.open || event.target.closest("select, input, textarea") || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "escape" && game && !busy) { event.preventDefault(); pause(!paused); return; }
    if (locked()) return;
    if ((event.ctrlKey || event.metaKey) && (key === "z" || key === "y")) {
      event.preventDefault();
      const direction = key === "y" || event.shiftKey ? "redo" : "undo";
      if (Sudoku.travel(game, direction)) changed();
      return;
    }
    if (event.ctrlKey || event.metaKey) return;
    if (/^[1-9]$/.test(key)) { event.preventDefault(); input(Number(key)); }
    else if (["backspace", "delete", "0"].includes(key)) { event.preventDefault(); input(0); }
    else if (key === "n") { event.preventDefault(); setMode(!pencil); }
    else if (key.startsWith("arrow")) {
      const row = Math.floor(selected / 9);
      const column = selected % 9;
      const targets = { arrowleft: row * 9 + Math.max(0, column - 1), arrowright: row * 9 + Math.min(8, column + 1),
        arrowup: Math.max(0, row - 1) * 9 + column, arrowdown: Math.min(8, row + 1) * 9 + column };
      if (targets[key] !== undefined) { event.preventDefault(); choose(targets[key]); }
    }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(true); });
  window.addEventListener("pagehide", () => { tick(); save(); });

  try {
    game = Sudoku.restore(localStorage.getItem(storageKey));
    const storedBest = JSON.parse(localStorage.getItem(bestKey) || "{}");
    for (const level of Object.keys(Sudoku.levels)) {
      if (Number.isInteger(storedBest?.[level]) && storedBest[level] > 0) best[level] = storedBest[level];
    }
  } catch { storageAvailable = false; }
  icons();
  if (game) {
    byId("difficulty").value = game.level;
    selected = Math.max(0, game.givens.findIndex(value => !value));
    paused = !Sudoku.complete(game);
    render();
  } else startGame();
  setInterval(() => {
    tick();
    if (performance.now() - lastSave > 5000) { save(); lastSave = performance.now(); }
  }, 250);
}());