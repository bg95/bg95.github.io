/* UI for the Week 11 self-study lab. The numerical model lives in engine.js. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id), $$=s=>Array.from(document.querySelectorAll(s));
  const sub=['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'];
  const pct=x=>`${(100*x).toFixed(1).replace(/\.0$/,'')}%`;
  const fmt=x=>Math.abs(x)<1e-9?'0':x.toFixed(3).replace(/0+$/,'').replace(/\.$/,'');
  const complex=(r,i)=>Math.abs(i)<1e-9?fmt(r):Math.abs(r)<1e-9?`${fmt(i)}i`:`(${fmt(r)} ${i<0?'−':'+'} ${fmt(Math.abs(i))}i)`;
  const ket=s=>`|${s}⟩`;
  const pauliLabel=e=>Array.from(e).map((p,i)=>p==='I'?'':p+sub[i+1]).join('')||'I';
  const opLabel=ops=>ops.length?ops.map(([p,q])=>p+sub[q]).join(' then '):'I (no operation)';
  const synHtml=s=>s.map(v=>`<span class="syn-bit${v?' fail':''}">${v}</span>`).join('');
  const feedback=(id,text,type='')=>{$(id).className=`feedback ${type}`;$(id).innerHTML=text;};
  const selectButtons=(selector,attribute,value)=>$$(selector).forEach(b=>{const yes=b.dataset[attribute]===String(value);b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',yes);});
  let completed=new Set();
  try{const saved=JSON.parse(localStorage.getItem('aiaa3072-week11-progress')||'[]');if(Array.isArray(saved))completed=new Set(saved.filter(k=>['classical','quantum','shor','coherent','stabilizers','practice'].includes(k)));}catch{}
  const showProgress=()=>{$('progress-text').textContent=`${completed.size} / 6`;$('progress-fill').style.width=`${completed.size/6*100}%`;};
  const mark=k=>{completed.add(k);try{localStorage.setItem('aiaa3072-week11-progress',JSON.stringify([...completed]));}catch{}showProgress();};
  $('reset-progress').onclick=()=>{completed.clear();try{localStorage.removeItem('aiaa3072-week11-progress');}catch{}showProgress();};showProgress();
  const sections=$$('main>.section-anchor');
  const updateNav=()=>{let current='overview';for(const s of sections)if(s.getBoundingClientRect().top<190)current=s.id;$$('.sidebar nav a').forEach(a=>{const active=a.hash===`#${current}`;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});};
  window.addEventListener('scroll',updateNav,{passive:true});updateNav();

  // 01 — classical repetition and an explicit error-model limit.
  let message=1,flips=[false,false,false];
  function renderClassical(){
    const received=flips.map(f=>message^Number(f)),syn=[received[0]^received[1],received[1]^received[2]],decoded=Number(received.reduce((a,b)=>a+b,0)>=2),count=flips.filter(Boolean).length;
    selectButtons('[data-message]','message',message);$('sent-word').textContent=String(message).repeat(3);
    $('received-bits').innerHTML=received.map((v,i)=>`<button class="${flips[i]?'flipped':''}" data-flip="${i}" aria-label="Received bit ${i+1}: ${v}. ${flips[i]?'Undo':'Apply'} flip" aria-pressed="${flips[i]}">${v}<span>bit ${i+1}</span></button>`).join('');
    $('decoded-bit').textContent=decoded;$('decoded-bit').classList.toggle('wrong',decoded!==message);$('classical-outcome').textContent=decoded===message?'message recovered':'wrong logical message';
    $('classical-parities').innerHTML=syn.map((s,i)=>`<div class="parity-tile${s?' failed':''}"><small>s${sub[i+1]} = y${sub[i+1]} ⊕ y${sub[i+2]}</small>${received[i]} ⊕ ${received[i+1]} = <strong>${s}</strong></div>`).join('');
    $('classical-syndrome').innerHTML=`<span class="syndrome-small-label">syndrome = </span>(${syn.join(', ')})`;
    $('classical-table').innerHTML=[['00','leave unchanged'],['10','flip bit 1'],['11','flip bit 2'],['01','flip bit 3']].map(([s,c])=>`<tr class="${s===syn.join('')?'current':''}"><td>${s}</td><td>${c}</td></tr>`).join('');
    const text=count===0?'Both comparisons pass. Either valid codeword gives syndrome <strong>00</strong>; the syndrome does not tell us which message was sent.':count===1?`One bit flipped. Syndrome <strong>${syn.join('')}</strong> identifies bit ${flips.indexOf(true)+1} under the at-most-one-flip model. Majority vote restores message ${message}.`:`${count} bits flipped. The decoder still follows its one-flip rule, but returns ${decoded} instead of ${message}. ${count===3?'Syndrome 00 cannot distinguish this logical error from no error.':'The observed syndrome is also compatible with a different, single-bit error.'}`;
    feedback('classical-feedback',text,count>1?'warning':count===1?'success':'');
    $$('[data-flip]').forEach(b=>b.onclick=()=>{const i=+b.dataset.flip;flips[i]=!flips[i];mark('classical');renderClassical();document.querySelector(`[data-flip="${i}"]`).focus({preventScroll:true});});
  }
  $$('[data-message]').forEach(b=>b.onclick=()=>{message=+b.dataset.message;mark('classical');renderClassical();});$('classical-reset').onclick=()=>{message=1;flips=[false,false,false];renderClassical();};renderClassical();

  // Circuit diagrams and exact numerical state inspectors.
  const txt=(x,y,t,extra='')=>`<text x="${x}" y="${y}" ${extra}>${t}</text>`;
  const wire=(y,width=675,start=83)=>`<line class="wire" x1="${start}" y1="${y}" x2="${width}" y2="${y}"/>`;
  const cx=(x,yc,yt,active=true)=>`<g class="${active?'':'inactive'}"><line class="control-line-svg" x1="${x}" y1="${yc}" x2="${x}" y2="${yt}"/><circle class="control-dot" cx="${x}" cy="${yc}" r="4.5"/><circle class="gate" cx="${x}" cy="${yt}" r="10"/><path class="control-line-svg" d="M${x-7},${yt}h14 M${x},${yt-7}v14"/></g>`;
  const box=(x,y,label,active=true,width=30)=>`<g class="${active?'':'inactive'}"><rect class="gate" x="${x-width/2}" y="${y-15}" width="${width}" height="30" rx="3"/>${txt(x,y+5,label,'text-anchor="middle" font-size="12"')}</g>`;
  const marker=(x,top,bottom,index,current,group)=>`<g role="button" tabindex="0" aria-label="${group} time ${index}" aria-pressed="${current===index}" data-time-group="${group}" data-time="${index}" class="time-marker ${current===index?'selected':''}"><rect class="time-hit" x="${x-15}" y="${top-20}" width="30" height="${bottom-top+45}"/><line x1="${x}" y1="${top}" x2="${x}" y2="${bottom-17}"/><circle cx="${x}" cy="${bottom}" r="14"/>${txt(x,bottom+4,String(index),'text-anchor="middle" font-size="11"')}</g>`;
  function bindMarkers(group,callback){$$(`[data-time-group="${group}"]`).forEach(el=>{const act=()=>{const t=+el.dataset.time;callback(t);document.querySelector(`[data-time-group="${group}"][data-time="${t}"]`).focus({preventScroll:true});};el.onclick=act;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();act();}else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const all=$$(`[data-time-group="${group}"]`),i=all.indexOf(el),next=all[Math.max(0,Math.min(all.length-1,i+(e.key==='ArrowRight'?1:-1)))];const target=+next.dataset.time;callback(target);document.querySelector(`[data-time-group="${group}"][data-time="${target}"]`).focus({preventScroll:true});}};});}
  const params=prefix=>({p:+$(prefix+'-prob').value/100,phi:+$(prefix+'-phase').value*Math.PI/180});
  function showParams(prefix){const p=params(prefix);$(prefix+'-prob-label').textContent=pct(p.p);$(prefix+'-phase-label').textContent=`${$(prefix+'-phase').value}°`;return p;}
  function stateTerms(s,n){const terms=[];for(let i=0;i<2**n;i++)if(s[2*i]**2+s[2*i+1]**2>1e-12)terms.push({basis:i.toString(2).padStart(n,'0'),re:s[2*i],im:s[2*i+1],prob:s[2*i]**2+s[2*i+1]**2});return terms;}
  function numericSum(terms){return terms.map(({re,im,label})=>`${complex(re,im)}${label}`).join(' + ').replaceAll('+ -','− ')||'0';}
  function stateFormula(s,n,split=0){return numericSum(stateTerms(s,n).map(t=>({...t,label:split?`${ket(t.basis.slice(0,split))}<sub>d</sub>${ket(t.basis.slice(split))}<sub>a</sub>`:ket(t.basis)})));}
  const logicalFormula=(p,phi,zero='|0⟩',one='|1⟩')=>numericSum([{re:Math.sqrt(1-p),im:0,label:zero},{re:Math.sqrt(p)*Math.cos(phi),im:Math.sqrt(p)*Math.sin(phi),label:one}].filter(t=>t.re*t.re+t.im*t.im>1e-12));
  const signRecord=s=>`${s.slice(0,2).join('')} | ${s.slice(2,4).join('')} | ${s.slice(4,6).join('')} ; ${s.slice(6).join('')}`;

  // 02 — numeric encoding; five-wire circuit with an inspectable state after every operation.
  let qStep=2,repError='III',cycleStep=9,repAction='',dataSample=null;
  const cycleNames=['Prepare data and ancillas','CNOT q₁ → q₂','CNOT q₁ → q₃','Apply the chosen data error','CNOT q₁ → a₁','CNOT q₂ → a₁','CNOT q₂ → a₂','CNOT q₃ → a₂','Measure ancilla a₁','Measure ancilla a₂','Apply the syndrome-based correction'];
  function renderQuantum(){
    const {p,phi}=showParams('q'),stages=QEC.repetition(p,phi),input=logicalFormula(p,phi);
    selectButtons('#rep-steps button','step',qStep);selectButtons('#rep-errors button','error',repError);
    $('rep-input').innerHTML=`|ψ⟩ ≈ ${input}`;
    let svg=txt(12,22,`Input q₁: ${input.replaceAll('−','−')}`,'font-size="16"');
    [65,115,165].forEach((y,i)=>svg+=wire(y,790,78)+txt(12,y+5,`q${sub[i+1]}`)+txt(57,y+5,i?'|0⟩':'↑','font-size="12" text-anchor="middle"'));
    svg+=cx(315,65,115,qStep>=1)+cx(585,65,165,qStep>=2)+txt(315,43,'CNOT 1 → 2','text-anchor="middle" font-size="11"')+txt(585,43,'CNOT 1 → 3','text-anchor="middle" font-size="11"');
    [160,440,730].forEach((x,i)=>svg+=marker(x,48,214,i,qStep,'Encoding'));$('rep-circuit').innerHTML=svg;
    $('rep-state').innerHTML=`${stateFormula(stages[qStep],3)}<span class="muted">t${qStep}: ${['input register','after the first CNOT','after the second CNOT'][qStep]}</span>`;
    $('rep-amplitudes').innerHTML=stateTerms(stages[qStep],3).map(t=>`<div class="amp"><span>${ket(t.basis)}</span><strong>${pct(t.prob)}</strong><div class="amp-track"><span style="width:${100*t.prob}%"></span></div><small>complex amplitude ${complex(t.re,t.im)}</small></div>`).join('');
    bindMarkers('Encoding',i=>{qStep=i;mark('quantum');renderQuantum();});
    const cycle=QEC.repetitionCycle(p,phi,repError),syn=cycle.syn,damaged=QEC.pauli(stages[2],3,repError),terms=stateTerms(damaged,3),correctQ=cycle.correction;
    $('rep-branches').innerHTML=terms.map(t=>`<div class="branch-row"><span>${complex(t.re,t.im)}${ket(t.basis)}</span><small>ancillas → ${syn.join('')}</small><span>${synHtml(syn)}</span></div>`).join('');
    $('rep-syndrome').innerHTML=`<span class="syndrome-small-label">syndrome = </span>(${syn.join(', ')})`;
    $('rep-explanation').innerHTML=repError==='ZII'?'The parity checks miss the phase flip. Both basis strings still have equal neighbors, even though their relative phase changed.':repError==='XXX'?'All comparisons pass even though the logical amplitudes exchanged places. A logical error can hide inside the code space.':`Both coherent components produce (${syn.join(', ')}). Reading only this record does not distinguish them.`;
    renderCycle(cycle,input);
    const fixed=correctQ?QEC.gate(damaged,3,correctQ,'X'):damaged,okay=['III','IXI'].includes(repError),effect=repError==='ZII'?'phase flip Z':'bit flip X';
    feedback('rep-result',`<strong>${repAction==='recover'?'Correction applied':'Decoder’s correction'}: ${correctQ?'X'+sub[correctQ]:'I'}</strong>. ${okay?'It restores the original encoded message for every input.':`A logical ${effect} remains; this error lies outside the bit-flip-only guarantee.`}<br>Recovered data ≈ <span class="formula">${stateFormula(fixed,3)}</span><br>Fidelity for this input: <strong>${pct(QEC.fidelity(stages[2],fixed))}</strong>.`,okay?'success':'warning');
    $('measurement-contrast').innerHTML=`<div class="contrast-grid"><div><span class="mini-label">PARITY ANCILLAS · MESSAGE PRESERVED</span><div class="formula">${stateFormula(damaged,3)}</div><p>Record (${syn.join(', ')}) with probability 100% for this chosen fixed Pauli error. The relative amplitudes remain coherent.</p></div><div><span class="mini-label">READ q₁ DIRECTLY · ONE COMPONENT SURVIVES</span>${terms.map(t=>`<div class="formula">${ket(t.basis)} <small>with probability ${pct(t.prob)}</small></div>`).join('')}<p>${p>0&&p<1?'Each outcome is a product state. The original logical coherence and the entanglement between the data qubits are lost.':'This input is already a basis state; there is no initial superposition or data entanglement to lose.'}</p></div></div>`;
    $('data-measurement-result').innerHTML=dataSample?`<div class="feedback warning">On a fresh preparation, directly reading q₁ gave <strong>${dataSample.basis[0]}</strong>. Conditional data state: <span class="formula">${ket(dataSample.basis)}</span>, up to global phase. The circuit above continues to show the parity-measurement route for comparison.</div>`:'';
  }
  function renderCycle(cycle,input){
    const ys=[90,140,190,270,330],xs=[110,200,290,380,470,560,650,740,830,920,1170];
    let svg=txt(12,22,`q₁ input: ${input}`,'font-size="15"');
    svg+=txt(200,51,'ENCODE','font-size="11" text-anchor="middle"')+txt(345,51,'ERROR','font-size="11" text-anchor="middle"')+txt(560,51,'EXTRACT PARITIES','font-size="11" text-anchor="middle"')+txt(845,51,'MEASURE ANCILLAS','font-size="11" text-anchor="middle"')+txt(1115,51,'CORRECT','font-size="11" text-anchor="middle"');
    ys.forEach((y,i)=>svg+=wire(y,i<3?1200:i===3?768:858,85)+txt(12,y+5,i<3?`q${sub[i+1]}`:`a${sub[i-2]}: |0⟩`,'font-size="12"'));
    svg+=cx(155,ys[0],ys[1],cycleStep>=1)+cx(245,ys[0],ys[2],cycleStep>=2);
    [...repError].forEach((p,i)=>{if(p!=='I')svg+=box(335,ys[i],p,cycleStep>=3);});if(repError==='III')svg+=box(335,ys[0],'I',cycleStep>=3);
    [[425,0,3,4],[515,1,3,5],[605,1,4,6],[695,2,4,7]].forEach(([x,c,t,step])=>svg+=cx(x,ys[c],ys[t],cycleStep>=step));
    svg+=box(785,ys[3],'MZ',cycleStep>=8,34)+box(875,ys[4],'MZ',cycleStep>=9,34);
    svg+=txt(840,ys[3]-22,`s₁ = ${cycle.syn[0]}${cycleStep<8?' (expected)':''}`,'font-size="11" text-anchor="middle"')+txt(905,ys[4]+27,`s₂ = ${cycle.syn[1]}${cycleStep<9?' (expected)':''}`,'font-size="11" text-anchor="middle"');
    const target=cycle.correction?ys[cycle.correction-1]:ys[0];
    // Each ancilla terminates at MZ. Only paired classical lines leave it.
    svg+=`<g class="${cycleStep>=9?'':'inactive'}"><path d="M802,268 H980 M802,272 H980 M892,328 H980 M892,332 H980" class="classical-wire"/><rect class="decoder-gate" x="980" y="246" width="91" height="106" rx="6"/>${txt(1025,291,'Decoder','text-anchor="middle" font-size="12"')}${txt(1025,318,`(${cycle.syn.join(', ')})`,'text-anchor="middle" font-size="12"')}<path d="M1071,298 H1113 V${target+15} M1071,302 H1117 V${target+15}" class="classical-wire"/></g>`;
    svg+=box(1115,target,cycle.correction?'X':'I',cycleStep>=10,38);
    svg+=txt(1115,ys[4]+45,`Apply ${cycle.correction?'X'+sub[cycle.correction]:'I'}`,'font-size="12" text-anchor="middle"');
    xs.forEach((x,i)=>svg+=marker(x,70,404,i,cycleStep,'Correction'));$('cycle-circuit').innerHTML=svg;
    const notes=['Prepare one unknown input and four |0⟩ auxiliaries.','The first CNOT correlates q₁ and q₂.','The data are encoded; the syndrome ancillas are still |00⟩.','Only the selected data error acts.','The first CNOT partially writes q₁ into a₁. Do not measure yet: that would reveal logical information.','The second CNOT completes a₁ = q₁ ⊕ q₂. The ancilla no longer distinguishes the logical components.','The first CNOT into a₂ is incomplete. Again, measuring now could reveal logical information.','Both comparisons are complete. The ancillas carry the same record for every logical component.',`Only a₁ is measured: s₁ = ${cycle.syn[0]}. The data amplitudes remain coherent.`,`Only a₂ is measured: s₂ = ${cycle.syn[1]}. The classical syndrome is (${cycle.syn.join(', ')}).`,'The decoder acts only on its syndrome record. The ancillas retain the record; the data carry the recovered state.'];
    notes[10]='The decoder uses the classical record to correct the data. The measured ancillas have left the quantum circuit.';
    const measured=cycleStep>=9?2:cycleStep===8?1:0;
    const expression=measured?numericSum(stateTerms(cycle.stages[cycleStep],5).map(t=>({...t,label:`${ket(t.basis.slice(0,3))}<sub>d</sub>${measured===1?`${ket(t.basis.slice(4))}<sub>a₂</sub>`:''}`}))):stateFormula(cycle.stages[cycleStep],5,3);
    $('cycle-state').innerHTML=`<span class="mini-label">t${cycleStep} · ${cycleNames[cycleStep]}</span><div class="formula">${expression}</div>${measured?`<p><strong>Classical record:</strong> s₁ = ${cycle.syn[0]}${measured===2?`, s₂ = ${cycle.syn[1]}`:''}</p>`:''}<p>${notes[cycleStep]}</p>`;
    bindMarkers('Correction',i=>{cycleStep=i;repAction=i===10?'recover':'';mark('quantum');renderQuantum();});
  }
  $$('[data-step]').forEach(b=>b.onclick=()=>{qStep=+b.dataset.step;mark('quantum');renderQuantum();});
  ['q-prob','q-phase'].forEach(id=>$(id).oninput=()=>{repAction='';dataSample=null;mark('quantum');renderQuantum();});
  $$('[data-error]').forEach(b=>b.onclick=()=>{repError=b.dataset.error;repAction='';dataSample=null;mark('quantum');renderQuantum();});
  $('rep-recover').onclick=()=>{repAction='recover';cycleStep=10;mark('quantum');renderQuantum();};
  $('rep-measure-data').onclick=()=>{const {p,phi}=params('q'),terms=stateTerms(QEC.pauli(QEC.repetition(p,phi)[2],3,repError),3);dataSample=Math.random()<terms[0].prob?terms[0]:terms[terms.length-1];mark('quantum');renderQuantum();};
  $('quantum-reset').onclick=()=>{$('q-prob').value=50;$('q-phase').value=0;qStep=2;cycleStep=9;repError='III';repAction='';dataSample=null;renderQuantum();};renderQuantum();

  // 03 — Shor encoding, explicit check formulas, and an always-visible recovery.
  let shorTime=5,brush='X',error='IIIIXIIII',recoveryStep=0;
  function renderShorCircuit(){
    const {p,phi}=showParams('shor'),input=logicalFormula(p,phi),stages=QEC.shorLayers(p,phi);
    selectButtons('#shor-stages button','stage',shorTime<=2?1:shorTime===3?2:3);
    $('shor-input').innerHTML=`Input |ψ⟩ ≈ ${input}`;
    let svg=txt(12,20,`Input q₁: ${input}`,'font-size="15"');const ys=Array.from({length:9},(_,i)=>85+i*36);
    ys.forEach((y,i)=>svg+=wire(y,825)+txt(12,y+5,`q${sub[i+1]}`)+txt(59,y+5,i===0?'↑':'|0⟩','font-size="12" text-anchor="middle"'));
    svg+=cx(200,ys[0],ys[3],shorTime>=1)+cx(325,ys[0],ys[6],shorTime>=2);
    [0,3,6].forEach(i=>svg+=box(450,ys[i],'H',shorTime>=3));
    [0,3,6].forEach(i=>svg+=cx(575,ys[i],ys[i+1],shorTime>=4)+cx(700,ys[i],ys[i+2],shorTime>=5));
    svg+=txt(265,51,'REPEAT REPRESENTATIVES','text-anchor="middle" font-size="11"')+txt(450,51,'CHANGE BASIS','text-anchor="middle" font-size="11"')+txt(670,51,'REPEAT WITHIN BLOCKS','text-anchor="middle" font-size="11"');
    [0,1,2].forEach(b=>svg+=`<path d="M 840 ${ys[3*b]-12} h 9 v 96 h -9" fill="none" stroke="#aeb1c3"/>`+txt(866,ys[3*b]+40,'ABC'[b]));
    [130,265,390,515,640,790].forEach((x,i)=>svg+=marker(x,65,428,i,shorTime,'Shor'));$('shor-circuit').innerHTML=svg;
    const captions=['Initial nine-qubit register','After CNOT 1 → 4','After CNOT 1 → 7','After H on representatives 1, 4, 7','After CNOTs 1 → 2, 4 → 5, 7 → 8','After CNOTs 1 → 3, 4 → 6, 7 → 9'];
    $('shor-stage-description').innerHTML=`<strong>t${shorTime}: ${captions[shorTime]}</strong><div class="formula full-state">${stateFormula(stages[shorTime],9)}</div>${shorTime===5?`<p>Equivalently, |ψ<sub>L</sub>⟩ ≈ <span class="formula">${logicalFormula(p,phi,'|B₊B₊B₊⟩','|B₋B₋B₋⟩')}</span></p>`:''}`;
    bindMarkers('Shor',i=>{shorTime=i;mark('shor');renderShorCircuit();});
  }
  $$('[data-stage]').forEach(b=>b.onclick=()=>{shorTime={1:2,2:3,3:5}[b.dataset.stage];mark('shor');renderShorCircuit();});
  ['shor-prob','shor-phase'].forEach(id=>$(id).oninput=()=>{recoveryStep=0;mark('shor');renderShorCircuit();renderShor();});
  function renderRecovery(a){
    const bitOps=a.ops.filter(o=>o[0]==='X'),phaseOps=a.ops.filter(o=>o[0]==='Z');
    const applied=recoveryStep===0?[]:recoveryStep===1?bitOps:a.ops;
    const state=QEC.operations(a.damaged,9,applied);
    const remaining=QEC.checks.map(g=>QEC.overlap(state,QEC.pauli(state,9,g))[0]<0?1:0);
    const panel=$('shor-recovery');
    panel.className=`recovery-panel${recoveryStep===2&&a.effect!=='I'?' warning':''}`;
    let svg='',ys=Array.from({length:9},(_,i)=>68+i*35);
    ys.forEach((y,i)=>svg+=wire(y,615,76)+txt(18,y+5,`q${sub[i+1]}`));
    svg+=txt(210,25,'BIT CORRECTION','text-anchor="middle" font-size="12"')+txt(440,25,'PHASE CORRECTION','text-anchor="middle" font-size="12"');
    [[210,bitOps,1],[440,phaseOps,2]].forEach(([x,ops,step])=>{
      ops.forEach(([gate,q])=>svg+=box(x,ys[q-1],gate,recoveryStep>=step,38));
      if(!ops.length)svg+=txt(x,ys[4]-12,'I · no gate needed','text-anchor="middle" font-size="12"');
    });
    [115,325,565].forEach((x,i)=>svg+=marker(x,47,389,i,recoveryStep,'Recovery'));
    const status=recoveryStep===0?'Before correction':recoveryStep===1?'After the bit correction':'After both corrections';
    const verdict=a.effect==='I'?'Every logical input is restored, up to global phase.':`A logical <strong>${a.effect}</strong> remains. A zero syndrome does not guarantee the original message: this error exceeds the one-qubit guarantee.`;
    panel.innerHTML=`<span class="mini-label">RECOVERY</span><h4>Use the syndrome to choose the gates.</h4><p>Bit record ${a.syn.slice(0,6).join('')} → <strong>${opLabel(bitOps)}</strong><br>Phase record (${a.syn.slice(6).join(', ')}) → <strong>${opLabel(phaseOps)}</strong></p><div class="step-tabs" role="group" aria-label="Recovery stage"><button data-recovery-step="0" class="${recoveryStep===0?'selected':''}">0. Before correction</button><button data-recovery-step="1" class="${recoveryStep===1?'selected':''}">1. Apply bit gates</button><button data-recovery-step="2" class="${recoveryStep===2?'selected':''}">2. Apply phase gates</button></div><div class="circuit-wrap"><svg id="recovery-circuit" viewBox="0 0 640 420" role="group" aria-label="Shor recovery circuit with bit and phase correction gates">${svg}</svg></div><div class="recovery-state"><strong>${status}</strong><div class="formula">Remaining syndrome: ${signRecord(remaining)}</div><p>${recoveryStep===2?verdict:'Click the next step or its circuit marker to apply the gates and update the state.'}</p></div>`;
    const change=i=>{recoveryStep=i;mark('shor');renderShor();};
    bindMarkers('Recovery',change);
    $$('[data-recovery-step]').forEach(b=>b.onclick=()=>{const i=+b.dataset.recoveryStep;change(i);document.querySelector(`[data-recovery-step="${i}"]`).focus({preventScroll:true});});
  }
  function renderPhaseCheck(bit){
    let svg=txt(12,24,'S₇ = X₁X₂X₃X₄X₅X₆','font-size="16"');
    svg+=wire(75,728,95)+txt(12,80,'a: |0⟩','font-size="13"')+box(145,75,'H',true,36);
    for(let i=0;i<6;i++){
      const y=140+38*i,x=245+65*i;
      svg+=wire(y,880,95)+txt(20,y+5,`q${sub[i+1]}`)+cx(x,75,y);
    }
    svg+=box(660,75,'H',true,36)+box(750,75,'MZ',true,44);
    svg+=`<path class="classical-wire" d="M772,73 H880 M772,77 H880"/>`+txt(830,52,`s₇ = ${bit}`,'text-anchor="middle" font-size="14"');
    svg+=txt(410,45,'one ancilla controls all six X gates','text-anchor="middle" font-size="12"')+txt(485,382,'q₇, q₈, q₉ are untouched','text-anchor="middle" font-size="12"');
    $('phase-check-circuit').innerHTML=svg;
    $('phase-check-outcome').innerHTML=`⟨S₇⟩ = ${bit?'−1':'+1'} → s₇ = ${bit}`;
  }
  function renderShor(){
    const {p,phi}=params('shor'),a=QEC.analyze(error,p,phi),count=[...error].filter(p=>p!=='I').length;selectButtons('#error-brush button','brush',brush);
    $('shor-map').innerHTML=[0,1,2].map(b=>`<div class="qubit-block"><div class="block-title"><strong>BLOCK ${'ABC'[b]}</strong><span>q${sub[b*3+1]}–q${sub[b*3+3]}</span></div><div class="qubits">${[0,1,2].map(i=>{const q=b*3+i,p=error[q];return `<button class="qubit" data-qubit="${q}" data-p="${p}" aria-label="Qubit ${q+1}: ${p==='I'?'no error':p+' error'}. ${p===brush?'Remove error':'Apply '+brush}" aria-pressed="${p!=='I'}">${p==='I'?q+1:p}<small>q${sub[q+1]}</small></button>`;}).join('')}</div><div class="block-parities">${[0,1].map(i=>`<span class="${a.syn[b*2+i]?'fail':''}">s${sub[b*2+i+1]} = ${a.syn[b*2+i]}</span>`).join('')}</div></div>`).join('');
    $('shor-bit-syndrome').innerHTML=[0,1,2].map(b=>synHtml(a.syn.slice(b*2,b*2+2))).join('<span class="syn-divider">|</span>');$('shor-phase-syndrome').innerHTML=synHtml(a.syn.slice(6));
    $('shor-syndrome-formulas').innerHTML=QEC.checks.map((g,i)=>`<div class="check-formula ${a.syn[i]?'failed':''}"><strong>S${sub[i+1]} = ${pauliLabel(g)}</strong><div class="formula check-outcome"><span>⟨${pauliLabel(g)}⟩ = ${a.syn[i]?'−1':'+1'}</span><span>→ s${sub[i+1]} = <b>${a.syn[i]}</b></span></div></div>`).join('');
    const phaseSigns=[0,1,2].map(b=>[...error.slice(b*3,b*3+3)].filter(p=>p==='Z'||p==='Y').length%2);
    $('phase-patterns').innerHTML=[0,1].map(row=>`<div class="phase-pattern-row"><span>${row?'β':'α'} component</span><div class="sign-triple">${phaseSigns.map((v,b)=>`<span class="${v?'changed':''}"><small>${'ABC'[b]}</small>${v^row?'−':'+'}</span>`).join('')}</div><span class="phase-arrow" aria-hidden="true">→</span><span class="phase-record">${synHtml(a.syn.slice(6))}</span></div>`).join('');
    feedback('shor-feedback',`Applied error: <strong>${pauliLabel(error)}</strong>. ${count===0?'All checks pass.':count===1?'The one-qubit guarantee applies. Compare the nonzero syndrome bits with the check formulas above.':`${count} qubits carry errors, beyond the one-qubit guarantee. The recovery below shows what this decoder does for this particular pattern.`}`,count>1?'warning':'');
    renderRecovery(a);
    renderPhaseCheck(a.syn[6]);
    $$('[data-qubit]').forEach(b=>b.onclick=()=>{const i=+b.dataset.qubit,e=[...error];e[i]=e[i]===brush?'I':brush;error=e.join('');recoveryStep=0;mark('shor');renderShor();document.querySelector(`[data-qubit="${i}"]`).focus({preventScroll:true});});
  }
  $$('[data-brush]').forEach(b=>b.onclick=()=>{brush=b.dataset.brush;renderShor();});$$('[data-preset]').forEach(b=>b.onclick=()=>{error=b.dataset.preset;recoveryStep=0;mark('shor');renderShor();});
  $('shor-reset').onclick=()=>{error='IIIIIIIII';brush='X';recoveryStep=0;renderShor();};renderShorCircuit();renderShor();

  // 04 — measurement removes coherence between error sectors, not within a logical state.
  let rotationAxis='X',lastCoherent=null;
  const axes={X:[1,0,0],Z:[0,0,1],XYZ:[Math.sqrt(1/3),Math.sqrt(1/3),Math.sqrt(1/3)]};
  const sectorErrors=['IIIIIIIII','IIIIXIIII','IIIIYIIII','IIIIZIIII'],sectorPaulis=['I','X₅','Y₅','Z₅'];
  function coherentCoefficients(){const theta=+$('rotation').value*Math.PI/180,c=Math.cos(theta/2),s=Math.sin(theta/2),a=axes[rotationAxis];return [c,...a.map(x=>s*x)];}
  function renderCoherent(){
    const {p,phi}=showParams('coherent'),coeff=coherentCoefficients(),angle=$('rotation').value;
    const stage=lastCoherent?(lastCoherent.corrected?2:1):0;
    const logical=logicalFormula(p,phi,'|0<sub>L</sub>⟩','|1<sub>L</sub>⟩');
    selectButtons('#rotation-axis button','axis',rotationAxis);$('rotation-label').textContent=`${angle}°`;
    $('coherent-logical').innerHTML=`|Ψ<sub>L</sub>⟩ = α|0<sub>L</sub>⟩ + β|1<sub>L</sub>⟩<br>≈ ${logicalFormula(p,phi,'|B₊B₊B₊⟩','|B₋B₋B₋⟩')}`;
    const op=rotationAxis==='XYZ'?'(X₅ + Y₅ + Z₅) / √3':rotationAxis+'₅';
    const numeric=coeff.slice(1).map((v,i)=>v>1e-12?`${fmt(v)} ${sectorPaulis[i+1]}`:'').filter(Boolean).join(' + ');
    $('rotation-formula').innerHTML=`R<sub>${rotationAxis==='XYZ'?'n':rotationAxis},5</sub>(θ) = cos(θ/2) I − i sin(θ/2) ${op}<br><strong>≈ ${fmt(coeff[0])} I${numeric?` − i (${numeric})`:''}</strong><span class="equation-note">θ = ${angle}°${rotationAxis==='XYZ'?' · n = (1, 1, 1)/√3':''}</span>`;
    const occupied=coeff.map((v,i)=>({v,i})).filter(t=>t.v>1e-12);
    const before=occupied.map(({v,i})=>`${i?'− i ':''}${fmt(v)} ${i?sectorPaulis[i]:''}|Ψ<sub>L</sub>⟩`).join(' + ').replaceAll('+ −','−');
    const selected=lastCoherent?.index,selectedPauli=selected?sectorPaulis[selected]:'';
    const now=stage===0?before:stage===1?`${selectedPauli}|Ψ<sub>L</sub>⟩`:'|Ψ<sub>L</sub>⟩';
    $('coherent-state').innerHTML=`<span class="mini-label">${['BEFORE MEASUREMENT · ONE COHERENT STATE','AFTER MEASUREMENT · ONE SELECTED SECTOR','AFTER CORRECTION · THE ORIGINAL MESSAGE'][stage]}</span><div>${now}</div>`;
    $('coherence-link').className=`coherence-link ${stage?'collapsed':''}`;
    $('coherence-link').innerHTML=`<span class="coherence-thread" aria-hidden="true"></span><strong>${stage?(occupied.length>1?'Coherence between different syndrome sectors is gone':'One definite sector · no inter-sector coherence to remove'):occupied.length>1?'Coherent superposition across the sectors below':'Only one sector is occupied at this angle'}</strong><span class="coherence-thread" aria-hidden="true"></span>`;
    $('coherent-sectors').innerHTML=occupied.map(({v,i})=>{
      const survives=stage&&selected===i,discarded=stage&&selected!==i;
      const action=stage===2&&survives?'':i?sectorPaulis[i]:'';
      const branch=logicalFormula(p,phi,`${action}|0<sub>L</sub>⟩`,`${action}|1<sub>L</sub>⟩`);
      const record=QEC.syndrome(sectorErrors[i]).join('');
      return `<div class="sector-card ${survives?'survives':''} ${discarded?'discarded':''}"><div class="sector-heading"><strong>${i?sectorPaulis[i]+' sector':'No-error sector'}</strong><span>${pct(v*v)}</span></div><div class="sector-record">Syndrome ${record}</div><div class="formula">${action}|Ψ<sub>L</sub>⟩</div><div class="logical-pair formula">${branch}</div><div class="sector-status">${discarded?'Not observed in this run':survives?(stage===2?'Corrected · record retained':'Observed · logical amplitudes preserved'):'Both logical components share this record'}</div></div>`;
    }).join('');
    ['coherent-prepare','measure-one','coherent-recover'].forEach((id,i)=>{$(id).classList.toggle('selected',i===stage);$(id).setAttribute('aria-pressed',i===stage);});
    $('coherent-recover').disabled=stage!==1;$('measure-one').disabled=stage!==0;
    $('preserved-amplitudes').innerHTML=`α = ${complex(Math.sqrt(1-p),0)}, &nbsp; β = ${complex(Math.sqrt(p)*Math.cos(phi),Math.sqrt(p)*Math.sin(phi))}`;
    $('record-mixture').innerHTML=occupied.map(({v,i})=>`<span class="record-chance">${QEC.syndrome(sectorErrors[i]).join('')} <b>${pct(v*v)}</b></span>`).join('');
    if(stage===0)feedback('coherent-result',`${occupied.length>1?'The sectors are coherent components of one state; no outcome has been chosen yet.':'At this angle there is only one occupied sector, so its syndrome is certain.'} Click “Measure the syndrome” to select an outcome. The percentages are the probabilities of the possible records.`);
    if(stage===1)feedback('coherent-result',`Syndrome <strong>${lastCoherent.result.syn.join('')}</strong> selects <strong>${sectorPaulis[selected]}</strong>. ${occupied.length>1?'The other sectors disappear from the conditional state. ':''}<strong>The logical amplitudes α and β survive together.</strong> Next apply ${opLabel(QEC.recover(lastCoherent.result.syn))}.`,'success');
    if(stage===2)feedback('coherent-result',`Applied <strong>${opLabel(QEC.recover(lastCoherent.result.syn))}</strong>. The data are back to <span class="formula">${logical}</span>, up to global phase. The classical record remains ${lastCoherent.result.syn.join('')}. <strong>The same logical message is recovered whichever syndrome is observed.</strong>`,'success');
  }
  function coherentTrial(){const {p,phi}=params('coherent'),encoded=QEC.shor(p,phi)[3],damaged=QEC.rotateAxis(encoded,9,5,+$('rotation').value*Math.PI/180,axes[rotationAxis]),result=QEC.measureSyndrome(damaged),index=sectorErrors.findIndex(e=>QEC.syndrome(e).join('')===result.syn.join(''));return {result,index,encoded,corrected:false};}
  ['rotation','coherent-prob','coherent-phase'].forEach(id=>$(id).oninput=()=>{lastCoherent=null;mark('coherent');renderCoherent();});
  $$('[data-axis]').forEach(b=>b.onclick=()=>{rotationAxis=b.dataset.axis;lastCoherent=null;mark('coherent');renderCoherent();});
  $('measure-one').onclick=()=>{lastCoherent=coherentTrial();mark('coherent');renderCoherent();};
  $('coherent-recover').onclick=()=>{if(!lastCoherent||lastCoherent.corrected)return;lastCoherent.fixed=QEC.operations(lastCoherent.result.state,9,QEC.recover(lastCoherent.result.syn));lastCoherent.corrected=true;mark('coherent');renderCoherent();};
  $('coherent-prepare').onclick=()=>{lastCoherent=null;renderCoherent();};
  $('coherent-reset').onclick=()=>{$('rotation').value=60;$('coherent-prob').value=50;$('coherent-phase').value=0;rotationAxis='X';lastCoherent=null;renderCoherent();};renderCoherent();


  // 05 — independent local error controls, adjacent to the stabilizer matrix.
  let checkError='IIIIYIIII',checkBrush='Y',selectedCheck=2;
  function renderChecks(){
    const syn=QEC.syndrome(checkError),g=QEC.checks[selectedCheck];$('matrix-error').textContent=pauliLabel(checkError);selectButtons('[data-check-brush]','checkBrush',checkBrush);
    $('check-qubits').innerHTML=[...checkError].map((p,i)=>`<button class="qubit ${g[i]!=='I'?'check-active':''}" data-check-qubit="${i}" data-p="${p}" aria-label="Stabilizer lab qubit ${i+1}: ${p==='I'?'no error':p}. ${p===checkBrush?'Remove error':'Apply '+checkBrush}" aria-pressed="${p!=='I'}">${p==='I'?i+1:p}<small>q${sub[i+1]}</small></button>`).join('');
    $('check-table').innerHTML=QEC.checks.map((g,i)=>`<tr class="${i===selectedCheck?'selected':''}"><td><button data-check="${i}" aria-label="Inspect stabilizer S${i+1}" aria-pressed="${i===selectedCheck}">S${sub[i+1]}</button></td>${[...g].map((p,j)=>`<td class="letter-${p}${p!=='I'&&checkError[j]!=='I'&&p!==checkError[j]?' anti':''}">${p}</td>`).join('')}<td class="matrix-result"><span class="badge ${syn[i]?'bad':'good'}">${syn[i]?'−1 → 1':'+1 → 0'}</span></td></tr>`).join('');
    const positions=[];[...g].forEach((p,i)=>{if(p!=='I'&&checkError[i]!=='I'&&p!==checkError[i])positions.push(`q${sub[i+1]} (${p} with ${checkError[i]})`);});
    $('check-detail').innerHTML=`<strong>S${sub[selectedCheck+1]} = ${pauliLabel(g)}</strong><br>${positions.length?`Local anticommutations at ${positions.join(', ')}.`:'No local anticommutations with the current error.'} The count ${positions.length} is ${positions.length%2?'odd':'even'}.<div class="formula">S${sub[selectedCheck+1]} E = ${positions.length%2?'−':''}E S${sub[selectedCheck+1]} → s${sub[selectedCheck+1]} = ${positions.length%2}</div><span class="caption">Teal rings mark the selected check’s qubits directly above this table. Coral underlines mark local anticommutations.</span>`;
    $$('[data-check]').forEach(b=>b.onclick=()=>{selectedCheck=+b.dataset.check;mark('stabilizers');renderChecks();document.querySelector(`[data-check="${selectedCheck}"]`).focus({preventScroll:true});});
    $$('[data-check-qubit]').forEach(b=>b.onclick=()=>{const i=+b.dataset.checkQubit,e=[...checkError];e[i]=e[i]===checkBrush?'I':checkBrush;checkError=e.join('');mark('stabilizers');renderChecks();document.querySelector(`[data-check-qubit="${i}"]`).focus({preventScroll:true});});
  }
  $$('[data-check-brush]').forEach(b=>b.onclick=()=>{checkBrush=b.dataset.checkBrush;renderChecks();});$$('[data-check-preset]').forEach(b=>b.onclick=()=>{checkError=b.dataset.checkPreset;mark('stabilizers');renderChecks();});
  $('checks-reset').onclick=()=>{checkError='IIIIIIIII';checkBrush='Y';selectedCheck=2;renderChecks();};renderChecks();


  // 06 — formative questions. Wrong answers remain available for revision.
  const questions=[
    {title:'The received words 010 and 101 have the same syndrome. What does this show?',options:['A syndrome is a copy of the original message.','A syndrome can reveal a disturbance without revealing the message.','The two words must have the same original message.'],correct:1,reason:'Both have neighbor parities 11. Under the one-flip model, they identify the middle position, but correspond to different original messages.'},
    {title:'A Z₁ error acts on (|000⟩ + |111⟩)/√2. What do the bit-repetition checks report?',options:['00, even though the logical state changed.','10, identifying the first qubit.','11, because a phase flip changes both parities.'],correct:0,reason:'Z₁ produces (|000⟩ − |111⟩)/√2. Each basis string still has equal neighboring bits, so the syndrome is 00. The two relative-phase states are orthogonal.'},
    {title:'In the Shor code, a Y₅ error produces which record (A | B | C ; phase)?',options:['00 | 11 | 00 ; 00','00 | 00 | 00 ; 11','00 | 11 | 00 ; 11'],correct:2,reason:'Y has both bit and phase components. X₅ fails the two checks in block B; Z₅ fails both block-sign comparisons. Apply X₅, then Z₄. The remaining global factor i is unobservable.'},
    {title:'Why can Z₄ correct an actual Z₅ error in the Shor code?',options:['The decoder must first learn the hidden amplitudes.','Z₄Z₅ acts as identity on the entire code space.','Any correction with a matching syndrome always works.'],correct:1,reason:'Z₄Z₅ is a stabilizer. These two phase errors have the same action on the code. Matching syndromes alone are not sufficient for arbitrary error sets: the residual action must be trivial on the logical state.'},
    {title:'For Rₓ,₅(60°), which statement about syndrome measurement is correct?',options:['The X₅ record occurs with probability 1/4; either branch can recover the message.','The X₅ record occurs with probability 1/2 because the angle is half of 120°.','Measuring the syndrome must destroy the logical superposition.'],correct:0,reason:'The X₅ sector has probability sin²(60°/2) = sin²(30°) = 1/4. The other sector has probability 3/4. Measurement distinguishes error sectors while each conditional state retains the unknown logical amplitudes.'}
  ];
  let answers={};
  function renderQuiz(){
    $('quiz').innerHTML=questions.map((q,i)=>`<article class="quiz-card"><span class="mini-label">CHECK ${String(i+1).padStart(2,'0')}</span><h3>${q.title}</h3><div class="quiz-options" role="group" aria-label="Question ${i+1}">${q.options.map((o,j)=>`<button data-question="${i}" data-answer="${j}" class="${answers[i]===j?`chosen ${j===q.correct?'correct':'incorrect'}`:''}" aria-pressed="${answers[i]===j}">${o}</button>`).join('')}</div><p class="quiz-explanation" aria-live="polite">${answers[i]===undefined?'Choose an answer to see the explanation.':`<strong>${answers[i]===q.correct?'Yes.':'Not quite. Try again.'}</strong> ${q.reason}`}</p></article>`).join('');
    const count=Object.keys(answers).length,right=questions.filter((q,i)=>answers[i]===q.correct).length;$('quiz-score').textContent=count?`${count} of 5 answered · ${right} currently correct`:'0 of 5 questions answered';
    $$('[data-question]').forEach(b=>b.onclick=()=>{const i=+b.dataset.question,j=+b.dataset.answer;answers[i]=j;if(Object.keys(answers).length===5)mark('practice');renderQuiz();document.querySelector(`[data-question="${i}"][data-answer="${j}"]`).focus({preventScroll:true});});
  }
  $('quiz-reset').onclick=()=>{answers={};renderQuiz();};renderQuiz();
})();
