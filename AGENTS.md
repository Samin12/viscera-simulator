# Agent setup guide

This is a client-side Vite and Three.js application. No API keys, environment variables, database, backend service, or robot hardware are required.

## Set up and run

1. Install Node.js 22.12 or later with npm.
2. From the repository root, run `npm ci`.
3. Run `npm test` and `npm run build` to verify the checkout.
4. Run `npm run dev` and open the localhost URL printed by Vite. The default is `http://127.0.0.1:5173/`; if occupied, Vite chooses another port.
5. Use a modern browser with WebGL enabled. Session records are stored locally in that browser.

For remote environments, use `npm run dev -- --host 0.0.0.0` with the environment's port forwarding. No server-side secrets are needed.

## Files to work on

- `src/main.js`: interface and input bindings.
- `src/style.css`: styling and responsive layout.
- `src/operative-scene.js`: active 3D anatomy, instruments, rendering and contact picking.
- `src/tissue-materials.js`: generated tissue atlas sampling and procedural surface maps.
- `src/simulation.js`: authored simulation rules and cases.
- `tests/simulation.test.js`: active simulation-rule tests.
- `src/scene.js` and `src/training.js`: legacy modules, not imported by the current application.

## Deliver changes

Run `npm test` after rule changes. Run `npm run build:standalone` after application changes; this updates both `dist/` and the tracked portable `Viscera.html`. Do not edit the generated HTML directly. Commit the rebuilt HTML with source changes. A large-bundle notice is expected because the portable app embeds Three.js and its tissue imagery.

For visual or input changes, open the app in a browser and check rendering and the affected interactions; passing rule tests alone does not verify WebGL appearance. Keep generated assets in the repository. Preserve image attribution and the distinction between this approximate research prototype and a clinically validated trainer.
