(async function () {
  "use strict";
  const output = document.getElementById("results");
  const results = [];
  function assert(condition, label) {
    if (!condition) throw new Error(label);
    results.push("PASS " + label);
    output.textContent = results.join("\n");
  }
  try {
    for (const level of Object.keys(Sudoku.levels)) {
      for (let sample = 0; sample < 3; sample++) {
        const game = await Sudoku.generate(level);
        const engine = new QQWing();
        assert(engine.setPuzzle(game.givens), level + " givens accepted, sample " + sample);
        assert(engine.countSolutions() === 1, level + " has exactly one solution");
        engine.setRecordHistory(true);
        engine.solve();
        assert(Sudoku.levels[level].ratings.includes(engine.getDifficulty()), level + " solver difficulty matches");
        assert(Sudoku.validSolution(game.solution), level + " solution satisfies rows, columns and boxes");
        const fixed = game.givens.findIndex(Boolean);
        const empty = game.givens.findIndex(value => !value);
        assert(!Sudoku.enter(game, fixed, 1), "Givens are immutable");
        Sudoku.enter(game, empty, 3, true);
        assert(game.board[empty] === 0 && game.notes[empty].includes(3), "Notes do not commit a value");
        Sudoku.enter(game, empty, 3, true);
        assert(game.notes[empty].length === 0, "Notes toggle off");
        Sudoku.enter(game, empty, game.solution[empty]);
        assert(game.board[empty] === game.solution[empty], "Final entry commits a value");
        Sudoku.travel(game, "undo");
        assert(game.board[empty] === 0, "Undo restores empty cell");
        Sudoku.travel(game, "redo");
        assert(game.board[empty] === game.solution[empty], "Redo restores entry");
        Sudoku.enter(game, empty, 0);
        const conflictingPeer = Sudoku.peers[empty].find(index => game.board[index]);
        Sudoku.enter(game, empty, game.board[conflictingPeer]);
        assert(Sudoku.conflicts(game)[empty], "Duplicate entry is marked as a conflict");
        Sudoku.hint(game, empty);
        assert(game.hints === 1 && game.board[empty] === game.solution[empty], "Hint corrects selected cell and records penalty");
        assert(Sudoku.restore(JSON.stringify(game)) !== null, "Valid saved progress restores");
        game.elapsed = Sudoku.levels[level].par;
        assert(Sudoku.rating(game).stars === 2, "Hint penalty affects time rating");
        game.board = [...game.solution];
        assert(Sudoku.complete(game), "Solved board completes");
        assert(!Sudoku.enter(game, empty, 0), "Completed game cannot be edited");
      }
    }
    const noteGame = await Sudoku.generate("easy");
    const empty = noteGame.givens.findIndex(value => !value);
    const peer = Sudoku.peers[empty].find(index => !noteGame.givens[index]);
    const nonPeer = noteGame.givens.findIndex((value, index) => !value && index !== empty && !Sudoku.peers[empty].includes(index));
    const candidate = noteGame.solution[empty];
    Sudoku.enter(noteGame, peer, candidate, true);
    Sudoku.enter(noteGame, nonPeer, candidate, true);
    Sudoku.enter(noteGame, empty, candidate);
    assert(!noteGame.notes[peer].includes(candidate), "Confirmed entry removes matching peer notes");
    assert(noteGame.notes[nonPeer].includes(candidate), "Confirmed entry preserves unrelated notes");
    Sudoku.travel(noteGame, "undo");
    assert(noteGame.notes[peer].includes(candidate) && noteGame.board[empty] === 0, "Undo restores entry and peer notes atomically");
    Sudoku.enter(noteGame, empty, candidate, true);
    assert(!Sudoku.travel(noteGame, "redo"), "New input clears redo history");
    assert(!Sudoku.enter(noteGame, -1, 1) && !Sudoku.enter(noteGame, empty, 10), "Invalid coordinates and values are rejected");
    const ratingGame = Sudoku.create(noteGame.givens, noteGame.solution, "easy");
    assert(Sudoku.rating(ratingGame).score === 1000, "Zero-time rating is finite and capped");
    ratingGame.elapsed = 600;
    assert(Sudoku.rating(ratingGame).stars === 3, "Three-star target is inclusive");
    ratingGame.elapsed = 601;
    assert(Sudoku.rating(ratingGame).stars === 2, "Exceeding target earns two stars");
    ratingGame.elapsed = 1200;
    assert(Sudoku.rating(ratingGame).stars === 2, "Two-star target is inclusive");
    ratingGame.elapsed = 1201;
    assert(Sudoku.rating(ratingGame).stars === 1, "Exceeding double target earns one star");
    ratingGame.elapsed = 1800;
    assert(Sudoku.rating(ratingGame).score === 333, "Score decreases with active play time");
    Sudoku.hint(ratingGame, empty);
    Sudoku.travel(ratingGame, "undo");
    assert(ratingGame.hints === 1, "Undo does not refund a hint penalty");
    const invalidGiven = JSON.parse(JSON.stringify(noteGame));
    invalidGiven.board[invalidGiven.givens.findIndex(Boolean)] = 0;
    assert(Sudoku.restore(JSON.stringify(invalidGiven)) === null, "Saved progress cannot change givens");
    const invalidNotes = JSON.parse(JSON.stringify(noteGame));
    invalidNotes.notes[empty] = [1, 1];
    assert(Sudoku.restore(JSON.stringify(invalidNotes)) === null, "Duplicate saved notes are rejected");
    const invalidTime = { ...noteGame, elapsed: -1 };
    assert(Sudoku.restore(JSON.stringify(invalidTime)) === null, "Negative saved elapsed time is rejected");
    assert(Sudoku.restore("not json") === null, "Corrupt storage is ignored");
    assert(Sudoku.restore('{"version":1}') === null, "Incomplete storage is ignored");
    output.textContent += "\n\nALL " + results.length + " CHECKS PASSED";
    document.body.dataset.result = "passed";
  } catch (error) {
    output.textContent += "\nFAIL " + error.message;
    document.body.dataset.result = "failed";
    console.error(error);
  }
}());