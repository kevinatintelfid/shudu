(function () {
  "use strict";

  const levels = {
    easy: { label: "Easy", ratings: [1, 2], par: 600, points: 1000 },
    medium: { label: "Medium", ratings: [3], par: 1200, points: 1800 },
    hard: { label: "Hard", ratings: [4], par: 1800, points: 2600 }
  };
  const peers = Array.from({ length: 81 }, (_, index) =>
    Array.from({ length: 81 }, (_, other) => other).filter(other => other !== index && (
      Math.floor(index / 9) === Math.floor(other / 9) || index % 9 === other % 9 ||
      (Math.floor(index / 27) === Math.floor(other / 27) && Math.floor(index % 9 / 3) === Math.floor(other % 9 / 3))
    ))
  );
  const readBoard = text => Array.from(text.replace(/[^1-9.]/g, ""), character => character === "." ? 0 : Number(character));
  const validSolution = board => Array.isArray(board) && board.length === 81 && board.every((value, index) =>
    Number.isInteger(value) && value >= 1 && value <= 9 && peers[index].every(other => board[other] !== value));

  async function generate(level) {
    if (!levels[level]) throw new Error("Unknown difficulty.");
    for (let attempt = 0; attempt < 400; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 0));
      const engine = new QQWing();
      engine.setRecordHistory(true);
      engine.generatePuzzleSymmetry(QQWing.Symmetry.ROTATE180);
      if (!engine.solve() || !levels[level].ratings.includes(engine.getDifficulty())) continue;
      const givens = readBoard(engine.getPuzzleString());
      const solution = readBoard(engine.getSolutionString());
      if (givens.length === 81 && validSolution(solution)) return create(givens, solution, level);
    }
    throw new Error("Could not find a puzzle at this difficulty. Please try again.");
  }

  function create(givens, solution, level) {
    return { version: 1, level, givens: [...givens], solution: [...solution], board: [...givens],
      notes: Array.from({ length: 81 }, () => []), elapsed: 0, hints: 0, history: [], future: [] };
  }

  function snapshot(game) {
    return { board: [...game.board], notes: game.notes.map(notes => [...notes]) };
  }

  function remember(game) {
    game.history.push(snapshot(game));
    if (game.history.length > 200) game.history.shift();
    game.future = [];
  }

  function enter(game, index, value, pencil = false) {
    if (!Number.isInteger(index) || index < 0 || index > 80 || game.givens[index] || complete(game) ||
        !Number.isInteger(value) || value < 0 || value > 9) return false;
    if (pencil && value && game.board[index]) return false;
    if (!pencil && game.board[index] === value && !game.notes[index].length) return false;
    remember(game);
    if (pencil && value) {
      const notes = game.notes[index];
      game.notes[index] = notes.includes(value) ? notes.filter(note => note !== value) : [...notes, value].sort();
    } else {
      game.board[index] = value;
      game.notes[index] = [];
      if (value) peers[index].forEach(other => {
        game.notes[other] = game.notes[other].filter(note => note !== value);
      });
    }
    return true;
  }

  function travel(game, direction) {
    if (complete(game)) return false;
    const source = direction === "undo" ? game.history : game.future;
    const target = direction === "undo" ? game.future : game.history;
    if (!source.length) return false;
    target.push(snapshot(game));
    const previous = source.pop();
    game.board = previous.board;
    game.notes = previous.notes;
    return true;
  }

  function hint(game, selected) {
    const index = Number.isInteger(selected) && !game.givens[selected] && game.board[selected] !== game.solution[selected]
      ? selected : game.board.findIndex((value, position) => value !== game.solution[position]);
    if (index < 0 || !enter(game, index, game.solution[index])) return -1;
    game.hints++;
    return index;
  }

  function conflicts(game) {
    return game.board.map((value, index) => Boolean(value && peers[index].some(other => game.board[other] === value)));
  }

  function complete(game) {
    return game.board.every((value, index) => value === game.solution[index]);
  }

  function rating(game) {
    const level = levels[game.level];
    const adjusted = game.elapsed + game.hints * 60;
    return { stars: adjusted <= level.par ? 3 : adjusted <= level.par * 2 ? 2 : 1,
      score: Math.max(1, Math.round(level.points * Math.min(1, level.par / Math.max(1, adjusted)))), adjusted };
  }

  function restore(text) {
    try {
      const game = JSON.parse(text);
      if (!game || game.version !== 1 || !levels[game.level] || !validSolution(game.solution)) return null;
      const isBoard = board => Array.isArray(board) && board.length === 81 && board.every(value => Number.isInteger(value) && value >= 0 && value <= 9);
      if (!isBoard(game.givens) || !isBoard(game.board) || !game.givens.some(value => value === 0) ||
          !game.givens.every((value, index) => !value || value === game.solution[index]) ||
          !game.givens.every((value, index) => !value || value === game.board[index]) ||
          !Array.isArray(game.notes) || game.notes.length !== 81 || !game.notes.every((notes, index) =>
            Array.isArray(notes) && notes.length <= 9 && new Set(notes).size === notes.length &&
            notes.every(value => Number.isInteger(value) && value >= 1 && value <= 9) && (!game.board[index] || !notes.length)) ||
          !Number.isFinite(game.elapsed) || game.elapsed < 0 || !Number.isInteger(game.hints) || game.hints < 0) return null;
      return { ...game, history: [], future: [] };
    } catch {
      return null;
    }
  }

  window.Sudoku = { levels, peers, generate, create, enter, travel, hint, conflicts, complete, rating, restore, validSolution };
}());