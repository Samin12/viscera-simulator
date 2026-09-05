import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES, INSTRUMENTS, SAFETY_CRITERIA, createState, act, getStage, getSummary } from '../src/simulation.js';

function exercise(caseId) {
  let state = createState(caseId);
  return {
    get state() { return state; },
    send(action) { const result = act(state, action); state = result.state; return result; },
    tool(tool) { return this.send({ type: 'choose-instrument', arm: state.activeArm, tool }); },
    touch(target) { return this.send({ type: 'contact', target, gesture: 'activate', point: { x: 1, y: 2, z: 3 } }); },
    expose() {
      this.tool('prograsp');
      assert.equal(this.touch('gallbladder').effect?.type, 'retract');
      assert.equal(this.touch('omentum').effect?.type, 'move-omentum');
      this.tool('maryland');
      while (state.adhesionsRemaining > 0) assert.equal(this.touch('adhesions').effect?.type, 'dissect');
      while (state.fatRemaining > 0) assert.equal(this.touch('triangleFat').effect?.type, 'dissect');
    },
    review() {
      assert.equal(this.send({ type: 'review-lower-third' }).effect?.type, 'lower-third-review');
      this.send({ type: 'view', view: 'operative' });
      this.send({ type: 'view', view: 'posterior' });
      assert.equal(this.send({ type: 'review-safety' }).effect?.type, 'safety-review');
    },
    protectAndDivide() {
      this.tool('clip');
      assert.equal(this.touch('cysticDuct').effect?.type, 'clip');
      assert.equal(this.touch('cysticArtery').effect?.type, 'clip');
      this.tool('scissors');
      assert.equal(this.touch('cysticDuct').effect?.type, 'divide');
      assert.equal(this.touch('cysticArtery').effect?.type, 'divide');
    },
    retrieve() {
      this.tool('maryland');
      while (state.bedRemaining > 0) assert.equal(this.touch('liverBed').effect?.type, 'dissect');
      this.tool('retrieval');
      return this.touch('gallbladder');
    },
  };
}

test('all four authored pathology cases support dissection, protection, division, and extraction', () => {
  for (const trainingCase of CASES) {
    const sim = exercise(trainingCase.id);
    assert.equal(getStage(sim.state).id, 'exposure');
    sim.expose();
    assert.equal(getStage(sim.state).id, 'safety');
    sim.review();
    assert.equal(getStage(sim.state).id, 'protection');
    sim.protectAndDivide();
    assert.equal(getStage(sim.state).id, 'liver-bed');
    assert.equal(sim.retrieve().effect?.type, 'extract');
    const summary = getSummary(sim.state);
    assert.equal(getStage(sim.state).id, 'debrief');
    assert.equal(summary.status, 'completed', trainingCase.id);
    assert.equal(summary.clean, true);
    assert.equal(summary.progress, 100);
    assert.equal(summary.injuryCount, 0);
    assert.equal(sim.state.bedRemaining, 0);
    assert.ok(Number.isFinite(Date.parse(sim.state.finishedAt)));
    assert.match(sim.state.finishedAt, /^\d{4}-\d{2}-\d{2}T/);
  }
});

test('case geometry counts and findings persist from initial configuration', () => {
  for (const trainingCase of CASES) {
    const state = createState(trainingCase.id);
    assert.equal(state.adhesionsRemaining, trainingCase.initialAdhesions);
    assert.equal(state.fatRemaining, trainingCase.initialFat);
    assert.equal(state.bedRemaining, trainingCase.initialBed);
    assert.equal(state.caseId, trainingCase.id);
    assert.ok(trainingCase.stones > 0);
  }
  assert.equal(CASES.find(item => item.id === 'acute-cholecystitis').inflamed, true);
  assert.equal(CASES.find(item => item.id === 'short-duct').shortDuct, true);
  assert.ok(createState('adhesions').adhesionsRemaining > createState('gallstones').adhesionsRemaining);
});

test('the wrong instrument cannot remove tissue or retrieve an attached specimen', () => {
  const sim = exercise('adhesions');
  sim.tool('prograsp'); sim.touch('gallbladder'); sim.touch('omentum');
  const original = sim.state.adhesionsRemaining;
  assert.equal(sim.touch('adhesions').feedback.level, 'warning');
  assert.equal(sim.state.adhesionsRemaining, original);
  sim.tool('retrieval');
  assert.equal(sim.touch('gallbladder').feedback.level, 'warning');
  assert.equal(sim.state.extracted, false);
});

test('drag gestures work for exposure and dissector contact removes one patch per event', () => {
  const sim = exercise('adhesions');
  sim.tool('cadiere');
  sim.send({ type: 'contact', target: 'gallbladder', gesture: 'drag', dragAmount: 25 });
  sim.send({ type: 'contact', target: 'omentum', gesture: 'drag', dragAmount: 30 });
  assert.equal(sim.state.retracted, true);
  assert.equal(sim.state.omentumMoved, true);
  sim.tool('maryland');
  const previous = sim.state.adhesionsRemaining;
  sim.send({ type: 'contact', target: 'adhesions', gesture: 'drag', dragAmount: 20 });
  assert.equal(sim.state.adhesionsRemaining, previous - 1);
});

test('tissue layers and liver bed cannot be released before the game prerequisites', () => {
  const sim = exercise('adhesions');
  const fat = sim.state.fatRemaining, bed = sim.state.bedRemaining;
  assert.equal(sim.touch('triangleFat').feedback.level, 'warning');
  sim.tool('prograsp'); sim.touch('gallbladder'); sim.touch('omentum'); sim.tool('maryland');
  assert.equal(sim.touch('triangleFat').feedback.level, 'warning');
  assert.equal(sim.touch('liverBed').feedback.level, 'warning');
  assert.equal(sim.state.fatRemaining, fat);
  assert.equal(sim.state.bedRemaining, bed);
});

test('pre-exposure camera visits do not certify a later synthetic checkpoint', () => {
  const sim = exercise('gallstones');
  sim.send({ type: 'view', view: 'operative' });
  sim.send({ type: 'view', view: 'posterior' });
  sim.expose();
  assert.deepEqual(sim.state.views, { anterior: false, posterior: false });
  assert.equal(sim.send({ type: 'review-safety' }).feedback.level, 'warning');
  assert.equal(sim.state.safetyReviewed, false);
  assert.equal(sim.send({ type: 'review-lower-third' }).effect?.type, 'lower-third-review');
  sim.send({ type: 'view', view: 'anterior' });
  assert.equal(sim.send({ type: 'review-safety' }).feedback.level, 'warning');
  sim.send({ type: 'view', view: 'posterior' });
  assert.equal(sim.send({ type: 'review-safety' }).effect?.type, 'safety-review');
});

test('the lower-third model must be exposed separately before paired-view evidence counts', () => {
  const sim = exercise('gallstones');
  assert.equal(sim.send({ type: 'review-lower-third' }).feedback.level, 'warning');
  assert.equal(sim.state.lowerThirdReviewed, false);
  sim.expose();
  sim.send({ type: 'view', view: 'operative' });
  sim.send({ type: 'view', view: 'posterior' });
  assert.deepEqual(sim.state.views, { anterior: false, posterior: false });
  assert.equal(sim.send({ type: 'review-safety' }).feedback.level, 'warning');
  const bedPatches = sim.state.bedRemaining;
  sim.send({ type: 'review-lower-third' });
  assert.equal(sim.state.lowerThirdReviewed, true);
  assert.equal(sim.state.bedRemaining, bedPatches);
  sim.send({ type: 'view', view: 'operative' });
  sim.send({ type: 'view', view: 'posterior' });
  sim.send({ type: 'review-lower-third' });
  assert.deepEqual(sim.state.views, { anterior: true, posterior: true });
  assert.equal(sim.send({ type: 'review-safety' }).effect?.type, 'safety-review');
});

test('clips are checkpoint-gated and repeat contact cannot inflate the protection count', () => {
  const sim = exercise('gallstones');
  sim.tool('clip');
  assert.equal(sim.touch('cysticDuct').feedback.level, 'warning');
  assert.equal(sim.state.ductClips, 0);
  sim.expose(); sim.review(); sim.tool('clip');
  sim.touch('cysticDuct'); sim.touch('cysticDuct');
  assert.equal(sim.state.ductClips, 1);
});

test('unsafe cystic division changes the model and records a critical injury instead of success', () => {
  const sim = exercise('gallstones');
  sim.tool('scissors');
  const result = sim.touch('cysticDuct');
  assert.equal(result.feedback.level, 'error');
  assert.equal(result.effect.type, 'injury');
  assert.equal(sim.state.ductDivided, true);
  assert.equal(sim.state.safetyBreached, true);
  assert.ok(sim.state.bleeding > 0);
  assert.equal(sim.state.injuries.length, 1);
  assert.equal(getStage(sim.state).id, 'complication');
  assert.equal(getSummary(sim.state).status, 'injury');
  assert.equal(getSummary(sim.state).clean, false);
  assert.equal(sim.send({ type: 'review-safety' }).feedback.level, 'error');
});

test('energized non-target contacts create persistent thermal injury and visible char', () => {
  for (const target of ['bileDuct', 'duodenum']) {
    const sim = exercise('gallstones');
    sim.tool('hook'); sim.send({ type: 'energy', mode: 'cut' });
    const result = sim.touch(target);
    assert.equal(result.effect.type, 'injury');
    assert.equal(sim.state.injuries[0].target, target);
    assert.deepEqual(sim.state.injuries[0].point, [1, 2, 3]);
    assert.ok(sim.state.charMarks > 0);
    assert.ok(sim.state.smoke > 0);
    assert.ok(sim.state.bleeding > 0);
    sim.tool('suction'); sim.touch('bleeding');
    assert.equal(sim.state.injuries.length, 1);
    assert.equal(getSummary(sim.state).completed, false);
  }
});

test('an injury location is serialized independently from the contact input', () => {
  const sim = exercise('gallstones');
  sim.tool('scissors');
  const point = [0.1, 0.2, 0.3];
  sim.send({ type: 'contact', target: 'bileDuct', point });
  point[0] = 99;
  const restored = JSON.parse(JSON.stringify(sim.state));
  assert.deepEqual(restored.injuries[0].point, [0.1, 0.2, 0.3]);
  assert.deepEqual(restored.events.find(item => item.action === 'contact').detail.point, [0.1, 0.2, 0.3]);
});

test('guided mode rejects an unsafe cut but records the safeguard', () => {
  const sim = exercise('gallstones');
  sim.send({ type: 'mode', mode: 'guided' }); sim.tool('scissors');
  const result = sim.touch('cysticDuct');
  assert.equal(result.effect.type, 'blocked');
  assert.equal(sim.state.ductDivided, false);
  assert.equal(sim.state.injuries.length, 0);
  assert.equal(getSummary(sim.state).safeguards, 1);
});

test('energy requires a compatible installed instrument and resets when active tools change', () => {
  const sim = exercise('gallstones');
  sim.tool('prograsp');
  assert.equal(sim.send({ type: 'energy', mode: 'cut' }).feedback.level, 'warning');
  assert.equal(sim.state.energyMode, 'off');
  sim.tool('maryland');
  assert.equal(sim.send({ type: 'energy', mode: 'cut' }).feedback.level, 'warning');
  assert.equal(sim.send({ type: 'energy', mode: 'coag' }).state.energyMode, 'coag');
  sim.tool('scissors');
  assert.equal(sim.state.energyMode, 'off');
  sim.send({ type: 'energy', mode: 'cut' });
  sim.send({ type: 'active-arm', arm: 'left' });
  assert.equal(sim.state.energyMode, 'off');
  assert.equal(sim.send({ type: 'choose-instrument', arm: 'left', tool: 'missing' }).feedback.level, 'warning');
  assert.equal(sim.state.instruments.left, 'prograsp');
});

test('pause freezes contact, instrument changes, and simulation time until resume', () => {
  const sim = exercise('gallstones');
  sim.send({ type: 'tick', dt: 1 });
  sim.send({ type: 'pause', reason: 'Uncertain anatomy' });
  const paused = JSON.stringify(sim.state);
  sim.touch('gallbladder'); sim.tool('hook'); sim.send({ type: 'tick', dt: 3 });
  assert.equal(JSON.stringify(sim.state), paused);
  assert.equal(getStage(sim.state).id, 'paused');
  assert.equal(getSummary(sim.state).status, 'paused');
  sim.send({ type: 'resume' });
  sim.send({ type: 'tick', dt: 1 });
  assert.equal(sim.state.elapsed, 2);
});

test('declining the safety review is supported for every case', () => {
  for (const trainingCase of CASES) {
    const state = act(createState(trainingCase.id), { type: 'decline-safety' }).state;
    assert.equal(state.paused, true);
    assert.equal(state.safetyReviewed, false);
    assert.equal(getSummary(state).completed, false);
  }
});

test('a partly completed serialized session resumes without replay or progress drift', () => {
  const sim = exercise('adhesions');
  sim.tool('prograsp'); sim.touch('gallbladder'); sim.touch('omentum'); sim.tool('maryland');
  sim.touch('adhesions');
  const original = sim.state;
  const restored = JSON.parse(JSON.stringify(original));
  assert.deepEqual(restored, original);
  const nextAction = { type: 'contact', target: 'adhesions', gesture: 'activate' };
  const fromOriginal = act(original, nextAction);
  const fromRestored = act(restored, nextAction);
  assert.deepEqual(fromRestored, fromOriginal);
  assert.equal(original.adhesionsRemaining, CASES.find(item => item.id === 'adhesions').initialAdhesions - 1);
  assert.equal(fromRestored.state.adhesionsRemaining, original.adhesionsRemaining - 1);
});

test('act never mutates the caller state or its nested records', () => {
  const state = createState('gallstones');
  Object.freeze(state.instruments); Object.freeze(state.views); Object.freeze(state.events); Object.freeze(state.injuries); Object.freeze(state);
  const before = JSON.stringify(state);
  const result = act(state, { type: 'choose-instrument', arm: 'right', tool: 'scissors' });
  assert.equal(JSON.stringify(state), before);
  assert.equal(result.state.instruments.right, 'scissors');
  assert.notEqual(result.state.instruments, state.instruments);
});

test('a completed procedure with an earlier noncritical injury is explicitly marked as injured', () => {
  const sim = exercise('gallstones');
  sim.tool('scissors');
  sim.touch('liver');
  assert.equal(sim.state.criticalInjury, false);
  assert.equal(sim.state.injuries.length, 1);
  sim.expose(); sim.review(); sim.protectAndDivide();
  assert.equal(sim.retrieve().feedback.level, 'warning');
  const summary = getSummary(sim.state);
  assert.equal(summary.status, 'completed-with-injury');
  assert.equal(summary.clean, false);
  assert.equal(summary.injuryCount, 1);
});

test('the instrument catalog distinguishes the assistant accessory and avoids power dosages', () => {
  assert.equal(INSTRUMENTS.find(item => item.id === 'suction').assistant, false);
  assert.equal(INSTRUMENTS.find(item => item.id === 'retrieval').assistant, true);
  assert.equal(INSTRUMENTS.filter(item => item.assistant).length, 1);
  assert.equal(new Set(INSTRUMENTS.map(item => item.id)).size, 9);
  assert.equal(SAFETY_CRITERIA.length, 3);
  assert.match(getSummary(createState()).notice, /does not establish.*clinical.*competence/i);
});
