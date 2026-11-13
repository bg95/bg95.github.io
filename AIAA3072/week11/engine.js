/* Exact pure-state model. Qubit 1 is the most significant bit. No dependencies. */
(function (root) {
  'use strict';
  const checks = ['ZZIIIIIII','IZZIIIIII','IIIZZIIII','IIIIZZIII','IIIIIIZZI','IIIIIIIZZ','XXXXXXIII','IIIXXXXXX'];
  const ket = n => new Float64Array(2 * 2 ** n);
  const clone = s => new Float64Array(s);
  const bit = (n, q) => 1 << (n - q);
  function input(n, p = .5, phi = 0) {
    const s = ket(n), i = bit(n, 1);
    s[0] = Math.sqrt(1-p);
    s[2*i] = Math.sqrt(p)*Math.cos(phi);
    s[2*i+1] = Math.sqrt(p)*Math.sin(phi);
    return s;
  }
  function gate(s, n, q, type) {
    const out=clone(s), m=bit(n,q), h=Math.SQRT1_2;
    for(let i=0;i<2**n;i++) if(!(i&m)) {
      const j=i|m, a=s[2*i], b=s[2*i+1], c=s[2*j], d=s[2*j+1];
      if(type==='H'){out[2*i]=(a+c)*h;out[2*i+1]=(b+d)*h;out[2*j]=(a-c)*h;out[2*j+1]=(b-d)*h;}
      if(type==='X'){out[2*i]=c;out[2*i+1]=d;out[2*j]=a;out[2*j+1]=b;}
      if(type==='Y'){out[2*i]=d;out[2*i+1]=-c;out[2*j]=-b;out[2*j+1]=a;}
      if(type==='Z'){out[2*j]=-c;out[2*j+1]=-d;}
    }
    return out;
  }
  function cnot(s,n,c,t){const out=ket(n),cm=bit(n,c),tm=bit(n,t);for(let i=0;i<2**n;i++){const j=i&cm?i^tm:i;out[2*j]=s[2*i];out[2*j+1]=s[2*i+1];}return out;}
  function pauli(s,n,str){let out=clone(s);Array.from(str).forEach((p,i)=>{if(p!=='I')out=gate(out,n,i+1,p);});return out;}
  function operations(s,n,ops){return ops.reduce((t,[p,q])=>gate(t,n,q,p),clone(s));}
  function overlap(a,b){let re=0,im=0;for(let i=0;i<a.length;i+=2){re+=a[i]*b[i]+a[i+1]*b[i+1];im+=a[i]*b[i+1]-a[i+1]*b[i];}return [re,im];}
  function fidelity(a,b){const [r,i]=overlap(a,b);return Math.min(1,Math.max(0,r*r+i*i));}
  function norm(s){return s.reduce((a,b)=>a+b*b,0);}
  function repetition(p=.5,phi=0){let s=input(3,p,phi);const stages=[s];s=cnot(s,3,1,2);stages.push(s);s=cnot(s,3,1,3);stages.push(s);return stages;}
  function shor(p=.5,phi=0){let s=input(9,p,phi);const stages=[s];s=cnot(cnot(s,9,1,4),9,1,7);stages.push(s);[1,4,7].forEach(q=>s=gate(s,9,q,'H'));stages.push(s);[1,4,7].forEach(q=>{s=cnot(s,9,q,q+1);s=cnot(s,9,q,q+2);});stages.push(s);return stages;}
  function anticommutes(a,b){let n=0;for(let i=0;i<a.length;i++)if(a[i]!=='I'&&b[i]!=='I'&&a[i]!==b[i])n++;return n%2;}
  function syndrome(error, generators=checks){return generators.map(g=>anticommutes(g,error));}
  function locate(a,b){return {'00':0,'10':1,'11':2,'01':3}[`${a}${b}`];}
  function recover(syn){const ops=[];for(let b=0;b<3;b++){const q=locate(syn[2*b],syn[2*b+1]);if(q)ops.push(['X',3*b+q]);}const block=locate(syn[6],syn[7]);if(block)ops.push(['Z',3*block-2]);return ops;}
  function logicalEffect(error,ops){
    const z=shor(0)[3],o=shor(1)[3];
    const zOut=operations(pauli(z,9,error),9,ops),oOut=operations(pauli(o,9,error),9,ops);
    const a=overlap(z,zOut),b=overlap(o,zOut),c=overlap(z,oOut),d=overlap(o,oOut);
    const abs=v=>v[0]*v[0]+v[1]*v[1],equal=(v,w)=>Math.hypot(v[0]-w[0],v[1]-w[1])<1e-8;
    if(abs(a)>.999999&&abs(d)>.999999)return equal(a,d)?'I':'Z';
    if(abs(b)>.999999&&abs(c)>.999999)return equal(b,c)?'X':'Y';
    return '?';
  }
  function analyze(error,p=.5,phi=0){const encoded=shor(p,phi)[3],damaged=pauli(encoded,9,error),syn=syndrome(error),ops=recover(syn),fixed=operations(damaged,9,ops);return {encoded,damaged,syn,ops,fixed,fidelity:fidelity(encoded,fixed),effect:logicalEffect(error,ops)};}
  function rotateX(s,n,q,theta){const x=gate(s,n,q,'X'),out=ket(n),c=Math.cos(theta/2),v=Math.sin(theta/2);for(let i=0;i<s.length;i+=2){out[i]=c*s[i]+v*x[i+1];out[i+1]=c*s[i+1]-v*x[i];}return out;}
  function rotateAxis(s,n,q,theta,axis){
    const length=Math.hypot(...axis);if(length<1e-12)throw new Error('The rotation axis must be nonzero.');
    const out=ket(n),c=Math.cos(theta/2),v=Math.sin(theta/2),acted=ket(n);
    ['X','Y','Z'].forEach((p,j)=>{const t=gate(s,n,q,p);for(let i=0;i<t.length;i++)acted[i]+=axis[j]/length*t[i];});
    for(let i=0;i<s.length;i+=2){out[i]=c*s[i]+v*acted[i+1];out[i+1]=c*s[i+1]-v*acted[i];}return out;
  }
  function repetitionCycle(p,phi,error){
    // Data are wires 1–3; ancillas are wires 4 and 5. Measurements occur only
    // after complete parity extraction, where this fixed Pauli has definite records.
    let state=input(5,p,phi);const stages=[state],syn=syndrome(error,['ZZI','IZZ']);
    state=cnot(state,5,1,2);stages.push(state);state=cnot(state,5,1,3);stages.push(state);
    state=pauli(state,5,error+'II');stages.push(state);
    for(const [c,t] of [[1,4],[2,4],[2,5],[3,5]]){state=cnot(state,5,c,t);stages.push(state);}
    state=project(state,5,'IIIZI',syn[0]).state;stages.push(state);
    state=project(state,5,'IIIIZ',syn[1]).state;stages.push(state);
    const correction=locate(...syn);if(correction)state=gate(state,5,correction,'X');stages.push(state);
    return {stages,syn,correction};
  }
  function shorLayers(p,phi){
    let state=input(9,p,phi);const stages=[state];
    state=cnot(state,9,1,4);stages.push(state);state=cnot(state,9,1,7);stages.push(state);
    for(const q of [1,4,7])state=gate(state,9,q,'H');stages.push(state);
    for(const q of [1,4,7])state=cnot(state,9,q,q+1);stages.push(state);
    for(const q of [1,4,7])state=cnot(state,9,q,q+2);stages.push(state);return stages;
  }
  function project(s,n,generator,outcome){const acted=pauli(s,n,generator),out=ket(n);for(let i=0;i<s.length;i++)out[i]=(s[i]+(outcome?-1:1)*acted[i])/2;const prob=norm(out);if(prob>1e-14)for(let i=0;i<out.length;i++)out[i]/=Math.sqrt(prob);return {state:out,probability:prob};}
  function measureSyndrome(s,random=Math.random){let state=clone(s),syn=[];for(const g of checks){const plus=project(state,9,g,0);const v=random()<Math.min(1,plus.probability)?0:1;syn.push(v);state=v?project(state,9,g,1).state:plus.state;}return {state,syn};}
  const api={checks,input,clone,gate,cnot,pauli,operations,overlap,fidelity,norm,repetition,shor,anticommutes,syndrome,locate,recover,logicalEffect,analyze,rotateX,rotateAxis,repetitionCycle,shorLayers,project,measureSyndrome};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.QEC=api;
})(typeof globalThis!=='undefined'?globalThis:this);
