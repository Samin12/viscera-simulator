import './style.css';
import {REFERENCE_PHOTOS} from './reference-photos.js';
import {createOperativeScene} from './operative-scene.js';
import {INSTRUMENTS,CASES,createState,act,getStage,getSummary} from './simulation.js';

const $=q=>document.querySelector(q);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={cross:'<path d="M12 3v18M3 12h18"/>',chevron:'<path d="m8 10 4 4 4-4"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',check:'<path d="m5 12 4 4L19 6"/>',camera:'<rect x="3" y="6" width="14" height="12" rx="2"/><path d="m17 10 4-3v10l-4-3"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',layers:'<path d="m12 3 10 5-10 5L2 8Zm-9 10 9 5 9-5M3 18l9 5 9-5"/>',reset:'<path d="M3 10a9 9 0 1 1 1 8M3 3v7h7"/>',pause:'<path d="M8 5v14M16 5v14"/>',play:'<path d="m8 4 12 8-12 8Z"/>',settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',target:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="3"/>',zap:'<path d="m13 2-9 12h7l-1 8 10-13h-7Z"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 1 1 3 5v2m0 2v1"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'};
const icon=(name)=>`<svg viewBox="0 0 24 24" class="icon" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.target}</svg>`;
function instrumentDrawing(id){
 const tips={prograsp:'<path d="m74 18 15-8 4 3-12 9M75 26l16 8 3-3-13-9"/><path d="m87 13 1 2m-5 0 1 2m4 12-1 2m-4-4-1 2"/>',cadiere:'<path d="m74 18 16-6 5 3-17 7m-4 4 16 6 5-3-17-7"/>',fenestrated:'<path d="m74 19 15-7q9 0 4 5l-14 5m-5 3 15 7q9 0 4-5l-14-5"/>',maryland:'<path d="M73 18q14-7 23-5-8 2-17 9m-6 4q14 7 23 5-8-2-17-9"/>',scissors:'<path d="m74 18 22-7-17 11 17 11-22-7"/><circle cx="75" cy="22" r="3"/>',hook:'<path d="M74 22h16q5 0 5-6v-4h-6"/>',clip:'<path d="m73 17 21-3v6H81m-8 7 21 3v-6H81"/><path d="M87 17v10"/>',suction:'<path d="M72 18h23v8H72"/><ellipse cx="95" cy="22" rx="2" ry="4"/>',retrieval:'<path d="M72 22h10"/><ellipse cx="94" cy="22" rx="13" ry="10"/><path d="M81 24q5 17 25 10l1-10"/>'};
 return `<svg class="instrument-drawing" viewBox="0 0 113 44" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19h58v6H4" opacity=".55"/><path d="M58 18h8l8 2v4l-8 2h-8"/><path d="M64 18v8M68 19v6" opacity=".5"/>${tips[id]||tips.prograsp}</svg>`;
}
const names={liver:'Liver',gallbladder:'Gallbladder',omentum:'Omentum',adhesions:'Adhesions',triangleFat:'Pericystic fat',cysticDuct:'Cystic duct',cysticArtery:'Cystic artery',bileDuct:'Main bile duct',liverBed:'Gallbladder bed',duodenum:'Duodenum',bleeding:'Blood in field',specimen:'Gallbladder specimen'};
let state=createState('gallstones');
let scene=null,hoverTarget=null,assistedTarget=null,labels=false,overlay=false,cameraMode=false,panel='instruments',drawer=null,feedback=null,feedbackTimer;
let sessionStarted=false;
let saved=null;try{saved=JSON.parse(localStorage.getItem('viscera-operative-current')||'null');}catch{}
const currentCase=()=>CASES.find(c=>c.id===state.caseId)||CASES[0];
const currentTool=()=>INSTRUMENTS.find(t=>t.id===state.instruments[state.activeArm])||INSTRUMENTS[0];

$('#app').innerHTML=`
<header class="app-header"><a href="#" class="brand"><span class="brand-mark">${icon('cross')}</span>viscera<span class="brand-dot">.</span><small>OPERATIVE SIMULATOR</small></a><div class="header-title"><span class="status-dot"></span>Robotic cholecystectomy <span class="version">02</span></div><div class="header-actions"><button id="help-button" class="text-button">${icon('help')} Controls</button><button id="about-button" class="text-button">${icon('info')} About</button></div></header>
<main class="console-layout">
 <section class="surgical-workspace">
  <div class="case-bar"><div><span class="eyebrow">SYNTHETIC PATIENT / CHOLECYSTECTOMY</span><button id="case-selector" class="case-title"></button></div><div class="case-bar-actions"><button id="photos-button" class="light-button reference-button">Reference photos</button><button id="resume-saved" class="light-button" ${saved?.version===2?'':'hidden'}>Resume saved</button><span id="timer" class="timer">00:00</span><button id="restart-button" class="light-button" title="Restart case">${icon('reset')}</button></div></div>
  <div id="viewport" class="operative-viewport">
   <div id="operative-scene" aria-label="Interactive synthetic operative field. Move pointer to position the instrument; click a tissue surface to act. Right-drag to move camera."></div>
   <div class="scope-vignette"></div>
   <div class="viewport-header"><div class="scope-info"><span class="scope-dot"></span><span>ENDOSCOPIC VIEW</span><small id="pathology-label"></small></div><div class="viewport-tools"><button class="scope-button" id="camera-button" aria-pressed="false" title="Toggle camera movement">${icon('camera')} Camera</button><button class="scope-button" id="labels-button" aria-pressed="false">${icon('eye')} Labels</button><button class="scope-button" id="overlay-button" aria-pressed="false">${icon('layers')} Anatomy aid</button><button class="scope-button" id="home-view" title="Reset operative camera" aria-label="Reset operative camera">${icon('target')}</button></div></div>
   <div class="field-target"><span id="active-tool-label"></span><span id="target-label">Position the instrument over tissue</span></div>
   <div id="field-feedback" class="field-feedback" role="status" aria-live="polite" hidden></div>
   <div id="pause-screen" class="pause-screen" hidden><div>${icon('pause')}<h2>Simulation paused</h2><p>Instrument actions and the timer are paused.</p><button id="resume-live" class="primary-button">Resume practice ${icon('play')}</button></div></div>
   <div id="scene-error" class="scene-error" hidden><h2>The 3D view is unavailable.</h2><p>Use a browser with WebGL enabled. The operating controls require an active 3D scene.</p></div>
   <div class="view-switch" role="group" aria-label="Camera viewpoints"><button data-view="operative" class="active">Operative</button><button data-view="closeup">Close-up</button><button data-view="posterior">Posterior review</button></div>
   <div class="field-bottom"><span id="field-status">SYNTHETIC TISSUE · MOUSE CONTROL</span><span id="smoke-status"></span><span id="bleeding-status"></span></div>
  </div>
  <div class="console-controls">
   <button class="arm-slot" data-arm="left" id="left-arm-slot"></button>
   <div class="energy-console"><div class="energy-label">${icon('zap')} SIMULATED ENERGY</div><div class="pedals" role="group" aria-label="Energy mode"><button data-energy="off" class="active">OFF</button><button data-energy="cut">CUT <kbd>C</kbd></button><button data-energy="coag">COAG <kbd>V</kbd></button></div><span id="energy-compatibility"></span></div>
   <button class="arm-slot active" data-arm="right" id="right-arm-slot"></button>
  </div>
  <div class="interaction-hint"><span><kbd>Click / drag</kbd> Instrument action</span><span><kbd>Right drag</kbd> Camera</span><span><kbd>Scroll</kbd> Zoom</span><span><kbd>1</kbd> Left arm <kbd>2</kbd> Right arm</span><button id="pause-button">${icon('pause')} Pause</button></div>
  <section class="workflow-panel" aria-label="Procedure progress"><div class="workflow-heading"><span class="eyebrow">PROCEDURE PROGRESS</span><span id="progress-label"></span></div><div class="stage-track" id="stage-track"></div><div id="current-stage"></div></section>
 </section>
 <aside class="instrument-panel"><div class="panel-tabs" role="tablist" aria-label="Console panel"><button role="tab" data-panel="instruments" class="active" aria-selected="true">Instruments</button><button role="tab" data-panel="settings" aria-selected="false">Settings</button><button role="tab" data-panel="session" aria-selected="false">Session</button></div><div id="panel-content"></div><div class="panel-footer"><span class="status-dot"></span><span id="save-state">Saved locally</span><button id="export-button" aria-label="Export session" title="Export session">${icon('download')}</button></div></aside>
</main>
<footer class="app-footer"><span>Research prototype · Synthetic anatomy and approximate mechanics · No connection to clinical hardware</span><button id="references-button">Visual & instrument references ${icon('arrow')}</button></footer>
<div id="drawer-backdrop" class="drawer-backdrop" hidden></div><aside id="drawer" class="drawer" role="dialog" aria-modal="true" aria-label="Simulator options" hidden></aside>
<div id="toast" class="toast" role="status" aria-live="polite"></div>`;

function persist(){try{localStorage.setItem('viscera-operative-current',JSON.stringify({version:2,state,labels,overlay}));$('#save-state').textContent='Saved on this device';}catch{$('#save-state').textContent='Export to save';}}
function archive(){try{const history=JSON.parse(localStorage.getItem('viscera-operative-history')||'[]');const entry={...getSummary(state),caseId:state.caseId,caseTitle:currentCase().title,startedAt:state.startedAt,finishedAt:state.finishedAt,actions:state.actions,injuries:state.injuries,extracted:state.extracted};const i=history.findIndex(x=>x.startedAt===state.startedAt);if(i>=0)history[i]=entry;else history.unshift(entry);localStorage.setItem('viscera-operative-history',JSON.stringify(history.slice(0,30)));}catch{}}
function syncScene(){if(!scene)return;scene.syncState(state);scene.setActiveArm(state.activeArm);scene.setInstrument('left',state.instruments.left);scene.setInstrument('right',state.instruments.right);}
function dispatch(action,{quiet=false}={}){
 if(!scene && ['contact','review-lower-third','review-safety','view'].includes(action.type)){toast('The operative field must be available for this action.');return;}
 if(action.type!=='tick')sessionStarted=true;
 const previous=state;const result=act(state,action);state=result.state;
 if(!quiet && result.feedback){feedback=result.feedback;showFeedback(feedback);}
 syncScene();
 if(action.type==='wrist'){const output=$('.setting-block output');if(output)output.textContent=`${Math.round(state.wristAngle)}°`;persist();}
 else if(action.type!=='tick'){render();persist();}
 else renderLive();
 if(!previous.extracted && state.extracted){archive();panel='session';renderPanel();}
 return result;
}
function selectArm(arm){dispatch({type:'active-arm',arm},{quiet:true});}
function equip(id){dispatch({type:'choose-instrument',arm:state.activeArm,tool:id});}
function contact(target,gesture='activate',point,dragAmount){
 if(!target)return toast('Position the tip on a tissue surface first.');
 dispatch({type:'contact',target,gesture,point,dragAmount});
}
function startCase(id,resume){
 sessionStarted=true;state=resume||createState(id);feedback=null;hoverTarget=null;assistedTarget=null;labels=resume?Boolean(saved?.labels):false;overlay=resume?Boolean(saved?.overlay):false;cameraMode=false;panel='instruments';
 scene?.setCase(currentCase());syncScene();scene?.setLabels(labels);scene?.setOverlay(overlay);scene?.setCameraMode(false);scene?.setView(state.currentView==='anterior'?'operative':state.currentView||'operative');
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===(state.currentView==='anterior'?'operative':state.currentView||'operative')));
 $('#labels-button').setAttribute('aria-pressed',String(labels));$('#overlay-button').setAttribute('aria-pressed',String(overlay));$('#camera-button').setAttribute('aria-pressed','false');
 $('#field-feedback').hidden=true;$('#resume-saved').hidden=true;closeDrawer();render();persist();
}
function render(){
 $('#case-selector').innerHTML=`${esc(currentCase().title)} ${icon('chevron')}`;
 $('#pathology-label').textContent=currentCase().subtitle||currentCase().description;
 for(const arm of ['left','right']){
  const t=INSTRUMENTS.find(t=>t.id===state.instruments[arm]);const active=state.activeArm===arm;
  const b=$(`#${arm}-arm-slot`);b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));
  b.innerHTML=`<span class="arm-letter">${arm==='left'?'L':'R'}</span><span class="arm-tool-copy"><small>${t?.assistant?'ASSISTANT ACCESSORY':`${arm.toUpperCase()} INSTRUMENT`} ${active?'· ACTIVE':''}</small><strong>${esc(t?.name)}</strong></span>${instrumentDrawing(t?.id)}`;
 }
 document.querySelectorAll('[data-energy]').forEach(b=>{b.classList.toggle('active',state.energyMode===b.dataset.energy);b.setAttribute('aria-pressed',String(state.energyMode===b.dataset.energy));});
 const t=currentTool();$('#energy-compatibility').textContent=t.energy && t.energy!=='none' ? `${t.energy==='bipolar'?'Bipolar':t.energy==='monopolar'?'Monopolar':'Energy-capable'} instrument · no real power settings`:'Mechanical instrument · energy unavailable';
 $('#active-tool-label').textContent=`${t.assistant?'ASSISTANT':state.activeArm.toUpperCase()+' ARM'} / ${t.name}`;
 $('#pause-screen').hidden=!state.paused;$('#pause-button').innerHTML=`${icon(state.paused?'play':'pause')} ${state.paused?'Resume':'Pause'}`;
 renderLive();renderStage();renderPanel();
}
function renderLive(){
 const elapsed=Math.floor(state.elapsed||0);$('#timer').textContent=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`;
 $('#smoke-status').textContent=state.smoke>0?'SIMULATED SMOKE':'';
 $('#bleeding-status').textContent=state.bleeding>0?'SIMULATED BLEEDING':'';
 $('#field-status').textContent=state.extracted?'SPECIMEN RETRIEVED · REVIEW SESSION':state.paused?'PAUSED':`${state.energyMode==='off'?'MECHANICAL ACTION':state.energyMode.toUpperCase()+' ENERGY ARMED'} · SYNTHETIC FIELD`;
}
const phases=[['exposure','Expose'],['dissection','Dissect'],['safety','Assess'],['control','Clip & divide'],['bed','Detach'],['complete','Retrieve']];
function stageIndex(st){const ids={retraction:0,exposure:0,omentum:0,adhesions:1,fat:1,dissection:1,safety:2,checkpoint:2,clipping:3,control:3,division:3,divide:3,bed:4,detachment:4,dissectBed:4,retrieval:5,complete:5,extracted:5};return ids[st.id]??(state.extracted?5:state.ductDivided&&state.arteryDivided?4:state.safetyReviewed?3:state.fatRemaining===0?2:state.omentumMoved?1:0);}
function renderStage(){
 const stage=getStage(state),idx=stageIndex(stage);
 $('#progress-label').textContent=state.extracted?'Simulation ended':`Phase ${idx+1} of 6`;
 $('#stage-track').innerHTML=phases.map(([id,name],i)=>`<div class="stage-stop ${i===idx?'current':''} ${i<idx?'done':''}"><span>${i<idx?icon('check'):i+1}</span><strong>${name}</strong></div>`).join('');
 const objs=stage.objectives||[];
 $('#current-stage').innerHTML=`<div class="stage-copy"><span class="eyebrow">${state.extracted?'SESSION REVIEW':'CURRENT OBJECTIVE'}</span><h2>${esc(stage.title)}</h2><p>${esc(stage.instruction)}</p></div><div class="stage-objectives">${objs.map(o=>`<div class="objective ${o.done?'done':''}"><span>${o.done?icon('check'):''}</span>${esc(o.label)}</div>`).join('')}${!state.safetyReviewed && idx===2?`<button id="review-lower-third" class="secondary-button">Inspect lower-third model</button><button id="review-safety" class="primary-button">Review simulation checkpoint ${icon('arrow')}</button>`:''}${state.extracted?`<button id="view-debrief" class="primary-button">View debrief ${icon('arrow')}</button>`:''}<button id="request-review" class="quiet-button">Pause for supervisor review</button></div>`;
 $('#review-lower-third')?.addEventListener('click',()=>{dispatch({type:'review-lower-third'});scene?.focusTarget('liverBed');});
 $('#review-safety')?.addEventListener('click',()=>openDrawer('safety'));
 $('#view-debrief')?.addEventListener('click',()=>{panel='session';renderPanel();$('#panel-content').scrollIntoView({behavior:'smooth',block:'nearest'});});
 $('#request-review')?.addEventListener('click',()=>{dispatch({type:'pause'});toast('Paused for review. Describe the uncertainty to your supervising educator.');});
}
function eventDescription(e){const d=e.detail;if(typeof d==='string')return d;if(!d)return e.message||e.target||'';if(d.message)return d.message;return [d.tool?INSTRUMENTS.find(t=>t.id===d.tool)?.name:'',d.target?names[d.target]||d.target:'',d.energy?`Energy: ${d.energy}`:'',d.view?`${d.view} view`:'',d.mode?`${d.mode} mode`:'',Number.isFinite(d.remaining)?`${d.remaining} patches remaining`:''].filter(Boolean).join(' · ');}
function renderPanel(){
 document.querySelectorAll('[data-panel]').forEach(b=>{b.classList.toggle('active',panel===b.dataset.panel);b.setAttribute('aria-selected',String(panel===b.dataset.panel));});
 if(panel==='instruments'){
  $('#panel-content').innerHTML=`<div class="panel-heading"><span class="eyebrow">INSTRUMENT LIBRARY</span><h2>Choose your instrument.</h2><p>Equip the active arm, then work directly in the field.</p></div><div class="equip-arm-picker"><button data-equip-arm="left" class="${state.activeArm==='left'?'active':''}">Left arm <kbd>1</kbd></button><button data-equip-arm="right" class="${state.activeArm==='right'?'active':''}">Right arm <kbd>2</kbd></button></div><div class="instrument-list">${INSTRUMENTS.filter(t=>!t.assistant).map(instrumentRow).join('')}</div><div class="assistant-heading">ASSISTANT PORT</div><div class="instrument-list">${INSTRUMENTS.filter(t=>t.assistant).map(instrumentRow).join('')}</div><div class="instrument-detail"><strong>${esc(currentTool().name)}</strong><p>${esc(currentTool().description)}</p></div><p class="library-note">Representative cholecystectomy set. Instrument geometry and mechanics are approximations.</p>`;
  document.querySelectorAll('[data-equip]').forEach(b=>b.addEventListener('click',()=>equip(b.dataset.equip)));
  document.querySelectorAll('[data-equip-arm]').forEach(b=>b.addEventListener('click',()=>selectArm(b.dataset.equipArm)));
 } else if(panel==='settings'){
  $('#panel-content').innerHTML=`<div class="panel-heading"><span class="eyebrow">CONSOLE SETTINGS</span><h2>Set up your view.</h2><p>These controls represent desktop practice, not a calibrated da Vinci console.</p></div><div class="setting-row"><div><strong>Structure labels</strong><small>Names of visible teaching targets</small></div><input id="setting-labels" type="checkbox" ${labels?'checked':''} aria-label="Structure labels"/></div><div class="setting-row"><div><strong>Anatomy aid</strong><small>Reveal the model’s deeper structures</small></div><input id="setting-overlay" type="checkbox" ${overlay?'checked':''} aria-label="Anatomy aid"/></div><div class="setting-block"><label for="wrist-angle">Instrument wrist rotation <output>${Math.round(state.wristAngle||0)}°</output></label><input id="wrist-angle" type="range" min="-70" max="70" step="5" value="${state.wristAngle||0}"/><small>Visual articulation only. Use [ and ] to adjust.</small></div><div class="setting-block"><h3>Camera review</h3><div class="settings-views"><button data-setting-view="operative">Anterior</button><button data-setting-view="posterior">Posterior</button><button data-setting-view="closeup">Close-up</button></div></div><div class="setting-block"><h3>Target assist</h3><p>Optional keyboard access. Focus a model target, then use <kbd>Space</kbd> to apply the active instrument.</p><select id="assist-target" aria-label="Target assist"><option value="">Choose a model target</option>${Object.entries(names).map(([id,n])=>`<option value="${id}" ${assistedTarget===id?'selected':''}>${n}</option>`).join('')}</select><button id="assist-focus" class="secondary-button">${icon('target')} Focus selected target</button></div><div class="setting-block"><h3>Simulation model</h3><p>Discrete tissue patches, simulated clip protection, energy marks, smoke, and bleeding. No force feedback, patient physiology, or clinical generator settings.</p></div>`;
  $('#setting-labels').addEventListener('change',toggleLabels);$('#setting-overlay').addEventListener('change',toggleOverlay);
  $('#wrist-angle').addEventListener('input',e=>{const angle=Number(e.target.value);dispatch({type:'wrist',angle},{quiet:true});});
  document.querySelectorAll('[data-setting-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.settingView)));
  $('#assist-target').addEventListener('change',e=>{assistedTarget=e.target.value;});
  $('#assist-focus').addEventListener('click',()=>{if(!assistedTarget)return toast('Select a target first.');scene?.focusTarget(assistedTarget);$('#operative-scene canvas')?.focus();hoverTarget=assistedTarget;$('#target-label').textContent=names[assistedTarget];toast('Target focused. Space applies the active instrument to this assisted target.');});
 } else {
  const summary=getSummary(state);
  $('#panel-content').innerHTML=`<div class="panel-heading"><span class="eyebrow">SESSION RECORD</span><h2>${state.extracted?'Your practice, reviewed.':'Track your decisions.'}</h2><p>${esc(summary.message||summary.description||(state.injuries.length?'This session includes simulated injuries.':'Every tissue interaction is recorded.'))}</p></div><div class="session-stats"><div><span>Instrument actions</span><strong>${state.actions||0}</strong></div><div><span>Simulated injuries</span><strong class="${state.injuries.length?'danger-text':''}">${state.injuries.length}</strong></div><div><span>Specimen</span><strong>${state.extracted?'Retrieved':'In field'}</strong></div></div><h3 class="section-title">Recent events</h3><div class="event-list">${state.events.length?state.events.slice(-12).reverse().map(e=>`<div class="event-item"><span class="event-dot"></span><div><strong>${esc(e.title||e.action||e.type||'Action')}</strong><p>${esc(eventDescription(e))}</p></div></div>`).join(''):'<p class="empty-note">Your first tissue interaction will appear here.</p>'}</div><button id="session-export" class="secondary-button full">${icon('download')} Export session record</button><button id="history-button" class="quiet-button full">View saved session history</button><p class="session-note">${state.injuries.length?'Retrieval with a simulated injury is not a successful outcome. ':''}This record describes software activity; it does not certify surgical competence.</p>`;
  $('#session-export').addEventListener('click',exportSession);$('#history-button').addEventListener('click',()=>openDrawer('history'));
 }
}
function instrumentRow(t){const active=state.instruments[state.activeArm]===t.id;const arm=state.instruments.left===t.id?'L':state.instruments.right===t.id?'R':'';return `<button class="instrument-row ${active?'selected':''}" data-equip="${t.id}" aria-pressed="${active}">${instrumentDrawing(t.id)}<span><strong>${esc(t.name)}</strong><small>${esc(t.family||t.action||'Instrument')}</small></span>${arm?`<b class="equipped-badge">${arm}</b>`:`<i class="equip-plus">+</i>`}</button>`;}
function setView(view){scene?.setView(view);dispatch({type:'view',view:view==='operative'?'anterior':view},{quiet:true});document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));}
function toggleLabels(){labels=!labels;scene?.setLabels(labels);$('#labels-button').setAttribute('aria-pressed',String(labels));if(panel==='settings')renderPanel();persist();}
function toggleOverlay(){overlay=!overlay;scene?.setOverlay(overlay);$('#overlay-button').setAttribute('aria-pressed',String(overlay));if(panel==='settings')renderPanel();persist();toast(overlay?'Anatomy aid enabled. Hidden model anatomy is a teaching overlay.':'Natural tissue view restored.');}
function showFeedback(f){
 const el=$('#field-feedback');el.className=`field-feedback ${f.level||'info'}`;el.innerHTML=`<strong>${esc(f.title)}</strong><p>${esc(f.message)}</p>`;el.hidden=false;clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>{el.hidden=true;},f.level==='error'?6500:3800);
}
let toastTimer;function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4200);}
let drawerTrigger;
function openDrawer(kind){
 drawer=kind;drawerTrigger=document.activeElement;$('#drawer-backdrop').hidden=false;$('#drawer').hidden=false;
 const title={cases:'Choose the pathology.',help:'At the controls.',about:'Practice operating, not just looking.',references:'Reference-led development.',safety:'Review the simulated field.',history:'Previous sessions.'}[kind];
 let body='';
 if(kind==='cases')body=`<p class="drawer-lead">Each synthetic case changes the tissue, visibility, and operative challenge.</p><div class="case-options">${CASES.map((c,i)=>`<button data-case="${c.id}" class="case-option ${state.caseId===c.id?'selected':''}"><span>0${i+1}</span><div><small>${esc(c.subtitle||c.difficulty||'Synthetic scenario')}</small><h3>${esc(c.title)}</h3><p>${esc(c.description)}</p></div>${icon('arrow')}</button>`).join('')}</div><p class="small-note">Changing cases starts a new session. Export the current session first if you want to keep an unfinished record.</p>`;
 if(kind==='help')body=`<p class="drawer-lead">Your pointer positions a visible instrument. The surface you contact determines the action.</p><div class="control-guide"><div><kbd>1 / 2</kbd><span>Choose the left or right instrument.</span></div><div><kbd>Click</kbd><span>Grasp, dissect, clip, divide, suction, or retrieve according to the equipped instrument.</span></div><div><kbd>Drag tissue</kbd><span>Apply a grasping interaction. Tissue motion is approximated.</span></div><div><kbd>Right drag</kbd><span>Move the endoscopic camera. Scroll to zoom.</span></div><div><kbd>C / V / X</kbd><span>Arm simulated cut, coagulation, or turn energy off. Only compatible tools respond.</span></div><div><kbd>[ / ]</kbd><span>Rotate the instrument wrist.</span></div><div><kbd>P</kbd><span>Pause or resume.</span></div><div><kbd>Space</kbd><span>Apply the active tool to a target selected with Target assist in Settings.</span></div></div><h3>Start here</h3><p>Activate the left grasper and interact with the gallbladder. Follow the current objective below the field, selecting instruments as needed from the library. The simulated checkpoint is available after exposure and model review.</p><h3>Energy is intentional</h3><p>Energy mode remains armed until changed or the engine switches it off. This simulation uses modes rather than real power settings. Tissue contact may cause a visible injury.</p>`;
 if(kind==='about')body=`<p class="drawer-lead">A browser prototype for residents and educators exploring a da Vinci-style surgical training experience.</p><h3>The purpose</h3><p>Give residents repeatable opportunities to practice instrument selection, orientation, tissue interaction, and decisions about uncertainty before working on patients under supervision.</p><h3>What you can do now</h3><p>Operate two virtual instruments in a synthetic abdomen; retract tissue; remove fat and adhesion patches; use simulated energy; place model clips; divide the modeled cystic structures; detach the gallbladder; and retrieve a specimen. Mistakes can create persistent simulated injury events, blood, smoke, and energy marks.</p><h3>What remains approximate</h3><p>The anatomy uses synthetic geometry and AI-generated tissue color textures, not a patient scan. Contact outcomes use authored rules, not a validated biomechanical solver. The camera, wrist behavior, clip representation, retrieval, and controls simplify actual surgery. There is no haptics, robot connection, live AI, or validated training assessment.</p><p class="notice">This is a research prototype for review with clinical educators. It is not an approved da Vinci simulator, is not affiliated with Intuitive, and does not establish readiness to operate. da Vinci and instrument names are their owners’ trademarks.</p>`;
 if(kind==='references')body=`<p class="drawer-lead">Actual operative photographs used to study tissue appearance. These are reference images, separate from the simulation.</p><div class="reference-gallery">${REFERENCE_PHOTOS.map(p=>`<figure><img src="${p.src}" alt="${p.title}: intraoperative reference photograph"/><figcaption><strong>${esc(p.title)}</strong><span>${esc(p.credit)}</span><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4394404/" target="_blank" rel="noopener">Source article</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">License</a></figcaption></figure>`).join('')}</div><div class="source-links"><a href="https://www.intuitive.com/en-us/products-and-services/da-vinci/instruments" target="_blank" rel="noopener">Intuitive — instrument portfolio ${icon('arrow')}</a><a href="https://www.sages.org/safe-cholecystectomy-program/" target="_blank" rel="noopener">SAGES — Safe Cholecystectomy Program ${icon('arrow')}</a><a href="https://www.laparoscopic.md/surgery" target="_blank" rel="noopener">Laparoscopic.MD — operative image reference ${icon('arrow')}</a></div><h3>How the references are used</h3><p>To study tissue color, surface sheen, fat, peritoneal films, visibility, and instrument families. The interactive meshes use an original AI-generated tissue atlas inspired by operative appearance, with layered vessel detail and wet surface lighting. The image generation is performed during development; the running simulation does not generate anatomy with AI. Clinical photographs are separate reference material.</p><h3>Representative instrument set</h3><p>The library includes graspers, bipolar instruments, monopolar curved scissors and hook, a clip applier, and wristed suction. Retrieval is represented as an assistant accessory. This is not the full instrument catalogue.</p><p class="notice">Surgical imagery is reference material. A visually convincing model still needs surgeon review, validated physics, realistic controls, and formal evaluation before use as a training system.</p>`;
 if(kind==='safety')body=`<p class="drawer-lead">This is a conceptual checkpoint for a synthetic model, not an automated confirmation of clinical safety.</p><h3>Review the complete concept</h3><ol class="criteria-list"><li>Fat and fibrous tissue cleared from the hepatocystic triangle.</li><li>Lower gallbladder separated sufficiently to show the cystic plate.</li><li>Only two structures entering the gallbladder.</li></ol><p>Compare anterior and posterior views. Scene states and scripted checks cannot establish a real critical view of safety.</p><div class="checkpoint-actions"><button id="confirm-safety" class="primary-button">Review model evidence ${icon('arrow')}</button><button id="decline-safety" class="secondary-button">Uncertain — pause for supervisor review</button></div>`;
 if(kind==='history'){
  let history=[];try{history=JSON.parse(localStorage.getItem('viscera-operative-history')||'[]');}catch{}
  body=`<p class="drawer-lead">Completed or retrieved simulation sessions saved in this browser.</p>${history.length?history.map(h=>`<div class="history-row"><strong>${esc(h.caseTitle)}</strong><p>${new Date(h.finishedAt||h.startedAt).toLocaleString()} · ${h.actions} actions · ${h.injuries?.length||0} simulated injuries</p></div>`).join(''):'<p>No completed sessions yet. Your current session saves automatically.</p>'}<p class="small-note">Activity records do not represent clinical competence.</p>`;
 }
 $('#drawer').innerHTML=`<div class="drawer-top"><span class="eyebrow">VISCERA / ${kind.toUpperCase()}</span><button id="close-drawer" class="icon-button" aria-label="Close panel">${icon('close')}</button></div><h2>${title}</h2>${body}`;
 $('#close-drawer').addEventListener('click',closeDrawer);
 document.querySelectorAll('[data-case]').forEach(b=>b.addEventListener('click',()=>startCase(b.dataset.case)));
 $('#confirm-safety')?.addEventListener('click',()=>{closeDrawer();dispatch({type:'review-safety'});});
 $('#decline-safety')?.addEventListener('click',()=>{closeDrawer();dispatch({type:'pause'});});
 $('#close-drawer').focus();
}
function closeDrawer(){drawer=null;$('#drawer-backdrop').hidden=true;$('#drawer').hidden=true;drawerTrigger?.focus();}
function exportSession(){const data={app:'Viscera operative prototype',version:2,notice:'Synthetic model activity only; not a surgical competence assessment.',case:currentCase(),summary:getSummary(state),state};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`viscera-operative-${state.caseId}-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Session record exported.');}

$('#photos-button').addEventListener('click',()=>openDrawer('references'));
$('#case-selector').addEventListener('click',()=>openDrawer('cases'));$('#restart-button').addEventListener('click',()=>{startCase(state.caseId);toast('Case restarted.');});
$('#resume-saved').addEventListener('click',()=>{if(saved?.state && CASES.some(c=>c.id===saved.state.caseId)){startCase(saved.state.caseId,saved.state);toast('Saved operative session restored.');}});
$('#help-button').addEventListener('click',()=>openDrawer('help'));$('#about-button').addEventListener('click',()=>openDrawer('about'));$('#references-button').addEventListener('click',()=>openDrawer('references'));
$('#drawer-backdrop').addEventListener('click',closeDrawer);$('#labels-button').addEventListener('click',toggleLabels);$('#overlay-button').addEventListener('click',toggleOverlay);
$('#camera-button').addEventListener('click',()=>{cameraMode=!cameraMode;scene?.setCameraMode(cameraMode);$('#camera-button').setAttribute('aria-pressed',String(cameraMode));toast(cameraMode?'Camera control active. Drag to change the view.':'Instrument control active.');});
$('#home-view').addEventListener('click',()=>setView('operative'));
$('#pause-button').addEventListener('click',()=>dispatch({type:state.paused?'resume':'pause'}));$('#resume-live').addEventListener('click',()=>dispatch({type:'resume'}));
$('#export-button').addEventListener('click',exportSession);
for(const button of document.querySelectorAll('[data-arm]'))button.addEventListener('click',()=>selectArm(button.dataset.arm));
for(const button of document.querySelectorAll('[data-energy]'))button.addEventListener('click',()=>dispatch({type:'energy',mode:button.dataset.energy}));
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>setView(button.dataset.view));
for(const button of document.querySelectorAll('[data-panel]'))button.addEventListener('click',()=>{panel=button.dataset.panel;renderPanel();});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'){closeDrawer();return;}
 if(drawer){if(event.key==='Tab'){const items=[...$('#drawer').querySelectorAll('button,a,input,select')];if(event.shiftKey && document.activeElement===items[0]){event.preventDefault();items.at(-1)?.focus();}else if(!event.shiftKey && document.activeElement===items.at(-1)){event.preventDefault();items[0]?.focus();}}return;}
 if(/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)||event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
 const key=event.key.toLowerCase();
 if(key==='1')selectArm('left');if(key==='2')selectArm('right');if(['c','v','x'].includes(key))dispatch({type:'energy',mode:{c:'cut',v:'coag',x:'off'}[key]});
 if(key==='p')dispatch({type:state.paused?'resume':'pause'});
 if(key==='['||key===']')dispatch({type:'wrist',angle:Math.max(-70,Math.min(70,(state.wristAngle||0)+(key==='['?-5:5)))},{quiet:true});
 if(key===' ' && assistedTarget && !['BUTTON','A'].includes(event.target.tagName)){event.preventDefault();contact(assistedTarget);}
});
try{scene=createOperativeScene($('#operative-scene'),{onTarget:id=>{hoverTarget=id;$('#target-label').textContent=id?(names[id]||id):'Position the instrument over tissue';},onAction:a=>contact(a.target,a.gesture,a.point,a.dragAmount)});scene.setCase(currentCase());syncScene();}catch(error){console.error(error);$('#scene-error').hidden=false;}
render();if(!saved)persist();
setInterval(()=>{if((sessionStarted||!saved) && !state.paused && !state.extracted && scene){dispatch({type:'tick',dt:1},{quiet:true});if(Math.floor(state.elapsed||0)%5===0)persist();}},1000);
