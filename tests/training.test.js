import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES, ANATOMY, PHASES, SOURCES, getFeedback } from '../src/training.js';

const orientationIds = ['liver', 'gallbladder'];
const anatomyIds = ['cysticDuct', 'cysticArtery', 'bileDuct'];

function session(caseId = 'routine') {
  return { caseId, phaseId: 'orientation', evidence: {}, identified: [] };
}

function choose(state, choiceId) {
  const feedback = getFeedback({ ...state, choiceId });
  if (feedback.accepted) {
    state.evidence = { ...state.evidence, ...feedback.evidence };
    state.phaseId = feedback.nextPhase;
  }
  return feedback;
}

function readyForSafety(caseId = 'routine') {
  const state = session(caseId);
  state.identified = [...orientationIds];
  assert.equal(choose(state, 'map-review').accepted, true);
  state.evidence.retracted = true;
  state.evidence.adhesionsCleared = true;
  assert.equal(choose(state, 'review-exposure').accepted, true);
  state.identified.push(...anatomyIds);
  assert.equal(choose(state, 'identify-pair').accepted, true);
  state.evidence.anteriorReviewed = true;
  state.evidence.posteriorReviewed = true;
  state.evidence.lowerThirdReviewed = true;
  return state;
}

test('the routine, adhesion, and short-duct cases reach a complete review through recorded observations', () => {
  for (const caseId of ['routine', 'adhesions', 'short-duct']) {
    const state = readyForSafety(caseId);
    const feedback = choose(state, 'cvs-supported');
    assert.equal(feedback.accepted, true, caseId);
    assert.equal(state.phaseId, 'debrief');
    assert.equal(state.evidence.cvsSupported, true);
    assert.equal(choose(state, 'finish-review').complete, true);
  }
});

test('orientation cannot advance on an answer without inspection of both landmarks', () => {
  const state = session();
  state.identified = ['liver'];
  const feedback = choose(state, 'map-review');
  assert.equal(feedback.accepted, false);
  assert.equal(state.phaseId, 'orientation');
  assert.deepEqual(feedback.missing, ['Inspect gallbladder']);
  assert.equal(choose(state, 'skip-orientation').type, 'error');
});

test('exposure requires retraction and requires adhesion review only in affected cases', () => {
  for (const trainingCase of CASES) {
    const state = { ...session(trainingCase.id), phaseId: 'exposure' };
    assert.equal(choose(state, 'review-exposure').accepted, false);
    state.evidence.retracted = true;
    const feedback = choose(state, 'review-exposure');
    assert.equal(feedback.accepted, trainingCase.adhesionLevel === 0, trainingCase.id);
    if (trainingCase.adhesionLevel > 0) {
      state.evidence.adhesionsCleared = true;
      assert.equal(choose(state, 'review-exposure').accepted, true);
    }
  }
});

test('recognition requires inspecting the main duct as well as the cystic pair', () => {
  const state = { ...session(), phaseId: 'recognition', identified: ['cysticDuct', 'cysticArtery'] };
  const feedback = choose(state, 'identify-pair');
  assert.equal(feedback.accepted, false);
  assert.deepEqual(feedback.missing, ['Inspect main bile duct']);
  state.identified.push('bileDuct');
  assert.equal(choose(state, 'identify-pair').accepted, true);
});

test('every required safety observation blocks a claim when absent', () => {
  const required = ['retracted', 'exposureReviewed', 'anatomyReviewed', 'anteriorReviewed', 'posteriorReviewed', 'lowerThirdReviewed'];
  for (const key of required) {
    const state = readyForSafety();
    state.evidence[key] = false;
    const feedback = choose(state, 'cvs-supported');
    assert.equal(feedback.accepted, false, key);
    assert.equal(state.phaseId, 'safety', key);
    assert.ok(feedback.missing.length > 0, key);
  }
  const adhesionCase = readyForSafety('adhesions');
  adhesionCase.evidence.adhesionsCleared = false;
  assert.equal(choose(adhesionCase, 'cvs-supported').accepted, false);
});

test('tissue and camera flags cannot replace the earlier exposure and anatomy decisions', () => {
  const state = readyForSafety();
  delete state.evidence.exposureReviewed;
  delete state.evidence.anatomyReviewed;
  const feedback = choose(state, 'cvs-supported');
  assert.equal(feedback.accepted, false);
  assert.ok(feedback.missing.includes('Complete the exposure decision'));
  assert.ok(feedback.missing.includes('Complete the anatomy decision'));
});

test('inflamed anatomy never supports CVS, even with all observation activities completed', () => {
  const state = readyForSafety('inflamed');
  const feedback = choose(state, 'cvs-supported');
  assert.equal(feedback.accepted, false);
  assert.equal(feedback.type, 'error');
  assert.equal(state.phaseId, 'safety');
  assert.equal(choose(state, 'cvs-not-established').accepted, true);
  assert.equal(state.phaseId, 'escalation');
  assert.equal(state.evidence.cvsSupported, false);
  assert.equal(choose(state, 'supervised-review').accepted, true);
  assert.equal(state.phaseId, 'debrief');
  assert.equal(state.evidence.escalated, true);
  assert.equal(choose(state, 'finish-review').complete, true);
});

test('an early pause is a valid path for every case', () => {
  for (const trainingCase of CASES) {
    const state = { ...session(trainingCase.id), phaseId: 'exposure' };
    assert.equal(choose(state, 'pause-obscured').accepted, true);
    assert.equal(state.phaseId, 'escalation');
    assert.equal(state.evidence.uncertaintyRecognized, true);
    assert.equal(choose(state, 'supervised-review').accepted, true);
    assert.equal(state.phaseId, 'debrief');
    assert.equal(state.evidence.cvsSupported, false);
  }
});

test('unsafe assumptions produce feedback and cannot advance the current phase', () => {
  const choices = [
    ['orientation', 'skip-orientation'],
    ['exposure', 'ignore-obscuration'],
    ['recognition', 'rely-color'],
    ['safety', 'two-structures-only'],
    ['escalation', 'force-completion'],
    ['escalation', 'trust-overlay'],
  ];
  for (const [phaseId, choiceId] of choices) {
    const state = { ...session(), phaseId };
    const feedback = choose(state, choiceId);
    assert.equal(feedback.accepted, false, choiceId);
    assert.equal(feedback.type, 'error', choiceId);
    assert.equal(state.phaseId, phaseId, choiceId);
    assert.equal(feedback.points, 0, choiceId);
  }
});

test('feedback does not mutate evidence or selected-structure inputs', () => {
  const state = readyForSafety();
  state.evidence = Object.freeze({ ...state.evidence });
  state.identified = Object.freeze([...state.identified]);
  const before = JSON.stringify(state);
  const feedback = getFeedback({ ...state, choiceId: 'cvs-supported' });
  assert.equal(feedback.accepted, true);
  assert.equal(JSON.stringify(state), before);
  assert.notEqual(feedback.evidence, state.evidence);
});

test('unknown cases, phases, and cross-phase choices fail closed', () => {
  for (const request of [
    { caseId: 'missing', phaseId: 'safety', choiceId: 'cvs-supported' },
    { caseId: 'routine', phaseId: 'missing', choiceId: 'map-review' },
    { caseId: 'routine', phaseId: 'orientation', choiceId: 'cvs-supported' },
    {},
  ]) {
    const feedback = getFeedback(request);
    assert.equal(feedback.accepted, false);
    assert.equal(feedback.type, 'error');
    assert.equal(feedback.complete, false);
  }
});

test('all case, phase, anatomy, and source references resolve for the UI', () => {
  assert.equal(new Set(CASES.map(item => item.id)).size, 4);
  assert.ok(CASES.every(item => item.caseId === item.id && Number.isInteger(item.adhesionLevel)));
  for (const phase of PHASES) {
    assert.equal(new Set(phase.choices.map(choice => choice.id)).size, phase.choices.length);
    assert.ok((phase.requiredStructures || []).every(id => ANATOMY[id]));
  }
  assert.equal(PHASES.find(item => item.id === 'safety').criteria.length, 3);
  assert.ok(SOURCES.every(source => new URL(source.url).protocol === 'https:'));
});
