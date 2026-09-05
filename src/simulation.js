export const INSTRUMENTS = [
  { id: 'prograsp', name: 'ProGrasp forceps', family: 'Grasper', action: 'grasp', energy: 'none', hotkey: '1', assistant: false, description: 'Hold and move the synthetic gallbladder or omentum.' },
  { id: 'cadiere', name: 'Cadiere forceps', family: 'Grasper', action: 'grasp', energy: 'none', hotkey: '2', assistant: false, description: 'An alternative grasper for the model’s exposure actions.' },
  { id: 'fenestrated', name: 'Fenestrated bipolar forceps', family: 'Bipolar', action: 'grasp', energy: 'bipolar', hotkey: '3', assistant: false, description: 'Grasp with energy off; use simulated coagulation on removable tissue patches.' },
  { id: 'maryland', name: 'Maryland bipolar forceps', family: 'Bipolar', action: 'dissect', energy: 'bipolar', hotkey: '4', assistant: false, description: 'Separate synthetic tissue patches, with optional simulated coagulation.' },
  { id: 'scissors', name: 'Monopolar curved scissors', family: 'Monopolar', action: 'cut', energy: 'monopolar', hotkey: '5', assistant: false, description: 'Cut model tissue; divide protected cystic targets with energy off after the exercise checkpoint.' },
  { id: 'hook', name: 'Monopolar hook', family: 'Monopolar', action: 'dissect', energy: 'monopolar', hotkey: '6', assistant: false, description: 'Remove synthetic tissue patches using the exercise’s cut or coagulation mode.' },
  { id: 'clip', name: 'Medium-large clip applier', family: 'Clip applier', action: 'clip', energy: 'none', hotkey: '7', assistant: false, description: 'Place a symbolic protection token on a reviewed cystic target. Token counts are game rules, not a clinical clipping technique.' },
  { id: 'suction', name: 'Wristed suction irrigator', family: 'Suction / irrigation', action: 'suction', energy: 'none', hotkey: '8', assistant: false, description: 'Clear the simulated blood and smoke field. It does not reverse an injury or simulate definitive hemostasis.' },
  { id: 'retrieval', name: 'Specimen retrieval bag', family: 'Assistant accessory', action: 'retrieve', energy: 'none', hotkey: '9', assistant: true, description: 'An assistant-port accessory for bagging and extracting the released synthetic specimen.' },
];

export const CASES = [
  {
    id: 'gallstones', caseId: 'gallstones', title: 'Gallstones', subtitle: 'A first complete procedure', difficulty: 'Foundation',
    description: 'Explore a synthetic gallbladder with visible stone inclusions, establish exposure, and complete the game’s dissection and retrieval sequence.',
    initialAdhesions: 0, initialFat: 3, initialBed: 4, adhesionLevel: 0, fatLevel: 3,
    inflamed: false, shortDuct: false, stones: 3, uncertain: false, variant: 'routine', duration: '8–12 min', accent: '#74b8a2',
  },
  {
    id: 'acute-cholecystitis', caseId: 'acute-cholecystitis', title: 'Acute cholecystitis', subtitle: 'Inflamed tissue, a more demanding field', difficulty: 'Advanced',
    description: 'An authored inflammatory scenario with more tissue patches and smoke sensitivity. This particular synthetic case remains completable; real inflammatory severity varies.',
    initialAdhesions: 2, initialFat: 4, initialBed: 6, adhesionLevel: 2, fatLevel: 4,
    inflamed: true, shortDuct: false, stones: 2, uncertain: false, variant: 'inflamed', duration: '10–15 min', accent: '#d28a7a',
  },
  {
    id: 'adhesions', caseId: 'adhesions', title: 'Adhesions', subtitle: 'Find the field beneath the bands', difficulty: 'Intermediate',
    description: 'Several synthetic adhesion layers obscure the target. Each compatible instrument contact removes one visible patch.',
    initialAdhesions: 4, initialFat: 4, initialBed: 5, adhesionLevel: 4, fatLevel: 4,
    inflamed: false, shortDuct: false, stones: 2, uncertain: false, variant: 'adhesions', duration: '10–14 min', accent: '#c6ab77',
  },
  {
    id: 'short-duct', caseId: 'short-duct', title: 'Short cystic duct', subtitle: 'A changed anatomic relationship', difficulty: 'Advanced',
    description: 'A schematic short-duct variant changes the contact targets and spacing. The geometry is illustrative and has not been reviewed as operative anatomy.',
    initialAdhesions: 1, initialFat: 3, initialBed: 4, adhesionLevel: 1, fatLevel: 3,
    inflamed: false, shortDuct: true, stones: 1, uncertain: false, variant: 'short-duct', duration: '10–14 min', accent: '#b59bd2',
  },
];

export const SAFETY_CRITERIA = [
  'Fat and fibrous tissue cleared from the hepatocystic triangle.',
  'The gallbladder’s lower third separated to show the cystic plate.',
  'Exactly two structures seen entering the gallbladder.',
];

const toolById = new Map(INSTRUMENTS.map(tool => [tool.id, tool]));
const targetNames = {
  liver: 'liver', gallbladder: 'gallbladder', omentum: 'omentum', adhesions: 'adhesions', triangleFat: 'triangle fat',
  cysticDuct: 'cystic duct', cysticArtery: 'cystic artery', bileDuct: 'main bile duct', liverBed: 'liver bed',
  duodenum: 'duodenum', bleeding: 'blood field', specimen: 'specimen',
};
const caseById = id => CASES.find(item => item.id === id) || CASES[0];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const contactPoint = value => {
  const coordinates = Array.isArray(value) ? value.slice(0, 3) : value && [value.x, value.y, value.z];
  return coordinates?.length === 3 && coordinates.every(Number.isFinite) ? coordinates : null;
};
const exposureReady = state => state.retracted && state.omentumMoved && state.adhesionsRemaining === 0 && state.fatRemaining === 0;
const divisionComplete = state => state.ductDivided && state.arteryDivided;
const notice = 'Synthetic game mechanics only. Completion does not establish a clinical critical view of safety or surgical competence.';

export function createState(caseId = 'gallstones') {
  const trainingCase = caseById(caseId);
  return {
    caseId: trainingCase.id, mode: 'practice', paused: false,
    retracted: false, omentumMoved: false,
    adhesionsRemaining: trainingCase.initialAdhesions, fatRemaining: trainingCase.initialFat, bedRemaining: trainingCase.initialBed,
    ductClips: 0, arteryClips: 0, ductDivided: false, arteryDivided: false, extracted: false,
    bleeding: 0, smoke: 0, charMarks: 0, injuries: [], criticalInjury: false,
    activeArm: 'right', instruments: { left: 'prograsp', right: 'maryland' }, energyMode: 'off', wristAngle: 0,
    safetyReviewed: false, safetyBreached: false, lowerThirdReviewed: false,
    views: { anterior: false, posterior: false }, currentView: 'operative',
    events: [], actions: 0, elapsed: 0, startedAt: new Date().toISOString(), finishedAt: null,
  };
}

function copyState(state) {
  return {
    ...state, instruments: { ...state.instruments }, views: { ...state.views },
    injuries: state.injuries.map(injury => ({ ...injury })), events: [...state.events],
  };
}

function invalidateViews(state) {
  state.views = { anterior: false, posterior: false };
  state.lowerThirdReviewed = false;
}

function event(state, action, detail) {
  state.events.push({ index: state.events.length + 1, at: state.elapsed, action, detail });
}

function respond(state, level, title, message, effect) {
  return { state, feedback: { level, title, message }, ...(effect ? { effect } : {}) };
}

function injury(state, action, { kind, title, message, critical = true, bleed = 1, char = 0, changes = {} }) {
  if (state.mode === 'guided') {
    event(state, 'safeguard', { target: action.target, kind });
    return respond(state, 'warning', 'Guided safeguard', message + ' Contact was blocked in guided mode.', { type: 'blocked', target: action.target, point: action.point });
  }
  Object.assign(state, changes);
  const item = { id: `injury-${state.injuries.length + 1}`, kind, target: action.target, point: contactPoint(action.point), at: state.elapsed, critical, message };
  state.injuries.push(item);
  state.criticalInjury ||= critical;
  state.bleeding = clamp(state.bleeding + bleed, 0, 5);
  state.charMarks += char;
  state.smoke = clamp(state.smoke + (char ? 0.7 : 0), 0, 1);
  event(state, 'injury', item);
  return respond(state, 'error', title, message + (critical ? ' The exercise now requires a pause and complication review.' : ''), { type: 'injury', target: action.target, point: action.point, kind, bleeding: state.bleeding, charMarks: state.charMarks });
}

function recordContact(state, action) {
  state.actions += 1;
  event(state, 'contact', { target: action.target, tool: state.instruments[state.activeArm], arm: state.activeArm, energy: state.energyMode, gesture: action.gesture || 'activate', point: contactPoint(action.point) });
}

function contact(state, action) {
  const target = action.target;
  const tool = toolById.get(state.instruments[state.activeArm]);
  recordContact(state, action);
  if (!tool || !targetNames[target]) return respond(state, 'warning', 'Choose an instrument and target', 'This contact has no supported instrument or anatomical target.');
  if (state.extracted) return respond(state, 'info', 'Specimen already retrieved', 'The procedure game has ended. Open the debrief or start another case.');

  if (tool.id === 'suction') {
    if (!['bleeding', 'liverBed', 'gallbladder', 'cysticArtery', 'cysticDuct', 'bileDuct', 'duodenum'].includes(target)) return respond(state, 'warning', 'No fluid target here', 'Use the irrigator over the simulated field to clear blood or smoke.');
    if (state.bleeding === 0 && state.smoke === 0) return respond(state, 'info', 'The field is clear', 'There is no simulated blood or smoke to clear.');
    state.bleeding = Math.max(0, state.bleeding - 1);
    state.smoke = Math.max(0, state.smoke - 0.75);
    event(state, 'suction', { bleeding: state.bleeding, smoke: state.smoke });
    return respond(state, 'success', 'Field cleared', 'Suction improves the illustration. Any recorded injury remains in the learning record.', { type: 'suction', target, point: action.point });
  }
  if (state.criticalInjury) return respond(state, 'error', 'Complication review required', 'A critical simulated injury has occurred. You can clear the field, pause to review it, or restart. The exercise cannot record a clean completion.');
  if (state.smoke > 0.88) return respond(state, 'warning', 'The field is obscured', 'Wait for the simulated smoke to dissipate or use suction before another contact.');

  const powered = state.energyMode !== 'off' && tool.energy !== 'none';
  if (powered && ['bileDuct', 'duodenum', 'liver', 'gallbladder'].includes(target)) {
    return injury(state, action, { kind: 'thermal-contact', title: 'Simulated thermal injury', message: `Energized contact affected the ${targetNames[target]}.`, critical: ['bileDuct', 'duodenum'].includes(target), bleed: target === 'liver' ? 2 : 1, char: 1 });
  }

  if (['prograsp', 'cadiere', 'fenestrated'].includes(tool.id) && state.energyMode === 'off') {
    if (target === 'gallbladder') {
      if (state.retracted) return respond(state, 'info', 'Retraction maintained', 'The synthetic gallbladder is already held in its exposed position.');
      state.retracted = true; invalidateViews(state);
      return respond(state, 'success', 'Gallbladder retracted', 'The model has moved and exposed the surrounding tissue. This gesture does not simulate force.', { type: 'retract', target, point: action.point });
    }
    if (target === 'omentum') {
      if (!state.retracted) return respond(state, 'warning', 'Begin with the gallbladder', 'Complete the model’s retraction action before moving the overlying omentum.');
      if (state.omentumMoved) return respond(state, 'info', 'Omentum already moved', 'The model’s overlying fatty layer is out of the field.');
      state.omentumMoved = true; invalidateViews(state);
      return respond(state, 'success', 'Omentum moved', 'The model’s underlying adhesion and fat targets are now available.', { type: 'move-omentum', target, point: action.point });
    }
    return respond(state, 'warning', 'This tool grasps', 'Use this grasper on the gallbladder or omentum. A grasp does not remove this target.');
  }

  if (tool.id === 'retrieval') {
    if (!['gallbladder', 'specimen'].includes(target)) return respond(state, 'warning', 'Choose the specimen', 'The retrieval bag is an assistant accessory for the released gallbladder.');
    if (!divisionComplete(state) || state.bedRemaining !== 0) return respond(state, 'warning', 'Specimen still attached', 'The synthetic cystic connections and all liver-bed patches must be released before retrieval.');
    if (!state.safetyReviewed || state.safetyBreached) return respond(state, 'error', 'Exercise checkpoint incomplete', 'This session has not completed the required synthetic safety review.');
    state.extracted = true;
    state.finishedAt = new Date(Date.parse(state.startedAt) + state.elapsed * 1000).toISOString();
    event(state, 'extract', { injuries: state.injuries.length });
    return respond(state, state.injuries.length ? 'warning' : 'success', state.injuries.length ? 'Specimen retrieved — review injuries' : 'Specimen retrieved', 'The synthetic procedure is complete. Review the action record; this result does not establish operative competence.', { type: 'extract', target: 'gallbladder', point: action.point });
  }

  if (tool.id === 'clip') {
    if (target === 'bileDuct' || target === 'duodenum') return injury(state, action, { kind: 'wrong-target-clip', title: 'Wrong structure clipped', message: `The clip contacted the ${targetNames[target]}, which is outside the exercise’s intended targets.`, bleed: 0.5 });
    if (!['cysticDuct', 'cysticArtery'].includes(target)) return respond(state, 'warning', 'Not a clip target', 'The game’s protection tokens belong only on the reviewed cystic duct and cystic artery.');
    if (!state.safetyReviewed) return respond(state, 'warning', 'Review the synthetic checkpoint first', 'Establish the exercise’s exposure and view observations before placing protection tokens.');
    const dividedKey = target === 'cysticDuct' ? 'ductDivided' : 'arteryDivided';
    const clipKey = target === 'cysticDuct' ? 'ductClips' : 'arteryClips';
    if (state[dividedKey]) return respond(state, 'warning', 'Target already divided', 'A new token cannot undo division or a previous injury.');
    if (state[clipKey] > 0) return respond(state, 'info', 'Protection token already placed', 'This prototype uses a single abstract protection token per target. It does not prescribe clinical clip count or placement.');
    state[clipKey] = 1;
    return respond(state, 'success', 'Protection token placed', `The ${targetNames[target]} now carries the game’s abstract protection token.`, { type: 'clip', target, point: action.point });
  }

  if (['cysticDuct', 'cysticArtery', 'bileDuct', 'duodenum'].includes(target)) {
    if (tool.id !== 'scissors') {
      if (powered) return injury(state, action, { kind: 'energy-on-connection', title: 'Unsafe energy contact', message: `The energy tool contacted the ${targetNames[target]} outside a removable tissue patch.`, char: 1, bleed: 1.5 });
      return respond(state, 'warning', 'No dissection patch here', 'This is a connection or adjacent structure. Select a removable patch, or use the correct instrument for the current stage.');
    }
    if (['bileDuct', 'duodenum'].includes(target)) return injury(state, action, { kind: 'wrong-target-division', title: 'Simulated wrong-target injury', message: `The scissors divided tissue in the ${targetNames[target]} target.`, bleed: 2 });
    const dividedKey = target === 'cysticDuct' ? 'ductDivided' : 'arteryDivided';
    const clipKey = target === 'cysticDuct' ? 'ductClips' : 'arteryClips';
    if (state[dividedKey]) return respond(state, 'info', 'Target already divided', 'This synthetic connection has already been released.');
    if (!state.safetyReviewed || state[clipKey] === 0 || powered) {
      return injury(state, action, { kind: 'unprotected-division', title: 'Unsafe simulated division', message: 'A cystic target was divided without the exercise’s complete checkpoint and protection conditions, or with energy active.', bleed: target === 'cysticArtery' ? 3 : 1.5, char: powered ? 1 : 0, changes: { [dividedKey]: true, safetyBreached: true } });
    }
    state[dividedKey] = true;
    return respond(state, 'success', 'Synthetic connection divided', `The protected ${targetNames[target]} has separated in the model.`, { type: 'divide', target, point: action.point });
  }

  if (['adhesions', 'triangleFat', 'liverBed'].includes(target)) {
    const supportsPatch = ['maryland', 'scissors', 'hook'].includes(tool.id) || (tool.id === 'fenestrated' && powered);
    if (!supportsPatch) return respond(state, 'warning', 'Choose a dissection instrument', 'This instrument does not remove the model’s tissue patches.');
    if (tool.id === 'hook' && !powered) return respond(state, 'warning', 'The hook is inactive', 'Select cut or coagulation mode to activate the model’s monopolar hook. No power setting is simulated.');
    if (!state.retracted || !state.omentumMoved) return respond(state, 'warning', 'Expose the model first', 'The game requires gallbladder retraction and movement of the omentum before tissue-patch actions.');
    if (target === 'triangleFat' && state.adhesionsRemaining > 0) return respond(state, 'warning', 'Adhesions still obscure this region', 'Remove the visible adhesion patches before the triangle-fat layer.');
    if (target === 'liverBed' && !divisionComplete(state)) return respond(state, 'warning', 'Connections remain attached', 'Complete the game’s protected cystic-connection stage before releasing the remaining liver-bed patches.');
    const countKey = { adhesions: 'adhesionsRemaining', triangleFat: 'fatRemaining', liverBed: 'bedRemaining' }[target];
    if (state[countKey] <= 0) return respond(state, 'info', 'This layer is complete', 'No removable patches remain at this target.');
    state[countKey] -= 1;
    if (target !== 'liverBed') invalidateViews(state);
    if (powered) {
      const sensitivity = caseById(state.caseId).inflamed ? 1.3 : 1;
      state.smoke = clamp(state.smoke + 0.16 * sensitivity, 0, 1);
    }
    return respond(state, 'success', 'Tissue patch released', `${state[countKey]} synthetic ${targetNames[target]} ${state[countKey] === 1 ? 'patch remains' : 'patches remain'}.`, { type: 'dissect', target, point: action.point, remaining: state[countKey], energized: powered });
  }

  if (tool.id === 'scissors' && ['liver', 'gallbladder', 'omentum'].includes(target)) return injury(state, action, { kind: 'off-target-cut', title: 'Simulated tissue injury', message: `The scissors contacted the ${targetNames[target]} instead of a removable patch.`, critical: false, bleed: 1 });
  return respond(state, 'warning', 'No action on this target', 'Choose a target and instrument that match the current exercise objective.');
}

export function act(current, action = {}) {
  const state = copyState(current);
  if (!action || typeof action !== 'object') return respond(state, 'warning', 'Unknown action', 'Choose an available simulation action.');
  if (action.type === 'resume') {
    state.paused = false; event(state, 'resume', {});
    return respond(state, 'info', 'Practice resumed', state.criticalInjury ? 'The critical injury remains. Review it or restart the case.' : 'Continue when ready.');
  }
  if (action.type === 'pause' || action.type === 'decline-safety') {
    state.paused = true; state.energyMode = 'off';
    event(state, 'pause', { reason: action.reason || 'Learner requested a supervised review' });
    return respond(state, 'info', 'Simulation paused', 'Choosing a pause is valid in every case. Discuss uncertainty with an educator; no instrument actions will run while paused.');
  }
  if (state.paused) return respond(state, 'info', 'Simulation is paused', 'Resume the exercise before changing instruments or contacting tissue.');

  if (action.type === 'choose-instrument') {
    if (!['left', 'right'].includes(action.arm) || !toolById.has(action.tool)) return respond(state, 'warning', 'Unavailable instrument', 'Choose an instrument and arm from the available controls.');
    state.instruments[action.arm] = action.tool;
    if (state.activeArm === action.arm) state.energyMode = 'off';
    event(state, 'instrument', { arm: action.arm, tool: action.tool });
    return respond(state, 'info', 'Instrument selected', `${toolById.get(action.tool).name} is assigned to the ${action.arm} interaction control.`, { type: 'instrument', arm: action.arm, tool: action.tool });
  }
  if (action.type === 'active-arm') {
    if (!['left', 'right'].includes(action.arm)) return respond(state, 'warning', 'Unknown arm', 'Select the left or right interaction control.');
    if (state.activeArm !== action.arm) state.energyMode = 'off';
    state.activeArm = action.arm;
    return respond(state, 'info', 'Active control changed', `The ${action.arm} control is active.`);
  }
  if (action.type === 'energy') {
    const tool = toolById.get(state.instruments[state.activeArm]);
    if (!['off', 'cut', 'coag'].includes(action.mode)) return respond(state, 'warning', 'Unknown energy mode', 'Choose off, cut, or coagulation.');
    if (action.mode !== 'off' && (!tool || tool.energy === 'none')) return respond(state, 'warning', 'This instrument has no energy mode', 'Select an energy-capable instrument before activating cut or coagulation.');
    if (action.mode === 'cut' && tool?.energy === 'bipolar') return respond(state, 'warning', 'Use the compatible mode', 'This model’s bipolar instruments support coagulation mode. Cut mode belongs to its monopolar instruments.');
    state.energyMode = action.mode;
    event(state, 'energy', { mode: action.mode, tool: tool?.id });
    return respond(state, action.mode === 'off' ? 'info' : 'warning', action.mode === 'off' ? 'Energy off' : 'Simulated energy active', 'Modes are illustrative. The prototype does not model watts, tissue temperature, or device settings.');
  }
  if (action.type === 'wrist') {
    if (!Number.isFinite(action.angle)) return respond(state, 'warning', 'Invalid wrist angle', 'Use the wrist control to set a finite model angle.');
    state.wristAngle = clamp(action.angle, -90, 90);
    return respond(state, 'info', 'Wrist adjusted', 'The instrument illustration rotated. This is not validated robotic kinematics.');
  }
  if (action.type === 'mode') {
    if (!['practice', 'guided'].includes(action.mode)) return respond(state, 'warning', 'Unknown practice mode', 'Choose guided safeguards or practice with consequences.');
    state.mode = action.mode;
    event(state, 'mode', { mode: action.mode });
    return respond(state, 'info', 'Practice mode changed', action.mode === 'guided' ? 'Risky contacts are blocked and recorded.' : 'Risky contacts can create persistent simulated injuries.');
  }
  if (action.type === 'view') {
    if (!['operative', 'anterior', 'posterior', 'closeup', 'overview'].includes(action.view)) return respond(state, 'warning', 'Unknown camera view', 'Choose an available camera view.');
    state.currentView = action.view;
    if (exposureReady(state) && state.lowerThirdReviewed) {
      if (['operative', 'anterior'].includes(action.view)) state.views.anterior = true;
      if (action.view === 'posterior') state.views.posterior = true;
    }
    event(state, 'view', { view: action.view, exposed: exposureReady(state) });
    return respond(state, 'info', 'View changed', exposureReady(state) && state.lowerThirdReviewed ? 'The perspective was recorded for the synthetic checkpoint.' : 'Complete exposure and inspect the lower-third model before recording the checkpoint perspectives.');
  }
  if (action.type === 'review-lower-third') {
    if (state.criticalInjury || state.safetyBreached || state.ductDivided || state.arteryDivided) return respond(state, 'error', 'Model review unavailable', 'A simulated injury or division prevents this pre-division review. Pause for educator review or restart.');
    if (!exposureReady(state)) return respond(state, 'warning', 'Exposure activities remain', 'Retract the gallbladder, move omentum, and remove adhesion and triangle-fat patches before inspecting the lower-third model.');
    if (state.lowerThirdReviewed) return respond(state, 'info', 'Lower-third model already revealed', 'Review its anterior and posterior perspectives before the synthetic checkpoint.');
    state.lowerThirdReviewed = true;
    state.views = { anterior: false, posterior: false };
    event(state, 'review-lower-third', { target: 'liverBed' });
    return respond(state, 'success', 'Lower-third model revealed', 'Inspect the schematic separation and cystic plate, then review both perspectives. This visual state is not a simulation of the technique or a verification of clinical evidence.', { type: 'lower-third-review', target: 'liverBed' });
  }
  if (action.type === 'review-safety') {
    event(state, 'review-safety', {});
    if (state.criticalInjury || state.safetyBreached || state.ductDivided || state.arteryDivided) return respond(state, 'error', 'Safety review cannot be established', 'A simulated injury or premature division prevents this checkpoint. Pause for review or restart.');
    if (caseById(state.caseId).uncertain) return respond(state, 'warning', 'Anatomy remains uncertain', 'This scenario cannot support the checkpoint. Pause and request educator review.');
    if (!exposureReady(state)) return respond(state, 'warning', 'Exposure activities remain', 'Retract the gallbladder, move omentum, and remove the model’s adhesion and triangle-fat patches before reviewing the checkpoint.');
    if (!state.lowerThirdReviewed) return respond(state, 'warning', 'Inspect the lower-third model', 'Reveal and inspect the schematic lower-third separation before recording the paired perspectives and reviewing the checkpoint.');
    if (!state.views.anterior || !state.views.posterior) return respond(state, 'warning', 'Review both perspectives', 'After exposure, inspect the operative or anterior view and the posterior view, then review the synthetic checkpoint.');
    state.safetyReviewed = true;
    return respond(state, 'success', 'Synthetic checkpoint reviewed', 'Review all three concepts: a cleared hepatocystic triangle, lower-third separation showing the cystic plate, and exactly two structures entering the gallbladder. This game flag does not verify clinical CVS.', { type: 'safety-review', target: 'gallbladder' });
  }
  if (action.type === 'tick') {
    const dt = Number.isFinite(action.dt) ? clamp(action.dt, 0, 5) : 0;
    if (!state.extracted) state.elapsed += dt;
    state.smoke = Math.max(0, state.smoke - dt * 0.14);
    return respond(state, 'info', 'Simulation updated', '');
  }
  if (action.type === 'contact') return contact(state, action);
  return respond(state, 'warning', 'Unknown action', 'Choose an available simulation action.');
}

function objective(label, done, target, tool) {
  return { label, done: Boolean(done), ...(target ? { target } : {}), ...(tool ? { tool } : {}) };
}

function overallObjectives(state) {
  return [
    objective('Retract the gallbladder', state.retracted),
    objective('Move the omentum', state.omentumMoved),
    objective('Remove adhesion patches', state.adhesionsRemaining === 0),
    objective('Remove triangle-fat patches', state.fatRemaining === 0),
    objective('Review the synthetic checkpoint', state.safetyReviewed),
    objective('Protect both cystic targets', state.ductClips > 0 && state.arteryClips > 0),
    objective('Divide both protected connections', divisionComplete(state)),
    objective('Release the liver-bed patches', state.bedRemaining === 0),
    objective('Retrieve the specimen', state.extracted),
  ];
}

export function getStage(state) {
  const all = overallObjectives(state);
  const progress = Math.round(all.filter(item => item.done).length / all.length * 100);
  const make = (id, title, instruction, objectives) => ({ id, title, instruction, progress, objectives });
  if (state.paused) return make('paused', 'Pause and review', 'The exercise is frozen. Discuss uncertainty or the action record with an educator, then resume or restart.', [objective('Resume only when ready', false)]);
  if (state.criticalInjury) return make('complication', 'Review the simulated injury', 'A critical complication stops procedural progress. Suction can clear the view, but cannot undo the injury. Pause for review or restart.', state.injuries.map(item => objective(item.message, false, item.target)));
  if (state.extracted) return make('debrief', state.injuries.length ? 'Completed with simulated injury' : 'Specimen retrieved', 'Review your decisions and the model’s limitations. Procedure completion is not a measure of clinical competence.', all);
  if (!state.retracted || !state.omentumMoved) return make('exposure', 'Create your working view', 'Use a grasper with energy off. Drag or activate the gallbladder, then the omentum.', [objective('Retract gallbladder', state.retracted, 'gallbladder', 'prograsp'), objective('Move omentum', state.omentumMoved, 'omentum', 'prograsp')]);
  if (state.adhesionsRemaining > 0 || state.fatRemaining > 0) return make('dissection', 'Reveal the anatomy', 'Contact the visible tissue patches with a compatible dissector. Clear adhesions before triangle fat.', [objective(`Adhesions: ${state.adhesionsRemaining} remaining`, state.adhesionsRemaining === 0, 'adhesions', 'maryland'), objective(`Triangle fat: ${state.fatRemaining} remaining`, state.fatRemaining === 0, 'triangleFat', 'maryland')]);
  if (!state.safetyReviewed) return make('safety', 'Review the synthetic checkpoint', 'First inspect the lower-third model, then visit the operative and posterior perspectives. Review the three CVS concepts or pause if anything remains unclear.', [objective('Inspect lower-third / cystic-plate model', state.lowerThirdReviewed), objective('Operative / anterior perspective', state.views.anterior), objective('Posterior perspective', state.views.posterior), objective('Synthetic safety review', state.safetyReviewed)]);
  if (state.ductClips === 0 || state.arteryClips === 0) return make('protection', 'Protect the two model targets', 'Use the clip applier on the cystic duct and artery. Each game token is an abstraction, not a clinical clip count.', [objective('Duct protection token', state.ductClips > 0, 'cysticDuct', 'clip'), objective('Artery protection token', state.arteryClips > 0, 'cysticArtery', 'clip')]);
  if (!divisionComplete(state)) return make('division', 'Release the protected connections', 'With the model’s scissors and energy off, contact each protected cystic target. Adjacent structures carry injury consequences.', [objective('Cystic duct divided', state.ductDivided, 'cysticDuct', 'scissors'), objective('Cystic artery divided', state.arteryDivided, 'cysticArtery', 'scissors')]);
  if (state.bedRemaining > 0) return make('liver-bed', 'Release the specimen', 'Use a compatible dissector on the remaining liver-bed patches. This changes meshes without simulating force or tissue planes.', [objective(`Liver-bed patches: ${state.bedRemaining} remaining`, false, 'liverBed', 'maryland')]);
  return make('retrieval', 'Bag and retrieve', 'Select the assistant-port specimen bag and contact the released gallbladder.', [objective('Retrieve gallbladder', state.extracted, 'gallbladder', 'retrieval')]);
}

export function getSummary(state) {
  const objectives = overallObjectives(state);
  const completedObjectives = objectives.filter(item => item.done).length;
  const completed = state.extracted && !state.criticalInjury;
  const clean = completed && state.injuries.length === 0 && !state.safetyBreached;
  const status = state.criticalInjury ? 'injury' : completed ? (clean ? 'completed' : 'completed-with-injury') : state.paused ? 'paused' : 'incomplete';
  return {
    caseId: state.caseId, caseTitle: caseById(state.caseId).title, status, completed, clean,
    title: status === 'injury' ? 'Complication review' : completed ? (clean ? 'Exercise complete' : 'Exercise complete with injury') : state.paused ? 'Paused for review' : 'Exercise incomplete',
    message: clean ? 'The model’s procedural sequence was completed without a recorded simulated injury.' : state.injuries.length ? 'Review the persistent injury record and the decisions that produced it.' : 'The model’s procedural sequence is not complete.',
    notice, extracted: state.extracted, injuries: state.injuries.map(item => ({ ...item })), injuryCount: state.injuries.length,
    actions: state.actions, elapsedSeconds: Math.round(state.elapsed), completedObjectives, totalObjectives: objectives.length,
    progress: Math.round(completedObjectives / objectives.length * 100), objectives,
    pauses: state.events.filter(item => item.action === 'pause').length,
    safeguards: state.events.filter(item => item.action === 'safeguard').length,
  };
}
