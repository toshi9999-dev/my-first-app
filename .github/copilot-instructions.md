# Copilot instructions for `my-first-app`

## Project overview

This is a dependency-free browser game named **SKYLINE RUNNER**. It is a static HTML/CSS/JavaScript application; there is no package manager configuration, build system, test runner, or lint configuration in the repository.

## Build, run, and validation

- Run the game from a local HTTP server because `game.js` uses ES module imports:
  ```sh
  python3 -m http.server 8000
  ```
  Then open `http://localhost:8000/`.
- Check JavaScript syntax for all modules:
  ```sh
  node --check game.js && node --check audio.js && node --check effects.js
  ```
- Check patch whitespace:
  ```sh
  git diff --check
  ```
- There are currently no automated tests or lint commands. For a focused manual check, reload the page and verify the selected stage starts, movement/jumping works, coins and enemies behave correctly, stage completion advances, restart resets the current stage, and the music button toggles audio.

## Architecture

- `index.html` defines the single-page shell: title/actions, HUD elements, the 960x540 game canvas, overlay message, and controls/stage selectors. DOM IDs and `data-stage` attributes are the integration points used by `game.js`.
- `game.js` owns the game state and orchestration. It contains the stage definitions, creates a mutable level from stage data, handles keyboard/pointer input, updates physics/collisions/progression, updates the HUD, and renders the world and player through `requestAnimationFrame`.
- `effects.js` provides a small particle/shake service. `game.js` triggers named effects (`coin`, `stomp`, `landing`, `goal`), advances them each frame, and draws them after the world/player so particles appear in the foreground.
- `audio.js` encapsulates Web Audio setup and sound events. Audio context creation is intentionally lazy so it follows browser user-gesture requirements; keep sound triggers behind the existing returned methods.
- `style.css` styles the surrounding UI only. The game world, characters, platforms, coins, enemies, goal, and parallax scenery are drawn directly in Canvas by `game.js`; CSS changes will not alter those sprites.

## Repository-specific conventions

- Keep the application dependency-free and browser-native. Avoid adding a framework or bundler for ordinary gameplay/UI changes.
- Preserve the ES module entry point (`<script type="module" src="game.js">`) and relative imports (`./audio.js`, `./effects.js`). Test through a local HTTP server rather than opening `index.html` with `file://`.
- Canvas coordinates use a fixed logical size of `WIDTH = 960` and `HEIGHT = 540`; CSS scales the canvas responsively. Keep gameplay coordinates in this logical coordinate space and use `cameraX` for horizontal scrolling.
- Stage data is declarative in `stageData`: blocks, coins, and enemies are authored as numeric tuples and converted to runtime objects by `createLevel`. Add or change stage content there rather than hard-coding one-off entities in the update loop.
- Runtime entities are mutable. Reset a stage through `loadStage(index)`, which recreates the level and resets player/camera/state; do not reset individual fields in unrelated event handlers.
- Game state is controlled by the strings `ready`, `playing`, `dead`, `won`, and `complete`. Changes to progression or overlays should update both `statusEl` and the overlay through the existing `showMessage` flow.
- Collision and movement are frame-updated in `update(dt)`, where `dt` is normalized against 60 FPS and capped at 2. Keep new time-based behavior scaled by `dt`.
- Player input supports keyboard (`A`/`D`, arrows, `W`/Space) and pointer/touch-style canvas interaction. When adding controls, preserve both input paths and the jump hold/release behavior.
- Use the existing `effects` and `audio` services for feedback instead of directly managing particles or Web Audio in `game.js`.
- Keep DOM text and labels in the existing Japanese/English hybrid style unless the feature requires a deliberate localization change. Use the existing IDs/classes rather than duplicating HUD or overlay elements.
- Explanations and user-facing descriptions should be displayed in Japanese.
