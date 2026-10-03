# Shudu

A standalone Sudoku game for desktop and mobile browsers. Open [index.html](index.html) in Edge, Chrome, Firefox, or Safari. No Node.js, installation, network connection, or development server is needed. All scripts, icons, and fonts are included locally.

## Play

Fill the 9 by 9 board with numbers 1 through 9. Each number must appear exactly once in every row, column, and 3 by 3 box. Dark numbers are fixed givens. Green numbers are your entries. Repeated numbers are highlighted in red; the game does not otherwise reveal incorrect guesses automatically.

- Select a cell, then use the number pad or keyboard keys `1` through `9`.
- Choose **Notes** or press `N` to toggle pencil marks without committing a number. Select a note again to remove it. Switch to **Number** to confirm an entry.
- Committing a number removes that note from its row, column, and box. Undo restores both the entry and affected notes.
- Use arrow keys to move, `Delete`/`Backspace`/`0` to erase, `Ctrl+Z` to undo, and `Ctrl+Shift+Z` or `Ctrl+Y` to redo. Command shortcuts also work on macOS.
- Pause with the timer button or `Escape`. The board is hidden and the timer stops. Switching away from the tab pauses the game automatically.
- A hint reveals the selected unsolved cell, or the next unsolved cell if the selection is already correct. Undoing a hint does not remove its scoring penalty.
- Select a difficulty, then **New game**. Changing the selector alone does not replace your puzzle. Replacing a puzzle with entries or notes requires confirmation.

Progress and per-difficulty best scores are saved in browser storage. Returning to an unfinished puzzle restores it paused. Undo history resets on reload. File-URL storage behavior varies by browser; keep the folder in the same location and use the same browser. Private browsing, clearing browser data, or disabling storage can remove progress. The footer reports when storage is unavailable.

## Difficulty And Rating

QQWing generates rotationally symmetric puzzles with one solution. Difficulty is based on its solving-technique classification, not just clue count:

| Game level | QQWing classification | Three-star target | Base points |
| --- | --- | --- | --- |
| Easy | Simple / Easy | 10 minutes | 1,000 |
| Medium | Intermediate | 20 minutes | 1,800 |
| Hard | Expert | 30 minutes | 2,600 |

Rating time is active play time plus 60 seconds per hint. Pauses, puzzle generation, and the new-game confirmation dialog do not count.

- Three stars: rating time at or below the target.
- Two stars: above the target, up to twice the target.
- One star: above twice the target. Every completed puzzle earns a rating.
- Points: `round(basePoints * min(1, targetSeconds / max(1, ratingSeconds)))`, with a minimum of 1 point.

Puzzle generation yields to the browser between attempts and only returns a puzzle matching the chosen classification. Difficulty is a solver-based estimate; individual solving times will vary. Ratings are local and are not intended as cheat-resistant competitive scores.

## Development And Tests

- [game.js](game.js): generator adapter, pure game state, notes, history, conflict detection, persistence validation, and scoring.
- [app.js](app.js): rendering, interaction, timing, and local storage.
- [styles.css](styles.css): responsive layout and visual states.
- Open [tests.html](tests.html) to run the browser-based engine regression suite. It generates three puzzles per level and verifies uniqueness, solver ratings, all Sudoku constraints, givens, notes, history, conflicts, hints, scoring, and storage.

There is no build step or required VS Code extension. Test UI changes by opening the game and exercising notes, undo/redo, pause/resume, reload recovery, and completion at both desktop and phone widths.

## Install On iPhone Or iPad

The game is a Progressive Web App (PWA). Once hosted over HTTPS it installs to the iOS home screen, opens full-screen without Safari's address bar, and plays offline. A Mac is not required.

1. Put the project folder online over HTTPS. Any static host works:
   - **GitHub Pages:** create a repository, upload every file in this folder (keep the structure, including `icons/`), then enable Pages for the default branch. GitHub gives you an `https://` link.
   - **Drag-and-drop host:** services such as Netlify, Cloudflare Pages, or tiiny.host let you drop the folder and get an `https://` link without Git.
2. On the iPhone, open that link in **Safari** (Chrome on iOS cannot install home-screen apps).
3. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
4. Launch **Shudu** from the home screen. It runs full-screen and works without a connection after the first load.

To preview on the same Wi-Fi without hosting, run a local server on the PC (for example `python -m http.server 8000` in this folder) and open `http://<your-PC-IP>:8000` in Safari. "Add to Home Screen" still works, but reliable offline mode needs the HTTPS hosting above, because iOS only runs the offline service worker over HTTPS.

## Turn It Into A Native App Store App

A real App Store build must be compiled on macOS with Xcode and needs a paid Apple Developer account; this cannot be done from Windows alone.

- Wrap the existing files with [Capacitor](https://capacitorjs.com) (`npx cap add ios`) to get an Xcode project that loads this web app in a native shell. Build and sign it in Xcode on a Mac, then install to your iPhone or submit to the App Store.
- Without your own Mac, use a hosted Mac/CI service (for example a cloud Mac or an Xcode cloud build) to compile and sign the Capacitor project.
- For personal use the PWA above is usually enough and needs no account, Mac, or review.

## Dependencies

See [THIRD_PARTY.md](THIRD_PARTY.md) for pinned sources and license notices. QQWing is GPL-2.0-or-later: distribution of the combined application must comply with applicable GPL requirements, including source availability. Do not treat the bundled engine as permissively licensed.