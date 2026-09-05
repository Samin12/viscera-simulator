export const SOURCES = [
  {
    id: 'sages-program',
    title: 'SAGES Safe Cholecystectomy Program',
    url: 'https://www.sages.org/safe-cholecystectomy-program/',
    note: 'Anatomic identification, three CVS criteria, paired views, and a deliberate pause.',
    accessed: '2026-09-05',
  },
  {
    id: 'sages-guideline',
    title: 'Safe Cholecystectomy Multi-Society Practice Guideline',
    url: 'https://www.sages.org/publications/guidelines/safe-cholecystectomy-multi-society-practice-guideline/',
    note: 'Uncertain anatomy, escalation, and the limits of the evidence behind safety recommendations.',
    accessed: '2026-09-05',
  },
  {
    id: 'intuitive-education',
    title: 'Intuitive: Residents and Fellows',
    url: 'https://www.intuitive.com/en-us/healthcare-professionals/academics/residents-fellows',
    note: 'Existing da Vinci educational pathways and SimNow simulation resources.',
    accessed: '2026-09-05',
  },
];

export const CASES = [
  {
    id: 'routine', caseId: 'routine', title: 'The first look', subtitle: 'Routine anatomy',
    difficulty: 'Foundation', description: 'An unobscured synthetic abdomen. Build your mental map and learn what evidence belongs at a safety checkpoint.',
    objectives: ['Orient within the abdomen', 'Distinguish the model’s duct and artery', 'Review the complete safety evidence'],
    focus: ['Orientation', 'Anatomy', 'CVS evidence'],
    adhesionLevel: 0, inflamed: false, shortDuct: false, variant: 'routine',
    duration: '6–8 min', accent: '#60bfa7',
  },
  {
    id: 'adhesions', caseId: 'adhesions', title: 'Under the surface', subtitle: 'Adhesions & obscured landmarks',
    difficulty: 'Intermediate', description: 'Synthetic adhesions obscure the gallbladder. Compare visibility before and after a simplified exposure exercise.',
    objectives: ['Recognize an obscured view', 'Review changing visibility', 'Reassess anatomy after the scene changes'],
    focus: ['Adhesions', 'Exposure', 'Reassessment'],
    adhesionLevel: 2, inflamed: false, shortDuct: false, variant: 'adhesions',
    duration: '8–10 min', accent: '#d0ad75',
  },
  {
    id: 'short-duct', caseId: 'short-duct', title: 'A different connection', subtitle: 'Short cystic duct variant',
    difficulty: 'Advanced', description: 'A deliberately simplified short cystic duct challenges familiar-looking geometry. Rebuild your map instead of relying on the previous case.',
    objectives: ['Notice a changed duct relationship', 'Separate familiarity from evidence', 'Review the model from multiple perspectives'],
    focus: ['Anatomic variation', 'Spatial relationships', 'Uncertainty'],
    adhesionLevel: 1, inflamed: false, shortDuct: true, variant: 'short-duct',
    duration: '8–10 min', accent: '#bca2e0',
  },
  {
    id: 'inflamed', caseId: 'inflamed', title: 'Knowing when to pause', subtitle: 'Inflammation & uncertain anatomy',
    difficulty: 'Advanced', description: 'Inflammation and dense synthetic adhesions keep the safety evidence incomplete. The learning objective is recognizing uncertainty and requesting supervision.',
    objectives: ['Recognize persistent uncertainty', 'Reject unsupported safety claims', 'Choose a supervised pause and review'],
    focus: ['Inflammation', 'Judgment', 'Escalation'],
    adhesionLevel: 3, inflamed: true, shortDuct: false, variant: 'inflamed',
    duration: '8–10 min', accent: '#e89989',
  },
];

export const ANATOMY = {
  liver: { id: 'liver', label: 'Liver', category: 'Organ', color: '#ad625c', description: 'The large upper-abdominal landmark. The model places the gallbladder along its inferior surface.' },
  gallbladder: { id: 'gallbladder', label: 'Gallbladder', category: 'Organ', color: '#8aa66c', description: 'The organ of focus in this module. Compare its body, neck, and relationship to the liver in each case.' },
  cysticDuct: { id: 'cysticDuct', label: 'Cystic duct', category: 'Biliary anatomy', color: '#acbd76', description: 'The model’s connection from the gallbladder to the extrahepatic biliary tree. Its length changes in the variant case.' },
  cysticArtery: { id: 'cysticArtery', label: 'Cystic artery', category: 'Vessel', color: '#d35e66', description: 'A schematic arterial branch associated with the gallbladder. The red color is an educational cue.' },
  bileDuct: { id: 'bileDuct', label: 'Main bile duct', category: 'Biliary anatomy', color: '#b1ba78', description: 'The continuous schematic extrahepatic duct. This model groups the common hepatic and common bile duct regions under one label; it is not the cystic duct.' },
  hepaticArtery: { id: 'hepaticArtery', label: 'Hepatic artery', category: 'Vessel', color: '#c34958', description: 'A simplified larger arterial landmark. Small branches and clinically important variations are not comprehensively modeled.' },
  portalVein: { id: 'portalVein', label: 'Portal vein', category: 'Vessel', color: '#727da8', description: 'A schematic deep vascular landmark. Educational visibility should not be interpreted as an exposure objective.' },
  stomach: { id: 'stomach', label: 'Stomach', category: 'Organ', color: '#c89487', description: 'An adjacent organ included for abdominal orientation. This cholecystectomy module does not simulate gastric surgery.' },
  duodenum: { id: 'duodenum', label: 'Duodenum', category: 'Organ', color: '#b48a7e', description: 'An adjacent bowel landmark shown schematically to give the operative region spatial context.' },
  omentum: { id: 'omentum', label: 'Omentum & fat', category: 'Tissue', color: '#d0ad69', description: 'A simplified fatty tissue layer. The model changes its visibility to illustrate how an obstructed view can change.' },
  adhesions: { id: 'adhesions', label: 'Adhesions', category: 'Case finding', color: '#d0b396', description: 'Synthetic tissue bridges used to vary visibility. Removing these meshes is a visual learning action, not a model of safe tissue dissection.' },
  nerves: { id: 'nerves', label: 'Schematic nerves', category: 'Educational overlay', color: '#e5d298', description: 'A conceptual overlay for spatial awareness. Individual abdominal nerves and plexuses are not anatomically resolved or validated.' },
};

export const PHASES = [
  {
    id: 'orientation', title: 'Find your bearings', label: 'Orient',
    prompt: 'Inspect the liver and gallbladder in the scene, then choose your starting approach.',
    objective: 'Create an abdominal map before interpreting small structures.',
    requiredStructures: ['liver', 'gallbladder'],
    choices: [
      { id: 'map-review', label: 'Review the landmarks and surrounding relationships', hint: 'Select the liver and gallbladder in the scene first.' },
      { id: 'skip-orientation', label: 'Assume the layout matches the last case', hint: 'Consider whether familiarity is enough.' },
    ],
  },
  {
    id: 'exposure', title: 'Understand the view', label: 'Expose',
    prompt: 'Use the exposure controls to compare the covered and revealed model. Check whether the scene still communicates uncertainty.',
    objective: 'Recognize the difference between a clearer model and established anatomy.',
    choices: [
      { id: 'review-exposure', label: 'Reassess after reviewing exposure', hint: 'Review retraction and the adhesions exercise when present.' },
      { id: 'pause-obscured', label: 'Pause because the anatomy remains uncertain', hint: 'Request a supervised review.' },
      { id: 'ignore-obscuration', label: 'Continue on the assumption that hidden anatomy is typical', hint: 'Consider what the model has actually shown.' },
    ],
  },
  {
    id: 'recognition', title: 'Build the anatomy map', label: 'Identify',
    prompt: 'Inspect the cystic duct, cystic artery, and main bile duct. Compare their connections rather than using color alone.',
    objective: 'Distinguish the three labeled structures in this synthetic model.',
    requiredStructures: ['cysticDuct', 'cysticArtery', 'bileDuct'],
    choices: [
      { id: 'identify-pair', label: 'Compare the cystic duct and artery with the main duct', hint: 'Select all three structures before continuing.' },
      { id: 'rely-color', label: 'Identify the structures from their colors alone', hint: 'Colors are added learning aids.' },
      { id: 'request-review', label: 'I cannot establish the relationships; request review', hint: 'Uncertainty is a valid reason to pause.' },
    ],
  },
  {
    id: 'safety', title: 'The safety checkpoint', label: 'Assess',
    prompt: 'Review anterior and posterior perspectives and the lower-third scene. Which conclusion is supported by the training evidence?',
    objective: 'Apply the three-part CVS concept and identify its limits.',
    criteria: [
      { id: 'triangle', label: 'Fat and fibrous tissue cleared from the hepatocystic triangle' },
      { id: 'plate', label: 'Lower third of the gallbladder separated to show the cystic plate' },
      { id: 'two', label: 'Exactly two structures enter the gallbladder' },
    ],
    choices: [
      { id: 'cvs-supported', label: 'All three CVS criteria have supporting model evidence', hint: 'Requires the exposure, anatomy, paired-view, and lower-third activities.' },
      { id: 'cvs-not-established', label: 'The evidence is insufficient; pause and seek review', hint: 'Use when the required relationships remain uncertain.' },
      { id: 'two-structures-only', label: 'Seeing two colored structures is sufficient', hint: 'Consider the complete set of criteria.' },
    ],
  },
  {
    id: 'escalation', title: 'Make a supervised pause', label: 'Escalate',
    prompt: 'The safety evidence is incomplete. Choose the next learning decision.',
    objective: 'Communicate uncertainty rather than force completion.',
    choices: [
      { id: 'supervised-review', label: 'Explain the uncertainty and request attending review', hint: 'Discuss what further assessment or alternative plan is appropriate.' },
      { id: 'force-completion', label: 'Continue until the expected anatomy appears', hint: 'Consider whether persistence resolves uncertainty.' },
      { id: 'trust-overlay', label: 'Treat the colored overlay as definitive anatomy', hint: 'A model label does not establish clinical anatomy.' },
    ],
  },
  {
    id: 'debrief', title: 'Review your decisions', label: 'Debrief',
    prompt: 'Review which observations supported your decisions and where the model left uncertainty.',
    objective: 'Turn the session into a focused discussion with an educator.',
    choices: [{ id: 'finish-review', label: 'Finish this learning session', hint: 'Completion records activity, not surgical competence.' }],
  },
];

function result(phaseId, overrides = {}) {
  return { accepted: false, type: 'warning', title: 'More review needed', message: '', nextPhase: phaseId, complete: false, evidence: {}, missing: [], points: 0, ...overrides };
}

function neededStructures(ids, selected) {
  return ids.filter(id => !selected.has(id)).map(id => `Inspect ${ANATOMY[id].label.toLowerCase()}`);
}

function exposureMissing(trainingCase, evidence) {
  return [
    !evidence.retracted && 'Review the retracted model',
    trainingCase.adhesionLevel > 0 && !evidence.adhesionsCleared && 'Complete the synthetic adhesion review',
  ].filter(Boolean);
}

export function getFeedback({ caseId = 'routine', phaseId = 'orientation', choiceId, evidence = {}, identified = [] } = {}) {
  const trainingCase = CASES.find(item => item.id === caseId);
  const phase = PHASES.find(item => item.id === phaseId);
  if (!trainingCase || !phase || !phase.choices.some(choice => choice.id === choiceId)) {
    return result(phaseId, { type: 'error', title: 'Unrecognized activity', message: 'Select a case and a choice from the current learning phase.' });
  }
  const selected = new Set(identified instanceof Set || Array.isArray(identified) ? identified : []);
  const accept = (nextPhase, title, message, changes = {}) => result(phaseId, { accepted: true, type: 'success', title, message, nextPhase, points: 1, ...changes });
  const blocked = (missing, message) => result(phaseId, { message, missing });
  const unsafe = (title, message) => result(phaseId, { type: 'error', title, message });

  if (phaseId === 'orientation') {
    if (choiceId === 'skip-orientation') return unsafe('Familiarity is not evidence', 'Each synthetic case changes the scene. Inspect its major landmarks before carrying assumptions into the next activity.');
    const missing = neededStructures(phase.requiredStructures, selected);
    if (missing.length) return blocked(missing, 'Select the two orientation landmarks in the 3D scene to build this case’s map.');
    return accept('exposure', 'Orientation reviewed', 'You inspected the liver and gallbladder. Next, compare how overlying tissue changes the view.', { evidence: { orientationReviewed: true } });
  }

  if (phaseId === 'exposure') {
    if (choiceId === 'pause-obscured') return accept('escalation', 'Uncertainty recognized', 'A pause is a valid learning decision. Identify what remains unclear for your supervisor.', { evidence: { uncertaintyRecognized: true } });
    if (choiceId === 'ignore-obscuration') return unsafe('The hidden region is unresolved', 'A typical-looking surrounding scene does not establish the identity of a covered structure. Review the exposure or request supervision.');
    const missing = exposureMissing(trainingCase, evidence);
    if (missing.length) return blocked(missing, 'Complete the visual exposure activities before reassessing this case. These controls represent scene changes, not tissue handling.');
    return accept('recognition', 'Exposure compared', trainingCase.inflamed ? 'The scene is easier to inspect, but inflammation leaves this case deliberately unresolved. A clearer view does not remove that uncertainty.' : 'The visual obstruction has changed. Rebuild the anatomy map using this case’s relationships.', { evidence: { exposureReviewed: true } });
  }

  if (phaseId === 'recognition') {
    if (choiceId === 'request-review') return accept('escalation', 'Review requested', 'Describe which connection you cannot establish. This is useful information for an educator.', { evidence: { uncertaintyRecognized: true } });
    if (choiceId === 'rely-color') return unsafe('Colors are teaching aids', 'The palette is assigned by the software. Compare structures and their connections; a colored overlay cannot confirm identity in surgery.');
    const missing = neededStructures(phase.requiredStructures, selected);
    if (missing.length) return blocked(missing, 'Inspect the cystic duct, cystic artery, and main duct in the model before comparing them.');
    return accept('safety', 'Model relationships reviewed', trainingCase.shortDuct ? 'This case deliberately shortens the cystic duct. A familiar shape from another case is not supporting evidence here.' : 'You reviewed the labeled model relationships. Next, assess the complete safety concept rather than a single visual cue.', { evidence: { anatomyReviewed: true } });
  }

  if (phaseId === 'safety') {
    if (choiceId === 'two-structures-only') return unsafe('One criterion is incomplete evidence', 'Two structures alone do not satisfy the full CVS concept. Review the triangle and cystic-plate criteria as well as the paired views.');
    if (choiceId === 'cvs-not-established') return accept('escalation', 'Safety claim withheld', 'You chose not to claim a safety view without sufficient evidence. Explain the uncertainty in a supervised review.', { evidence: { uncertaintyRecognized: true, safetyReviewed: true, cvsSupported: false } });
    if (trainingCase.inflamed) return unsafe('This case cannot establish CVS', 'Persistent inflammatory uncertainty is built into this scenario. Display controls and labels cannot resolve it. Choose a pause and supervised review.');
    const missing = [
      ...exposureMissing(trainingCase, evidence),
      ...neededStructures(['cysticDuct', 'cysticArtery', 'bileDuct'], selected),
      !evidence.exposureReviewed && 'Complete the exposure decision',
      !evidence.anatomyReviewed && 'Complete the anatomy decision',
      !evidence.anteriorReviewed && 'Review the anterior perspective',
      !evidence.posteriorReviewed && 'Review the posterior perspective',
      !evidence.lowerThirdReviewed && 'Review the lower-third / cystic-plate scene',
    ].filter(Boolean);
    if (missing.length) return blocked(missing, 'The required model observations have not all been recorded. Complete them or choose uncertainty. A button press alone does not confirm a safety view.');
    return accept('debrief', 'Evidence review completed', 'You connected the three-part safety concept with the required scene activities. This is a conceptual learning result; the software has not verified a clinical CVS.', { evidence: { safetyReviewed: true, cvsSupported: true } });
  }

  if (phaseId === 'escalation') {
    if (choiceId === 'force-completion') return unsafe('Completion is not the objective', 'Repeating the same approach does not turn uncertainty into evidence. The useful decision in this activity is to stop and request supervision.');
    if (choiceId === 'trust-overlay') return unsafe('The overlay is not ground truth', 'These labels were authored for a synthetic model. They cannot confirm patient anatomy or justify proceeding.');
    return accept('debrief', 'Supervised review chosen', 'Your debrief should state the missing evidence and why you paused. Decisions about imaging or an alternative operative plan belong to the qualified supervising team.', { evidence: { escalated: true, safetyReviewed: true, cvsSupported: false } });
  }

  return accept('debrief', 'Learning session complete', 'Review the decision record with an educator. Activity completion is not an assessment of readiness for clinical surgery.', { complete: true });
}
