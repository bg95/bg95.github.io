(() => {
 'use strict';
 const Q=Surface,$=id=>document.getElementById(id),$$=s=>Array.from(document.querySelectorAll(s));
 const sub=s=>String(s).replace(/[0-9]/g,n=>'₀₁₂₃₄₅₆₇₈₉'[n]);
 const f=x=>Math.abs(x)<1e-10?'0':x.toFixed(3).replace(/0+$/,'').replace(/\.$/,'');
 const percent=x=>`${f(100*x)}%`;
 const op=(m,type='Z')=>Q.support(m).map(s=>type+sub(s)).join('')||'I';
 const pauliAt=(x,z,i)=>(x&(1<<i))?((z&(1<<i))?'Y':'X'):((z&(1<<i))?'Z':'I');
 const pauliNext={I:'X',X:'Y',Y:'Z',Z:'I'};
 const pauliOp=(x,z)=>Q.sites.map((site,i)=>{const letter=pauliAt(x,z,i);return letter==='I'?'':letter+sub(site);}).join('')||'I';
 function cyclePauli(x,z,i){const bit=1<<i,next=pauliNext[pauliAt(x,z,i)];return {x:(x&~bit)|(['X','Y'].includes(next)?bit:0),z:(z&~bit)|(['Z','Y'].includes(next)?bit:0)};}
 const checkName=(type,i)=>`S${type==='X'?'ˣ':'ᶻ'}${sub(i+1)}`;
 const formulaState=(p,phi,sign=1)=>{
  const a=Math.sqrt(1-p),r=sign*Math.sqrt(p)*Math.cos(phi),im=sign*Math.sqrt(p)*Math.sin(phi);
  const beta=Math.abs(im)<1e-9?f(r):Math.abs(r)<1e-9?`${f(im)}i`:`(${f(r)} ${im<0?'−':'+'} ${f(Math.abs(im))}i)`;
  return [a>1e-9?`${f(a)}|0<sub>L</sub>⟩`:'',p>1e-9?`${beta}|1<sub>L</sub>⟩`:''].filter(Boolean).join(' + ').replace('+ -','− ');
 };
 const select=(selector,key,value)=>$$(selector).forEach(el=>{const active=el.dataset[key]===String(value);el.classList.toggle('selected',active);el.setAttribute('aria-pressed',active);});
 const result=(id,text,tone='')=>{$(id).className=`result ${tone}`;$(id).innerHTML=text;};
 const txt=(x,y,text,attr='')=>`<text x="${x}" y="${y}" ${attr}>${text}</text>`;
 const svgButton=(attrs,body,label)=>`<g role="button" tabindex="0" ${attrs} aria-label="${label}">${body}</g>`;
 const bind=(selector,fn)=>$$(selector).forEach(el=>{const act=()=>{const key=el.getAttribute('data-focus-key');fn(el);if(key)document.querySelector(`[data-focus-key="${key}"]`)?.focus({preventScroll:true});};el.onclick=act;el.onkeydown=e=>{if(el.tagName.toLowerCase()==='g'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();act();}};});
 let visited=new Set();try{visited=new Set(JSON.parse(localStorage.getItem('aiaa3072-week12-progress')||'[]').filter(x=>['patch','measure','chains','logical','time','matching','scaling','practice'].includes(x)));}catch{}
 function progress(){ $('progress-text').textContent=`${visited.size} / 8`;$('progress-fill').style.width=`${visited.size/8*100}%`; }
 function mark(id){if(id==='circuits')return;visited.add(id);try{localStorage.setItem('aiaa3072-week12-progress',JSON.stringify([...visited]));}catch{}progress();}
 $('reset-progress').onclick=()=>{visited.clear();try{localStorage.removeItem('aiaa3072-week12-progress');}catch{}progress();};progress();
 const sections=$$('.section-anchor');function nav(){let current='overview';sections.forEach(s=>{if(s.getBoundingClientRect().top<190)current=s.id;});$$('.sidebar nav a').forEach(a=>{const yes=a.hash==='#'+current;a.classList.toggle('active',yes);if(yes)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}window.addEventListener('scroll',nav,{passive:true});nav();

 // The physical layout is shared by every patch illustration.
 const coords=Q.sites.map((_,i)=>[140+140*(i%3),115+130*Math.floor(i/3)]);
 const regions=[
  {type:'X',i:0,d:'M280 115H420V245H280Z',x:350,y:185},
  {type:'X',i:1,d:'M140 245H280V375H140Z',x:210,y:315},
  {type:'X',i:2,d:'M140 115Q210 20 280 115Z',x:210,y:82},
  {type:'X',i:3,d:'M280 375Q350 465 420 375Z',x:350,y:416},
  {type:'Z',i:0,d:'M140 115H280V245H140Z',x:210,y:185},
  {type:'Z',i:1,d:'M280 245H420V375H280Z',x:350,y:315},
  {type:'Z',i:2,d:'M420 115Q520 180 420 245Z',x:459,y:185},
  {type:'Z',i:3,d:'M140 245Q40 310 140 375Z',x:100,y:315}
 ];
 function patch({errors=0,type='Z',pauli=null,selected=[],overlap=0,clickSites='',clickChecks=false,hero=false}={}){
  let s=`<path class="boundary rough" d="M62 92V398 M498 92V398"/><path class="boundary smooth" d="M125 35H435 M125 448H435"/>`;
  s+=txt(280,23,'SMOOTH · X-chain endpoints','class="boundary-label" text-anchor="middle"')+txt(280,468,'SMOOTH','class="boundary-label" text-anchor="middle"');
  s+=txt(31,245,'ROUGH · Z-chain endpoints','class="boundary-label" text-anchor="middle" transform="rotate(-90 31 245)"')+txt(530,245,'ROUGH','class="boundary-label" text-anchor="middle" transform="rotate(90 530 245)"');
  const xMask=pauli?pauli.x:(type==='X'?errors:0),zMask=pauli?pauli.z:(type==='Z'?errors:0);
  const syndromes={X:Q.syndrome(zMask,Q.X),Z:Q.syndrome(xMask,Q.Z)};
  regions.forEach(r=>{
   const chosen=selected.includes(r.type+r.i),failed=syndromes[r.type][r.i];
   const body=`<path d="${r.d}" class="check-region ${r.type.toLowerCase()} ${chosen?'chosen':''} ${failed?'failed':''}"/>${txt(r.x,r.y,checkName(r.type,r.i),'class="check-label" text-anchor="middle"')}${failed?txt(r.x,r.y+21,'−1 · bit 1','class="defect-label" text-anchor="middle"'):''}`;
   s+=clickChecks?svgButton(`data-patch-check="${r.type}${r.i}" data-focus-key="patch-${r.type}${r.i}"`,body,`Select ${r.type} check ${r.i+1}`):`<g>${body}</g>`;
  });
  coords.forEach(([x,y],i)=>{
   const letter=pauliAt(xMask,zMask,i),err=letter!=='I',shared=Boolean(overlap&(1<<i));
   const body=(clickSites?`<circle cx="${x}" cy="${y}" r="40" fill="transparent"/>`:'')+(shared?`<circle cx="${x}" cy="${y}" r="29" class="shared-ring"/>`:'')+`<circle cx="${x}" cy="${y}" r="22" class="data-qubit ${err?'error':''} ${pauli?'pauli-'+letter.toLowerCase():''}"/>`+txt(x,y+6,pauli?letter:(err?type:'q'+sub(Q.sites[i])),'class="qubit-label" text-anchor="middle"')+((err||pauli)?txt(x,y+42,'q'+sub(Q.sites[i]),'class="site-label" text-anchor="middle"'):'');
   s+=clickSites?svgButton(`data-site="${i}" data-error="${letter}" data-focus-key="${clickSites}-${i}" aria-pressed="${err}"`,body,`q${Q.sites[i]}: ${letter}. Set ${pauliNext[letter]} error next.`):body;
  });
  return s;
 }
 $('hero-patch').setAttribute('viewBox','0 0 560 470');$('hero-patch').innerHTML=patch({errors:7,hero:true});

 // 01: every displayed support comes from the same fixed matrices.
 let xCheck=0,zCheck=2;
 function renderPatch(){
  $('patch-svg').innerHTML=patch({selected:['X'+xCheck,'Z'+zCheck],overlap:Q.X[xCheck]&Q.Z[zCheck],clickChecks:true});
  for(const type of ['X','Z'])$(type.toLowerCase()+'-checks').innerHTML=Q[type].map((_,i)=>`<button data-select-check="${type}${i}" data-focus-key="choose-${type}${i}" aria-pressed="${(type==='X'?xCheck:zCheck)===i}" class="${(type==='X'?xCheck:zCheck)===i?'selected':''}">${checkName(type,i)}</button>`).join('');
  const common=Q.X[xCheck]&Q.Z[zCheck],n=Q.pop(common);
  $('patch-formulas').innerHTML=`<div class="formula">${checkName('X',xCheck)} = ${op(Q.X[xCheck],'X')}</div><div class="formula">${checkName('Z',zCheck)} = ${op(Q.Z[zCheck])}</div>`;
  result('commutation',`<strong>${n} shared qubits${n?': '+Q.support(common).map(s=>'q'+sub(s)).join(', '):''}</strong><div class="formula">(−1)<sup>${n}</sup> = +1 → the checks commute</div>${n?'Each shared site contributes a minus sign. The pair cancels.':'The checks act on disjoint sites.'}`,'good');
  const change=value=>{if(value[0]==='X')xCheck=+value[1];else zCheck=+value[1];mark('patch');renderPatch();};
  bind('[data-patch-check]',el=>change(el.dataset.patchCheck));bind('[data-select-check]',el=>change(el.dataset.selectCheck));
 }
 $('patch-reset').onclick=()=>{xCheck=0;zCheck=2;renderPatch();};renderPatch();

 // 02: graph edges are qubit faults; vertices are the opposite-type checks.
 let chain=16,chainX=0,chainView='patch'; // Separate Z and X components; Y has both.
 const spatialEdges=[
  {i:0,d:'M55 100H180',x:112,y:100},{i:1,d:'M180 100H380',x:280,y:100},
  {i:2,d:'M380 100Q435 40 505 75',x:450,y:65},
  {i:3,d:'M55 255Q120 255 180 330',x:112,y:270},
  {i:4,d:'M380 100L180 330',x:280,y:215},
  {i:5,d:'M380 100Q445 180 505 160',x:450,y:153},
  {i:6,d:'M55 375Q120 400 180 330',x:110,y:375},
  {i:7,d:'M180 330H380',x:280,y:330},{i:8,d:'M380 330H505',x:450,y:330}
 ];
 function spatialGraph(m,xMask=0){
  const syn=Q.syndrome(m);let s=`<path class="boundary rough" d="M55 42V425 M505 42V425"/>${txt(55,25,'ROUGH L','class="boundary-label" text-anchor="middle"')}${txt(505,25,'ROUGH R','class="boundary-label" text-anchor="middle"')}`;
  spatialEdges.forEach(e=>s+=svgButton(`data-site="${e.i}" data-focus-key="chain-${e.i}" aria-pressed="${Boolean(m&(1<<e.i))}"`,`<path class="edge-hit" d="${e.d}"/><circle cx="${e.x}" cy="${e.y}" r="40" fill="transparent"/><path class="graph-edge ${m&(1<<e.i)?'fault':''}" d="${e.d}"/><circle class="edge-label-bg ${m&(1<<e.i)?'active':''}" cx="${e.x}" cy="${e.y}" r="23"/>${txt(e.x,e.y+6,'q'+sub(Q.sites[e.i]),'class="edge-label" text-anchor="middle"')}`,`q${Q.sites[e.i]}: ${pauliAt(xMask,m,e.i)}. Toggle Z component to ${pauliAt(xMask,m^(1<<e.i),e.i)}.`));
  [[380,100],[180,330],[180,100],[380,330]].forEach(([x,y],i)=>{s+=`<circle class="detector ${syn[i]?'event':''}" cx="${x}" cy="${y}" r="29"/>${txt(x,y+5,checkName('X',i),'class="node-label" text-anchor="middle"')}${txt(x,y+50,`s${sub(i+1)} = ${syn[i]}`,'class="site-label" text-anchor="middle"')}`;});
  return s+txt(280,460,'Edges: Z component (Z or Y) · vertices: X checks','class="boundary-label" text-anchor="middle"');
 }
 function renderChain(){
  const synX=Q.syndrome(chain,Q.X),synZ=Q.syndrome(chainX,Q.Z),effect=Q.classify(chainX,chain);
  select('[data-chain-view]','chainView',chainView);
  $('chain-svg').innerHTML=chainView==='patch'?patch({pauli:{x:chainX,z:chain},clickSites:'chain'}):spatialGraph(chain,chainX);
  $('chain-svg').setAttribute('aria-label',chainView==='patch'?'Cycle data-qubit errors through I, X, Y, Z, I':'Toggle the Z component on syndrome-graph edges; X components are retained');
  $('chain-hint').textContent=chainView==='patch'?'Click a data qubit, or focus it and press Enter or Space: I → X → Y → Z → I. I means no error.':'This graph shows the Z component, including Y sites. Click an edge to toggle only that component (I ↔ Z, X ↔ Y). X components remain and appear in the Z-check syndrome below.';
  $('chain-operator').innerHTML=`E = ${pauliOp(chainX,chain)}`;
  $('chain-components').innerHTML=`<span>X component: ${op(chainX,'X')}</span><span>Z component: ${op(chain)}</span>`;
  $('chain-syndrome').innerHTML=`<div>sˣ = (${synX.join(', ')})</div><div>sᶻ = (${synZ.join(', ')})</div>`;
  $('chain-counts').innerHTML=[['X',chain,synX,'Z / Y'],['Z',chainX,synZ,'X / Y']].map(([type,mask,syn,letters])=>`<div class="check-sector"><h4>${type} checks · ${letters} sites</h4>${Q[type].map((g,i)=>`<div class="check-count ${syn[i]?'failed':''}"><strong>${checkName(type,i)}</strong><span>${Q.pop(g&mask)} touching</span><span>⟨${checkName(type,i)}⟩ = ${syn[i]?'−1':'+1'} → bit ${syn[i]}</span></div>`).join('')}</div>`).join('');
  const verdict=!(chain|chainX)?'No error is selected.':effect==='I'?'Zero syndrome, and this operator is a product of stabilizers, up to an irrelevant global phase. It preserves every code state.':effect!=='outside'?`Zero syndrome, but a logical ${effect} remains. ${effect==='Z'&&!chainX?'This Z string joins opposite rough boundaries and can change the logical phase.':'It changes some encoded inputs even though every check passes.'}`:'X checks detect an odd number of touching Z or Y factors. Z checks detect an odd number of touching X or Y factors. Two anticommuting factors cancel in either check.';
  result('chain-result',verdict,effect==='outside'?'':effect==='I'?'good':'warning');
  bind('#chain-svg [data-site]',el=>{const i=+el.dataset.site;if(chainView==='patch'){const next=cyclePauli(chainX,chain,i);chainX=next.x;chain=next.z;}else chain^=1<<i;mark('chains');renderChain();});
 }
 bind('[data-chain]',el=>{chain=+el.dataset.chain;chainX=0;mark('chains');renderChain();});bind('[data-chain-view]',el=>{chainView=el.dataset.chainView;renderChain();});$('chain-reset').onclick=()=>{chain=0;chainX=0;renderChain();};renderChain();

 // 04: Pauli propagation through actual CNOT directions and orderings.
 let circuitType='X',orderType='rows',faultAfter=2;
 const gate=(x,y,label,cls='')=>`<rect class="gate ${cls}" x="${x-21}" y="${y-18}" width="42" height="36" rx="4"/>${txt(x,y+6,label,'text-anchor="middle" class="gate-label"')}`;
 function cnot(x,c,t,hot){return `<g class="${hot?'propagates':''}"><line class="control-line" x1="${x}" y1="${c}" x2="${x}" y2="${t}"/><circle class="control-dot" cx="${x}" cy="${c}" r="5"/><circle class="target" cx="${x}" cy="${t}" r="13"/><path class="control-line" d="M${x-9} ${t}h18 M${x} ${t-9}v18"/></g>`;}
 function renderCircuit(){
  const enabled=$('hook-enabled').checked,base=circuitType==='X'?[1,2,4,5]:[0,1,3,4],order=orderType==='rows'?base:[base[0],base[2],base[1],base[3]],ys=[75,165,225,285,345];
  const h=enabled?Q.hook(circuitType,order,faultAfter):{x:0,z:0},data=h.x|h.z;
  select('[data-circuit]','circuit',circuitType);select('[data-order]','order',orderType);
  $('circuit-support').innerHTML=`${checkName(circuitType,0)} = ${op(Q[circuitType][0],circuitType)}`;$('hook-type').textContent=circuitType+'ₐ fault';
  let s='';ys.forEach((y,i)=>{s+=`<line class="wire" x1="95" y1="${y}" x2="${i?1010:899}" y2="${y}"/>${txt(20,y+6,i?'q'+sub(Q.sites[base[i-1]]):'a: |0⟩','class="wire-label"')}`;});
  if(circuitType==='X')s+=gate(140,75,'H')+gate(845,75,'H');
  order.forEach((q,i)=>{const x=280+140*i,y=ys[1+base.indexOf(q)];s+=cnot(x,circuitType==='X'?75:y,circuitType==='X'?y:75,enabled&&i>=faultAfter);s+=txt(x,30,`CNOT ${i+1}`,'class="small-svg" text-anchor="middle"');});
  s+=gate(920,75,'MZ')+`<path class="classical" d="M941 73H1020 M941 77H1020"/>`+txt(980,48,'bit 0','class="small-svg" text-anchor="middle"');
  [210,350,490,630,770].forEach((x,i)=>{
   s+=svgButton(`data-fault-after="${i}" data-focus-key="hook-${i}" aria-pressed="${faultAfter===i}"`,`<rect x="${x-19}" y="40" width="38" height="375" fill="transparent"/><path class="time-marker ${faultAfter===i?'chosen':''}" d="M${x} 40V380"/><circle class="time-circle ${faultAfter===i?'chosen':''}" cx="${x}" cy="400" r="17"/>${txt(x,406,String(i),'class="marker-text" text-anchor="middle"')}`,`Insert ancilla fault after ${i} CNOTs`);
   if(enabled&&faultAfter===i)s+=gate(x,75,circuitType,'fault-gate');
  });
  $('hook-circuit').innerHTML=s;$('hook-patch').innerHTML=patch({errors:data,type:circuitType});
  result('hook-result',enabled?`<strong>${circuitType}ₐ inserted ${faultAfter?'after CNOT '+faultAfter:'before CNOT 1'}</strong><div class="formula">Final data operator: ${op(data,circuitType)}</div>${4-faultAfter} later CNOT${4-faultAfter===1?'':'s'} propagate the ancilla fault.`:'<strong>No injected fault.</strong> The ideal circuit measures the joint check; it does not read the data qubits separately.',enabled&&Q.pop(data)===2?'warning':'');
  $('propagation-formula').innerHTML=circuitType==='X'?'X<sub>control</sub> → X<sub>control</sub>X<sub>target</sub>':'Z<sub>target</sub> → Z<sub>control</sub>Z<sub>target</sub>';
  $('hook-explanation').textContent=circuitType==='X'?'The ancilla controls each CNOT. Its X fault spreads to every later data target. The last H converts the ancilla X to Z, which does not flip the MZ report.':'The ancilla is the target of each CNOT. Its Z fault spreads to every later data control. The ancilla Z does not flip its MZ report.';
  const completions=Q.sites.filter((_,i)=>!(data&(1<<i))&&Q.classify(circuitType==='X'?data^(1<<i):0,circuitType==='Z'?data^(1<<i):0)===circuitType);
  result('hook-orientation',!enabled?'Enable the fault to compare the two gate orders.':Q.pop(data)===2?(completions.length?`<strong>This pair can shorten a logical string.</strong> An additional ${circuitType} on ${completions.map(s=>'q'+sub(s)).join(' or ')} completes a logical ${circuitType}. Compare the other gate order.`:'This two-qubit suffix is transverse to the logical string. No single additional same-type data Pauli completes a logical operator. This checks one hook, not a full fault-tolerant schedule.'):Q.pop(data)===4?'The four-data-qubit suffix is the measured stabilizer itself. On a code state, that complete product is harmless.':!data?'There are no later CNOTs, so this fault cannot spread to the data.':'Only the data sites visited after the fault are affected.',enabled&&Q.pop(data)===2&&completions.length?'warning':'');
  bind('[data-fault-after]',el=>{faultAfter=+el.dataset.faultAfter;mark('circuits');renderCircuit();});
 }
 bind('[data-circuit]',el=>{circuitType=el.dataset.circuit;mark('circuits');renderCircuit();});bind('[data-order]',el=>{orderType=el.dataset.order;mark('circuits');renderCircuit();});$('hook-enabled').onchange=()=>{mark('circuits');renderCircuit();};$('circuit-reset').onclick=()=>{circuitType='X';orderType='rows';faultAfter=2;$('hook-enabled').checked=true;renderCircuit();};renderCircuit();

 // 05–06: physical time runs down; only rounds 1 and 2 have data-fault edges.
 // Open data-qubit circles match the patch. Filled nodes are check records.
 function faultQubit(x,y,letter,site,tone='error'){
  return `<circle class="fault-marker-hit" cx="${x}" cy="${y}" r="32"/><circle class="data-qubit fault-qubit ${letter==='I'?'':tone}" cx="${x}" cy="${y}" r="22"/>`+txt(x,y+7,letter,'class="qubit-label" text-anchor="middle"')+(site?txt(x,y+42,'q'+sub(site),'class="fault-site" text-anchor="middle"'):'');
 }
 const nodeXY=[[250,95],[505,95],[250,250],[505,250],[250,405],[505,405],[80,95],[675,95],[80,250],[675,250]];
 function spacetime({events,highlight=0,mode='paths',connections=[],weights=null,frameOnly=false,faults=null,editable=false,editScope='history',showInference=false,preview=false}){
  const editing=faults!==null;
  let s=txt(18,55,'TIME ↓','class="small-svg"')+txt(375,25,'SPACE →','class="axis-label" text-anchor="middle"')+txt(250,55,'a = Sˣ₃','class="node-heading" text-anchor="middle"')+txt(505,55,'b = Sˣ₁','class="node-heading" text-anchor="middle"');
  [95,250,405].forEach((y,i)=>s+=txt(50,y+6,`t=${i+1}`,'class="axis-label" text-anchor="end"'));
  Q.edges.forEach((e,i)=>{const [x1,y1]=nodeXY[e.u],[x2,y2]=nodeXY[e.v],hot=Boolean((editing?faults:highlight)&(1<<i))&&(editing||!frameOnly||e.type==='data'),x=(x1+x2)/2,y=(y1+y2)/2;
   let body=(editable?`<path class="fault-hit" d="M${x1} ${y1}L${x2} ${y2}"/>`:'')+`<line class="graph-edge ${hot?(editing?'actual-fault':'inferred'):''} ${mode==='graph'&&!editing?'faint':''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
   if(showInference&&mode!=='graph'&&(highlight&(1<<i))&&(!frameOnly||e.type==='data')){
    const dx=e.type==='report'?-10:0,dy=e.type==='data'?10:0;
    body+=`<line class="decoder-rail ${preview?'preview-rail':''}" data-inferred-edge="${i}" x1="${x1+dx}" y1="${y1+dy}" x2="${x2+dx}" y2="${y2+dy}"/>`;
   }
   if(mode!=='graph'||editable){
    if(e.type==='data')body+=faultQubit(x,y,hot?'Z':'I',Q.sites[e.q],editing?'error':'correction-symbol');
    else body+=`<rect class="report-marker ${hot?(editing?'applied':'inferred'):''}" x="${x-29}" y="${y-18}" width="58" height="36" rx="4"/>`+txt(x,y+6,editing?(hot?'flip':'OK'):'report','class="report-state" text-anchor="middle"')+(editing?txt(x,y+39,(e.check?'b':'a')+' report · t'+sub(e.t),'class="fault-site" text-anchor="middle"'):'');
   }
   const label=e.type==='data'?`Toggle Z fault on q${Q.sites[e.q]} before round ${e.t}`:`Toggle wrong ${e.check?'b':'a'} report in round ${e.t}`;
   s+=editable?svgButton(`class="fault-target" data-${editScope}-fault="${i}" data-focus-key="${editScope}-${i}" data-fault-type="${e.type}" aria-pressed="${hot}"`,body,label):body;
  });
  if(mode==='graph'||mode==='all')connections.forEach((c,i)=>{
   const [x1,y1]=nodeXY[c.from],[x2,y2]=nodeXY[c.to];
   s+=`<path class="matching-link" d="M${x1} ${y1} Q${(x1+x2)/2+(x1===x2?120:0)} ${(y1+y2)/2-(y1===y2?70:0)} ${x2} ${y2}"/>`;
   s+=txt((x1+x2)/2+(x1===x2?100:0),(y1+y2)/2-(y1===y2?48:0),f(c.cost),'class="matching-cost" text-anchor="middle"');
  });
  nodeXY.forEach(([x,y],i)=>{const event=Boolean(events&(1<<i));s+=i<6?`<circle class="detector ${event?'event':''}" data-event="${i}" data-bit="${event?1:0}" cx="${x}" cy="${y}" r="18"/>`+txt(x,y+6,event?'1':'0','class="detector-bit" text-anchor="middle"')+txt(x,y+42,Q.nodes[i],'class="node-label" text-anchor="middle"'):`<rect class="boundary-node" x="${x-20}" y="${y-20}" width="40" height="40" rx="4"/>${txt(x,y+6,i%2?'R':'L','class="node-label" text-anchor="middle"')}`;});
  s+=txt(375,458,'t = 3: ideal closure · no data-fault edges · no free time boundary','class="graph-caption" text-anchor="middle"');
  s+=txt(375,488,editing?'Horizontal = data fault · vertical = wrong report · red node = event':(mode==='graph'||mode==='all')?'Purple connections summarize paths; labels show total path cost.':frameOnly?'Green data edges contribute Z updates; report edges contribute no data Pauli.':'Horizontal = data fault · vertical = wrong report · red node = event','class="graph-caption" text-anchor="middle"');
  return s;
 }
 let historyFaults=129;
 function renderHistory(){
  const h=Q.history(historyFaults);
  select('[data-history]','history',historyFaults);
  $('history-table').innerHTML=[0,1].map(j=>`<tr><th>Reported s<sub>${j?'b':'a'}</sub></th>${h.reports.map((bs,t)=>`<td class="${t===0||t===3?'closure':''}">${bs[j]}</td>`).join('')}</tr><tr class="event-row"><th>Change δ<sub>${j?'b':'a'}</sub></th><td>—</td>${h.deltas.slice(1).map((bs,t)=>`<td class="${bs[j]?'has-event':''}">${bs[j]}${bs[j]?'<small>event</small>':''}</td>`).join('')}</tr>`).join('');
  $('history-graph').innerHTML=spacetime({events:h.events,faults:historyFaults,editable:true});
  const names=Q.nodes.slice(0,6).filter((_,i)=>h.events&(1<<i));
  result('history-result',`<strong>Observed events: ${names.length?'{'+names.join(', ')+'}':'none'}</strong><div class="formula">Final data error: ${op(h.frame)}</div>The coloured edges are the faults you set. The decoder receives the measured record, not these choices. ${historyFaults===256?'The second event is at a₃: the ideal terminal comparison catches the bad round-2 report.':historyFaults===1?'The data error persists, but only a₁ is a new event. Repeated 1s are not new faults.':historyFaults===64?'One wrong report creates a₁ and a₂, joined by one time-like edge.':''}`);
  bind('#history-graph [data-history-fault]',el=>{historyFaults^=1<<+el.dataset.historyFault;mark('time');renderHistory();});
 }
 bind('[data-history]',el=>{historyFaults=+el.dataset.history;mark('time');renderHistory();});$('history-clear').onclick=()=>{historyFaults=0;renderHistory();};renderHistory();

 // Matching uses only the observed record and calibrated weights, even while the teaching view shows E.
 let shot='A',matchingFaults=129,matchingView='all',candidatePreview=null;
 const faultLabel=i=>{const e=Q.edges[i];return e.type==='data'?`Z${sub(Q.sites[e.q])} @ t${e.t}`:`${e.check?'b':'a'} report @ t${e.t}`;};
 const faultList=mask=>Q.edges.map((_,i)=>mask&(1<<i)?faultLabel(i):'').filter(Boolean).join('; ')||'No faults';
 function renderMatching(){
  const pd=+$('data-rate').value/100,pm=+$('report-rate').value/100,h=Q.history(matchingFaults),m=Q.matching(h.events,pd,pm),all=Q.enumerate(h.events,pd,pm),ties=all.filter(x=>Math.abs(x.cost-m.cost)<1e-8),classes=new Set(ties.map(x=>Q.classify(0,x.correction^h.frame)));
  select('[data-shot]','shot',shot);select('[data-matching-view]','matchingView',matchingView);
  $('data-rate-value').textContent=percent(pd);$('report-rate-value').textContent=percent(pm);$('weights').innerHTML=`w<sub>d</sub> = ${f(Q.weight(pd))}, &nbsp; w<sub>m</sub> = ${f(Q.weight(pm))}`;
  const eventNames=Q.nodes.slice(0,6).filter((_,i)=>h.events&(1<<i));
  $('matching-evidence').innerHTML=`<span>Observed changes D = </span>${eventNames.length?'{'+eventNames.join(', ')+'}':'∅'}`;
  $('matching-record').innerHTML=`<table><caption>Measured record s(t) → adjacent changes δ(t)</caption><thead><tr><th>Check</th><th>s₀</th><th>s₁</th><th>s₂</th><th>s₃</th><th>δ₁ δ₂ δ₃</th></tr></thead><tbody>${[0,1].map(j=>`<tr><th>${j?'b':'a'}</th>${h.reports.map(bs=>`<td>${bs[j]}</td>`).join('')}<td class="event-row">${h.deltas.slice(1).map(bs=>bs[j]).join(' ')}</td></tr>`).join('')}</tbody></table>`;
  $('matching-graph').innerHTML=spacetime({events:h.events,faults:matchingFaults,editable:true,editScope:'matching',showInference:true,preview:candidatePreview!==null,highlight:candidatePreview??m.edgeMask,mode:candidatePreview!==null?'paths':matchingView,connections:m.connections,frameOnly:candidatePreview===null&&matchingView==='frame'});
  $('matching-path-key').textContent=candidatePreview!==null?'Violet rails preview the selected candidate. The decoder’s chosen correction remains on the right.':matchingView==='graph'?'Purple arcs pair the observed events; labels give path costs.':matchingView==='frame'?'Green rails mark only the data edges used for correction. Actual report faults remain editable.':matchingView==='paths'?'Green rails mark the decoder’s chosen fault paths.':'Purple arcs pair events; green rails show the chosen fault paths. Labels give path costs.';
  $('matching-connections').innerHTML=m.connections.length?m.connections.map(c=>`<div><strong>${Q.nodes[c.from]} ↔ ${c.to>=6?(c.to%2?'right':'left')+' boundary':Q.nodes[c.to]}</strong><span>cost ${f(c.cost)}</span></div>`).join(''):'<p>No events: no connections are needed.</p>';
  $('matching-expanded').textContent=faultList(m.edgeMask);
  result('matching-result',`<strong>Minimum total cost: ${f(m.cost)}</strong><div class="formula">Data correction C = ${op(m.correction)}</div>Report-fault edges add no data gate. ${classes.size>1?'<strong class="tie">Logically different corrections tie; one minimum is shown.</strong>':ties.length>1?'Several minimum-cost histories give the same logical class.':''}`,'good');
  const candidates=all.slice(0,4);
  $('matching-candidates').innerHTML=candidates.map(c=>`<tr class="${Math.abs(c.cost-m.cost)<1e-8?'optimal':''}"><td><button class="candidate-button" data-candidate="${c.faults}" aria-pressed="${candidatePreview===c.faults}">${faultList(c.faults)}</button>${Math.abs(c.cost-m.cost)<1e-8?' <span class="tag">minimum</span>':''}</td><td>${f(c.cost)}</td><td>${op(c.correction)}</td></tr>`).join('');
  $('candidate-preview').hidden=candidatePreview===null;if(candidatePreview!==null)result('candidate-preview',`<strong>Alternative path preview</strong><div class="formula">Physical correction = ${op(Q.frame(candidatePreview))}</div>The decoder’s chosen correction and recovery are unchanged.`);
  const residual=m.correction^h.frame,ok=Q.classify(0,residual)==='I';
  let circuit=txt(140,27,'Actual E','class="meter-label" text-anchor="middle"')+txt(280,27,'Apply C','class="meter-label" text-anchor="middle"')+txt(410,27,'Residual CE','class="meter-label" text-anchor="middle"');
  [0,1,2].forEach(i=>{const y=70+i*65;circuit+=txt(38,y+6,'q'+sub(Q.sites[i]),'class="meter-label" text-anchor="end"')+`<path class="meter-quantum" d="M48 ${y}H465"/>`;
   circuit+=faultQubit(140,y,h.frame&(1<<i)?'Z':'I',null,'error');
   circuit+=`<rect x="257" y="${y-19}" width="46" height="38" rx="4" fill="white" stroke="#087b77" stroke-width="2"/>`+txt(280,y+6,m.correction&(1<<i)?'Z':'I','class="meter-label" text-anchor="middle"');
   circuit+=faultQubit(410,y,residual&(1<<i)?'Z':'I',null,'residual-symbol');});
  $('matching-recovery').innerHTML=circuit;
  result('shot-verdict',`<div class="formula">E<sub>final</sub> = ${op(h.frame)} &nbsp; → &nbsp; CE<sub>final</sub> = ${op(residual)}</div><strong>${ok?'Recovery succeeds: the logical state is restored.':'Recovery fails: a logical Z remains.'}</strong> The final checks are clear in both cases. The decoder used the record and weights, not the actual faults shown in orange.`,ok?'good':'warning');
  bind('#matching-graph [data-matching-fault]',el=>{matchingFaults^=1<<+el.dataset.matchingFault;shot='custom';candidatePreview=null;mark('matching');renderMatching();});
  bind('[data-candidate]',el=>{candidatePreview=+el.dataset.candidate;mark('matching');renderMatching();});
 }
 bind('[data-shot]',el=>{shot=el.dataset.shot;matchingFaults=shot==='A'?129:shot==='B'?66:0;candidatePreview=null;if(shot!=='clear'){$('data-rate').value=shot==='A'?1:10;$('report-rate').value=shot==='A'?10:1;}mark('matching');renderMatching();});
 bind('[data-matching-view]',el=>{matchingView=el.dataset.matchingView;candidatePreview=null;mark('matching');renderMatching();});
 ['data-rate','report-rate'].forEach(id=>$(id).oninput=()=>{candidatePreview=null;mark('matching');renderMatching();});
 $('matching-reset').onclick=()=>{shot='A';matchingFaults=129;matchingView='all';candidatePreview=null;$('data-rate').value=1;$('report-rate').value=10;renderMatching();};$('history-decode').onclick=()=>{matchingFaults=historyFaults;shot='custom';candidatePreview=null;mark('matching');renderMatching();};renderMatching();

 // Published fitted per-cycle logical error rates, Google Quantum AI, Nature 614 (2023), Fig. 3 and main text.
 const publishedScaling={a:{name:'Tensor-network decoder',values:[3.028,2.914],errors:[.023,.016]},b:{name:'Belief-matching decoder',values:[3.118,3.056],errors:[.025,.015]}};
 let scaling='a';
 function renderScaling(){
  select('[data-scaling]','scaling',scaling);const data=publishedScaling[scaling],y=v=>290-(v-2.8)/.4*225;
  let s=txt(95,26,'Logical error per cycle (%) · published estimates ± 1σ','class="axis-label"');
  [2.8,2.9,3,3.1,3.2].forEach(v=>{s+=`<path class="chart-grid" d="M95 ${y(v)}H690"/>`+txt(78,y(v)+6,v.toFixed(1),'class="axis-label" text-anchor="end"');});
  s+=`<path d="M250 ${y(data.values[0])}L560 ${y(data.values[1])}" stroke="#087b77" stroke-width="3" fill="none"/>`;
  data.values.forEach((v,i)=>{const x=250+i*310,lo=y(v-data.errors[i]),hi=y(v+data.errors[i]);s+=`<path d="M${x} ${hi}V${lo}M${x-11} ${hi}H${x+11}M${x-11} ${lo}H${x+11}" stroke="#087b77" stroke-width="2.5"/><circle cx="${x}" cy="${y(v)}" r="7" fill="#087b77"/>`+txt(x,hi-18,`${v.toFixed(3)} ± ${data.errors[i].toFixed(3)}%`,'class="chart-value" text-anchor="middle"')+txt(x,325,`d = ${i?5:3}`,'class="axis-label" text-anchor="middle"');});
  $('scaling-chart').innerHTML=s;
  result('scaling-result',`<strong>${data.name}: distance 5 has a lower fitted error per cycle.</strong> <span class="formula">${data.values[0].toFixed(3)}% → ${data.values[1].toFixed(3)}%</span> These two tested distances show improvement on this device; they do not determine an infinite-distance limit or a threshold value.`,'good');
 }
 bind('[data-scaling]',el=>{scaling=el.dataset.scaling;mark('scaling');renderScaling();});renderScaling();

 // General Pauli measurement: exact sector algebra, with the logical state inside each sector untouched.
 let meterCheck='XYZ',meterSector='plus',meterStage=0,meterOutcome=null;
 function renderMeter(){
  const p=meterSector==='plus'?0:meterSector==='minus'?1:+$('meter-prob').value/100,a=Math.sqrt(1-p),b=Math.sqrt(p),letters=meterCheck.split('');
  const terms=(plus,minus)=>[a>1e-10?`${f(a)}${plus}`:'',b>1e-10?`${f(b)}${minus}`:''].filter(Boolean).join(' + ');
  const incoming=terms('|ψ₊⟩','|ψ₋⟩');
  select('[data-meter-check]','meterCheck',meterCheck);select('[data-meter-sector]','meterSector',meterSector);$('meter-prob-control').hidden=meterSector!=='both';$('meter-prob-value').textContent=percent(p);
  let pic=`<path class="meter-quantum" d="M95 70H760"/>${txt(85,76,'a: |0⟩','class="meter-label" text-anchor="end"')}`;
  letters.forEach((P,i)=>{const y=126+i*49,x=300+i*72;pic+=`<path class="meter-quantum" d="M95 ${y}H900"/>`+txt(85,y+6,'q'+sub(i+1),'class="meter-label" text-anchor="end"')+`<path stroke="#48458e" stroke-width="1.8" d="M${x} 70V${y}"/><circle fill="#48458e" cx="${x}" cy="70" r="5"/><rect class="meter-gate" x="${x-20}" y="${y-18}" width="40" height="36" rx="3"/>`+txt(x,y+6,P,'class="meter-label" text-anchor="middle"');});
  [190,650].forEach(x=>pic+=`<rect class="meter-gate" x="${x-20}" y="52" width="40" height="36" rx="3"/>`+txt(x,76,'H','class="meter-label" text-anchor="middle"'));
  pic+=`<rect class="meter-gate" x="760" y="52" width="45" height="36" rx="3"/>${txt(782,76,'MZ','class="meter-label" text-anchor="middle"')}<path class="meter-classical" d="M805 67H854M805 73H854"/>${txt(866,76,meterOutcome===null?'b':String(meterOutcome),'class="meter-label"')}`;
  const labels=['Input','H on ancilla','Controlled S','Final H','Measure'],xs=[140,245,590,705,865];
  pic+=txt(425,24,'Controlled S = '+letters.join(' ⊗ '),'class="meter-label" text-anchor="middle"');
  labels.forEach((label,i)=>pic+=svgButton(`class="meter-time-cut ${i===meterStage?'selected':''}" data-meter-stage="${i}" data-focus-key="meter-stage-${i}" aria-pressed="${i===meterStage}"`, `<rect class="time-hit" x="${xs[i]-23}" y="30" width="46" height="326"/><path class="time-cut" d="M${xs[i]} 35V309"/><circle cx="${xs[i]}" cy="332" r="20"/>`+txt(xs[i],339,'t'+i,'text-anchor="middle"')+txt(xs[i],377,['Input','After H','After S','After H','Read bit'][i],'class="time-caption" text-anchor="middle"'),`Stage ${i}: ${label}`));
  $('meter-circuit').innerHTML=pic;
  let state,explain;
  if(meterStage===0){state=`|0⟩<sub>a</sub> (${incoming})`;explain='The helper starts at 0. The data may carry any state within the chosen check sector.';}
  else if(meterStage===1){state=`0.707 (|0⟩ + |1⟩)<sub>a</sub> (${incoming})`;explain='The first H prepares two ancilla branches.';}
  else if(meterStage===2){state=[a>1e-10?`${f(a/Math.sqrt(2))} (|0⟩ + |1⟩)<sub>a</sub>|ψ₊⟩`:'',b>1e-10?`${f(b/Math.sqrt(2))} (|0⟩ − |1⟩)<sub>a</sub>|ψ₋⟩`:''].filter(Boolean).join(' + ');explain='Controlled S applies a minus sign only to the |1⟩ ancilla branch of the −1 data sector.';}
  else{state=terms('|0⟩<sub>a</sub>|ψ₊⟩','|1⟩<sub>a</sub>|ψ₋⟩');explain=meterStage===3?'The final H converts each relative sign into a distinct ancilla bit.':'Choose an allowed outcome below. Measurement selects one branch; the data within it remain coherent.';}
  if(meterStage===4&&meterOutcome!==null){state=`b = ${meterOutcome} → |ψ${meterOutcome?'₋':'₊'}⟩`;explain=`This outcome has probability ${percent(meterOutcome?p:1-p)}. The measured ancilla becomes a classical record; its quantum wire ends at MZ.`;}
  $('meter-state').innerHTML=`<strong>${labels[meterStage]}</strong><div class="formula">${state}</div><p>${explain}</p>`;
  $('meter-outcomes').innerHTML=meterStage===4?[0,1].map(bit=>`<button data-meter-outcome="${bit}" ${((bit?p:1-p)<1e-10)?'disabled':''} aria-pressed="${meterOutcome===bit}">b = ${bit} · ${percent(bit?p:1-p)}</button>`).join(''):'';
  bind('[data-meter-stage]',el=>{meterStage=+el.dataset.meterStage;meterOutcome=null;mark('measure');renderMeter();});bind('[data-meter-outcome]',el=>{meterOutcome=+el.dataset.meterOutcome;mark('measure');renderMeter();});
 }
 bind('[data-meter-check]',el=>{meterCheck=el.dataset.meterCheck;meterOutcome=null;mark('measure');renderMeter();});bind('[data-meter-sector]',el=>{meterSector=el.dataset.meterSector;meterOutcome=null;mark('measure');renderMeter();});$('meter-prob').oninput=()=>{meterOutcome=null;mark('measure');renderMeter();};$('meter-reset').onclick=()=>{meterCheck='XYZ';meterSector='plus';meterStage=0;meterOutcome=null;$('meter-prob').value=25;renderMeter();};renderMeter();

 // 04A and 04B share one editable error, one patch, and a syndrome-only decoder.
 let loopX=0,loopZ=2,loopStage=0,loopBrush='cycle',loopCheck='',loopOriginal={x:0,z:2},loopCase='custom';
 const loopPresets={'0':{x:0,z:0},'2':{x:0,z:2},y22:{x:16,z:16},mixed:{x:17,z:272},logical:{x:0,z:7}};
 const setLoopError=(x,z)=>{loopX=x;loopZ=z;loopOriginal={x,z};loopCase='custom';};
 function loopFamily(c){
  const examples=[
   {id:'chosen',label:'E = C',x:c.x,z:c.z,meaning:'No residual'},
   {id:'stabilizer',label:'E = C Sᶻ₁',x:c.x,z:c.z^Q.Z[0],meaning:'Harmless stabilizer'},
   {id:'logicalX',label:'E = C X̄',x:c.x^Q.LX,z:c.z,meaning:'Logical X'},
   {id:'logicalZ',label:'E = C Z̄',x:c.x,z:c.z^Q.LZ,meaning:'Logical Z'},
   {id:'logicalY',label:'E = C Ȳ',x:c.x^Q.LX,z:c.z^Q.LZ,meaning:'Logical Y'}
  ];
  if(!examples.some(e=>e.x===loopOriginal.x&&e.z===loopOriginal.z))examples.unshift({id:'custom',label:'Your custom E',...loopOriginal,meaning:'Your starting error'});
  return examples;
 }
 const multiplyComplex=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
 function logicalPair(p,phi,effect='I'){
  const a=[Math.sqrt(1-p),0],b=[Math.sqrt(p)*Math.cos(phi),Math.sqrt(p)*Math.sin(phi)];
  return effect==='X'?[b,a]:effect==='Z'?[a,[-b[0],-b[1]]]:effect==='Y'?[multiplyComplex([0,-1],b),multiplyComplex([0,1],a)]:[a,b];
 }
 function pairFormula(pair,encoded=false){
  const term=([r,im])=>Math.abs(im)<1e-9?f(r):Math.abs(r)<1e-9?`${f(im)}i`:`(${f(r)} ${im<0?'−':'+'} ${f(Math.abs(im))}i)`;
  return pair.map((c,i)=>Math.hypot(...c)>1e-9?`${term(c)}|${i}${encoded?'<sub>L</sub>':''}⟩`:'').filter(Boolean).join(' + ').replace('+ -','− ');
 }
 function renderLoop(){
  const sx=Q.syndrome(loopZ,Q.X),sz=Q.syndrome(loopX,Q.Z),c=Q.decodeSyndrome(sx,sz),rx=loopX^c.x,rz=loopZ^c.z,effect=Q.classify(rx,rz),ok=effect==='I';
  const p=+$('loop-prob').value/100,phi=+$('loop-phase').value*Math.PI/180,initial=logicalPair(p,phi),output=logicalPair(p,phi,effect),E=pauliOp(loopX,loopZ),C=pauliOp(c.x,c.z),R=pauliOp(rx,rz);
  select('[data-loop-brush]','loopBrush',loopBrush);select('[data-loop-error]','loopError','');
  $('loop-prob-value').textContent=percent(p);$('loop-phase-value').textContent=$('loop-phase').value+'°';
  const patchDrawing=patch({pauli:{x:loopX,z:loopZ},clickSites:'loop',selected:loopCheck?[loopCheck]:[]});
  $('loop-patch').innerHTML=loopBrush==='cycle'?patchDrawing:patchDrawing.replace(/(aria-label="q\d+: [IXYZ]\. )Set [IXYZ] error next\./g,'$1Paint '+loopBrush+'.');
  $('loop-error-label').innerHTML=`E = ${E}`;
  $('loop-editor-summary').innerHTML=`<span>Correction C = ${C}</span><span>Residual CE = ${R}</span>`;
  $('loop-evidence').innerHTML=`<div>sˣ = (${sx.join(', ')})</div><div>sᶻ = (${sz.join(', ')})</div>`;
  $('loop-checks').innerHTML=['X','Z'].map(type=>`<div class="loop-check-sector"><h4>${type} checks</h4>${Q[type].map((g,i)=>{const bit=(type==='X'?sx:sz)[i];return `<button class="loop-check ${bit?'failed':''} ${loopCheck===type+i?'selected':''}" data-loop-check="${type}${i}" data-focus-key="loop-check-${type}${i}" aria-pressed="${loopCheck===type+i}" aria-label="Inspect ${checkName(type,i)} = ${op(g,type)}; eigenvalue ${bit?'minus':'plus'} one, syndrome bit ${bit}"><span>${checkName(type,i)}</span><span>${bit?'−1':'+1'} → <b>${bit}</b></span></button>`;}).join('')}</div>`).join('');
  $('loop-check-formula').innerHTML=loopCheck?`${checkName(loopCheck[0],+loopCheck[1])} = ${op(Q[loopCheck[0]][+loopCheck[1]],loopCheck[0])}`:'Click a check to highlight its support on the shared patch.';
  $('loop-choice').innerHTML=`<div class="formula">C = ${C}</div><p>Smallest compatible weight: <strong>${c.weight} qubit${c.weight===1?'':'s'}</strong>. ${c.ties===1?'This is the unique lowest-weight Pauli.':`${c.ties} Pauli corrections tie at this weight; a fixed order selects one.`}${c.logicalClasses.length>1?' <strong>Some tied corrections differ logically.</strong>':''}</p>`;
  $('loop-gates').innerHTML=Q.sites.map((site,i)=>`<div><span>q${sub(site)}</span><b class="${pauliAt(c.x,c.z,i)==='I'?'idle':'applied'}">${pauliAt(c.x,c.z,i)}</b></div>`).join('');
  result('loop-verdict',`<div class="formula">CE = ${R} &nbsp;≃&nbsp; ${ok?'I':effect+'̄'}</div><strong>${ok?'Recovery succeeds for every logical input.':'A logical '+effect+' remains: recovery is not guaranteed for the message.'}</strong><p>${ok?(rx||rz?'The residual is a stabilizer product. The correction need not reproduce the actual error.':'Error and correction cancel.'):'All eight checks return to 0, but this residual can change the encoded state.'}</p>` ,ok?'good':'warning');
  const cases=loopFamily(c);
  $('loop-cases').innerHTML=cases.map(e=>{const dx=e.x^c.x,dz=e.z^c.z,kind=Q.classify(dx,dz),selected=loopX===e.x&&loopZ===e.z;return `<tr class="${selected?'selected':''}"><td><button data-loop-case="${e.id}" data-focus-key="loop-case-${e.id}" aria-pressed="${selected}" aria-label="Try ${e.label}: ${pauliOp(e.x,e.z)}"><strong>${e.label}</strong><span>${pauliOp(e.x,e.z)}</span></button></td><td><span class="case-residual">${e.id==='stabilizer'?'Sᶻ₁':e.id==='custom'?pauliOp(dx,dz):kind==='I'?'I':kind+'̄'}</span><small>${kind==='I'?'Preserves all inputs':'Can change the message'}</small></td></tr>`;}).join('');
  $('loop-case-context').innerHTML=`Every row gives the same sˣ = (${sx.join(', ')}) and sᶻ = (${sz.join(', ')}). The decoder keeps <strong>C = ${C}</strong>. Click a row to change the error on the shared patch.`;
  $('loop-message').innerHTML=`<div><span>Input |ψ⟩</span><div class="formula">${pairFormula(initial)}</div></div><div><span>After correction and decoding</span><div class="formula">${pairFormula(output)}</div></div>`;
  const overlap=initial.reduce((sum,a,i)=>{const t=multiplyComplex([a[0],-a[1]],output[i]);return [sum[0]+t[0],sum[1]+t[1]];},[0,0]);
  $('loop-special-state').textContent=!ok&&Math.hypot(...overlap)>1-1e-8?'This particular input is unchanged up to overall phase. The residual still fails to preserve other logical inputs.':'Operators and displayed states are equivalent up to an overall phase.';
  const names=['Encode V','Error E','Measure S','Infer C','Apply C','Decode V†'],xs=[80,245,410,575,740,905];
  let pic='<path class="meter-quantum" d="M20 70H995"/><path class="meter-classical" d="M410 98V140H506M415 98V145H506M644 140H735V98M644 145H740V98"/>'+txt(575,202,'classical syndrome → decoder → correction','class="meter-label" text-anchor="middle"');
  names.forEach((name,i)=>pic+=svgButton(`class="loop-stage ${i===loopStage?'selected':''}" data-loop-stage="${i}" data-focus-key="loop-stage-${i}" aria-pressed="${i===loopStage}"`,`<rect x="${xs[i]-69}" y="${i===3?115:43}" width="138" height="55" rx="7"/>`+txt(xs[i],i===3?149:77,`${i+1}. ${name}`,'text-anchor="middle"'),`Step ${i+1}: ${name}`));
  pic+=txt(575,28,'nine-qubit data register','class="small-svg" text-anchor="middle"');$('loop-circuit').innerHTML=pic;
  const state=[`|ψ⟩ = ${pairFormula(initial)}<br>↓ V<br>|ψ<sub>L</sub>⟩ = ${pairFormula(initial,true)}`,`${E} (${pairFormula(initial,true)})`,`${E} (${pairFormula(initial,true)})`,`C = ${C}; ${c.weight} nonidentity gate${c.weight===1?'':'s'}.`,`${pairFormula(output,true)}`,`${pairFormula(output)}`][loopStage];
  const explanation=['V encodes one unknown qubit into the joint state of nine data qubits.','The physical Pauli E acts on the selected sites.','The ancillas reveal the eight check eigenvalues. The encoded superposition stays coherent within this syndrome sector.','Only the syndrome and assumed noise model enter this choice. The decoder does not know the actual E.','The residual CE acts on the logical state as '+(ok?'identity.':effect+'̄.'),'Ideal inverse encoding returns one qubit. The comparison above shows whether the message was preserved.'][loopStage];
  $('loop-state').innerHTML=`<strong>${loopStage+1}. ${names[loopStage]}</strong><div class="formula loop-state-line">${state}</div><p>${explanation}</p>`;
  bind('#loop-patch [data-site]',el=>{const i=+el.dataset.site,bit=1<<i;let next=loopBrush==='cycle'?cyclePauli(loopX,loopZ,i):{x:(loopX&~bit)|(['X','Y'].includes(loopBrush)?bit:0),z:(loopZ&~bit)|(['Z','Y'].includes(loopBrush)?bit:0)};setLoopError(next.x,next.z);mark('logical');renderLoop();});
  bind('[data-loop-check]',el=>{loopCheck=el.dataset.loopCheck;renderLoop();});
  bind('[data-loop-case]',el=>{const choice=cases.find(c=>c.id===el.dataset.loopCase);loopX=choice.x;loopZ=choice.z;loopCase=choice.id;mark('logical');renderLoop();});
  bind('[data-loop-stage]',el=>{loopStage=+el.dataset.loopStage;mark('logical');renderLoop();});
 }
 bind('[data-loop-brush]',el=>{loopBrush=el.dataset.loopBrush;renderLoop();});
 bind('[data-loop-error]',el=>{const e=loopPresets[el.dataset.loopError];setLoopError(e.x,e.z);mark('logical');renderLoop();});
 ['loop-prob','loop-phase'].forEach(id=>$(id).oninput=()=>{mark('logical');renderLoop();});
 $('loop-reset').onclick=()=>{setLoopError(0,2);loopStage=0;loopBrush='cycle';loopCheck='';$('loop-prob').value=50;$('loop-phase').value=45;renderLoop();};
 $('chain-decode').onclick=()=>{setLoopError(chainX,chain);mark('logical');renderLoop();};renderLoop();

 const questions=[
  {q:'Two opposite-type checks share exactly two qubits. Why do they commute?',a:['Each shared qubit gives a minus sign, and the two signs cancel.','X and Z always commute.','Two-qubit overlap means the checks are identical.'],c:0,why:'XZ = −ZX at each shared site, so the whole commutation sign is (−1)² = +1.'},
  {q:'Z₁₁ and Z₁₂Z₁₃ have the same syndrome. With correction Z₁₁, what differs?',a:['The second error is also guaranteed to recover.','Their residuals are I and logical Z, respectively.','The second error gives a different syndrome after all.'],c:1,why:'Their product is the full top-row logical string. Both corrections clear the checks, but only the first preserves every logical input.'},
  {q:'For a general Pauli check S, what does ancilla bit 1 select?',a:['Every individual data-qubit value.','The entire logical state in the computational basis.','The −1 eigenspace, via (I − S)/2.'],c:2,why:'H–controlled-S–H converts the joint check eigenvalue into a bit. It preserves the unknown superposition within the selected eigenspace.'},
  {q:'One check reports 0, 1, 1, 1 including a known start and ideal terminal closure. Where are the events?',a:['At all three rounds reporting 1.','Only at the first change from 0 to 1.','There must be two time-like events.'],c:1,why:'Adjacent XOR gives 1, 0, 0. A persistent syndrome is not a new fault at each round.'},
  {q:'A matching uses a time-like edge for a wrong check report. What does that edge add to the data correction?',a:['No data Pauli.','A Z on every qubit in the check.','A logical X.'],c:0,why:'A report-fault edge explains two detection events. In the phenomenological model it does not alter the data.'},
  {q:'A correction explains all events and minimizes the assumed cost. Has it necessarily recovered this shot?',a:['Yes: matching guarantees logical success on every shot.','No: the actual error and correction can leave a logical string.','Yes, provided the final syndrome is zero.'],c:1,why:'Consistency, optimality under a noise model, and success on the hidden trajectory are separate tests.'},
  {q:'What does an edge in the spatial syndrome graph represent?',a:['A gate between two ancillas.','A measured check value.','A possible data-qubit fault, joining the checks it flips.'],c:2,why:'Z faults connect X-check vertices; X faults connect Z-check vertices. If a fault flips only one measured check, its other endpoint is a compatible virtual boundary.'}
 ];
 let answers={};
 function renderQuiz(){
  $('quiz').innerHTML=questions.map((q,i)=>`<article class="quiz-card"><span class="eyebrow">CHECK ${String(i+1).padStart(2,'0')}</span><h3>${q.q}</h3><div class="quiz-options">${q.a.map((a,j)=>`<button data-question="${i}" data-answer="${j}" data-focus-key="quiz-${i}-${j}" class="${answers[i]===j?(j===q.c?'correct':'incorrect'):''}" aria-pressed="${answers[i]===j}">${a}</button>`).join('')}</div>${i in answers?`<p class="quiz-feedback"><strong>${answers[i]===q.c?'Correct.':'Try again.'}</strong> ${q.why}</p>`:''}</article>`).join('');
  $('quiz-score').textContent=`${questions.filter((q,i)=>answers[i]===q.c).length} / ${questions.length} correct. You can revise any answer.`;
  bind('[data-question]',el=>{answers[+el.dataset.question]=+el.dataset.answer;mark('practice');renderQuiz();});
 }
 renderQuiz();

 // 03A introduces the graph's edge meaning on the same nine-qubit patch.
 let introSite=4,introType='Z';
 function renderIntro(){
  select('[data-intro-type]','introType',introType);
  const bit=1<<introSite,x=introType==='X'?bit:0,z=introType==='Z'?bit:0,type=introType==='Z'?'X':'Z',checks=Q[type],bits=Q.syndrome(type==='X'?z:x,checks),ends=bits.map((b,i)=>b?i:-1).filter(i=>i>=0);
  $('intro-patch').innerHTML=patch({pauli:{x,z},clickSites:'intro'}).replace(/aria-label="q(\d+): [IXYZ]\. Set [IXYZ] error next\."/g,(_,site)=>`aria-label="Place the ${introType} error on q${site}"`);
  const q=Q.sites[introSite],boundary=introType==='Z'?(introSite%3===0?'Left rough':'Right rough'):(introSite<3?'Top smooth':'Bottom smooth');
  const nodes=ends.map(i=>({name:checkName(type,i),boundary:false}));
  if(nodes.length===1)nodes.push({name:boundary,boundary:true});
  let g=txt(240,30,`${introType}${sub(q)} flips these ${type} checks`,'text-anchor="middle" class="meter-label"')+`<path d="M90 110H390" stroke="#7765ba" stroke-width="5"/>`+txt(240,85,'q'+sub(q),'text-anchor="middle" class="meter-label"');
  nodes.forEach((node,i)=>{const cx=90+300*i;g+=node.boundary?`<rect x="${cx-23}" y="87" width="46" height="46" rx="4" fill="#eef0f5" stroke="#626c7d" stroke-width="2"/>`:`<circle cx="${cx}" cy="110" r="27" fill="#ad4938"/>`;
   g+=txt(cx,117,node.boundary?'B':'1',`text-anchor="middle" class="meter-label" style="fill:${node.boundary?'#282b5a':'white'}"`)+txt(cx,166,node.name,'text-anchor="middle" class="meter-label"')+txt(cx,196,node.boundary?'no measured bit':'measured check bit','text-anchor="middle" class="small-svg"');});
  $('intro-edge').innerHTML=g;
  $('intro-readout').innerHTML=`<div>sˣ = (${Q.syndrome(z,Q.X).join(', ')})</div><div>sᶻ = (${Q.syndrome(x,Q.Z).join(', ')})</div>`;
  $('intro-explanation').innerHTML=`<strong>One data-qubit fault → one graph edge.</strong><p>The edge labelled q${sub(q)} joins ${ends.map(i=>checkName(type,i)).join(' and ')}${ends.length===1?' to the permitted '+boundary.toLowerCase()+' boundary':''}. ${ends.length===1?'The square is a virtual endpoint; it is not a measured check.':'Each endpoint is a check that reports bit 1.'}</p><p>The decoder will infer error edges from these check bits. Experiment 03B combines several edges; 04 uses the measured syndrome to choose a correction.</p>`;
  bind('#intro-patch [data-site]',el=>{introSite=+el.dataset.site;mark('chains');renderIntro();});
 }
 bind('[data-intro-type]',el=>{introType=el.dataset.introType;mark('chains');renderIntro();});renderIntro();

 // Any subset of five data faults can be edited. All three recovery stages stay visible.
 let stripActual=17;
 const stripOp=m=>[0,1,2,3,4].filter(i=>m&(1<<i)).map(i=>'Z'+sub(i+1)).join('')||'I';
 const stripSyndrome=m=>[0,1,2,3].map(i=>((m>>i)^(m>>(i+1)))&1);
 function renderStrip(){
  select('[data-strip-error]','stripError',stripActual);
  const candidates=[stripActual,stripActual^31].sort((a,b)=>Q.pop(a)-Q.pop(b)),correction=candidates[0],residual=stripActual^correction,syndrome=stripSyndrome(stripActual);
  $('strip-syndrome').innerHTML=`syndrome = (${syndrome.join(', ')})`;
  let g='';const colors=['#ad4938','#087b77','#7765ba'];
  [stripActual,correction,residual].forEach((mask,row)=>{const y=85+135*row;
   if(row)g+=`<path d="M20 ${y-66}H735" stroke="#e1e3ec" stroke-width="1"/>`;
   g+=txt(38,y+7,['E','C','CE'][row],`font-size="24" text-anchor="middle" fill="${colors[row]}"`);
   for(let j=0;j<5;j++){const x=100+115*j,hit=mask&(1<<j);g+=`<path d="M${x} ${y}h115" stroke="${hit?colors[row]:'#bfc2d4'}" stroke-width="${hit?7:3}"/>`;
    const marker=faultQubit(x+57.5,y,hit?'Z':'I',String(j+1),row===0?'error':row===1?'correction-symbol':'residual-symbol');
    g+=row===0?svgButton(`class="fault-target" data-strip-fault="${j}" data-focus-key="strip-fault-${j}" data-error="${hit?'Z':'I'}" aria-pressed="${Boolean(hit)}"`,`<path class="fault-hit" d="M${x+20} ${y}H${x+95}"/>`+marker,`Qubit ${j+1}: ${hit?'Z':'I'}. Toggle Z error.`):marker;
   }
   const bits=stripSyndrome(mask);
   for(let j=0;j<6;j++){const x=100+115*j,boundary=j===0||j===5,event=!boundary&&bits[j-1];g+=boundary?`<rect x="${x-9}" y="${y-9}" width="18" height="18" fill="#626c7d"/>`:`<circle cx="${x}" cy="${y}" r="14" fill="${event?'#ad4938':'#626c7d'}" stroke="#626c7d" stroke-width="2"/>`;
    if(!boundary)g+=txt(x,y+6,bits[j-1],'class="detector-bit" text-anchor="middle"');
    g+=txt(x,y+48,boundary?(j===0?'Bᴸ':'Bᴿ'):'c'+sub(j),'text-anchor="middle" font-size="18" fill="#626c7d"');
   }
  });$('strip-graph').innerHTML=g;
  $('strip-candidates').innerHTML=candidates.map((c,i)=>`<tr><td>${stripOp(c)}</td><td>${Q.pop(c)}</td><td>${i===0?'Chosen: fewer fault edges':'Same syndrome, more edges'}</td></tr>`).join('');
  result('strip-explanation',`<strong>E = ${stripOp(stripActual)}; decoder chooses C = ${stripOp(correction)}.</strong><div class="formula">CE = ${residual?'Z₁Z₂Z₃Z₄Z₅ = Z̄':'I'}</div>${residual?'All checks clear, but a logical Z remains. The more likely explanation was not the actual error.':'All checks clear and the original logical state is restored.'}`,residual?'warning':'good');
  bind('[data-strip-fault]',el=>{stripActual^=1<<+el.dataset.stripFault;mark('logical');renderStrip();});
 }
 bind('[data-strip-error]',el=>{stripActual=+el.dataset.stripError;mark('logical');renderStrip();});
 renderStrip();

 // 03C: a single Pauli state drives both embeddings of the 25-qubit patch.
 const large=Q.rotatedPatch(5),largePoint=(x,y)=>[130+100*x,130+100*y];
 let largeX=1<<12,largeZ=1<<12,largeSelected=null,largeLastSite=12;
 const largeVertices=new Map(large.vertices.map(v=>[v.id,v]));
 const largeName=s=>checkName(s.type,s.index);
 const largeOp=()=>large.sites.map((site,i)=>{const p=pauliAt(largeX,largeZ,i);return p==='I'?'':p+sub(site);}).filter(Boolean).join(' ')||'I';
 const largePolygon=points=>points.map(p=>largePoint(...p).join(',')).join(' ');
 function largeFace(s){
  const [ax,ay]=largePoint(s.qubits[0]%5,Math.floor(s.qubits[0]/5)),[bx,by]=largePoint(s.qubits.at(-1)%5,Math.floor(s.qubits.at(-1)/5));
  if(s.side==='top'||s.side==='bottom')return `M${ax} ${ay}Q${(ax+bx)/2} ${ay+(s.side==='top'?-100:100)} ${bx} ${by}Z`;
  if(s.side==='left'||s.side==='right')return `M${ax} ${ay}Q${ax+(s.side==='left'?-100:100)} ${(ay+by)/2} ${bx} ${by}Z`;
  return `M${ax} ${ay}H${bx}V${by}H${ax}Z`;
 }
 function largeCheck(s,view,bits){
  const flagged=bits[s.type][s.index],selected=largeSelected===s.id;
  let [x,y]=largePoint(s.cx,s.cy),shape;
  const cls=`play-check ${s.type.toLowerCase()} ${flagged?'flagged':''} ${selected?'selected-check':''}`;
  if(view==='node'){
   if(s.side==='top')y=100;if(s.side==='bottom')y=560;
   if(s.side==='left')x=100;if(s.side==='right')x=560;
   shape=`<path d="${largeFace(s)}" class="${cls}"/>`;
  }else if(s.type==='X')shape=`<circle cx="${x}" cy="${y}" r="23" class="${cls} vertex-check"/>`;
  else{
   shape=`<polygon points="${largePolygon(large.faces[s.index].polygon)}" class="${cls}"/>`;
   if(s.side==='left')x+=100/3;if(s.side==='right')x-=100/3;
  }
  if(s.side==='left'||s.side==='right')y+=15;
  const badgeX=x+(s.side==='left'?-23:23);
  const badge=flagged?`<circle cx="${badgeX}" cy="${y-20}" r="10" class="play-flag-badge"/>${txt(badgeX,y-16,'1','class="play-flag-bit" text-anchor="middle"')}`:'';
  return svgButton(`class="play-check-target" data-playground-check="${s.id}" data-syndrome="${flagged}" data-focus-key="playground-${view}-check-${s.id}" aria-pressed="${selected}"`,shape+txt(x,y+6,largeName(s),'class="play-check-label" text-anchor="middle"')+badge,`${s.type} check ${s.index+1}: syndrome bit ${flagged}, eigenvalue ${flagged?'minus':'plus'} one. Inspect its qubits.`);
 }
 function largeQubit(i,view){
  const [x,y]=largePoint(i%5,Math.floor(i/5)),letter=pauliAt(largeX,largeZ,i),selected=large.checks.find(s=>s.id===largeSelected);
  const support=selected?.qubits.includes(i),linked=largeLastSite===i;
  let line='';
  if(view==='edge'){
   const [a,b]=large.edges[i].ends.map(id=>largeVertices.get(id)),[ax,ay]=largePoint(a.x,a.y),[bx,by]=largePoint(b.x,b.y);
   line=`<path class="play-edge ${letter!=='I'?'has-error':''} ${support?'support-edge':''}" d="M${ax} ${ay}L${bx} ${by}"/><path class="play-edge-hit" d="M${ax} ${ay}L${bx} ${by}"/>`;
  }
  const body=line+`<circle cx="${x}" cy="${y}" r="32" class="play-qubit-hit"/>`+(linked?`<circle cx="${x}" cy="${y}" r="26" class="play-linked"/>`:'')+`<circle cx="${x}" cy="${y}" r="20" class="data-qubit play-qubit ${letter!=='I'?'error':''} ${support?'support-qubit':''}"/>`+txt(x,y+7,letter,'class="play-pauli" text-anchor="middle"')+txt(x,y+39,'q'+sub(large.sites[i]),'class="play-site-label" text-anchor="middle"');
  return svgButton(`class="play-qubit-target" data-playground-site="${i}" data-error="${letter}" data-focus-key="playground-${view}-qubit-${i}" aria-pressed="${letter!=='I'}"`,body,`q${large.sites[i]}: ${letter}. Set ${pauliNext[letter]} next. Both drawings update.`);
 }
 function largeDrawing(view,bits){
  let out='';
  if(view==='node'){
   out+=`<path class="boundary rough" d="M55 100V560 M605 100V560"/><path class="boundary smooth" d="M110 55H550 M110 605H550"/>`;
   out+=large.checks.map(s=>largeCheck(s,view,bits)).join('');
  }else{
   out+=large.checks.filter(s=>s.type==='Z').map(s=>largeCheck(s,view,bits)).join('');
   // Close boundary faces with unphysical segments, explicitly shown dashed.
   large.faces.filter(f=>large.checks.find(s=>s.id===f.id).side).forEach(f=>{
    const ends=f.polygon.filter(([x])=>x===-.5||x===4.5).map(p=>largePoint(...p));
    out+=`<path class="play-virtual-boundary" d="M${ends[0].join(' ')}L${ends[1].join(' ')}"/>`;
   });
  }
  out+=large.sites.map((_,i)=>largeQubit(i,view)).join('');
  if(view==='edge'){
   out+=large.checks.filter(s=>s.type==='X').map(s=>largeCheck(s,view,bits)).join('');
   out+=large.vertices.filter(v=>v.boundary).map(v=>{const [x,y]=largePoint(v.x,v.y);return `<rect x="${x-6}" y="${y-6}" width="12" height="12" class="play-boundary-end"><title>Unmeasured rough-boundary endpoint</title></rect>`;}).join('');
  }
  return out+txt(330,34,'SMOOTH','class="play-boundary-label" text-anchor="middle"')+txt(330,639,'SMOOTH','class="play-boundary-label" text-anchor="middle"')+txt(26,330,'ROUGH','class="play-boundary-label" text-anchor="middle" transform="rotate(-90 26 330)"')+txt(634,330,'ROUGH','class="play-boundary-label" text-anchor="middle" transform="rotate(90 634 330)"');
 }
 function renderPlayground(){
  const bits=large.syndrome(largeX,largeZ),total=[...bits.X,...bits.Z].reduce((a,b)=>a+b,0),weight=Q.pop(largeX|largeZ);
  for(const view of ['node','edge'])$('playground-'+view).innerHTML=largeDrawing(view,bits);
  const flags=type=>bits[type].map((bit,i)=>bit?checkName(type,i):'').filter(Boolean).join(', ')||'none';
  const logicalX=Q.parity(largeX&large.LZ),logicalZ=Q.parity(largeZ&large.LX),logical=logicalX?(logicalZ?'Y':'X'):(logicalZ?'Z':'I');
  const verdict=total?`${total} ${total===1?'check flags':'checks flag'}`:!weight?'All checks pass':logical!=='I'?`Zero syndrome · logical ${logical} action`:'Zero syndrome · no logical change';
  $('playground-status').innerHTML=`<div class="play-error-summary"><strong>Current error: <span class="play-error-operator">${largeOp()}</span></strong><span>${weight} affected ${weight===1?'qubit':'qubits'} · ${verdict}</span></div><div class="play-flag-summary"><span><strong>X checks flagged:</strong> ${flags('X')}</span><span><strong>Z checks flagged:</strong> ${flags('Z')}</span></div>`;
  const selected=large.checks.find(s=>s.id===largeSelected);
  $('playground-inspector').innerHTML=selected?`<div class="formula">${largeName(selected)} = ${selected.qubits.map(i=>selected.type+sub(large.sites[i])).join('')}</div><span>Measured eigenvalue ${bits[selected.type][selected.index]?'−1':'+1'} → syndrome bit <strong>${bits[selected.type][selected.index]}</strong>. Its ${selected.qubits.length} qubits are highlighted in both views.</span>`:largeLastSite>=0?`<strong>q${sub(large.sites[largeLastSite])} = ${pauliAt(largeX,largeZ,largeLastSite)}</strong> is outlined in both views. Select a check to inspect its qubits.`:'Select any check in either drawing to inspect its qubits.';
  bind('[data-playground-site]',el=>{const i=+el.dataset.playgroundSite,next=cyclePauli(largeX,largeZ,i);largeX=next.x;largeZ=next.z;largeLastSite=i;mark('chains');renderPlayground();});
  bind('[data-playground-check]',el=>{largeSelected=el.dataset.playgroundCheck;largeLastSite=-1;mark('chains');renderPlayground();});
 }
 bind('[data-playground-preset]',el=>{largeX=0;largeZ=0;largeSelected=null;largeLastSite=12;switch(el.dataset.playgroundPreset){case 'center':largeX=largeZ=1<<12;break;case 'pair':largeZ=(1<<12)|(1<<13);largeLastSite=13;break;case 'logical':largeZ=large.LZ;largeLastSite=0;break;}mark('chains');renderPlayground();});
 $('playground-clear').onclick=()=>{largeX=largeZ=0;largeSelected=null;largeLastSite=-1;renderPlayground();};
 renderPlayground();

})();
