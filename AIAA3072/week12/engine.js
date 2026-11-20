/* The exact nine-site patch and ten-fault teaching graph. No dependencies. */
(function(root){
  'use strict';
  const sites=['11','12','13','21','22','23','31','32','33'];
  const mask=indices=>indices.reduce((m,i)=>m|(1<<i),0);
  const X=[[1,2,4,5],[3,4,6,7],[0,1],[7,8]].map(mask);
  const Z=[[0,1,3,4],[4,5,7,8],[2,5],[3,6]].map(mask);
  const LX=mask([0,3,6]),LZ=mask([0,1,2]);
  const pop=m=>{let n=0;for(;m;m&=m-1)n++;return n;};
  const parity=m=>pop(m)%2;
  const syndrome=(m,checks=X)=>checks.map(g=>parity(m&g));
  const support=m=>sites.filter((_,i)=>m&(1<<i));
  function span(rows){let s=[0];for(const r of rows)s=s.concat(s.map(x=>x^r));return [...new Set(s)];}
  function classify(x,z){
    if(syndrome(z,X).some(Boolean)||syndrome(x,Z).some(Boolean))return 'outside';
    const a=parity(x&LZ),b=parity(z&LX);return a?(b?'Y':'X'):(b?'Z':'I');
  }
  // Exact minimum-Pauli-weight decoding of this small code. The lookup depends
  // only on the eight measured bits, never on the actual error used for scoring.
  const packBits=bits=>bits.reduce((m,b,i)=>m|((b&1)<<i),0);
  let pauliTable=null;
  function buildPauliTable(){
    const counts=Array.from({length:512},(_,m)=>pop(m));
    const zSigns=Array.from({length:512},(_,z)=>packBits(syndrome(z,X)));
    const xSigns=Array.from({length:512},(_,x)=>packBits(syndrome(x,Z))<<4);
    pauliTable=Array.from({length:256},()=>({weight:Infinity,candidates:[]}));
    for(let x=0;x<512;x++)for(let z=0;z<512;z++){
      const row=pauliTable[xSigns[x]|zSigns[z]],weight=counts[x|z];
      if(weight<row.weight){row.weight=weight;row.candidates=[];}
      if(weight===row.weight)row.candidates.push({x,z});
    }
  }
  function decodeSyndrome(sx,sz){
    if(sx.length!==4||sz.length!==4||[...sx,...sz].some(b=>b!==0&&b!==1))throw new Error('Expected four X-check bits and four Z-check bits.');
    if(!pauliTable)buildPauliTable();
    const key=packBits(sx)|(packBits(sz)<<4),row=pauliTable[key],chosen=row.candidates[0];
    const classes=[...new Set(row.candidates.map(c=>classify(c.x^chosen.x,c.z^chosen.z)))];
    return {key,x:chosen.x,z:chosen.z,weight:row.weight,ties:row.candidates.length,logicalClasses:classes,candidates:row.candidates.map(c=>({...c}))};
  }
  const nodes=['a₁','b₁','a₂','b₂','a₃','b₃','L₁','R₁','L₂','R₂'];
  const edges=[
    {u:6,v:0,type:'data',q:0,t:1},{u:0,v:1,type:'data',q:1,t:1},{u:1,v:7,type:'data',q:2,t:1},
    {u:8,v:2,type:'data',q:0,t:2},{u:2,v:3,type:'data',q:1,t:2},{u:3,v:9,type:'data',q:2,t:2},
    {u:0,v:2,type:'report',check:0,t:1},{u:1,v:3,type:'report',check:1,t:1},
    {u:2,v:4,type:'report',check:0,t:2},{u:3,v:5,type:'report',check:1,t:2}
  ];
  function boundary(faults){let m=0;edges.forEach((e,i)=>{if(faults&(1<<i)){if(e.u<6)m^=1<<e.u;if(e.v<6)m^=1<<e.v;}});return m;}
  function frame(faults){let m=0;edges.forEach((e,i)=>{if(e.type==='data'&&(faults&(1<<i)))m^=1<<e.q;});return m;}
  function history(faults){
    const reports=[[0,0]],truth=[[0,0]];let data=0;
    for(let t=1;t<=2;t++){
      data^=(faults>>((t-1)*3))&7;
      const bits=[parity(data&3),parity(data&6)];truth.push(bits);
      reports.push(bits.map((b,j)=>b^((faults>>(6+(t-1)*2+j))&1)));
    }
    truth.push([...truth[2]]);reports.push([...truth[2]]);
    const deltas=[null,...[1,2,3].map(t=>reports[t].map((b,j)=>b^reports[t-1][j]))];
    const events=deltas.slice(1).reduce((m,bs,t)=>m|(bs[0]<<(2*t))|(bs[1]<<(2*t+1)),0);
    return {reports,truth,deltas,events,frame:data};
  }
  const weight=p=>Math.log((1-p)/p);
  function edgeWeights(pd,pm){return edges.map(e=>weight(e.type==='data'?pd:pm));}
  function shortest(start,weights){
    const dist=Array(10).fill(Infinity),path=Array(10).fill(0),done=Array(10).fill(false);dist[start]=0;
    for(let k=0;k<10;k++){
      let u=-1;for(let i=0;i<10;i++)if(!done[i]&&(u<0||dist[i]<dist[u]))u=i;
      if(u<0||!Number.isFinite(dist[u]))break;done[u]=true;
      // Boundaries absorb an endpoint; they are never free transit nodes.
      if(u>=6)continue;
      edges.forEach((e,i)=>{const v=e.u===u?e.v:e.v===u?e.u:-1;if(v<0||done[v])return;
        const d=dist[u]+weights[i];if(d<dist[v]-1e-10){dist[v]=d;path[v]=path[u]^(1<<i);}
      });
    }
    return {dist,path};
  }
  function matching(events,pd,pm){
    const weights=edgeWeights(pd,pm),short=Array.from({length:6},(_,i)=>shortest(i,weights)),memo=new Map();
    function solve(todo){
      if(!todo)return {cost:0,connections:[],edgeMask:0};if(memo.has(todo))return memo.get(todo);
      let i=0;while(!(todo&(1<<i)))i++;const rest=todo^(1<<i);let best={cost:Infinity};
      const consider=(j,next)=>{const tail=solve(next),cost=short[i].dist[j]+tail.cost;
        if(cost<best.cost-1e-10)best={cost,connections:[{from:i,to:j,cost:short[i].dist[j],path:short[i].path[j]},...tail.connections],edgeMask:short[i].path[j]^tail.edgeMask};
      };
      for(let b=6;b<10;b++)consider(b,rest);
      for(let j=i+1;j<6;j++)if(rest&(1<<j))consider(j,rest^(1<<j));
      memo.set(todo,best);return best;
    }
    const result=solve(events);return {...result,weights,correction:frame(result.edgeMask)};
  }
  function enumerate(events,pd,pm){
    const weights=edgeWeights(pd,pm),out=[];
    for(let f=0;f<1024;f++)if(boundary(f)===events){
      let cost=0;for(let i=0;i<10;i++)if(f&(1<<i))cost+=weights[i];out.push({faults:f,cost,correction:frame(f)});
    }
    return out.sort((a,b)=>a.cost-b.cost||a.faults-b.faults);
  }
  function hook(type,order,after){return {x:type==='X'?mask(order.slice(after)):0,z:type==='Z'?mask(order.slice(after)):0};}
  const api={sites,mask,X,Z,LX,LZ,pop,parity,syndrome,support,span,classify,decodeSyndrome,nodes,edges,boundary,frame,history,weight,matching,enumerate,hook};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.Surface=api;
})(typeof globalThis!=='undefined'?globalThis:this);
