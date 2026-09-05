# Version 2 note

The current operative simulator uses `simulation.js` and `operative-scene.js`. Its inflammatory case is an authored, completable scenario with simulated injury consequences; the mandatory-escalation inflammatory case described below belongs to the retained version 1 anatomy explorer. For current scope and visual/instrument sources, see README.md and REFERENCE-NOTES.md. Neither version is clinically validated.

---

# Cholecystectomy learning prototype

This browser simulation explores a product for surgical residents, fellows, and hospital educators: repeatable abdominal orientation and decision exercises across a small set of synthetic cholecystectomy cases. Its purpose is to make anatomy, changing visibility, and uncertainty discussable before a supervised training encounter. It is an early educational prototype, not a complete operation simulator or credentialing instrument.

## What the first module teaches

The four cases cover routine anatomy, adhesions, a shortened cystic duct, and persistent inflammatory uncertainty. The sequence is orientation, exposure comparison, anatomy review, a safety checkpoint, and debrief. Learners can branch to a supervised pause; the inflamed case requires that branch and cannot receive a supported-CVS result.

The SAGES Safe Cholecystectomy Program describes three CVS criteria: a cleared hepatocystic triangle, separation of the gallbladder’s lower third to reveal the cystic plate, and exactly two structures entering the gallbladder. It describes anterior and posterior perspectives and a deliberate pause. This module adapts those concepts into review activities. [SAGES program](https://www.sages.org/safe-cholecystectomy-program/)

The multi-society guideline supports attention to anatomic uncertainty and further assessment; it recommends biliary imaging when anatomy is uncertain or injury is suspected. Some recommendations, including CVS identification, are based on expert opinion. The prototype therefore routes unresolved evidence to a request for supervision and does not prescribe an operative maneuver or simulate the choice of a bailout procedure. [Multi-society guideline](https://www.sages.org/publications/guidelines/safe-cholecystectomy-multi-society-practice-guideline/)

Intuitive already offers resident and fellow educational pathways and SimNow resources. This prototype is an independent concept that would need to demonstrate useful educational value alongside existing institutional and manufacturer training. It is not connected to those products. [Intuitive resident and fellow education](https://www.intuitive.com/en-us/healthcare-professionals/academics/residents-fellows)

## What the application actually assesses

The learning engine checks recorded scene actions and conceptual decisions. The safety activity requires exposure review, the anatomy decision, anterior and posterior scene review, and lower-third review. It also requires inspection of the cystic duct, cystic artery, and main duct. An unsupported answer returns the missing activities instead of advancing. Unsafe assumptions receive corrective feedback.

Those checks establish that the learner interacted with the exercise. Selecting a labeled model is not an anatomic identification test, and visiting a camera view is not proof that the learner interpreted it correctly. The system does not infer clinical CVS from imagery, grade tissue handling, measure validated surgical competence, or establish permission to operate. Scores, if shown, are learning activity counts only.

## Geometry and scope

All geometry is synthetic and schematic. Shapes, colors, scale, and relative positions need expert review. The main bile duct combines common hepatic and common bile duct regions in a single model label. Nerves are a conceptual overlay rather than a resolved abdominal nerve map. Adhesion removal and retraction are visual state changes, not validated dissection or force models. The case set is deliberately small and does not represent every anatomic variation or pathology.

There is no patient-specific imaging reconstruction, live patient data, da Vinci console integration, instrument kinematics validation, haptic feedback, true tissue physics, bleeding model, cutting or suturing engine, or headset dependency. No live AI service is connected; feedback comes from a transparent local rule engine. The interface should describe that honestly.

## Development priorities

Before use as a hospital teaching product, a surgical educator should review the anatomy, case assumptions, language, and feedback. A production simulator would require expert-authored and independently reviewed anatomy; credible instrument and tissue interaction; a defined curriculum; usability evaluation with residents and faculty; and appropriate educational validation against explicitly defined outcomes. Any patient-specific reconstruction, AI feedback, or hardware interface needs separate technical and clinical evaluation.

Sources reviewed on 5 September 2026. These references ground the conceptual teaching content; they do not validate this software.
