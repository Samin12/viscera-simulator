# Viscera — Operative Simulator, version 2

A hands-on browser prototype for residents and educators exploring robotic cholecystectomy training. This revision replaces the anatomy-only explorer with instrument control, tissue interaction, and a simulated procedure through specimen retrieval.

## Open

Download **[Viscera.html](Viscera.html)** and open it in a modern desktop browser. The 3D library, application, generated tissue atlas, and three attributed reference photographs are embedded. Optional fonts use Google Fonts; fallback fonts work offline. Browser storage behavior can vary for file URLs; use the local server for consistent persistence.

## Run locally

Requires Node.js 22.12 or later and npm.

```sh
git clone https://github.com/Samin12/viscera-simulator.git
cd viscera-simulator
npm ci
npm run dev
```

Open the localhost address printed by Vite, normally http://127.0.0.1:5173/.

To rebuild the portable app, run `npm run build:standalone`. The output is `Viscera.html` in the repository root. The production website bundle is generated in `dist/`.

## What changed

- An oblique, close endoscopic field inspired by a supplied operative photograph: vascular pink liver capsule, pale fibrous serosa, lobulated yellow-orange omentum, pericystic fat, translucent adhesion films, wet surface highlights, and a scope border. A synthetic texture atlas supplies fine color detail while the anatomy remains interactive.
- Two visible, articulating instrument models. The active tip follows the pointer; tissue contact drives actions.
- Representative tools: ProGrasp, Cadiere, fenestrated bipolar and Maryland bipolar forceps, monopolar curved scissors, monopolar hook, medium-large clip applier, wristed suction, and an assistant retrieval bag.
- Retraction, omentum movement, sequential dissection patches, visual clip tokens, connection division, liver-bed detachment, and specimen retrieval.
- Simulated energy modes, smoke, blood, energy marks, persistent injury records, and a complication stop for critical injuries.
- Four authored cases: gallstones, acute cholecystitis, adhesions, and a short cystic duct.
- Real, unmodified intraoperative reference photographs from Sugrue et al. (2015), CC BY 4.0, accessible through **Reference photos** with attribution and links.
- Local session save/resume, action log, debrief, history, and JSON export.

## Controls

- **1 / 2**: activate left/right instrument. Select a tool in the library to equip that arm.
- **Pointer + click**: position the tip on tissue and activate the equipped instrument.
- **Drag**: grasping or repeated tissue interaction, according to the tool. Mechanics remain approximate.
- **Right drag / scroll**: camera movement / zoom. The Camera toggle also enables left-drag camera control.
- **C / V / X**: simulated cut / coagulation / energy off. Only compatible instruments can use each mode. No real power settings are modeled.
- **[ / ]**: adjust visual wrist rotation.
- **P**: pause/resume.
- **Settings → Target assist**: optional keyboard access to a model target. Choose it, click Focus, then press Space on the focused canvas to apply the active instrument.

The current objective below the field updates after each action. Lower-third inspection and paired perspectives precede the synthetic checkpoint. Every modeled patch must be removed individually. The clip representation is an abstract protection rule, not a recommendation about real clip counts or placement.

## Important scope

This is a research prototype, not a clinically validated surgical trainer or an approved da Vinci simulator. It does not connect to a robot or emulate all instruments, kinematics, stereo vision, haptics, force, clinical energy delivery, tissue temperature, bleeding physiology, or validated tissue planes. Its geometry and tissue textures are synthetic and its response model is deterministic; it does not use patient scans or live generative AI. The acute inflammatory scenario is deliberately completable and does not represent every severity or situation.

Retrieving a specimen with simulated injury is recorded as an injured outcome. Activity completion does not establish surgical competence or a real critical view of safety. The prototype needs surgeon review, validated mechanics and controller integration, curriculum development, and formal evaluation before clinical education or credentialing use. It is not affiliated with Intuitive; named products remain their owners' trademarks.

## Development and verification

```sh
npm test
npm run build
npm run build:standalone
```

- `src/operative-scene.js`: synthetic tissue meshes, instruments, contact picking, and visual state.
- `src/tissue-materials.js`: tissue atlas sampling and procedural surface detail.
- `src/assets/tissue-atlas.png`: generated material atlas; see `TEXTURE-NOTES.md` for its prompt and provenance.
- `src/simulation.js`: instrument/case catalogue, action rules, injuries, progression, and debrief.
- `src/main.js`: console UI, input controls, save/resume, history, and export.
- `src/reference-photos.js`: embedded licensed reference images.
- `tests/simulation.test.js`: 19 meaningful simulation-rule tests.

Legacy `scene.js`, `training.js`, and their tests remain as the original anatomy-explorer modules, but version 2 does not import them. See `QA.md` for checks and `REFERENCE-NOTES.md` for clinical-image attribution and instrument sources.
