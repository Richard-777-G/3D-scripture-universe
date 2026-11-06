// @ts-nocheck
/* Scripture Universe v16 app code, moved here unchanged except for where its data comes from.
   Data now arrives in start(DATA) from the versioned packs (see src/data/loader.ts). */
import * as THREE from "three";
export function start(DATA){
const D=DATA.core;
const B=D.books,TH=D.th,A=D.aud;
const $=id=>document.getElementById(id);
const fmt=n=>n.toLocaleString("en-US"),q=s=>String(s).replace(/'/g,"\u2019");
/* ---------- data (same verified model as the 2D map) ---------- */
const chs=[],chBase=[];let vc=0;
B.forEach((b,bi)=>{chBase.push(chs.length);b.ch.forEach((n,k)=>{chs.push({b:bi,c:k+1,v0:vc,n});vc+=n})});
const chOf=new Uint16Array(vc);chs.forEach((c,g)=>{for(let i=0;i<c.n;i++)chOf[c.v0+i]=g});

const STORY=DATA.story;
const VT=new Map();D.vn.forEach((v,i)=>VT.set(v,D.vt[i]));const J=D.J;Object.keys(J.jv).forEach(k=>VT.set(+k,J.jv[k]));
const vr=v=>{const c=chs[chOf[v]];return[B[c.b].n,c.c,v-c.v0+1]};
const refOf=v=>{const[b,c,x]=vr(v);return`${b} ${c}:${x}`};
const refRange=(a,b)=>{if(a===b)return refOf(a);const A1=vr(a),B1=vr(b);if(A1[0]!==B1[0])return refOf(a)+" \u2013 "+refOf(b);return A1[1]===B1[1]?`${A1[0]} ${A1[1]}:${A1[2]}\u2013${B1[2]}`:`${A1[0]} ${A1[1]}:${A1[2]}\u2013${B1[1]}:${B1[2]}`};
/* Links shown in the app. Since v17 each row carries an evidence level, not reader votes:
   vo = 30 sourced prophecy link, 20 quotation, 10 shared wording (pipeline/connections.mjs);
   fe is the end of the fv range and mw the distinctive words both passages share. */
const MG=(()=>{const idx=new Map(),o={fv:[],fe:[],ts:[],te:[],d:[],vo:[],vx:[],mw:[]};
 for(let i=0;i<D.fv.length;i++){const d=D.d[i],fe=D.fe?D.fe[i]:D.fv[i],a=d?D.ts[i]:D.fv[i],b=d?D.te[i]:fe,c=d?D.fv[i]:D.ts[i],e=d?fe:D.te[i],k=a+"|"+b+"|"+c+"|"+e,j=idx.get(k);
  if(j===undefined){idx.set(k,o.fv.length);o.fv.push(D.fv[i]);o.fe.push(fe);o.ts.push(D.ts[i]);o.te.push(D.te[i]);o.d.push(d);o.vo.push(D.vo[i]);o.vx.push(-9999);o.mw.push(D.mw?D.mw[i]:"")}
  else{const v=D.vo[i];if(v>o.vo[j]){o.vx[j]=o.vo[j];o.vo[j]=v}else o.vx[j]=v}}
 return o})();
const L=MG.fv.length,oS=new Int32Array(L),oE=new Int32Array(L),nS=new Int32Array(L),nE=new Int32Array(L),ob=new Uint8Array(L),nb=new Uint8Array(L),vo=MG.vo,vx=MG.vx;
for(let i=0;i<L;i++){const d=MG.d[i];oS[i]=d?MG.ts[i]:MG.fv[i];oE[i]=d?MG.te[i]:MG.fe[i];nS[i]=d?MG.fv[i]:MG.ts[i];nE[i]=d?MG.fe[i]:MG.te[i];ob[i]=chs[chOf[oS[i]]].b;nb[i]=chs[chOf[nS[i]]].b}
const ROW=new Map();for(let i=0;i<L;i++)ROW.set(oS[i]+"|"+oE[i]+"|"+nS[i]+"|"+nE[i],i);
const tierName=v=>v>=30?"Sourced prophecy link":v>=20?"Same wording":"Shared words";
function side(s,e,mx,hs){let h="";const n=e-s+1,cap=Math.min(n,mx||5);for(let v=s;v<s+cap;v++)h+=`<span>${n>1?`<sup>${vr(v)[2]}</sup>`:""}${hlT(q(VT.get(v)||""),hs)} </span>`;if(n>cap)h+=`<small>+ ${n-cap} more verses in this range</small>`;return h}
/* ---------- state ---------- */
let uiMode="none",sheetState="peek",jState=null,jLines=null,jcps=null,jCur=[],jNtChap=null,lastQ="",lastHits=[],selChap=null,chLines=null,chPts=null,chMeta=[],chCur=[],ccps=null,cBase=null,chCapped=false,pMode=0,tRad=null,intro=null,featured=null,pulseT=-1,ti=1,selBook=null,selPair=null,labelsOn=true,spin=!matchMedia("(prefers-reduced-motion: reduce)").matches,shown=6;
const T=()=>TH[ti];
let M=new Float32Array(39*27);
function counts(){M=new Float32Array(39*27);const t=T();for(let i=0;i<L;i++)if(vo[i]>=t)M[ob[i]*27+(nb[i]-39)]++}
const cntBook=b=>{let n=0;if(b<39){for(let j=0;j<27;j++)n+=M[b*27+j]}else{for(let o=0;o<39;o++)n+=M[o*27+b-39]}return n};
/* ---------- scene ---------- */
let SW=window.innerWidth,SH=window.innerHeight;const stage=$("stage"),canvas=$("gl"),R=10,H=10,TARGET=new THREE.Vector3(0,H/2,0),tTgt=new THREE.Vector3(0,H/2,0);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0x05070d,1);
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(45,1,0.1,300);
const PAL=[0xff8a1f,0x25b7ff,0xb48cff,0x3fd69a],NTC=0xf2d47a,secOf=i=>i<5?0:i<17?1:i<22?2:3;
const books=B.map((b,i)=>{const ot=i<39,k=ot?i:i-39,n=ot?39:27,a=k/n*Math.PI*2+(ot?0:Math.PI/27),h=1.3,y=ot?0:H;
 const pos=new THREE.Vector3(R*Math.cos(a),y,R*Math.sin(a));return{i,name:b.n,ot,a,h,depth:0.12+0.045*Math.sqrt(b.ch.length),pos,col:new THREE.Color(ot?PAL[secOf(i)]:NTC),chs:b.ch.length}});
const group=new THREE.Group();scene.add(group);
/* ---------- original cover art: one symbolic emblem per book, drawn in code ---------- */
const CR="#f6e7b4";
const ln=(c,a,b,d,e)=>{c.beginPath();c.moveTo(a,b);c.lineTo(d,e);c.stroke()},ci=(c,x,y,r,f)=>{c.beginPath();c.arc(x,y,r,0,6.2832);f?c.fill():c.stroke()},pl=(c,p,close,f)=>{c.beginPath();p.forEach((q,k)=>k?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));if(close)c.closePath();f?c.fill():c.stroke()},
 elp=(c,x,y,rx,ry,rot,f)=>{c.beginPath();c.ellipse(x,y,rx,ry,rot||0,0,6.2832);f?c.fill():c.stroke()};
const IC={
 sun:c=>{ci(c,0,6,22);for(let k=0;k<12;k++){const a=k/12*6.283;ln(c,Math.cos(a)*34,6+Math.sin(a)*34,Math.cos(a)*54,6+Math.sin(a)*54)}},
 waves:c=>{for(const s of[-1,1])for(const o of[0,16]){c.beginPath();for(let y=-52;y<=52;y+=4){const x=s*(30+o+7*Math.sin(y/8));y===-52?c.moveTo(x,y):c.lineTo(x,y)}c.stroke()}ln(c,-20,50,20,50)},
 flame:c=>{c.beginPath();c.moveTo(0,-56);c.bezierCurveTo(30,-26,34,6,14,26);c.bezierCurveTo(8,34,-8,34,-14,26);c.bezierCurveTo(-34,6,-28,-20,0,-56);c.stroke();c.beginPath();c.moveTo(0,-16);c.bezierCurveTo(14,0,14,14,0,22);c.bezierCurveTo(-14,14,-14,0,0,-16);c.stroke();c.strokeRect(-34,34,68,16)},
 tents:c=>{pl(c,[[-46,34],[0,-30],[46,34]],1);pl(c,[[-12,34],[0,8],[12,34]],1);ln(c,-56,34,56,34);for(let k=0;k<8;k++){const a=k/8*6.283;ln(c,Math.cos(a)*5,-46+Math.sin(a)*5,Math.cos(a)*12,-46+Math.sin(a)*12)}},
 tablets:c=>{for(const x of[-26,26]){c.beginPath();c.moveTo(x-20,44);c.lineTo(x-20,-12);c.arc(x,-12,20,Math.PI,0);c.lineTo(x+20,44);c.closePath();c.stroke();for(let y=-14;y<=26;y+=12)ln(c,x-10,y,x+10,y)}},
 wall:c=>{pl(c,[[-50,44],[-50,-14],[-38,-14],[-38,-26],[-24,-26],[-24,-14],[-8,-14],[-8,-26],[8,-26],[8,-14],[24,-14],[24,-26],[38,-26],[38,-14],[50,-14],[50,44]]);ln(c,-56,44,56,44);c.beginPath();c.moveTo(-12,44);c.lineTo(-12,16);c.arc(0,16,12,Math.PI,0);c.lineTo(12,44);c.stroke()},
 scales:c=>{ln(c,0,-50,0,40);ln(c,-46,-34,46,-34);ln(c,-20,44,20,44);for(const s of[-1,1]){ln(c,s*46,-34,s*30,0);ln(c,s*46,-34,s*62,0);c.beginPath();c.arc(s*46,0,16,0,Math.PI);c.stroke()}},
 wheat:c=>{ln(c,0,52,0,-14);for(let k=0;k<5;k++){elp(c,-11,-44+k*16,5,11,-.6);elp(c,11,-44+k*16,5,11,.6)}elp(c,0,-54,5,11)},
 harp:c=>{c.beginPath();c.moveTo(-34,46);c.bezierCurveTo(-44,-40,6,-60,36,-30);c.lineTo(36,46);c.closePath();c.stroke();for(let x=-20;x<=24;x+=11)ln(c,x,-38+(x+22)*.45,x,46)},
 crown:c=>{pl(c,[[-44,30],[-48,-24],[-22,0],[0,-40],[22,0],[48,-24],[44,30]],1);ln(c,-46,42,46,42);for(const q of[[-48,-24],[0,-40],[48,-24]])ci(c,q[0],q[1]-6,5,1)},
 temple:c=>{pl(c,[[-54,-14],[0,-52],[54,-14]],1);ln(c,-54,-14,54,-14);for(let x=-36;x<=36;x+=24)c.strokeRect(x-6,-8,12,44);ln(c,-58,40,58,40);ln(c,-62,50,62,50)},
 wheel:c=>{ci(c,0,0,52);ci(c,0,0,36);ci(c,0,0,10);for(let k=0;k<8;k++){const a=k/8*6.283;ln(c,Math.cos(a)*10,Math.sin(a)*10,Math.cos(a)*36,Math.sin(a)*36);ci(c,Math.cos(a+.39)*44,Math.sin(a+.39)*44,3,1)}},
 scroll:c=>{c.strokeRect(-34,-40,68,80);ci(c,0,-40,0);elp(c,0,-44,38,8);elp(c,0,44,38,8);for(let y=-26;y<=26;y+=13)ln(c,-22,y,22,y)},
 lamp:c=>{c.beginPath();c.arc(0,6,34,0,Math.PI);c.closePath();c.stroke();ln(c,34,6,54,-6);c.beginPath();c.moveTo(54,-12);c.bezierCurveTo(66,-26,60,-40,54,-52);c.bezierCurveTo(46,-40,42,-26,54,-12);c.stroke();c.beginPath();c.arc(-34,16,14,Math.PI*1.5,Math.PI*.5,true);c.stroke();ln(c,-20,50,20,50)},
 storm:c=>{c.beginPath();c.arc(-22,-14,20,Math.PI*.5,Math.PI*1.5);c.arc(0,-34,22,Math.PI,0);c.arc(26,-16,20,Math.PI*1.5,Math.PI*.5);c.closePath();c.stroke();pl(c,[[6,0],[-12,22],[2,22],[-8,48],[18,16],[4,16],[14,0]],1)},
 hourglass:c=>{ln(c,-34,-48,34,-48);ln(c,-34,48,34,48);pl(c,[[-26,-48],[26,-48],[0,0],[26,48],[-26,48],[0,0]],1);for(let k=0;k<3;k++)ci(c,0,30+k*4-k*4,2,1)},
 heart:c=>{c.beginPath();c.moveTo(0,40);c.bezierCurveTo(-60,0,-50,-46,-24,-44);c.bezierCurveTo(-10,-43,0,-32,0,-24);c.bezierCurveTo(0,-32,10,-43,24,-44);c.bezierCurveTo(50,-46,60,0,0,40);c.stroke()},
 jar:c=>{c.beginPath();c.moveTo(-16,-46);c.lineTo(16,-46);c.lineTo(14,-34);c.bezierCurveTo(50,-20,50,26,22,46);c.lineTo(-22,46);c.bezierCurveTo(-50,26,-50,-20,-14,-34);c.closePath();c.stroke();pl(c,[[10,-10],[2,0],[12,10],[4,22]])},
 drop:c=>{c.beginPath();c.moveTo(0,-52);c.bezierCurveTo(8,-30,36,-10,36,16);c.arc(0,16,36,0,Math.PI);c.bezierCurveTo(-36,-10,-8,-30,0,-52);c.stroke()},
 lion:c=>{ci(c,0,4,26);for(let k=0;k<18;k++){const a=k/18*6.283;ln(c,Math.cos(a)*34,4+Math.sin(a)*34,Math.cos(a)*54,4+Math.sin(a)*54)}ci(c,-9,-2,3,1);ci(c,9,-2,3,1);pl(c,[[-6,10],[6,10],[0,18]],1);ln(c,0,18,0,24);c.beginPath();c.arc(-6,24,6,0,Math.PI);c.arc(6,24,6,0,Math.PI);c.stroke()},
 ring:c=>{ci(c,0,16,30);ci(c,0,16,22);pl(c,[[0,-34],[14,-20],[0,-8],[-14,-20]],1);for(let k=0;k<5;k++){const a=-1.57+(k-2)*.5;ln(c,Math.cos(a)*24,-20+Math.sin(a)*24,Math.cos(a)*34,-20+Math.sin(a)*34)}},
 wind:c=>{for(const[y,l]of[[-26,50],[0,60],[26,44]]){c.beginPath();c.moveTo(-l,y);c.bezierCurveTo(-l/3,y-10,l/3,y+10,l-14,y);c.arc(l-14,y-8,8,Math.PI*.5,-Math.PI*.9,true);c.stroke()}},
 plumb:c=>{ln(c,-30,-48,30,-48);ln(c,0,-48,0,8);pl(c,[[-14,8],[14,8],[0,48]],1);ci(c,0,-48,4,1)},
 mountain:c=>{pl(c,[[-58,42],[-20,-18],[0,6],[24,-34],[58,42]],1);pl(c,[[18,-22],[24,-34],[30,-22]]);ci(c,-34,-40,8)},
 fish:c=>{c.beginPath();c.moveTo(-46,0);c.bezierCurveTo(-22,-36,20,-36,36,0);c.bezierCurveTo(20,36,-22,36,-46,0);c.stroke();pl(c,[[36,0],[58,-20],[58,20]],1);ci(c,-26,-4,3,1);ln(c,-8,-14,-8,14)},
 star:c=>{const p=[];for(let k=0;k<16;k++){const r=k%2?18:54,a=-1.5708+k/16*6.283;p.push([Math.cos(a)*r,Math.sin(a)*r])}pl(c,p,1)},
 tower:c=>{pl(c,[[-20,50],[-20,-30],[-26,-30],[-26,-44],[-12,-44],[-12,-36],[-4,-36],[-4,-44],[4,-44],[4,-36],[12,-36],[12,-44],[26,-44],[26,-30],[20,-30],[20,50]]);ln(c,-30,50,30,50);c.strokeRect(-6,-14,12,22);ln(c,0,-44,0,-58);pl(c,[[0,-58],[16,-52],[0,-46]],1)},
 cloud:c=>{c.beginPath();c.arc(-24,10,22,Math.PI*.5,Math.PI*1.5);c.arc(0,-12,26,Math.PI,0);c.arc(28,10,22,Math.PI*1.5,Math.PI*.5);c.closePath();c.stroke();for(const x of[-24,0,24])ln(c,x,38,x-6,52)},
 menorah:c=>{ln(c,0,12,0,-40);ln(c,0,12,0,46);ln(c,-26,46,26,46);for(const k of[1,2,3])for(const s of[-1,1]){c.beginPath();c.moveTo(s*k*16,-30);c.quadraticCurveTo(s*k*16,12,0,12);c.stroke();ln(c,s*k*16,-30,s*k*16,-38)}for(let k=-3;k<=3;k++)elp(c,k*16,-46,3,6,0,1)},
 sunrise:c=>{ln(c,-56,20,56,20);c.beginPath();c.arc(0,20,26,Math.PI,0);c.stroke();for(let k=0;k<7;k++){const a=Math.PI+k/6*Math.PI;ln(c,Math.cos(a)*34,20+Math.sin(a)*34,Math.cos(a)*54,20+Math.sin(a)*54)}ln(c,-40,34,40,34);ln(c,-26,46,26,46)},
 cup:c=>{c.beginPath();c.moveTo(-36,-36);c.lineTo(36,-36);c.bezierCurveTo(36,0,14,10,0,12);c.bezierCurveTo(-14,10,-36,0,-36,-36);c.stroke();ln(c,0,12,0,38);elp(c,0,42,24,6)},
 wings:c=>{for(const s of[-1,1]){c.beginPath();c.moveTo(s*6,10);c.bezierCurveTo(s*30,-44,s*56,-40,s*62,-8);for(let k=0;k<4;k++)c.lineTo(s*(56-k*14),6+k*5),c.lineTo(s*(50-k*14),-2+k*5);c.lineTo(s*6,22);c.stroke()}ci(c,0,-8,8);pl(c,[[0,-2],[0,8]])},
 chain:c=>{elp(c,-16,0,30,15,.5);elp(c,16,0,30,15,-.5);ln(c,-46,24,-30,10)},
 shield:c=>{c.beginPath();c.moveTo(-38,-42);c.lineTo(38,-42);c.lineTo(38,0);c.quadraticCurveTo(38,34,0,54);c.quadraticCurveTo(-38,34,-38,0);c.closePath();c.stroke();ln(c,0,-30,0,40);ln(c,-22,-10,22,-10)},
 staff:c=>{c.beginPath();c.moveTo(0,52);c.lineTo(0,-30);c.arc(-18,-30,18,0,-Math.PI*1.2,true);c.stroke()},
 anchor:c=>{ci(c,0,-44,8);ln(c,0,-36,0,42);ln(c,-18,-22,18,-22);c.beginPath();c.arc(0,16,34,0,Math.PI);c.stroke();pl(c,[[-40,10],[-34,22],[-26,14]],0);pl(c,[[40,10],[34,22],[26,14]],0)},
 letter:c=>{c.strokeRect(-48,-30,96,62);pl(c,[[-48,-30],[0,6],[48,-30]]);ci(c,0,8,9);ci(c,0,8,3,1)},
 sword:c=>{pl(c,[[-7,-52],[7,-52],[7,22],[-7,22]],1);ln(c,-26,22,26,22);ln(c,0,22,0,44);ci(c,0,50,5,1);ln(c,0,-52,0,-58)}
};
const ICON=["sun","waves","flame","tents","tablets","wall","scales","wheat","harp","crown","temple","wheel","scroll","lamp","temple","wall","star","storm","harp","lamp","hourglass","heart","scroll","jar","drop","wheel","lion","ring","wind","plumb","mountain","fish","star","flame","tower","cloud","temple","menorah","sunrise",
 "star","lion","cup","wings","flame","scroll","heart","jar","chain","shield","crown","sunrise","sunrise","hourglass","staff","scroll","staff","letter","temple","wheat","anchor","star","heart","lamp","lamp","sword","menorah"];
const hexc=n=>"#"+n.toString(16).padStart(6,"0");
function drawCover(b){const W=256,Hh=384,cv=document.createElement("canvas");cv.width=W;cv.height=Hh;const x=cv.getContext("2d"),col=b.ot?PAL[secOf(b.i)]:NTC,cc=new THREE.Color(col);
 let g=x.createLinearGradient(0,0,0,Hh);g.addColorStop(0,`rgb(${cc.r*105|0},${cc.g*105|0},${cc.b*115|0})`);g.addColorStop(.55,`rgb(${cc.r*34|0},${cc.g*34|0},${cc.b*40|0})`);g.addColorStop(1,"#05070d");x.fillStyle=g;x.fillRect(0,0,W,Hh);
 g=x.createRadialGradient(W/2,168,8,W/2,168,128);g.addColorStop(0,hexc(col)+"99");g.addColorStop(1,hexc(col)+"00");x.fillStyle=g;x.fillRect(0,0,W,Hh);
 x.strokeStyle="#d8b45a";x.lineWidth=4;x.strokeRect(8,8,W-16,Hh-16);x.lineWidth=1.5;x.strokeRect(15,15,W-30,Hh-30);
 x.fillStyle=CR;x.textAlign="center";x.font="600 12px system-ui,sans-serif";x.fillText(b.ot?"OLD TESTAMENT":"NEW TESTAMENT",W/2,40);
 x.save();x.translate(W/2,168);x.scale(1.12,1.12);x.strokeStyle=CR;x.fillStyle=CR;x.lineWidth=4.5;x.lineCap="round";x.lineJoin="round";
 x.globalAlpha=.35;ci(x,0,0,74);x.globalAlpha=1;IC[ICON[b.i]](x);x.restore();
 let fs=30;x.font=`700 ${fs}px Georgia,serif`;const fit=t=>{let s=30;x.font=`700 ${s}px Georgia,serif`;while(x.measureText(t).width>206&&s>13){s--;x.font=`700 ${s}px Georgia,serif`}return s};
 x.shadowColor="#000";x.shadowBlur=6;x.fillStyle="#fff7dc";const nm=b.name;
 if(x.measureText(nm).width>206&&nm.includes(" ")&&nm.length>12){const w=nm.split(" "),m=Math.ceil(w.length/2),a=w.slice(0,m).join(" "),c2=w.slice(m).join(" "),s=Math.min(fit(a),fit(c2));x.font=`700 ${s}px Georgia,serif`;x.fillText(a,W/2,296);x.fillText(c2,W/2,296+s+4)}
 else{const s=fit(nm);x.font=`700 ${s}px Georgia,serif`;x.fillText(nm,W/2,312)}
 x.shadowBlur=0;x.fillStyle=CR;x.globalAlpha=.8;x.font="12px system-ui,sans-serif";x.fillText(`${b.chs} chapter${b.chs===1?"":"s"}`,W/2,Hh-26);x.globalAlpha=1;return cv}

function drawSpine(b){const cv=document.createElement("canvas");cv.width=64;cv.height=384;const x=cv.getContext("2d"),cc=new THREE.Color(b.ot?PAL[secOf(b.i)]:NTC);
 const g=x.createLinearGradient(0,0,0,384);g.addColorStop(0,`rgb(${cc.r*105|0},${cc.g*105|0},${cc.b*115|0})`);g.addColorStop(1,`rgb(${cc.r*30|0},${cc.g*30|0},${cc.b*36|0})`);x.fillStyle=g;x.fillRect(0,0,64,384);
 x.strokeStyle="#d8b45a";x.lineWidth=3;x.strokeRect(3,3,58,378);x.save();x.translate(32,192);x.rotate(-Math.PI/2);x.fillStyle="#fff7dc";x.textAlign="center";x.shadowColor="#000";x.shadowBlur=4;let s=26;x.font=`700 ${s}px Georgia,serif`;while(x.measureText(b.name).width>320&&s>12){s--;x.font=`700 ${s}px Georgia,serif`}x.fillText(b.name,0,s*.35);x.restore();return cv}
const covers=books.map(drawCover),spines=books.map(drawSpine),maxAn=Math.min(4,renderer.capabilities.getMaxAnisotropy());
const mkTex=c=>{const t=new THREE.CanvasTexture(c);t.anisotropy=maxAn;return t};
const thumbs=[],thumb=i=>thumbs[i]||(thumbs[i]=(()=>{const c=document.createElement("canvas");c.width=92;c.height=138;c.getContext("2d").drawImage(covers[i],0,0,92,138);return c.toDataURL("image/jpeg",.8)})());
const meshes=books.map(b=>{const g=new THREE.BoxGeometry(0.9,b.h,b.depth);g.translate(0,b.h/2,0);
 const ct=mkTex(covers[b.i]),st=mkTex(spines[b.i]),pg=()=>new THREE.MeshBasicMaterial({color:0xd9cfb5}),
  mats=[new THREE.MeshBasicMaterial({map:st}),new THREE.MeshBasicMaterial({map:st}),pg(),pg(),new THREE.MeshBasicMaterial({map:ct}),new THREE.MeshBasicMaterial({map:ct})];
 const m=new THREE.Mesh(g,mats);m.userData.baseCols=mats.map(x=>x.color.clone());m.position.copy(b.pos);m.rotation.y=-b.a+Math.PI/2;
 const e=new THREE.LineSegments(new THREE.EdgesGeometry(g),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.55}));m.add(e);m.userData.edge=e;group.add(m);return m});
/* a point on the inner cover of book bi: u across (-0.5..0.5), v up (0..1); threads and chapter marks sit on the book itself */
function faceP(bi,u,v){const b=books[bi],s=meshes[bi]?meshes[bi].scale.x:1,c=Math.cos(b.a),sn=Math.sin(b.a),d=b.depth/2*s+0.02;return new THREE.Vector3(b.pos.x-c*d+sn*u*0.9*s,b.pos.y+v*b.h*s,b.pos.z-sn*d-c*u*0.9*s)}
function ringLine(y,col){const pts=[];for(let k=0;k<=160;k++){const a=k/160*Math.PI*2;pts.push(new THREE.Vector3(R*Math.cos(a)*1.03,y,R*Math.sin(a)*1.03))}
 const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:col,transparent:true,opacity:.85,blending:THREE.AdditiveBlending}));group.add(l);
 const d=new THREE.Mesh(new THREE.RingGeometry(R*0.2,R*1.03,64),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.05,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));d.rotation.x=-Math.PI/2;d.position.y=y-0.01;group.add(d)}
ringLine(-0.02,0x25b7ff);ringLine(H-0.02,0xff8a1f);
{const n=1400,p=new Float32Array(n*3);let s=7;const r=()=>(s=(s*16807)%2147483647)/2147483647;for(let i=0;i<n;i++){const u=r()*2-1,t=r()*Math.PI*2,rad=45+r()*40,w=Math.sqrt(1-u*u);p[i*3]=rad*w*Math.cos(t);p[i*3+1]=H/2+rad*u;p[i*3+2]=rad*w*Math.sin(t)}
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(p,3));scene.add(new THREE.Points(g,new THREE.PointsMaterial({color:0x8899bb,size:0.18,transparent:true,opacity:.6,depthWrite:false})))}
/* ---------- book notes: groupings follow the standard Protestant canon; attribution is TRADITION, not proof ---------- */
const GRP=["Law","History","Poetry & wisdom","Major Prophets","Minor Prophets","Gospel","Acts","Pauline letter","General letter","Apocalypse"];
const INFO=[[0,"Moses","Creation, the flood, and the stories of Abraham, Isaac, Jacob and Joseph."],[0,"Moses","Israel\u2019s escape from Egypt, the covenant at Sinai, and the building of the tabernacle."],[0,"Moses","Laws for worship, sacrifice, purity and holy living."],[0,"Moses","A census of Israel and forty years of wilderness wandering."],[0,"Moses","Moses\u2019 final speeches restating the law before Israel enters the land."],
[1,"unnamed in the text; Jewish tradition says Joshua","The conquest and division of Canaan."],[1,"unnamed; Jewish tradition says Samuel","Israel\u2019s cycles of failure and rescue under leaders like Deborah and Samson."],[1,"unnamed; Jewish tradition says Samuel","A Moabite widow\u2019s loyalty and her place in David\u2019s family line."],[1,"unnamed","Samuel, the first king Saul, and David\u2019s rise."],[1,"unnamed","David\u2019s reign over Israel."],[1,"unnamed; tradition says Jeremiah","Solomon, the temple, and the division of the kingdom."],[1,"unnamed; tradition says Jeremiah","The decline of both kingdoms, ending in exile."],[1,"unnamed; tradition says Ezra","Genealogies and David\u2019s reign retold."],[1,"unnamed; tradition says Ezra","Solomon and the kings of Judah up to the exile."],[1,"Ezra, by tradition","The return from exile and the rebuilding of the temple."],[1,"Nehemiah, by tradition","Rebuilding Jerusalem\u2019s wall and renewing the covenant."],[1,"unnamed","A Jewish queen in Persia saves her people."],
[2,"unnamed","A righteous man\u2019s suffering and his dialogue with his friends and with God."],[2,"David and others; many scholars doubt a single author","One hundred fifty songs and prayers."],[2,"Solomon and others","Short sayings on wisdom and daily life."],[2,"\u201cthe Preacher\u201d; tradition says Solomon","A reflection on meaning, work and mortality."],[2,"Solomon, by the title","Love poetry."],
[3,"Isaiah; many scholars see later authors in chapters 40\u201366","Judgment and hope, including the Servant songs."],[3,"Jeremiah, with the scribe Baruch","Warnings before Jerusalem\u2019s fall and a promised new covenant."],[3,"tradition says Jeremiah","Poems mourning Jerusalem\u2019s destruction."],[3,"Ezekiel","Visions and messages to the exiles in Babylon."],[3,"Daniel, as the book presents itself; many scholars date it to the 2nd century BC","Stories of Daniel in Babylon and visions of coming kingdoms."],
[4,"Hosea","Israel\u2019s unfaithfulness, shown through the prophet\u2019s marriage."],[4,"Joel","A locust plague and the \u201cday of the LORD\u201d."],[4,"Amos","A herdsman\u2019s call for justice."],[4,"Obadiah","Judgment on Edom; the shortest Old Testament book."],[4,"unnamed; centres on the prophet Jonah","A reluctant prophet is sent to Nineveh."],[4,"Micah","Justice, judgment and hope, including a ruler from Bethlehem (5:2)."],[4,"Nahum","The fall of Nineveh."],[4,"Habakkuk","A prophet questions God about injustice."],[4,"Zephaniah","The day of the LORD and a purified remnant."],[4,"Haggai","A call to rebuild the temple."],[4,"Zechariah","Visions and promises after the exile."],[4,"Malachi","The last Old Testament prophet, calling Israel back to faithfulness."],
[5,"Matthew, by tradition; the text itself is anonymous","Jesus\u2019 birth, his teaching including the Sermon on the Mount, his death and resurrection."],[5,"Mark, by tradition","The shortest Gospel: Jesus\u2019 ministry, death and resurrection."],[5,"Luke, by tradition","Jesus\u2019 life with attention to the poor and outcast; volume one of Luke\u2013Acts."],[5,"John, by tradition","Jesus\u2019 signs and teaching, including the \u201cI am\u201d sayings."],[6,"Luke, by tradition","The early church from Jerusalem to Rome."],
[7,"Paul","Paul\u2019s argument about sin, faith and righteousness."],[7,"Paul","Advice to a divided church in Corinth."],[7,"Paul","Paul defends his ministry and writes about suffering and giving."],[7,"Paul","Faith versus works of the law."],[7,"Paul; some scholars dispute","Unity in Christ and in the church."],[7,"Paul","A joyful letter written from prison."],[7,"Paul; some scholars dispute","The supremacy of Christ over all things."],[7,"Paul","Encouragement about Christ\u2019s return."],[7,"Paul; some scholars dispute","Clarifies teaching about the end times."],[7,"Paul; many scholars dispute","Instructions on church leadership."],[7,"Paul; many scholars dispute","Paul\u2019s final charge to his coworker."],[7,"Paul; many scholars dispute","Guidance for the churches on Crete."],[7,"Paul","A personal plea concerning the runaway slave Onesimus."],
[8,"unnamed; no author is given in the text","Christ\u2019s superiority to angels, Moses and the old priesthood."],[8,"James, by tradition","Practical teaching on faith shown through action."],[8,"Peter, by tradition","Encouragement for Christians who are suffering."],[8,"Peter; widely disputed by scholars","Warnings against false teachers."],[8,"John, by tradition; the text is anonymous","Love, truth and assurance."],[8,"\u201cthe Elder\u201d; tradition identifies John","A short letter on truth and love."],[8,"\u201cthe Elder\u201d; tradition identifies John","A personal letter about hospitality."],[8,"Jude, by tradition","A warning against false teachers."],[9,"John, as the text names him","Visions of the end and the new creation."]];

/* ---------- threads ---------- */
let lines=null,curves=[],base=null,SEG=24,drawn=0,cps=null,cmaxG=1;
const rng=(()=>{let s=12345;return()=>(s=(s*16807)%2147483647)/2147483647})();
function buildThreads(){
 if(lines){group.remove(lines);lines.geometry.dispose();lines.material.dispose();lines=null}
 counts();curves=[];let cmax=1;for(let k=0;k<M.length;k++)if(M[k]>cmax)cmax=M[k];cmaxG=cmax;
 for(let o=0;o<39;o++)for(let n=0;n<27;n++){const c=M[o*27+n];if(!c)continue;const copies=c>=cmax*.5?4:c>=cmax*.15?3:c>=cmax*.04?2:1,I=0.1+0.9*Math.sqrt(c/cmax);for(let k=0;k<copies;k++)curves.push({o,n:n+39,I:I/Math.sqrt(copies)*0.95,j:k,c})}
 cps=new Float32Array(curves.length*12);const V=curves.length*SEG*2,pos=new Float32Array(V*3);base=new Float32Array(V*3);const p0=new THREE.Vector3(),p1=new THREE.Vector3(),p2=new THREE.Vector3(),p3=new THREE.Vector3(),pt=new THREE.Vector3(),pl=new THREE.Vector3();
 curves.forEach((cv,ci)=>{const a=books[cv.o],b=books[cv.n],jit=cv.j?0.9:0;
  p0.copy(faceP(cv.o,0,0.55));p3.copy(faceP(cv.n,0,0.45));
  const tw=0.45,k1=0.22+rng()*0.1*jit,k2=0.22+rng()*0.1*jit,a1=a.a+tw,a2=b.a-tw,ry=0.42+(rng()-.5)*0.1*jit;
  p1.set(R*k1*Math.cos(a1),a.h+H*ry,R*k1*Math.sin(a1));p2.set(R*k2*Math.cos(a2),H-H*ry,R*k2*Math.sin(a2));cps.set([p0.x,p0.y,p0.z,p1.x,p1.y,p1.z,p2.x,p2.y,p2.z,p3.x,p3.y,p3.z],ci*12);
  const c0=a.col,c1=books[cv.n].col;let prev=null;
  for(let s=0;s<SEG;s++){for(let e=0;e<2;e++){const t=(s+e)/SEG,u=1-t,w0=u*u*u,w1=3*u*u*t,w2=3*u*t*t,w3=t*t*t;
    pt.set(w0*p0.x+w1*p1.x+w2*p2.x+w3*p3.x,w0*p0.y+w1*p1.y+w2*p2.y+w3*p3.y,w0*p0.z+w1*p1.z+w2*p2.z+w3*p3.z);
    const vi=(ci*SEG*2+s*2+e)*3;pos[vi]=pt.x;pos[vi+1]=pt.y;pos[vi+2]=pt.z;
    const m=0.35+0.65*t;base[vi]=(c0.r*(1-t)+c1.r*t)*cv.I*m;base[vi+1]=(c0.g*(1-t)+c1.g*t)*cv.I*m;base[vi+2]=(c0.b*(1-t)+c1.b*t)*cv.I*m}}});
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(pos,3));g.setAttribute("color",new THREE.BufferAttribute(new Float32Array(base),3));
 lines=new THREE.LineSegments(g,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));lines.frustumCulled=false;group.add(lines);drawn=curves.length;applyLook()}
function applyLook(){
 if(lines){const arr=lines.geometry.attributes.color.array,per=SEG*6;curves.forEach((cv,ci)=>{let f=1;
  if(jState)f=0.03;else if(selPair)f=(cv.o===selPair.o&&cv.n===selPair.n)?0.35:0.025;else if(selBook!==null)f=(cv.o===selBook||cv.n===selBook)?0.3:0.03;
  const st=ci*per;for(let j=0;j<per;j++)arr[st+j]=base[st+j]*f});lines.geometry.attributes.color.needsUpdate=true}
 const conn=new Set();CONN=conn;if(selBook!==null){conn.add(selBook);const b=selBook;if(b<39){for(let j=0;j<27;j++)if(M[b*27+j])conn.add(j+39)}else{for(let o=0;o<39;o++)if(M[o*27+b-39])conn.add(o)}}
 meshes.forEach((m,i)=>{const on=selBook===null||conn.has(i)||(selPair&&(i===selPair.o||i===selPair.n)),sel=i===selBook||(selPair&&(i===selPair.o||i===selPair.n));
  let f=on?1:0.16;if(selPair)f=sel?1:0.16;m.material.forEach((mt,k)=>mt.color.copy(m.userData.baseCols[k]).multiplyScalar(f*(sel?1.25:1)));m.userData.edge.material.opacity=on?(sel?1:.55):.12;m.scale.setScalar(sel?1.18:1)});buildChapters();buildJourneyLayer();applyChapterLook();pickEligible()}
/* ---------- living effects: flowing light, halo, pulse ---------- */
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;let QUALITY=window.__QUALITY||"auto",pOn=true;
const NP=520,pPos=new Float32Array(NP*3),pCol=new Float32Array(NP*3),pT=new Float32Array(NP),pC=new Int32Array(NP),pS=new Float32Array(NP);let pCount=0,elig=[];
const pGeo=new THREE.BufferGeometry();pGeo.setAttribute("position",new THREE.BufferAttribute(pPos,3));pGeo.setAttribute("color",new THREE.BufferAttribute(pCol,3));pGeo.setDrawRange(0,0);
const GT=(()=>{const c=document.createElement("canvas");c.width=c.height=64;const x=c.getContext("2d"),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,"rgba(255,255,255,1)");g.addColorStop(.35,"rgba(255,255,255,.45)");g.addColorStop(1,"rgba(255,255,255,0)");x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)})();
const pPts=new THREE.Points(pGeo,new THREE.PointsMaterial({size:0.6,map:GT,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));pPts.frustumCulled=false;group.add(pPts);
const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:GT,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0}));halo.scale.set(4,4,1);group.add(halo);
const pulse=new THREE.Mesh(new THREE.RingGeometry(0.92,1,64),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));pulse.rotation.x=-Math.PI/2;group.add(pulse);
function pickEligible(){elig=[];pMode=0;
 if(jLines&&jCur.length){pMode=2;jCur.forEach((_,ci)=>elig.push(ci))}
 else if(selBook!==null&&chCur.length){pMode=1;chCur.forEach((cv,ci)=>{if(selChap===null||cv.a===selChap||cv.b===selChap)elig.push(ci)})}
 else curves.forEach((cv,ci)=>{if(selPair){if(cv.o===selPair.o&&cv.n===selPair.n)elig.push(ci)}else if(selBook!==null){if(cv.o===selBook||cv.n===selBook)elig.push(ci)}else if(cv.j===0&&cv.c>=cmaxG*0.12)elig.push(ci)});
 pCount=elig.length?(selBook===null&&!selPair&&!jState?Math.min(NP,150):NP):0;pGeo.setDrawRange(0,pOn?pCount:0);for(let k=0;k<NP;k++){pC[k]=elig.length?elig[(Math.random()*elig.length)|0]:0;pT[k]=Math.random();pS[k]=0.16+Math.random()*0.2}stepParticles(0,false)}
function stepParticles(dt,anim){const S=pMode===2?jcps:pMode===1?ccps:cps;if(!elig.length||!S)return;for(let k=0;k<pCount;k++){if(anim){pT[k]+=pS[k]*dt;if(pT[k]>1){pT[k]=0;pC[k]=elig[(Math.random()*elig.length)|0]}}
  const ci=pC[k],q=ci*12,t=pT[k],u=1-t,w0=u*u*u,w1=3*u*u*t,w2=3*u*t*t,w3=t*t*t;
  pPos[k*3]=w0*S[q]+w1*S[q+3]+w2*S[q+6]+w3*S[q+9];pPos[k*3+1]=w0*S[q+1]+w1*S[q+4]+w2*S[q+7]+w3*S[q+10];pPos[k*3+2]=w0*S[q+2]+w1*S[q+5]+w2*S[q+8]+w3*S[q+11];
  const cv=pMode===2?jCur[ci]:pMode===1?chCur[ci]:curves[ci],a=pMode?cv.ca:books[cv.o].col,b=pMode?cv.cb:books[cv.n].col,f=1.15*Math.sin(Math.PI*t)+.12;pCol[k*3]=(a.r*(1-t)+b.r*t)*f;pCol[k*3+1]=(a.g*(1-t)+b.g*t)*f;pCol[k*3+2]=(a.b*(1-t)+b.b*t)*f}
 pGeo.attributes.position.needsUpdate=true;pGeo.attributes.color.needsUpdate=true}
/* ---------- chapter layer: the chapters of the selected book(s) as glowing nodes, with chapter-level threads ---------- */
const uScale={value:1},chMat=new THREE.ShaderMaterial({uniforms:{uScale,map:{value:GT}},vertexShader:"attribute float size;attribute vec3 aCol;varying vec3 vC;uniform float uScale;void main(){vC=aCol;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=size*uScale/(-mv.z);gl_Position=projectionMatrix*mv;}",fragmentShader:"uniform sampler2D map;varying vec3 vC;void main(){float a=texture2D(map,gl_PointCoord).a;gl_FragColor=vec4(vC,a);}",transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
let labOT=null,labNT=null;const chLab=document.createElement("div");chLab.className="lab pin ot";chLab.style.cssText="font-size:12px;display:none";$("labels").appendChild(chLab);
const chapName=g=>`${B[chs[g].b].n} ${chs[g].c}`,SEGC=20,CHCAP=2600;
function chapPos(bi,k,N){const cols=Math.max(1,Math.round(Math.sqrt(N*0.62))),rows=Math.ceil(N/cols),col=k%cols,row=Math.floor(k/cols);return faceP(bi,cols>1?((col+0.5)/cols-0.5)*0.8:0,rows>1?0.9-((row+0.5)/rows)*0.8:0.5)}
function buildChapters(){
 if(chLines){group.remove(chLines);chLines.geometry.dispose();chLines.material.dispose();chLines=null}
 if(chPts){group.remove(chPts);chPts.geometry.dispose();chPts=null}
 chMeta=[];chCur=[];ccps=null;cBase=null;chCapped=false;if(selBook===null)return;
 const t=T(),bi=selBook,pair=!!selPair,bks=pair?[selPair.o,selPair.n]:[bi],nodeN=new Map(),cm=new Map();
 for(let i=0;i<L;i++){if(vo[i]<t)continue;const o_=ob[i],n_=nb[i];if(pair){if(o_!==selPair.o||n_!==selPair.n)continue}else if(o_!==bi&&n_!==bi)continue;
  const oc=chOf[oS[i]],nc=chOf[nS[i]];
  if(pair){nodeN.set(oc,(nodeN.get(oc)||0)+1);nodeN.set(nc,(nodeN.get(nc)||0)+1);const k=oc*2048+nc;cm.set(k,(cm.get(k)||0)+1)}
  else if(bi<39){nodeN.set(oc,(nodeN.get(oc)||0)+1);const k=oc*128+n_;cm.set(k,(cm.get(k)||0)+1)}
  else{nodeN.set(nc,(nodeN.get(nc)||0)+1);const k=nc*128+o_;cm.set(k,(cm.get(k)||0)+1)}}
 let maxN=1;nodeN.forEach(v=>{if(v>maxN)maxN=v});const posOf=new Map();
 bks.forEach(b=>{const N=B[b].ch.length;for(let k=0;k<N;k++){const g=chBase[b]+k,pos=chapPos(b,k,N);posOf.set(g,pos);chMeta.push({g,book:b,pos,n:nodeN.get(g)||0})}});
 const NN=chMeta.length,pp=new Float32Array(NN*3),sz=new Float32Array(NN),cc=new Float32Array(NN*3);
 chMeta.forEach((m,j)=>{pp[j*3]=m.pos.x;pp[j*3+1]=m.pos.y;pp[j*3+2]=m.pos.z;const sel=m.g===selChap||m.g===jNtChap,col=books[m.book].col,w=m.n?0.55+0.45*Math.sqrt(m.n/maxN):0.18;
  {const fN=Math.min(1,3/Math.sqrt(B[m.book].ch.length));sz[j]=(sel?0.55:(m.n?0.12+0.22*Math.sqrt(m.n/maxN):0.06))*fN}cc[j*3]=sel?1:col.r*w;cc[j*3+1]=sel?1:col.g*w;cc[j*3+2]=sel?.9:col.b*w});
 const ng=new THREE.BufferGeometry();ng.setAttribute("position",new THREE.BufferAttribute(pp,3));ng.setAttribute("size",new THREE.BufferAttribute(sz,1));ng.setAttribute("aCol",new THREE.BufferAttribute(cc,3));
 chPts=new THREE.Points(ng,chMat);chPts.frustumCulled=false;group.add(chPts);
 let list=[];cm.forEach((c,k)=>{
  if(pair){const oc=Math.floor(k/2048),nc=k%2048;list.push({c,a:oc,b:nc,o:selPair.o,n:selPair.n,P0:posOf.get(oc),P3:posOf.get(nc)})}
  else if(bi<39){const g=k>>7,n_=k&127,nbk=books[n_];list.push({c,a:g,b:-1,o:bi,n:n_,P0:posOf.get(g),P3:faceP(n_,0,0.45)})}
  else{const g=k>>7,o_=k&127,obk=books[o_];list.push({c,a:g,b:-1,o:o_,n:bi,P0:faceP(o_,0,0.55),P3:posOf.get(g)})}});
 list.sort((x,y)=>y.c-x.c);{const cap=uiMode==="reader"?900:CHCAP;if(list.length>cap){list.length=cap;chCapped=true}}
 const cmax=list.length?list[0].c:1,V=list.length*SEGC*2,pos=new Float32Array(V*3),bs=new Float32Array(V*3);ccps=new Float32Array(list.length*12);
 const rot=(x,z,a)=>{const c=Math.cos(a),s=Math.sin(a);return[x*c-z*s,z*c+x*s]};
 list.forEach((cv,ci)=>{const P0=cv.P0,P3=cv.P3,dy=P3.y-P0.y,tw=0.45+(rng()-.5)*0.25,j=0.26+rng()*0.1,r1=rot(P0.x*j,P0.z*j,tw),r2=rot(P3.x*j,P3.z*j,-tw),
   p1=[r1[0],P0.y+dy*(0.4+(rng()-.5)*0.1),r1[1]],p2=[r2[0],P3.y-dy*(0.4+(rng()-.5)*0.1),r2[1]];
  ccps.set([P0.x,P0.y,P0.z,p1[0],p1[1],p1[2],p2[0],p2[1],p2[2],P3.x,P3.y,P3.z],ci*12);
  const ca=books[cv.o].col,cb=books[cv.n].col,I=0.22+0.78*Math.sqrt(cv.c/cmax);chCur.push({a:cv.a,b:cv.b,c:cv.c,ca,cb});
  for(let s=0;s<SEGC;s++)for(let e=0;e<2;e++){const tt=(s+e)/SEGC,u=1-tt,w0=u*u*u,w1=3*u*u*tt,w2=3*u*tt*tt,w3=tt*tt*tt,vi=(ci*SEGC*2+s*2+e)*3,m=0.35+0.65*tt;
   pos[vi]=w0*P0.x+w1*p1[0]+w2*p2[0]+w3*P3.x;pos[vi+1]=w0*P0.y+w1*p1[1]+w2*p2[1]+w3*P3.y;pos[vi+2]=w0*P0.z+w1*p1[2]+w2*p2[2]+w3*P3.z;
   bs[vi]=(ca.r*(1-tt)+cb.r*tt)*I*m;bs[vi+1]=(ca.g*(1-tt)+cb.g*tt)*I*m;bs[vi+2]=(ca.b*(1-tt)+cb.b*tt)*I*m}});
 cBase=bs;const lg=new THREE.BufferGeometry();lg.setAttribute("position",new THREE.BufferAttribute(pos,3));lg.setAttribute("color",new THREE.BufferAttribute(new Float32Array(bs),3));
 chLines=new THREE.LineSegments(lg,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));chLines.frustumCulled=false;group.add(chLines)}
function applyChapterLook(){if(!chLines)return;const arr=chLines.geometry.attributes.color.array,per=SEGC*6;chCur.forEach((cv,ci)=>{let f=jState?0.22:1.25;if(selChap!==null)f=(cv.a===selChap||cv.b===selChap)?2:0.04;const st=ci*per;for(let j=0;j<per;j++)arr[st+j]=cBase[st+j]*f});chLines.geometry.attributes.color.needsUpdate=true}
function pickChapter(x,y){if(!chMeta.length)return null;let best=null,bd=26;chMeta.forEach(m=>{tmp.copy(m.pos).project(cam);if(tmp.z>1)return;const d=Math.hypot((tmp.x*.5+.5)*SW-x,(-tmp.y*.5+.5)*SH-y);if(d<bd&&(m.n>0||selChap===m.g)){bd=d;best=m.g}});return best}
function selectChapter(g){selChap=(g===null||selChap===g)?null:g;if(selChap!==null&&sheetState==="peek")sheetState="half";applyLook();panel()}
function chapStrip(){if(selBook===null)return"";const bks=selPair?[selPair.o,selPair.n]:[selBook],t=T();
 return bks.map(bi=>`<p class="meta lbl">${books[bi].name}: chapters (number = connections)</p><div class="chips row">${chMeta.filter(m=>m.book===bi).map(m=>`<button class="chip" data-g="${m.g}" aria-pressed="${selChap===m.g}" style="${m.n?"":"opacity:.45"}">${chs[m.g].c}<small style="margin-left:4px;color:#9a9486">${fmt(m.n)}</small></button>`).join("")}</div>`).join("")}
/* ---------- journeys: curated threads drawn from the sourced dataset, independent of votes ---------- */
const JI={first:[],who:[],second:[],story:[]};J.items.forEach(it=>JI[it.j].push(it));JI.story=STORY.map(s=>Object.assign(J.items.find(it=>it.id===s.id),{st:s}));
function makeCurves(list,seg){const V=list.length*seg*2,pos=new Float32Array(V*3),col=new Float32Array(V*3),cp=new Float32Array(list.length*12),rot=(x,z,a)=>{const c=Math.cos(a),s=Math.sin(a);return[x*c-z*s,z*c+x*s]};
 list.forEach((cv,ci)=>{const P0=cv.P0,P3=cv.P3,dy=P3.y-P0.y,tw=0.4+(rng()-.5)*(cv.j?0.35:0.08),jt=0.3+(cv.j?rng()*0.12:0),r1=rot(P0.x*jt,P0.z*jt,tw),r2=rot(P3.x*jt,P3.z*jt,-tw),p1=[r1[0],P0.y+dy*0.4,r1[1]],p2=[r2[0],P3.y-dy*0.4,r2[1]];
  cp.set([P0.x,P0.y,P0.z,p1[0],p1[1],p1[2],p2[0],p2[1],p2[2],P3.x,P3.y,P3.z],ci*12);
  for(let s=0;s<seg;s++)for(let e=0;e<2;e++){const t=(s+e)/seg,u=1-t,w0=u*u*u,w1=3*u*u*t,w2=3*u*t*t,w3=t*t*t,vi=(ci*seg*2+s*2+e)*3,m=(0.5+0.5*t)*cv.I;
   pos[vi]=w0*P0.x+w1*p1[0]+w2*p2[0]+w3*P3.x;pos[vi+1]=w0*P0.y+w1*p1[1]+w2*p2[1]+w3*P3.y;pos[vi+2]=w0*P0.z+w1*p1[2]+w2*p2[2]+w3*P3.z;col[vi]=cv.col.r*m;col[vi+1]=cv.col.g*m;col[vi+2]=cv.col.b*m}});
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(pos,3));g.setAttribute("color",new THREE.BufferAttribute(col,3));
 const lines=new THREE.LineSegments(g,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));lines.frustumCulled=false;return{lines,cp}}
function buildJourneyLayer(){if(jLines){group.remove(jLines);jLines.geometry.dispose();jLines.material.dispose();jLines=null}jcps=null;jCur=[];if(!jState)return;
 const meta=J.meta.find(m=>m.id===jState.j),col=new THREE.Color(meta.color),list=[];
 if(jState.k===null){JI[jState.j].forEach(it=>{const o=books[it.ot[0].b],n=books[it.nt[0].b];list.push({P0:faceP(it.ot[0].b,0,0.55),P3:faceP(it.nt[0].b,0,0.45),col,I:1.1,j:0})})}
 else{const it=JI[jState.j][jState.k],a=chMeta.find(m=>m.g===chOf[it.ot[0].s]),b=chMeta.find(m=>m.g===chOf[it.nt[jState.t].s]);if(a&&b)for(let c=0;c<4;c++)list.push({P0:a.pos,P3:b.pos,col,I:1.6,j:c})}
 if(!list.length)return;const r=makeCurves(list,24);jLines=r.lines;jcps=r.cp;jCur=list.map(()=>({ca:col,cb:col}));group.add(jLines)}
function goStep(jid,k,t){const it=JI[jid][k];t=t||0;const o=it.ot[0].b,n=it.nt[t].b;select(o);selPair={o,n};frameBooks([o,n]);selChap=chOf[it.ot[0].s];jNtChap=chOf[it.nt[t].s];labOT=refRange(it.ot[0].s,it.ot[0].e);labNT=refRange(it.nt[t].s,it.nt[t].e);jState={j:jid,k,t};uiMode="journey";labelsOn=false;sheetState="half";applyLook();renderSheet();syncTools()}
function openJourney(jid){clearSel();jState={j:jid,k:null,t:0};uiMode="journey";sheetState="half";applyLook();renderSheet();syncTools()}
function backToJourneys(){clearSel();uiMode="journeys";sheetState="half";renderSheet();syncTools()}
/* ---------- camera / controls ---------- */
let lastFrame=null;function frameBooks(ids){lastFrame=ids.slice();const ang=ids.map(i=>books[i].a);let mid=ang[0];
 if(ids.length>1){const d=((ang[1]-ang[0]+Math.PI*3)%(Math.PI*2))-Math.PI;mid=ang[0]+d/2}
 tTh=mid;const hh=Math.tan(cam.fov*Math.PI/360),hw=hh*cam.aspect;let r=fit()*0.9;
 ids.forEach((i,k)=>{const d=ang[k]-mid,x=Math.abs(R*Math.sin(d)),z=R*Math.cos(d);r=Math.max(r,(x+1.2)/(0.84*hw)+z)});
 r=Math.max(r,9/(0.84*hh)+R*0.4);tRad=Math.min(r,fit()*1.6);
 if(ids.length>1){const a=books[ids[0]].pos,b=books[ids[1]].pos;tTgt.set((a.x+b.x)*0.1,H/2,(a.z+b.z)*0.1)}}
let th=0.6,el=0.52,rad=40,tTh=null,lastTouch=0;const fit=()=>{const asp=SW/SH;return Math.min(95,Math.max(30,27/(2*Math.tan(22.5*Math.PI/180)*Math.min(asp,1.6))))};
function resize(){const r=stage.getBoundingClientRect();SW=Math.max(1,r.width);SH=Math.max(1,r.height);renderer.setSize(SW,SH,false);cam.aspect=SW/SH;cam.setViewOffset(SW,SH,0,VOFF,SW,SH);cam.updateProjectionMatrix();uScale.value=renderer.getPixelRatio()*SH/(2*Math.tan(22.5*Math.PI/180))}
function placeCam(){cam.position.set(TARGET.x+rad*Math.cos(el)*Math.cos(th),TARGET.y+rad*Math.sin(el),TARGET.z+rad*Math.cos(el)*Math.sin(th));cam.lookAt(TARGET)}
const ptrs=new Map();let dragD=0,downT=0,pinch0=0,rad0=0;
canvas.addEventListener("contextmenu",e=>e.preventDefault());canvas.addEventListener("pointerdown",e=>{$("hint").style.opacity=0;canvas.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});dragD=0;downT=performance.now();lastTouch=downT;tTh=null;tRad=null;intro=null;if(ptrs.size===2){const[a,b]=[...ptrs.values()];pinch0=Math.hypot(a.x-b.x,a.y-b.y);rad0=rad}});
canvas.addEventListener("pointermove",e=>{const p=ptrs.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;lastTouch=performance.now();
 if(ptrs.size===1){dragD+=Math.abs(dx)+Math.abs(dy);th-=dx*0.0075;el=Math.max(-1.35,Math.min(1.45,el+dy*0.0075))}
 else if(ptrs.size===2){const[a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);rad=Math.max(14,Math.min(100,rad0*pinch0/Math.max(d,1)));dragD=99}});
const up=e=>{const was=ptrs.size;ptrs.delete(e.pointerId);if(was===1&&dragD<10&&performance.now()-downT<500){const r=canvas.getBoundingClientRect();tap(e.clientX-r.left,e.clientY-r.top)}};
canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",e=>ptrs.delete(e.pointerId));
canvas.setAttribute("tabindex","0");canvas.addEventListener("keydown",e=>{const k=e.key;if(k==="ArrowLeft")th+=0.12;else if(k==="ArrowRight")th-=0.12;else if(k==="ArrowUp")el=Math.min(1.3,el+0.08);else if(k==="ArrowDown")el=Math.max(-0.15,el-0.08);else if(k==="+"||k==="=")rad=Math.max(14,rad*0.9);else if(k==="-")rad=Math.min(100,rad*1.1);else if(k==="Escape")clearSel();else return;tTh=null;tRad=null;intro=null;e.preventDefault()});canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();$("err").style.display="flex"});canvas.addEventListener("webglcontextrestored",()=>{$("err").style.display="none"});canvas.addEventListener("wheel",e=>{e.preventDefault();rad=Math.max(14,Math.min(100,rad*(1+e.deltaY*0.001)));tRad=null;intro=null;lastTouch=performance.now()},{passive:false});
/* ---------- picking (screen-space, finger friendly) ---------- */
const tmp=new THREE.Vector3();
function screenOf(i){const b=books[i];tmp.set(b.pos.x,b.pos.y+b.h*0.5,b.pos.z).project(cam);return{x:(tmp.x*.5+.5)*SW,y:(-tmp.y*.5+.5)*SH,z:tmp.z}}
function facing(i){const b=books[i];const v1=new THREE.Vector3(b.pos.x,0,b.pos.z).normalize(),v2=new THREE.Vector3(cam.position.x,0,cam.position.z).normalize();return v1.dot(v2)}
const _v=new THREE.Vector3(),_p=new THREE.Vector3();
function pick(x,y){let best=-1,bs=1e9;
 meshes.forEach((m,i)=>{m.updateMatrixWorld();const g=m.geometry;if(!g.boundingBox)g.computeBoundingBox();const bb=g.boundingBox;let mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9;
  for(let k=0;k<8;k++){_v.set(k&1?bb.max.x:bb.min.x,k&2?bb.max.y:bb.min.y,k&4?bb.max.z:bb.min.z).applyMatrix4(m.matrixWorld).project(cam);const sx=(_v.x*.5+.5)*SW,sy=(-_v.y*.5+.5)*SH;if(sx<mnx)mnx=sx;if(sx>mxx)mxx=sx;if(sy<mny)mny=sy;if(sy>mxy)mxy=sy}
  const pad=7,inside=x>=mnx-pad&&x<=mxx+pad&&y>=mny-pad&&y<=mxy+pad,d=Math.hypot((mnx+mxx)/2-x,(mny+mxy)/2-y);if(!inside&&d>24)return;
  m.getWorldPosition(_p);const sc=(inside?0:60)+cam.position.distanceTo(_p)*1.2+d*1.0;if(sc<bs){bs=sc;best=i}});
 return best}
function tap(x,y){const c=pickChapter(x,y),i=c===null?pick(x,y):-1;
 if(uiMode==="reader"){if(c!==null){openReader(chs[c].b,chs[c].c);return}if(i>=0&&i!==rdB)openReader(i,1);return}
 if(uiMode==="story"||uiMode==="journey"||(uiMode==="evidence"&&evSel))return;
 if(c!==null){selectChapter(c);return}if(i>=0)select(i);else if(selBook!==null)clearSel()}
function select(i){labOT=labNT=null;uiMode="book";sheetState="half";jState=null;jNtChap=null;selBook=i;selPair=null;selChap=null;featured=null;labelsOn=false;shown=6;frameBooks([i]);intro=null;
 const b=books[i];tTgt.set(b.pos.x*0.25,b.ot?3.4:6.8,b.pos.z*0.25);halo.position.set(b.pos.x,b.pos.y+b.h*.5,b.pos.z);halo.material.color.copy(b.col);halo.material.opacity=.75;pulse.position.set(b.pos.x,b.pos.y+0.03,b.pos.z);pulse.material.color.copy(b.col);pulseT=0;
 applyLook();panel();syncTools()}
function clearSel(){uiMode="none";jState=null;jNtChap=null;selBook=null;selPair=null;selChap=null;featured=null;labelsOn=true;halo.material.opacity=0;pulse.material.opacity=0;pulseT=-1;tRad=fit();tTgt.set(0,H/2,0);applyLook();panel();syncTools();setTimeout(()=>{if(selBook===null&&!jState)tRad=fit()},80)}
/* ---------- labels ---------- */
const labDiv=$("labels");const labs=books.map(b=>{const d=document.createElement("div");d.className="lab";d.textContent=b.name;labDiv.appendChild(d);return d});
const ringT=[["OLD TESTAMENT",-0.02,"#25b7ff"],["NEW TESTAMENT",H-0.02,"#ff8a1f"]].map(([t,y,c])=>{const d=document.createElement("div");d.className="lab ring";d.textContent=t;d.style.color=c;labDiv.appendChild(d);return{d,y}});
const LSZ=new Map();function labSize(d,kind){const k=kind+"|"+d.textContent;let s=LSZ.get(k);if(!s){const was=d.style.display;d.style.display="block";s=[d.offsetWidth||80,d.offsetHeight||20];d.style.display=was;LSZ.set(k,s)}return s}
function updateLabels(){const w=SW,h=SH,cand=[],BAD=[];
 const hideAll=(sheetState==="full"&&!panelMin&&$("panel").classList.contains("on"))||$("vpk").classList.contains("on")||$("sheet").classList.contains("open")||$("intro").classList.contains("on");
 labDiv.style.visibility=hideAll?"hidden":"";if(hideAll)return;
 const selMode=selBook!==null&&!jState;let SET=null,names=true,rank=null;
 if(selMode){if(selPair)SET=new Set([selPair.o,selPair.n]);else if(uiMode==="book"){const cs=chapConn();names=cs.list.length<=8;SET=new Set([selBook,...cs.list.slice(0,names?8:10)]);rank=cs.rank}else SET=new Set([selBook])}
 labs.forEach((d,i)=>{d.style.display="none";const on=selMode?SET.has(i):labelsOn;if(!on)return;
  const b=books[i],sc=meshes[i].scale.y,isB=selMode&&!names&&i!==selBook&&!(selPair&&(i===selPair.o||i===selPair.n));tmp.set(b.pos.x,b.pos.y+(isB?b.h*sc*0.55:b.h*sc+0.3),b.pos.z).project(cam);if(tmp.z>1||tmp.z<-1)return;
  const f=facing(i);if(!selMode&&f<0.3)return;
  const main=selMode&&(i===selBook||(selPair&&(i===selPair.o||i===selPair.n)));if(main&&!selPair&&selChap!==null&&chLab.style.display==="block")return;
  cand.push({i,f,main,key:selMode?(main?1e6:1e5-(rank?rank.get(i)||99:0)):f,x:(tmp.x*.5+.5)*w,y:(-tmp.y*.5+.5)*h})});
 cand.sort((a,b)=>b.key-a.key);const taken=[[w-120,0,w,62]];
 cand.forEach(c=>{const d=labs[c.i],badge=selMode&&!c.main&&!names,txt=badge?String(rank.get(c.i)):books[c.i].name;
  d.classList.toggle("cnl",selMode&&!c.main&&!badge);d.classList.toggle("selp",!!c.main);d.classList.toggle("nb",badge);
  if(d.textContent!==txt)d.textContent=txt;const sz=labSize(d,c.main?"m":badge?"b":selMode?"c":"n"),wd=sz[0]+4,hh=sz[1]+3;
  d.dataset.bi=c.i;if(badge){BAD.push({d,x:c.x,y:c.y,r:Math.max(wd,hh)/2+1,f:c.f,k:rank.get(c.i)||0});return}
  d.style.zIndex=c.main?"300":"";const offs=selMode?[0,-hh,hh,-2*hh,2*hh,-3*hh,3*hh]:[0];let pl=null;
  const X=Math.max(wd/2+4,Math.min(w-wd/2-4,c.x));
  for(const o of offs){const y=Math.max(hh+4,Math.min(h-4,c.y+o)),r=[X-wd/2,y-hh,X+wd/2,y];if(!taken.some(t=>r[0]<t[2]&&r[2]>t[0]&&r[1]<t[3]&&r[3]>t[1])){pl=[X,y,r];break}}
  if(!pl){if(!selMode)return;const y=Math.max(hh+4,Math.min(h-4,c.y));pl=[X,y,[X-wd/2,y-hh,X+wd/2,y]]}
  taken.push(pl[2]);d.style.display="block";
  d.style.opacity=selMode?(c.f<-0.2?"0.9":"1"):Math.min(1,(c.f-0.3)/0.35).toFixed(2);
  d.style.transform=`translate(${pl[0].toFixed(1)}px,${pl[1].toFixed(1)}px) translate(-50%,-100%)`});
 relaxBadges(BAD,taken,w,h);
 ringT.forEach(r=>{if(selBook!==null){r.d.style.display="none";return}const up=r.y>1,sg=up?-1:1;tmp.set(sg*Math.cos(th)*(R+3.4),up?H+3.6:-2.0,sg*Math.sin(th)*(R+3.4)).project(cam);const ry=Math.max(76,Math.min(h-16,(-tmp.y*.5+.5)*h)),rx=Math.max(70,Math.min(w-70,(tmp.x*.5+.5)*w));r.d.style.transform=`translate(${rx.toFixed(1)}px,${ry.toFixed(1)}px) translate(-50%,-50%)`;r.d.style.display=(labNT&&jState)?"none":"block";r.d.style.opacity=labelsOn?1:.7});
 if(selChap!==null){const m=chMeta.find(x=>x.g===selChap);if(m){tmp.copy(m.pos).project(cam);chLab.style.display="block";chLab.textContent=labOT||chapName(selChap);chLab.style.transform=`translate(${((tmp.x*.5+.5)*w).toFixed(1)}px,${((-tmp.y*.5+.5)*h).toFixed(1)}px) translate(-50%,-140%)`}else chLab.style.display="none"}else chLab.style.display="none"}
/* ---------- panel ---------- */
function cardsFor(f,max,feat){const t=T(),idx=[];for(let i=0;i<L;i++)if(vo[i]>=t&&f(i))idx.push(i);idx.sort((a,b)=>vo[b]-vo[a]||a-b);
 if(feat!=null&&f(feat)&&vo[feat]>=t)idx.splice(0,idx.length,feat,...idx.filter(x=>x!==feat));
 const sd=(bk,s,e,tag,hs)=>`<div class="side"><img class="th" data-b="${bk}" src="${thumb(bk)}" alt="Cover of ${books[bk].name}. Tap to open this book."><div><b>${refRange(s,e)}<span class="tag">${tag}</span></b><p>${side(s,e,5,hs)}</p></div></div>`;
 let h=idx.slice(0,max).map((i,k)=>`<div class="card" style="border-color:#${PAL[secOf(ob[i])].toString(16)}">${feat!=null&&k===0&&i===feat?'<span class="badge">Your surprise connection</span><br>':''}<small>${tierName(vo[i])}</small>${(()=>{const w=whyOf(oS[i],oE[i],nS[i],nE[i]);return sd(ob[i],oS[i],oE[i],"Old Testament",w.set)+sd(nb[i],nS[i],nE[i],"New Testament",w.set)+whyLine(w,i)})()}</div>`).join("");
 if(idx.length>max)h+=`<button class="btn more" id="more">Show more (${fmt(idx.length-max)} left)</button>`;return{h,n:idx.length}}
function infoHtml(b){const I=INFO[b.i],t=T(),cc=new Map();for(let i=0;i<L;i++){if(vo[i]<t)continue;if(b.i<39?ob[i]!==b.i:nb[i]!==b.i)continue;const g=chOf[b.i<39?oS[i]:nS[i]];cc.set(g,(cc.get(g)||0)+1)}
 let best=null;cc.forEach((v,g)=>{if(!best||v>best[1])best=[g,v]});
 return`<div class="info"><b>${GRP[I[0]]}</b> \u00b7 Traditional attribution: ${I[1]}.<br>${I[2]}</div>`+(best?`<p class="ins">Most connected chapter: <b>${B[chs[best[0]].b].n} ${chs[best[0]].c}</b> (${fmt(best[1])} connections).</p>`:"")}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const refList=a=>a.map(r=>refRange(r.s,r.e)).join("; ");
const sdv=(bk,s,e,tag,mx)=>`<div class="side"><img class="th" data-b="${bk}" src="${thumb(bk)}" alt="Cover of ${books[bk].name}. Tap to open this book."><div><b>${refRange(s,e)}<span class="tag">${tag}</span></b><p>${side(s,e,mx)}</p></div></div>`;
function bookHtml(){const b=books[selBook],t=T(),conn=[];
 if(selBook<39){for(let j=0;j<27;j++)if(M[selBook*27+j])conn.push([j+39,M[selBook*27+j]])}else{for(let o=0;o<39;o++)if(M[o*27+selBook-39])conn.push([o,M[o*27+selBook-39]])}
 conn.sort((x,y)=>y[1]-x[1]);const tot=cntBook(selBook);
 const bf=selPair?(i=>ob[i]===selPair.o&&nb[i]===selPair.n):(i=>ob[i]===selBook||nb[i]===selBook),f=selChap!==null?(i=>bf(i)&&(chOf[oS[i]]===selChap||chOf[nS[i]]===selChap)):bf,cf=cardsFor(f,shown,selPair?featured:null);
 const head=selChap!==null?`${chapName(selChap)}, strongest first:`:selPair?`${books[selPair.o].name} \u2194 ${books[selPair.n].name}, strongest first:`:"Strongest connections. Tap a book above to compare just two:";
 return `<div class="hd"><img class="cov" alt="Cover of ${b.name}" src="${thumb(selBook)}"><div class="hm"><h2>${b.name}</h2><p class="meta" style="margin:0">${b.ot?"Old":"New"} Testament \u00b7 ${b.chs} chapters \u00b7 <b>${fmt(tot)}</b> connections</p></div></div>${infoHtml(b)}${evForBook(b.i)}<p class="meta" style="margin:10px 0 2px"><b>Connected books</b> \u00b7 ${chapConn().list.length>8?"the top 10 are numbered on the ring. ":""}Tap a book here, or its number on the ring, to see only the links between the two.</p>
<div class="chips row">${chapConn().list.map((k,ix)=>{const n=chapConn().cnt.get(k),o=selBook<39?selBook:k,nn=selBook<39?k:selBook,on=selPair&&selPair.o===o&&selPair.n===nn;return`<button class="chip" data-o="${o}" data-n="${nn}" aria-pressed="${!!on}"><span class="rk">${ix+1}</span>${books[k].name} <small style="color:var(--mute)">${fmt(n)}</small></button>`}).join("")||'<span class="meta">No connections here.</span>'}</div>
${chapStrip()}<p class="meta">Each link shown here is backed by the text: <b>same wording</b> (the New Testament repeats words from the Old Testament passage, often a quotation), <b>shared words</b> (both passages use the same distinctive words), or a <b>sourced prophecy link</b> with published citations. <mark>Highlighted</mark> words appear in both passages.</p><p class="meta"><b>${head}</b></p>${cf.n?cf.h:`<p class="meta">No connections backed by the text here.</p>`}`}
function journeysHtml(){return `<h2 class="ph">Journeys</h2><p class="meta">Three guided threads through the whole Bible. Each step shows what the text says, how Christians read it, and answers to common questions.</p>`+J.meta.filter(m=>m.id!=="story").map(m=>`<button class="jcard" data-j="${m.id}" style="--jc:${m.color}"><b>${m.name}</b><span>${m.blurb}</span><small>${JI[m.id].length} steps \u00b7 sourced</small></button>`).join("")+`<p class="meta">Journey threads come from a hand-built, sourced list of passages.</p>`}
function journeyHtml(){const m=J.meta.find(x=>x.id===jState.j),L2=JI[jState.j],k=jState.k;
 let h=`<div class="jh" style="--jc:${m.color}"><button class="chip" data-jback>\u2039 Journeys</button><b>${m.name}</b></div><div class="stepbar"><button class="chip" data-step="all" aria-pressed="${k===null}">All</button>${L2.map((it,i)=>`<button class="chip" data-step="${i}" aria-pressed="${k===i}">${i+1}</button>`).join("")}</div>`;
 if(k===null)return h+`<p class="meta">${m.blurb}</p>`+L2.map((it,i)=>`<button class="jstep" data-step="${i}"><b>${i+1}. ${it.title}</b><span>${refList(it.ot)} \u2192 ${refList(it.nt.slice(0,2))}${it.nt.length>2?" +"+(it.nt.length-2)+" more":""}</span></button>`).join("");
 const it=L2[k],t=jState.t,nt=it.nt[t],vt=it.votes[t];
 h+=`<h3 class="st">${k+1}. ${it.title}</h3><span class="lab2 l-text">What the text says</span><p class="jt">${q(it.text)}</p>`;
 h+=it.ot.map(r=>sdv(r.b,r.s,r.e,"Old Testament",8)).join("");
 if(it.nt.length>1)h+=`<div class="chips row">${it.nt.map((r,i)=>`<button class="chip" data-nt="${i}" aria-pressed="${i===t}">${refRange(r.s,r.e)}</button>`).join("")}</div>`;
 h+=sdv(nt.b,nt.s,nt.e,"New Testament",8);
 if(it.christian)h+=`<span class="lab2 l-chr">Christian reading</span><p class="jt">${q(it.christian)}</p>`;
 h+=qaFor(it.id);
 h+=`<p class="meta" style="margin-top:12px">Also in the OpenBible cross-reference list: ${vt==null?"not listed":"yes"}. That list shows where readers have connected passages; it is not evidence.</p>`;
 h+=it.src.length?`<p class="meta">Sources consulted:</p><ol class="src">${it.src.map(id=>{const s=J.sources.find(x=>x.id===id);return`<li value="${id}"><a href="${s.url}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a></li>`}).join("")}</ol>`:`<p class="meta">No commentary source was consulted for this pairing; it rests on the verses themselves.</p>`;
 return h+`<div class="nav2"><button class="btn" data-prev>\u2039 Previous</button><button class="btn p" data-next>Next \u203a</button></div>`}
function searchHtml(){return `<h2 class="ph">Search</h2><input id="qin" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" placeholder="Words, a theme, or a verse such as John 3:16" aria-label="Search the Bible and the journeys" value="${esc(lastQ)}"><div id="sres"></div><div id="sask"></div><div id="sans" aria-live="polite"></div>`}
/* --- search: BM25 retrieval over the sourced journeys and every verse in the dataset --- */
const STOP=new Set("the and for with that this from are was were his her him they them their there which have has had not but you your thou thee thy unto shall will into upon all one out who whom than then when what also did hath doth said saith say yea behold lord god".split(" "));
const tok=s=>s.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(w=>w.length>2&&!STOP.has(w));
let IDX=null;
function buildIndex(){const docs=[];J.items.forEach(it=>docs.push({k:"j",id:it.id,toks:tok([it.title,it.text,it.christian||"",it.views||"",refList(it.ot),refList(it.nt)].join(" "))}));
 D.vn.forEach((v,i)=>docs.push({k:"v",id:v,toks:tok(D.vt[i]+" "+refOf(v))}));
 const df=new Map(),inv=new Map();let tl=0;docs.forEach((d,di)=>{tl+=d.toks.length;const tf=new Map();d.toks.forEach(w=>tf.set(w,(tf.get(w)||0)+1));tf.forEach((c,w)=>{df.set(w,(df.get(w)||0)+1);let a=inv.get(w);if(!a){a=[];inv.set(w,a)}a.push([di,c])})});
 IDX={docs,df,inv,N:docs.length,avg:tl/docs.length}}
function search(qq,k){if(!IDX)buildIndex();const ts=[...new Set(tok(qq))],sc=new Map(),{N,avg,docs,inv,df}=IDX;
 ts.forEach(w=>{const a=inv.get(w);if(!a)return;const n=df.get(w),idf=Math.log(1+(N-n+.5)/(n+.5));a.forEach(([di,c])=>{const dl=docs[di].toks.length,s=idf*(c*2.2)/(c+1.2*(0.25+0.75*dl/avg));sc.set(di,(sc.get(di)||0)+s*(docs[di].k==="j"?1.6:1))})});
 return[...sc.entries()].sort((a,b)=>b[1]-a[1]).slice(0,k).map(([di,s])=>({d:docs[di],s}))}
const ALIAS={psalm:"Psalms","song of songs":"Song of Solomon",revelations:"Revelation","song":"Song of Solomon"};
function refQuery(qq){const m=qq.trim().match(/^((?:[1-3]\s*)?[a-z][a-z .]*?)\s+(\d{1,3})(?::(\d{1,3}))?$/i);if(!m)return null;let nm=m[1].trim().toLowerCase().replace(/\s+/g," ").replace(/^([1-3])(?=[a-z])/,"$1 ");nm=ALIAS[nm]?ALIAS[nm].toLowerCase():nm;
 const c=B.findIndex(b=>b.n.toLowerCase()===nm)>=0?B.findIndex(b=>b.n.toLowerCase()===nm):(()=>{const f=B.map((b,i)=>b.n.toLowerCase().startsWith(nm)?i:-1).filter(i=>i>=0);return nm.length>=3&&f.length===1?f[0]:-1})();
 if(c<0)return null;const ch=+m[2];if(ch<1||ch>B[c].ch.length)return null;const g=chBase[c]+ch-1,vs=m[3]?+m[3]:null;return{g,label:`${B[c].n} ${ch}`+(vs&&vs<=B[c].ch[ch-1]?":"+vs:"")}}
function jText(it){return `${it.title}. ${it.text} Christian reading: ${it.christian||"none given"} Sources: ${it.src.length?it.src.map(id=>J.sources.find(s=>s.id===id).name).join("; "):"the verses themselves"}.`}
function promptFor(qq,hits){const ps=hits.slice(0,8).map((x,i)=>`[P${i+1}] `+(x.d.k==="j"?jText(J.items.find(it=>it.id===x.d.id)):`${refOf(x.d.id)}: ${VT.get(x.d.id)}`)).join("\n\n");
 return `You are a careful Bible study assistant inside an educational app. Answer the reader's question using ONLY the numbered passages below.\nRules:\n1. Cite passages like [P2] after each claim.\n2. Keep apart (a) what the text says and (b) how Christians read it, and (c) answer a common question about it from a Christian perspective if the passages support that.\n3. If the passages do not answer the question, say so plainly and suggest what to look up. Do not use outside knowledge.\n4. Never claim proof. How often passages are cross-referenced is not evidence.\n5. Plain language, at most 170 words.\n\nQUESTION: ${qq}\n\nPASSAGES:\n${ps}`}
let sampleP=null;const getSample=()=>sampleP||(sampleP=(window.claude&&window.claude.use?Promise.resolve().then(()=>window.claude.use("sample")):Promise.resolve(null)).catch(()=>null));
function renderResults(qq){lastQ=qq;const el=$("sres");if(!el)return;if(!qq.trim()){el.innerHTML='<p class="meta">Try \u201cAlpha and Omega\u201d, \u201cvirgin\u201d, \u201cMount of Olives\u201d, or a reference like Isaiah 53.</p>';$("sask").innerHTML="";lastHits=[];return}
 const ref=refQuery(qq),hits=search(qq,30),jh=hits.filter(x=>x.d.k==="j").slice(0,5),vh=hits.filter(x=>x.d.k==="v").slice(0,8);let h="";
 if(ref)h+=`<button class="res" data-goref="${ref.g}"><b>Go to ${ref.label}</b><span>Open this chapter in the 3D view</span></button>`;
 jh.forEach(x=>{const it=J.items.find(i=>i.id===x.d.id),m=J.meta.find(mm=>mm.id===it.j);h+=`<button class="res" data-je="${it.id}"><span class="tg" style="color:${m.color}">${m.name}</span><b>${it.title}</b><span>${refList(it.ot)} \u2194 ${refList(it.nt.slice(0,2))}</span></button>`});
 vh.forEach(x=>{h+=`<button class="res" data-vs="${x.d.id}"><b>${refOf(x.d.id)}</b><span>${q(VT.get(x.d.id))}</span></button>`});
 if(!ref&&!jh.length&&!vh.length)h='<p class="meta">No matching passages. Try other words.</p>';
 el.innerHTML=h;lastHits=[...jh,...vh];$("sans").textContent="";
 getSample().then(s=>{if($("sask")&&lastQ===qq)$("sask").innerHTML=s&&lastHits.length?'<button class="btn p" id="askbtn" style="width:100%">Ask Claude about these passages</button><p class="meta">The answer is written by AI using only the passages above. Check the verses and sources.</p>':""})}
async function runAsk(qq){const s=await getSample(),out=$("sans");if(!s){out.textContent="AI answers are not available in this viewer.";return}out.textContent="Asking\u2026";
 try{const r=await s(promptFor(qq,lastHits),{onText:({text})=>{out.textContent=text},modelTier:"default",cache:false});out.textContent=r.text+"\n\nWritten by AI from the passages above. Check the verses and sources."}catch(e){out.textContent=e&&e.code==="not_granted"?"Permission was declined, so no AI answer was written.":"The AI answer could not be written right now."}}
function jumpChapter(g){select(chs[g].b);selectChapter(g)}
var VOFF=-20;let panelMin=false;
function refitView(){setTimeout(()=>{resize();if(selBook!==null&&lastFrame)frameBooks(lastFrame);else tRad=fit()},40)}
function setMin(m){const was=panelMin;panelMin=!!m;if(was!==panelMin)refitView();const p=$("panel");p.classList.toggle("min",panelMin);const r=$("prest");r.classList.toggle("on",panelMin&&p.classList.contains("on"));if(panelMin){r.querySelector("span").textContent=($("pttl").textContent||"Panel")+" · Show";closePop()}}
let keepScroll=false;
/* v16: clean landing — wheel, brand and one call to action pointing at Story */
let landing=false;
function placeCta(){const t=$("tab-story").getBoundingClientRect(),st=$("stage").getBoundingClientRect(),c=$("cta");const half=c.offsetWidth/2||90;const x=Math.max(half+10,t.left+t.width/2-st.left);c.style.left=x+"px";const ar=t.left+t.width/2-st.left-(x-half);c.querySelector("i").style.left=ar+"px";c.style.setProperty("--ar",ar+"px")}
function startLanding(){landing=true;$("tabs").classList.add("land");$("stage").classList.add("land");$("cta").classList.add("on");$("tab-story").classList.add("beckon");VOFF=Math.round(Math.min(60,SH*0.06));resize();placeCta();requestAnimationFrame(placeCta)}
function endLanding(){landing=false;$("tabs").classList.remove("land");$("stage").classList.remove("land");$("cta").classList.remove("on");$("tab-story").classList.remove("beckon");$("brand").classList.add("off");VOFF=-20;resize()}
addEventListener("resize",()=>{if(landing)placeCta()});
function renderSheet(keep){const p=$("panel"),c=$("pc");if(keep!==true&&panelMin)setMin(false);
 if(uiMode==="book"&&selBook===null)uiMode="none";if(uiMode!=="none")panelHidden=false;navMark();if(landing&&(uiMode!=="none"||!panelHidden))endLanding();$("pshow").classList.toggle("on",uiMode==="none"&&panelHidden&&!landing);if(uiMode==="none"&&panelHidden){if(panelMin)setMin(false);p.className="";c.innerHTML="";panelChrome();syncTools();return}if(uiMode==="none")sheetState=sheetState==="full"?"full":"peek";
 const was=p.classList.contains("on"),sc=$("psc").scrollTop;let h="";
 try{h=uiMode==="book"?bookHtml():uiMode==="journeys"?journeysHtml():uiMode==="journey"?journeyHtml():uiMode==="search"?searchHtml():uiMode==="evidence"?evidenceHtml():uiMode==="story"?storyHtml():uiMode==="storyhome"?storyHomeHtml():uiMode==="none"?exploreHomeHtml():uiMode==="reader"?readerHtml():libraryHtml()}catch(e){h='<p class="meta">Something went wrong showing this panel.</p>';console.error(e)}
 c.innerHTML=h;p.className="on "+sheetState+(uiMode==="none"?" home":"")+(panelMin?" min":"");panelChrome();if(panelMin)setMin(true);
 if(!was){p.style.pointerEvents="none";setTimeout(()=>{p.style.pointerEvents=""},600)}
 $("psc").scrollTop=keep===true?sc:0;
 c.querySelectorAll('.chips.row .chip[aria-pressed="true"],.stepbar .chip[aria-pressed="true"]').forEach(ac=>{const row=ac.parentElement;row.scrollLeft+=(ac.getBoundingClientRect().left-row.getBoundingClientRect().left)-(row.clientWidth-ac.offsetWidth)/2});
 if(uiMode==="search")renderResults(lastQ);syncTools()}
function panel(){renderSheet()}
function setSheet(s){setTimeout(()=>{try{panelChrome()}catch(e){}},0);if(s==="peek"&&uiMode!=="none")s="half";sheetState=s;const p=$("panel");if(p.classList.contains("on"))p.className="on "+sheetState+(panelMin?" min":"")}
$("clr").onclick=()=>{setMin(false);panelHidden=true;clearSel()};$("pmin").onclick=()=>setMin(true);$("prest").onclick=()=>setMin(false);
$("pc").addEventListener("click",e=>{const t=e.target;let el;
 if(el=t.closest("[data-rb]")){openReader(+el.dataset.rb,1);return}
 if(el=t.closest("[data-rc]")){openReader(rdB,+el.dataset.rc);return}
 if(el=t.closest("[data-rnav]")){const d=+el.dataset.rnav;let b=rdB,c=rdC+d;if(c<1){b--;c=B[b].ch.length}else if(c>B[b].ch.length){b++;c=1}if(b>=0&&b<66)openReader(b,c);return}
 if(el=t.closest("[data-rv]")){const v=+el.dataset.rv;rdV=rdV===v?null:v;rdTab="links";renderSheet(true);return}
 if(el=t.closest("[data-vpick]")){openVpk(el.dataset.vpick);return}
 if(t.closest("[data-rpick]")){openRefPicker();return}
 if(el=t.closest("[data-kwv]")){const v=+el.dataset.kwv;rdV=v;rdTab="words";renderSheet(true);setTimeout(()=>{const n=document.querySelector('#pc [data-rv="'+v+'"]');if(n&&n.scrollIntoView)n.scrollIntoView({block:"start"})},30);return}
 if(t.closest("[data-kw] summary")){setTimeout(()=>{const d=document.querySelector("#pc [data-kw]");kwOpen=!!(d&&d.open)},0)}
 if(el=t.closest("[data-rtab]")){rdTab=el.dataset.rtab;renderSheet(true);return}
 if(el=t.closest("[data-vexp]")){explainVerse(+el.dataset.vexp);return}
 if(el=t.closest("[data-ver]")){rdVer=el.dataset.ver;if(rdPar===rdVer)rdPar=null;try{localStorage.setItem("su_ver",JSON.stringify([rdVer,rdPar]))}catch(e){}renderSheet(true);return}
 if(el=t.closest("[data-par]")){rdPar=el.dataset.par||null;try{localStorage.setItem("su_ver",JSON.stringify([rdVer,rdPar]))}catch(e){}renderSheet(true);return}
 if(t.closest("[data-rbooks]")){clearSel();uiMode="library";sheetState="half";renderSheet();return}
 if(t.closest("[data-r3d]")){setSheet("half");return}
 if(t.closest("[data-evall]")){clearSel();uiMode="evidence";evSel=null;evLayer="all";sheetState="half";renderSheet();return}
 if(el=t.closest("[data-xo]")){const i=+el.dataset.xo;select(ob[i]);selPair={o:ob[i],n:nb[i]};frameBooks([ob[i],nb[i]]);selChap=chOf[oS[i]];featured=i;shown=6;applyLook();panel();return}
 if(el=t.closest("[data-explain]")){runExplain(+el.dataset.explain);return}
 if(el=t.closest("[data-storygo]")){storyGo(+el.dataset.storygo);return}
 if(el=t.closest("[data-stab]")){storyTab=el.dataset.stab;renderSheet();return}
 if(el=t.closest("[data-snt]")){storyGo(storyK,+el.dataset.snt);return}
 if(t.closest("[data-surprise]")){surprise();return}
 if(t.closest("[data-storyhome]")){clearSel();uiMode="storyhome";sheetState="half";renderSheet();return}
 if(el=t.closest("[data-evl]")){evLayer=el.dataset.evl;renderSheet();return}
 if(el=t.closest("[data-ev]")){openEvidence(el.dataset.ev);return}
 if(t.closest("[data-evback]")){evBack();return}
 if(el=t.closest("[data-evb]")){select(+el.dataset.evb);return}
 if(t.closest("[data-ovp]")){evSel="__ov";renderSheet();return}
 if(el=t.closest(".chip[data-g]")){selectChapter(+el.dataset.g);return}
 if(el=t.closest("img.th")){select(+el.dataset.b);return}
 if(el=t.closest(".chip[data-o]")){const o=+el.dataset.o,n=+el.dataset.n;selPair=(selPair&&selPair.o===o&&selPair.n===n)?null:{o,n};selChap=null;frameBooks(selPair?[o,n]:[selBook]);shown=6;if(selPair&&sheetState==="peek")sheetState="half";applyLook();panel();return}
 if(el=t.closest("[data-j]")){openJourney(el.dataset.j);return}
 if(t.closest("[data-jback]")){backToJourneys();return}
 if(el=t.closest("[data-step]")){if(el.dataset.step==="all")openJourney(jState.j);else goStep(jState.j,+el.dataset.step,0);return}
 if(el=t.closest("[data-nt]")){goStep(jState.j,jState.k,+el.dataset.nt);return}
 if(t.closest("[data-prev]")){const n=JI[jState.j].length;goStep(jState.j,(jState.k+n-1)%n,0);return}
 if(t.closest("[data-next]")){const n=JI[jState.j].length;goStep(jState.j,(jState.k+1)%n,0);return}
 if(t.closest("#more")){shown+=6;renderSheet(true);return}
 if(el=t.closest("[data-lib]")){select(+el.dataset.lib);return}
 if(el=t.closest("[data-je]")){const it=J.items.find(i=>i.id===el.dataset.je),sk=JI.story.indexOf(it);if(sk>=0)storyGo(sk);else goStep(it.j,JI[it.j].indexOf(it),0);return}
 if(el=t.closest("[data-vs]")){jumpChapter(chOf[+el.dataset.vs]);return}
 if(el=t.closest("[data-goref]")){jumpChapter(+el.dataset.goref);return}
 if(t.closest("#askbtn")){runAsk(lastQ)}});
$("pc").addEventListener("change",e=>{const t=e.target;if(!t.matches("select[data-sver],select[data-spar]"))return;const v=t.value;
 if(v.startsWith("ext:")){rdExt=v.slice(4);renderSheet(true);return}rdExt=null;
 if(t.matches("[data-sver]")){rdVer=v;if(rdPar===rdVer)rdPar=null}else rdPar=v||null;
 try{localStorage.setItem("su_ver",JSON.stringify([rdVer,rdPar]))}catch(e){}renderSheet(true)});
$("pc").addEventListener("input",e=>{if(e.target.id==="qin"){clearTimeout(renderResults.t);renderResults.t=setTimeout(()=>renderResults(e.target.value),140)}});
$("pexp").onclick=()=>{if(uiMode==="reader")readerFull=sheetState!=="full";setSheet(sheetState==="full"?(uiMode==="none"?"peek":"half"):"full");panelChrome()};

/* ---------- UI ---------- */
function closePop(){const pp=$("pop");pp.classList.remove("on");$("mbtn").setAttribute("aria-expanded","false")}
function openPop(kind){const pp=$("pop");pp.dataset.kind="menu";
 pp.innerHTML=`<button class="mi" data-pop="names">Book names: ${labelsOn?"on":"off"}</button><button class="mi" data-pop="spin">Auto-rotate: ${spin?"on":"off"}</button><button class="mi" data-pop="surprise">Surprise me</button><button class="mi" data-pop="reset">Reset view</button><button class="mi" data-pop="help">How to read this and about the data</button><button class="mi" data-pop="credits">Credits and licences</button>`;
 pp.classList.add("on");$("mbtn").setAttribute("aria-expanded","true")}
function syncTools(){evVis();
 const m={reader:"library",none:"explore",book:"explore",journeys:"story",journey:"story",story:"story",storyhome:"story",search:"search",library:"library",evidence:"evidence"}[uiMode];["story","explore","search","library","evidence"].forEach(k=>$("tab-"+k).setAttribute("aria-pressed",k===m));
 if($("pop").classList.contains("on"))openPop($("pop").dataset.kind)}
{const top=$("top");top.innerHTML='<span class="ttl">Scripture Universe</span><button class="chip ib" id="hbtn" aria-label="How this works">?</button><button class="chip ib" id="mbtn" aria-label="Menu" aria-haspopup="true" aria-expanded="false">\u22ef</button>';
  $("mbtn").onclick=e=>{e.stopPropagation();const o=$("pop").classList.contains("on")&&$("pop").dataset.kind==="menu";if(o)closePop();else openPop("menu")};
 document.addEventListener("pointerdown",e=>{if($("pop").classList.contains("on")&&!e.target.closest("#pop,#mbtn"))closePop()},true);
 $("pop").addEventListener("click",e=>{const a=e.target.closest("[data-pop]");if(!a)return;const k=a.dataset.pop;
  if(k==="help"){closePop();info()}else if(k==="credits"){closePop();credits()}else if(k==="names"){labelsOn=!labelsOn;syncTools()}else if(k==="spin"){spin=!spin;syncTools()}else if(k==="surprise"){closePop();surprise()}else if(k==="reset"){closePop();th=0.6;el=0.52;rad=fit();tTh=null;clearSel()}});
 const go=m=>{clearSel();uiMode=m;sheetState="half";renderSheet();if(m==="search")setTimeout(()=>{const i=$("qin");if(i&&!/Android|iPhone/i.test(navigator.userAgent||""))i.focus()},60)};
 $("tab-explore").onclick=()=>{closePop();panelHidden=false;clearSel()};$("tab-story").onclick=()=>{closePop();go("storyhome")};$("cta").onclick=()=>{closePop();go("storyhome")};$("tab-search").onclick=()=>{closePop();go("search")};$("tab-library").onclick=()=>{closePop();rdB=null;go("library")};$("tab-evidence").onclick=()=>{closePop();evSel=null;evLayer="all";go("evidence")};
 setTimeout(()=>{const h=$("hint");if(h)h.style.opacity=0},9000)}
function surprise(){const pool=[];for(let i=0;i<L;i++)if(vo[i]>=20)pool.push(i);if(!pool.length)return;const i=pool[(Math.random()*pool.length)|0];select(ob[i]);selPair={o:ob[i],n:nb[i]};frameBooks([ob[i],nb[i]]);featured=i;shown=6;sheetState="half";applyLook();panel()}
function info(){const shownN=M.reduce((a,b)=>a+b,0);$("sc").innerHTML=`<h2>How to read this, and about the data</h2><ul>
<li><b>Two rings.</b> Old Testament books stand in the lower ring, New Testament books in the upper ring. A thicker book has more chapters. Each cover carries a small symbolic picture drawn for this page, not a historical image.</li>
<li><b>Threads.</b> A thread joins an Old Testament book to a New Testament book where a passage repeats words from, shares distinctive words with, or is a sourced prophecy link to the other. Tap a book to see its chapters and the verses on both sides.</li>
<li><b>The story.</b> A guided tour in 16 steps, from the first promise in Genesis 3:15 to the new heaven and earth in Revelation 21. Each step shows the promise, the fulfilment, why they connect, and any evidence from history. Use Back and Next at the bottom.</li><li><b>Read the Bible.</b> Library \u2192 pick a book. Versions: KJV, Berean Standard Bible, ASV, Bible in Basic English, Young\u2019s Literal, Darby, Webster and the Telugu Old Version (public domain), and the Telugu Indian Revised Version 2019 (CC BY-SA 4.0). Full credits are in the menu. Tap a verse for its links, its original Hebrew or Greek words with meanings (STEPBible.org, CC BY 4.0), and an AI explanation.</li><li><b>Why two passages connect.</b> Words found in both passages are <mark>highlighted</mark>. When several words in a row match, the New Testament is probably quoting the Old. \u201cExplain this link\u201d asks Claude for a short plain-language explanation, clearly marked as written by AI.</li><li><b>Journeys.</b> Three guided sets, built by hand from named sources: the first coming of Jesus, who he is (including \u201cthe first and the last\u201d and \u201cAlpha and Omega\u201d), and the second coming. Each step keeps three things apart: <i>what the text says</i>, <i>how Christians read it</i>, and <i>questions people ask</i>, with Christian answers and sources. This app presents the Christian case; it does not claim to settle questions of faith.</li>
<li><b>Connections.</b> The map shows ${fmt(L)} Old\u2194New links that the text itself supports: repeated wording (often a quotation), shared distinctive words, and sourced prophecy links. Candidates come from the OpenBible.info cross-reference list (CC BY); a candidate whose passages share no distinctive wording is not shown. A link shows where Scripture echoes Scripture; it is not proof of any interpretation.</li>
<li><b>Evidence.</b> The Evidence tab collects real objects, manuscripts, places and ancient writers connected to the Bible, plus the journeys of Paul and some apostles. Gold markers on the ring show which books each one touches. Every card says what was found, what it shows, what it does not show, and links its sources. Pictures on the cards are original drawings, not photos; the source links lead to photos.</li><li><b>Search and ask.</b> Search finds journeys and verses. Where available, \u201cAsk Claude\u201d answers using only the passages found and says so when they do not answer the question. Check the verses and sources.</li>
<li><b>Text.</b> King James Version (public domain).</li>
<li><b>Book notes.</b> Groupings follow the standard Protestant order. \u201cTraditional attribution\u201d is what tradition says, not proof: scholars debate authorship of several books, and Hebrews is anonymous. Notes consulted: PC(USA) Scripture study guide, Bart Ehrman\u2019s book overview, The Collector. The one-line contents were written for this page.</li>
<li>Tap a book to hide the other names and see only its threads. Tap empty space or Close to restore.</li></ul>`;$("sheet").classList.add("open")}
/* Credits: every dataset with its licence and attribution, read from data/sources.json (Phase 2) */
function credits(){const ds=DATA.sources||[],lk=(u,t)=>u?`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`:esc(t);
 $("sc").innerHTML=`<h2>Credits and licences</h2><p>Scripture Universe is built on open data. Each source is listed with its licence.</p><ul class="credits">${ds.map(d=>`<li><b>${lk(d.url,d.name)}</b><br><span class="meta">Licence: ${esc(d.licence)}${d.shareAlike?" · share-alike: data derived from it stays under the same licence":""}</span>${d.attribution?`<br>${esc(d.attribution)}`:""}</li>`).join("")}</ul>
<p>Prophecy links cite ${fmt(J.sources.length)} published sources, and every evidence card and Q&amp;A answer links its own sources.</p><p class="meta">Data version ${esc(DATA.version||"")}</p>`;$("sheet").classList.add("open")}
$("sx").onclick=()=>$("sheet").classList.remove("open");

/* ---------- evidence: sourced historical finds linked to books ---------- */
const EVD=DATA.evidence,EGR={"artifact": "Physical find", "manuscript": "Ancient manuscript", "writer": "Ancient writers", "place": "Place and tradition", "text": "Bible text", "tradition": "Tradition"},EOV={"title": "What we know about the Twelve after the Gospels", "body": "The firmest facts are in the New Testament: James son of Zebedee was killed by Herod (Acts 12:2), John was exiled to Patmos (Revelation 1:9), and Matthias replaced Judas (Acts 1). Almost everything else, such as Matthew in Ethiopia or Parthia, Bartholomew in India or Armenia, or Simon in Britain, comes from later writers and apocryphal acts, and the sources often disagree. Because of that, this map draws lines only for five travellers and marks which ones are Bible text and which are tradition. One scholar cited in the source, Sean McDowell, concludes that all the apostles except John probably or plausibly died as martyrs.", "src": {"t": "Christian History Institute: Authority, missions, and martyrdom", "u": "https://christianhistoryinstitute.org/magazine/article/ch156-authority-missions-martyrdom"}},ELC={ot:"#25b7ff",jesus:"#ffc857",church:"#9fe3b5",apostles:"#cdb8ff"},ELN={ot:"Old Testament",jesus:"Jesus",church:"Early church",apostles:"Apostles"};

let evSel=null,evLayer="all";
var EVM=[];
const bIdx=n=>books.findIndex(b=>b.name===n);
const evBooks=it=>it.books.map(bIdx).filter(i=>i>=0);
const evImgs={};
function evThumb(it){if(evImgs[it.icon])return evImgs[it.icon];const W=128,c=document.createElement("canvas");c.width=c.height=W;const x=c.getContext("2d");
 const g=x.createLinearGradient(0,0,W,W);g.addColorStop(0,"#1c2740");g.addColorStop(1,"#0b0f18");x.fillStyle=g;x.fillRect(0,0,W,W);
 x.strokeStyle="#d8b45a";x.lineWidth=2;x.strokeRect(4,4,W-8,W-8);x.save();x.translate(W/2,W/2);x.scale(.8,.8);x.strokeStyle=CR;x.fillStyle=CR;x.lineWidth=4.5;x.lineCap="round";x.lineJoin="round";IC[it.icon](x);x.restore();
 return evImgs[it.icon]=c.toDataURL()}
function evCard(it,compact){return`<button class="evc" data-ev="${it.id}" style="--jc:${ELC[it.layer]}"><img alt="" src="${evThumb(it)}"><span><span class="gr ${it.grade}">${EGR[it.grade]}</span><b>${esc(it.title)}</b><span class="k">${esc(it.kid)}</span></span></button>`}
function evForBook(bi){const m=EVD.filter(x=>evBooks(x).includes(bi));if(!m.length)return"";return`<p class="meta" style="margin-top:6px"><b>Historical evidence linked to ${books[bi].name}</b></p>`+m.map(x=>evCard(x)).join("")}
function openEvidence(id){const it=EVD.find(x=>x.id===id),bs=evBooks(it);
 if(bs.length)select(bs[0]);else clearSel();
 uiMode="evidence";evSel=id;sheetState="half";renderSheet()}
function evBack(){evSel=null;clearSel();uiMode="evidence";sheetState="half";renderSheet()}
(()=>{const seen=new Set();EVD.forEach(it=>evBooks(it).forEach(i=>{if(seen.has(i))return;seen.add(i);const b=books[i];const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:GT,color:0xffd36b,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));sp.position.set(b.pos.x,b.pos.y+b.h+0.75,b.pos.z);sp.scale.setScalar(1.5);sp.visible=false;group.add(sp);EVM.push({sp,i})}))})();
function evVis(){const on=uiMode==="evidence";EVM.forEach(m=>{m.sp.visible=on&&(selBook===null||evSel===null||m.i===selBook)})}
function evTick(now){if(uiMode!=="evidence")return;EVM.forEach((m,k)=>{m.sp.scale.setScalar(1.3+0.25*Math.sin(now/380+k))})}

/* ---------- v8: story, explore home, panel chrome, shared words, AI explain, intro ---------- */
let storyK=0,storyTab="verses";
/* Common words never count as a link (stop words plus words in more than 150 KJV verses),
   matching pipeline/connections.mjs, so highlighting shows only distinctive shared words. */
const STOPW=new Set(D.cw||[]);
const wds=t=>(t.toLowerCase().match(/[a-z']+/g)||[]).filter(w=>w.length>1);
const IRRW={broken:"break",brake:"break",spake:"speak",spoken:"speak",gave:"give",given:"give",born:"bear",bare:"bear",begat:"beget",slain:"slay",slew:"slay",written:"write",wrote:"write",saw:"see",seen:"see",knew:"know",known:"know",took:"take",taken:"take"};
const stem=w=>IRRW[w]||w.replace(/(eth|est|ing|ed|es|s)$/,"");
const keyWord=w=>!STOPW.has(w)&&!STOPW.has(stem(w));
function textOf(s,e,cap){let t=[];for(let v=s;v<=Math.min(e,s+(cap||5)-1);v++)t.push(VT.get(v)||"");return t.join(" ")}
function whyOf(a1,a2,b1,b2){const r=ROW.get(a1+"|"+a2+"|"+b1+"|"+b2),set=new Set(),words=[];
 if(r!==undefined&&MG.mw[r]){for(const w of MG.mw[r].split(" "))if(w&&!set.has(stem(w))){set.add(stem(w));words.push(w)}}
 else{const bs=new Set(wds(textOf(b1,b2)).filter(keyWord).map(stem));for(const w of wds(textOf(a1,a2)))if(keyWord(w)&&bs.has(stem(w))&&!set.has(stem(w))){set.add(stem(w));words.push(w)}}
 return{set,words,tier:r!==undefined?vo[r]:0,quote:r!==undefined&&vo[r]>=20&&vo[r]<30}}
function hlT(html,hs){if(!hs||!hs.size)return html;return html.replace(/[A-Za-z']+/g,w=>{const l=w.toLowerCase();return l.length>1&&keyWord(l)&&hs.has(stem(l))?`<mark>${w}</mark>`:w})}
function whyLine(w,i){const lead=w.tier>=30?"<b>Sourced prophecy link.</b> ":w.quote?"<b>Same wording:</b> the New Testament repeats words from this Old Testament passage. ":"";
 const body=w.words.length?"Distinctive words in both: "+w.words.slice(0,6).map(x=>`<mark>${esc(x)}</mark>`).join(", ")+".":w.tier>=30?"The two passages do not share wording; the link rests on the sources cited for it.":"No distinctive words in common in this translation.";
 return`<p class="why">${lead}${body}${i!=null?` <button class="lnk" data-explain="${i}">Explain this link</button>`:""}</p>${i!=null?`<div class="expl" id="ex${i}" aria-live="polite"></div>`:""}`}
async function runExplain(i){const out=$("ex"+i);if(!out)return;const s=await getSample();if(!s){out.textContent="Explanations by AI are not available in this viewer. The highlighted words show what the two passages share.";return}
 out.textContent="Thinking…";const A=`${refRange(oS[i],oE[i])}: ${textOf(oS[i],oE[i],6)}`,Bt=`${refRange(nS[i],nE[i])}: ${textOf(nS[i],nE[i],6)}`;
 const p=`You explain a Bible cross-reference to an ordinary reader (a child or an adult) inside an educational Christian app.\nOld Testament passage, ${A}\nNew Testament passage, ${Bt}\nIn at most 110 words of plain language: 1) say what the two passages share (words, pictures or ideas); 2) say how Christians usually understand the link; 3) if there is a common question about it, answer it briefly from a Christian perspective. Do not claim proof. Use only these passages and widely known background, and say so if you are unsure.`;
 try{const r=await s(p,{onText:({text})=>{out.textContent=text},modelTier:"default",cache:true});out.textContent=r.text+"\n\nWritten by AI. Check it against the verses."}catch(e){out.textContent=e&&e.code==="not_granted"?"Permission was declined, so no explanation was written.":"The explanation could not be written right now."}}
function storyGo(k,t){storyK=Math.max(0,Math.min(JI.story.length-1,k));const it=JI.story[storyK];const tt=t==null?(it.st.t||0):t;goStep("story",storyK,tt);uiMode="story";storyTab=t==null?"verses":storyTab;sheetState=sheetState==="full"?"full":"half";renderSheet();syncTools()}
function vbox(cls,label,r,hs){return`<div class="vbox ${cls}"><span class="r">${label}: ${refRange(r.s,r.e)}</span><p>${side(r.s,r.e,6,hs)}</p></div>`}
function storyHomeHtml(){let h=`<h2 class="ph">The story of Jesus, Genesis to Revelation</h2><p class="jt">Christians read the whole Bible as one story: God promises a rescuer, the prophets describe him, Jesus comes, dies and rises, the church is born, and he will come again. Follow it in ${JI.story.length} steps. Each step shows the promise, the fulfilment, why they connect, and evidence from history.</p>
<button class="btn p" data-storygo="0" style="width:100%;margin:12px 0 6px">Start at step 1</button>`;let last="";
 JI.story.forEach((it,k)=>{if(it.st.chapter!==last){last=it.st.chapter;h+=`<p class="meta" style="margin:14px 0 2px"><b>${esc(last)}</b></p>`}h+=`<button class="jstep" data-storygo="${k}"><b>${k+1}. ${esc(it.title)}</b><span>${refRange(it.ot[0].s,it.ot[0].e)} → ${refRange(it.nt[it.st.t||0].s,it.nt[it.st.t||0].e)}</span></button>`});
 h+=`<h3 class="st" style="margin-top:18px">Go deeper: themed journeys</h3><p class="meta">Longer sets of passages on one theme, each with sources.</p>`+J.meta.filter(m=>m.id!=="story").map(m=>`<button class="jcard" data-j="${m.id}" style="--jc:${m.color}"><b>${m.name}</b><span>${m.blurb}</span><small>${JI[m.id].length} steps · sourced</small></button>`).join("");return h}
function exploreHomeHtml(){return`<h2 class="ph">The whole Bible in 3D</h2>
<div class="leg"><span class="sw" style="background:linear-gradient(90deg,#ff8a1f,#25b7ff,#b48cff,#3fd69a)"></span><span><b>Lower ring:</b> the 39 Old Testament books, written before Jesus. Colours: <span style="color:#ff8a1f">Law</span>, <span style="color:#25b7ff">History</span>, <span style="color:#b48cff">Poetry</span>, <span style="color:#3fd69a">Prophets</span>.</span></div>
<div class="leg"><span class="sw" style="background:#f2d47a"></span><span><b>Upper ring:</b> the 27 New Testament books, about Jesus and the first church.</span></div>
<div class="leg"><span class="sw" style="background:linear-gradient(90deg,#25b7ff,#f2d47a)"></span><span><b>Threads:</b> places where a New Testament passage echoes an Old Testament one. Brighter means more links.</span></div>
<p class="meta">Tap any book to see what it is about and what it connects to. Drag to turn, pinch to zoom.</p>
<div class="nav2"><button class="btn p" data-storygo="0">Start the guided story</button><button class="btn" data-surprise>Surprise me</button></div>`}
function panelChrome(){const t=$("pttl"),f=$("pft"),x=$("pexp");if(!t)return;
 const names={none:"Explore",book:selBook!==null?(selPair?`${books[selPair.o].name} ↔ ${books[selPair.n].name}`:`Explore › ${books[selBook].name}`):"Explore",journeys:"Themed journeys",journey:jState?(J.meta.find(m=>m.id===jState.j)||{}).name||"Journey":"Journey",story:`Story · ${storyK+1} of ${JI.story.length}`,storyhome:"The story",search:"Search",library:"Read the Bible",reader:rdB!=null?`${books[rdB].name} ${rdC}`:"Read",evidence:"Historical evidence"};
 t.textContent=names[uiMode]||"";$("pback").classList.toggle("on",navStack.length>0);x.innerHTML=sheetState==="full"?ICO_COL:ICO_EXP;x.title=sheetState==="full"?"Show more of the 3D view":"Make the panel bigger";x.setAttribute("aria-label",sheetState==="full"?"Make the panel smaller":"Make the panel bigger");
 if(uiMode==="story"){const n=JI.story.length;f.innerHTML=`<button class="btn" data-sback ${storyK===0?"disabled":""}>◀ Previous</button><span class="cnt">${storyK+1} / ${n}</span><button class="btn p" data-snext>${storyK===n-1?"Finish":"Next ▶"}</button>`;f.classList.add("on")}else{f.innerHTML="";f.classList.remove("on")}}
$("pft").addEventListener("click",e=>{if(e.target.closest("[data-sback]")){storyGo(storyK-1);return}if(e.target.closest("[data-snext]")){if(storyK===JI.story.length-1){clearSel();uiMode="storyhome";sheetState="half";renderSheet()}else storyGo(storyK+1)}});
const ntLab=document.createElement("div");ntLab.className="lab pin nt";ntLab.style.display="none";labDiv.appendChild(ntLab);
function placePin(el,m){tmp.copy(m.pos).project(cam);const w=labSize(el,"p")[0],x=Math.max(w/2+4,Math.min(SW-w/2-4,(tmp.x*.5+.5)*SW)),y=Math.max(30,Math.min(SH-4,(-tmp.y*.5+.5)*SH-10));el.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`}
function ntLabel(){if(chLab.style.display==="block"&&selChap!==null){const m0=chMeta.find(x=>x.g===selChap);if(m0)placePin(chLab,m0)}
 if(jNtChap==null||!labNT||!jState){ntLab.style.display="none";return}const m=chMeta.find(x=>x.g===jNtChap);if(!m){ntLab.style.display="none";return}tmp.copy(m.pos).project(cam);if(tmp.z>1){ntLab.style.display="none";return}ntLab.style.display="block";if(ntLab.textContent!==labNT)ntLab.textContent=labNT;placePin(ntLab,m)}
/* first-run guide */
const IPG=[["The Bible is one story","66 books written over many centuries. Christians read them as one story that points to Jesus: promised, born, crucified, risen, and coming again. This app lets you see that story and check it for yourself."],
 ["What you are looking at",`<span class="leg"><span class="sw" style="background:linear-gradient(90deg,#ff8a1f,#25b7ff,#b48cff,#3fd69a)"></span><span><b>Lower ring:</b> the Old Testament, written before Jesus.</span></span><span class="leg"><span class="sw" style="background:#f2d47a"></span><span><b>Upper ring:</b> the New Testament, about Jesus and the church.</span></span><span class="leg"><span class="sw" style="background:linear-gradient(90deg,#25b7ff,#f2d47a)"></span><span><b>Each thread:</b> a place where the New Testament points back to the Old.</span></span>`],
 ["Three ways in","<b>Story</b>: a guided tour in 16 steps, from the first promise to the new creation. <b>Explore</b>: tap any book to see its connections, with shared words highlighted. <b>Evidence</b>: real objects, manuscripts and places from history, with what they show and what they don’t."]];
let ipg=0;function introRender(){const p=IPG[ipg];$("ipg").innerHTML=`<h2>${p[0]}</h2><p>${p[1]}</p>`;$("idots").innerHTML=IPG.map((_,i)=>`<i class="${i===ipg?"on":""}"></i>`).join("");
 $("ibtns").innerHTML=ipg<IPG.length-1?`<button class="btn" data-iskip>Skip</button><button class="btn p" data-inext>Next</button>`:`<button class="btn" data-iexp>Explore on my own</button><button class="btn p" data-istory>Start the story</button>`}
function openIntro(){ipg=0;introRender();$("intro").classList.add("on")}
function closeIntro(){$("intro").classList.remove("on");try{localStorage.setItem("su_intro_v1","1")}catch(e){}}
$("intro").addEventListener("click",e=>{const t=e.target;if(t.closest("[data-inext]")){ipg++;introRender()}else if(t.closest("[data-iskip]")){closeIntro()}else if(t.closest("[data-iexp]")){closeIntro();clearSel()}else if(t.closest("[data-istory]")){closeIntro();storyGo(0)}});
$("hbtn").onclick=e=>{e.stopPropagation();closePop();openIntro()};

/* ---------- v9: full Bible reader, history (Back), evidence groups, questions people ask ---------- */
let panelHidden=false,rdB=null,rdC=1,rdV=null;
let FULL=DATA.kjv;

const vtext=v=>VT.get(v)||(FULL?FULL[v]:"");
const QA=DATA.qa,PHOTO={"merneptah":"Merneptah Stele","teldan":"Tel Dan Stele","siloam":"Siloam inscription","cyrus":"Cyrus Cylinder","isaiahscroll":"Great Isaiah Scroll","nativity":"Church of the Nativity Bethlehem","caiaphas":"Caiaphas ossuary","pilate":"Pilate stone","outside":"Tacitus Annals manuscript","p52":"Rylands Papyrus P52","gallio":"Gallio inscription Delphi","ketef":"Ketef Hinnom scrolls","mesha":"Mesha Stele","blackobelisk":"Black Obelisk of Shalmaneser III","lachish":"Lachish reliefs","nabonidus":"Nabonidus cylinder","siloampool":"Pool of Siloam","bethesda":"Pool of Bethesda","sinaiticus":"Codex Sinaiticus","erastus":"Erastus inscription Corinth","creed":"Papyrus 46"},EGROUPS=[["text","Manuscripts","The text was preserved",["isaiahscroll","ketef","p52","sinaiticus"]],["ot","Old Testament","Kings and empires of the Old Testament",["merneptah","teldan","mesha","blackobelisk","siloam","lachish","nabonidus","cyrus"]],["jesus","Jesus","Places and people around Jesus",["nativity","siloampool","bethesda","caiaphas","pilate"]],["risen","Resurrection","Jesus in history and the resurrection",["outside","creed"]],["church","Early church","The early church",["gallio","erastus"]],["apostles","Apostles","Where the apostles went",["ap_paul","ap_john","ap_andrew","ap_thomas","ap_james"]]];
function qaHtml(list){return list.map(x=>`<details class="qa"><summary>${esc(x.q)}</summary><div class="qb"><p>${esc(x.a)}</p>${x.ev.length?`<div class="chips">${x.ev.map(id=>{const e=EVD.find(y=>y.id===id);return e?`<button class="chip" data-ev="${id}">${esc(e.title)}</button>`:""}).join("")}</div>`:""}<ol class="src">${x.src.map(s=>`<li><a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)}</a></li>`).join("")}</ol></div></details>`).join("")}
function qaFor(id){const l=QA.filter(x=>x.items.includes(id));return l.length?`<span class="qhd">Questions people ask</span>`+qaHtml(l):""}
/* history: every distinct view is remembered so Back always returns to where you were */
const navStack=[];let navCommitted=null,navCommittedKey=null,navRestoring=false,navTimer=0;
function navSnap(){return{m:uiMode,b:selBook,p:selPair?{o:selPair.o,n:selPair.n}:null,c:selChap,j:jState?{j:jState.j,k:jState.k,t:jState.t}:null,k:storyK,tab:storyTab,ev:evSel,evl:evLayer,rb:rdB,rc:rdC,hid:panelHidden}}
const navKey=s=>JSON.stringify([s.m,s.m==="none"?null:s.b,s.p,s.m==="book"||s.m==="reader"?s.c:null,s.m==="journey"||s.m==="story"?s.j:null,s.m==="story"?s.k:null,s.m==="evidence"?s.ev:null,s.m==="reader"?[s.rb,s.rc]:null,s.m==="none"?s.hid:null]);
function navMark(){if(navTimer)return;navTimer=setTimeout(()=>{navTimer=0;const s=navSnap(),k=navKey(s);if(navRestoring){navRestoring=false}else if(navCommitted&&k!==navCommittedKey){navStack.push(navCommitted);if(navStack.length>60)navStack.shift()}navCommitted=s;navCommittedKey=k;panelChrome()},0)}
function navBack(){const s=navStack.pop();if(!s)return;navRestoring=true;
 if(s.m==="story"){storyTab=s.tab;storyGo(s.k,s.j?s.j.t:null)}
 else if(s.m==="journey"&&s.j){if(s.j.k==null)openJourney(s.j.j);else goStep(s.j.j,s.j.k,s.j.t)}
 else if(s.m==="book"&&s.b!=null){select(s.b);if(s.p){selPair=s.p;frameBooks([s.p.o,s.p.n])}if(s.c!=null)selChap=s.c;applyLook();panel()}
 else if(s.m==="evidence"){evLayer=s.evl;if(s.ev&&s.ev!=="__ov")openEvidence(s.ev);else{clearSel();uiMode="evidence";evSel=s.ev;sheetState="half";renderSheet()}}
 else if(s.m==="reader"&&s.rb!=null)openReader(s.rb,s.rc);
 else if(s.m==="none"){panelHidden=s.hid;clearSel()}
 else{clearSel();uiMode=s.m;sheetState="half";renderSheet()}
 syncTools()}
$("pback").onclick=navBack;
$("pshow").onclick=()=>{panelHidden=false;renderSheet()};
/* evidence */
const photoUrl=q=>"https://commons.wikimedia.org/w/index.php?title=Special:MediaSearch&type=image&search="+encodeURIComponent(q);
function evidenceHtml(){
 if(evSel==="__ov")return`<h2 class="ph">${esc(EOV.title)}</h2><p class="jt">${esc(EOV.body)}</p><p class="meta" style="margin-top:12px">Source:</p><ol class="src"><li><a href="${esc(EOV.src.u)}" target="_blank" rel="noopener noreferrer">${esc(EOV.src.t)}</a></li></ol>`;
 if(evSel){const it=EVD.find(x=>x.id===evSel);if(it)return evDetail(it)}
 const gs=EGROUPS.filter(g=>evLayer==="all"||g[0]===evLayer);
 let h=`<h2 class="ph">Historical evidence</h2><p class="meta">Real inscriptions, manuscripts, places and ancient writers that touch the Bible’s story. Each card shows what was found, what it shows, how strong it is, and where to see photos.</p>
<div class="chips row">${[["all","All"]].concat(EGROUPS.map(g=>[g[0],g[1]])).map(([k,n])=>`<button class="chip" data-evl="${k}" aria-pressed="${evLayer===k}">${n}</button>`).join("")}</div>`;
 if(evLayer==="all")h+=`<h3 class="grh">Questions people ask<small>Short answers, with the evidence and sources behind them.</small></h3>`+qaHtml(QA.filter(x=>x.gen));
 gs.forEach(g=>{const items=g[3].map(id=>EVD.find(x=>x.id===id)).filter(Boolean);h+=`<h3 class="grh">${esc(g[2])}<small>${items.length} ${items.length===1?"item":"items"}</small></h3>`+items.map(x=>evCard(x)).join("");
  if(g[0]==="apostles")h+=`<button class="evc" data-ovp style="--jc:#9a9486"><span><span class="gr">Read first</span><b>${esc(EOV.title)}</b><span class="k">Why only some apostles are listed.</span></span></button>`});
 return h}
function evDetail(it){const bs=evBooks(it),ks=JI.story.map((s,k)=>s.st.ev.includes(it.id)?k:-1).filter(k=>k>=0),ap=it.layer==="apostles";
 return`<div class="evh"><img alt="" src="${evThumb(it)}"><div><span class="gr ${it.grade}">${EGR[it.grade]}</span><h2 class="ph" style="margin:4px 0 2px">${esc(it.title)}</h2><p class="meta" style="margin:0">${esc(it.place)}</p></div></div>
<p class="kid">${esc(it.kid)}</p>
${PHOTO[it.id]?`<a class="photo" href="${photoUrl(PHOTO[it.id])}" target="_blank" rel="noopener noreferrer">See real photos ↗</a>`:""}
<span class="lab2 l-text">${ap?"What is reported":"What was found"}</span><p class="jt">${esc(it.what)}</p>
${it.shows?`<span class="lab2 l-text">What it shows</span><p class="jt">${esc(it.shows)}</p>`:""}
<span class="lab2 l-oth">How strong is this evidence?</span><p class="jt">${esc(it.limits)}</p>
${it.faith?`<span class="lab2 l-chr">Why it matters for faith</span><p class="jt">${esc(it.faith)}</p>`:""}
${(()=>{const l=QA.filter(x=>x.ev.includes(it.id));return l.length?`<span class="qhd">Questions people ask</span>`+qaHtml(l):""})()}
${bs.length?`<p class="meta" style="margin-top:12px">Open in the 3D ring:</p><div class="chips">${bs.map(i=>`<button class="chip" data-evb="${i}">${books[i].name}</button>`).join("")}</div>`:""}
${ks.length?`<p class="meta" style="margin-top:10px">Part of the story:</p><div class="chips">${ks.map(k=>`<button class="chip" data-storygo="${k}">Step ${k+1}: ${esc(JI.story[k].title)}</button>`).join("")}</div>`:""}
${it.see?`<p class="meta"><a style="color:#9bbcff" href="${esc(it.see.u)}" target="_blank" rel="noopener noreferrer">${esc(it.see.t)} ↗</a></p>`:""}
<p class="meta" style="margin-top:12px">Sources:</p><ol class="src">${it.src.map(s=>`<li><a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t)}</a></li>`).join("")}</ol>
<p class="meta" style="margin-top:8px">The picture on this card is a drawing made for this app; the photo link opens real photographs on Wikimedia Commons.</p>`}
/* story step (why tab now answers questions) */
function storyHtml(){const k=storyK,it=JI.story[k],st=it.st,t=jState?jState.t:st.t,nt=it.nt[t];
 const w=whyOf(it.ot[0].s,it.ot[it.ot.length-1].e,nt.s,nt.e),evs=st.ev.map(id=>EVD.find(x=>x.id===id)).filter(Boolean),nq=QA.filter(x=>x.items.includes(it.id)).length;
 let h=`<div class="sthd"><span class="chap">${esc(st.chapter)}</span></div><h3 class="st" style="margin-top:2px">${k+1}. ${esc(it.title)}</h3><p class="kid">${esc(st.kid)}</p>
<div class="seg" role="tablist"><button role="tab" data-stab="verses" aria-selected="${storyTab==="verses"}">Verses</button><button role="tab" data-stab="why" aria-selected="${storyTab==="why"}">${nq?"Why · Q&amp;A":"Why linked"}</button><button role="tab" data-stab="ev" aria-selected="${storyTab==="ev"}">Evidence${evs.length?" ("+evs.length+")":""}</button></div>`;
 if(storyTab==="verses"){h+=it.ot.map(r=>vbox("ot","The promise",r,w.set)).join("")+`<div class="arrow">↓ fulfilled in ↓</div>`+vbox("nt","The fulfilment",nt,w.set);
  if(it.nt.length>1)h+=`<p class="meta" style="margin-top:8px">Also see:</p><div class="chips row">${it.nt.map((r,i)=>`<button class="chip" data-snt="${i}" aria-pressed="${i===t}">${refRange(r.s,r.e)}</button>`).join("")}</div>`;
  h+=whyLine(w,null)}
 else if(storyTab==="why"){h+=`<span class="lab2 l-text">What the text says</span><p class="jt">${q(it.text)}</p>`;
  if(it.christian)h+=`<span class="lab2 l-chr">How Christians read it</span><p class="jt">${q(it.christian)}</p>`;
  h+=qaFor(it.id);
  h+=it.src.length?`<p class="meta" style="margin-top:10px">Sources:</p><ol class="src">${it.src.map(id=>{const s=J.sources.find(x=>x.id===id);return`<li value="${id}"><a href="${s.url}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a></li>`}).join("")}</ol>`:`<p class="meta" style="margin-top:10px">This step rests on the verses themselves.</p>`}
 else{h+=evs.length?`<p class="meta">Real objects and records from history connected to this step. Tap one for details and photos.</p>`+evs.map(x=>evCard(x)).join(""):`<p class="jt">No physical evidence is linked to this step. It rests on the texts themselves.</p><button class="btn" style="width:100%;margin-top:8px" data-evall>Browse all evidence</button>`}
 return h}
/* library: pick a book, read any chapter */
function libraryHtml(){let h=`<h2 class="ph">Read the Bible</h2><p class="meta">King James Version (public domain). Pick a book to read any chapter. Verses with a blue number connect to the other Testament: tap them to see the links.</p>`;let g=-1;
 books.forEach((b,i)=>{const gi=INFO[i][0];if(gi!==g){if(g!==-1)h+=`</div>`;g=gi;h+=`<p class="bkg">${GRP[gi]}</p><div class="bk">`}h+=`<button data-rb="${i}"><img src="${thumb(i)}" alt="">${b.name}</button>`});
 return h+`</div>`}
function openReader(b,c){rdExt=null;closeVpk();const keepHalf=uiMode==="reader"&&sheetState==="half";select(b);uiMode="reader";rdB=b;rdC=Math.max(1,Math.min(B[b].ch.length,c||1));rdV=null;selChap=chBase[b]+rdC-1;applyLook();sheetState=readerFull?"full":"half";renderSheet();syncTools()}
function verseLinks(v){const out=[];for(let i=0;i<L;i++){if(vo[i]<3)continue;if(v>=oS[i]&&v<=oE[i])out.push([i,0]);else if(v>=nS[i]&&v<=nE[i])out.push([i,1])}out.sort((a,b)=>vo[b[0]]-vo[a[0]]);const seen=new Set();return out.filter(([i,s])=>{const k=s?oS[i]:nS[i];if(seen.has(k))return false;seen.add(k);return true})}

/* ---------- v10: Bible versions, original Hebrew/Greek words, verse explanations ---------- */
var CONN;
const AST=DATA.assets,TELN=["ఆదికాండము","నిర్గమకాండము","లేవీయకాండము","సంఖ్యాకాండము","ద్వితీయోపదేశకాండమ","యెహొషువ","న్యాయాధిపతులు","రూతు","సమూయేలు మొదటి గ్రంథము","సమూయేలు రెండవ గ్రంథము","రాజులు మొదటి గ్రంథము","రాజులు రెండవ గ్రంథము","దినవృత్తాంతములు మొదటి గ్రంథము","దినవృత్తాంతములు రెండవ గ్రంథము","ఎజ్రా","నెహెమ్యా","ఎస్తేరు","యోబు గ్రంథము","కీర్తనల గ్రంథము","సామెతలు","ప్రసంగి","పరమగీతము ","యెషయా గ్రంథము ","యిర్మీయా","విలాపవాక్యములు","యెహెజ్కేలు","దానియేలు","హొషేయ","యోవేలు","ఆమోసు","ఓబద్యా","యోనా","మీకా ","నహూము","హబక్కూకు","జెఫన్యా","హగ్గయి","జెకర్యా","మలాకీ","మత్తయి సువార్త","మార్కు సువార్త","లూకా సువార్త","యోహాను సువార్త","అపొస్తలుల కార్యములు","రోమీయులకు","1 కొరింథీయులకు","2 కొరింథీయులకు","గలతీయులకు","ఎఫెసీయులకు","ఫిలిప్పీయులకు","కొలొస్సయులకు","1 థెస్సలొనీకయులకు","2 థెస్సలొనీకయులకు","1 తిమోతికి","2 తిమోతికి","తీతుకు","ఫిలేమోనుకు","హెబ్రీయులకు","యాకోబు","1 పేతురు","2 పేతురు","1 యోహాను","2 యోహాను","3 యోహాను","యూదా","ప్రకటన గ్రంథము"];const astCache={};
async function unz(b64){const bin=Uint8Array.from(atob(b64.trim()),c=>c.charCodeAt(0));const st=new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"));return await new Response(st).text()}
function loadAsset(k){if(!AST[k])return Promise.reject(new Error("missing"));return astCache[k]||(astCache[k]=fetch(AST[k]).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.text()}).catch(e=>{delete astCache[k];throw e}))}
const VERS=[["kjv","KJV","King James Version (1769)"],["bsb","BSB","Berean Standard Bible, modern English (public domain)"],["asv","ASV","American Standard Version (1901)"],["bbe","BBE","Bible in Basic English, simple words"],["ylt","YLT","Young’s Literal Translation (1898), word for word"],["darby","Darby","Darby Translation (1890)"],["webster","Webster","Webster’s Bible (1833)"],["tel","తెలుగు","Telugu Bible, Old Version (public domain)"],["irv","తెలుగు IRV","Telugu, Indian Revised Version 2019 (CC BY-SA 4.0)"]];
const VTX={},VERR={};let rdVer="kjv",rdPar=null,rdTab="links",rdExt=null;const EXTV=["NKJV","NIV","ESV","NLT","NASB"];
try{const s=JSON.parse(localStorage.getItem("su_ver")||"null");if(s){rdVer=s[0]||"kjv";rdPar=s[1]||null}}catch(e){}
function needVer(k){if(k==="kjv"||VTX[k]||VERR[k]==="loading")return;VERR[k]="loading";loadAsset("v_"+k).then(t=>{VTX[k]=t.split("\n");VERR[k]=null;if(uiMode==="reader")renderSheet(true)}).catch(e=>{VERR[k]="failed";if(uiMode==="reader")renderSheet(true)})}
function vtextV(k,v){if(k==="kjv")return vtext(v);const a=VTX[k];return a?a[v]:null}
const WCACHE={},LEX={};
function needWords(b){const k="w"+String(b+1).padStart(2,"0"),lk=b<39?"lexh":"lexg";
 if(!WCACHE[b]&&WCACHE[b]!=="loading"){WCACHE[b]="loading";loadAsset(k).then(t=>{WCACHE[b]=JSON.parse(t);KWC.clear();if(uiMode==="reader")renderSheet(true)}).catch(()=>{WCACHE[b]="failed";if(uiMode==="reader")renderSheet(true)})}
 if(!LEX[lk]){LEX[lk]="loading";loadAsset(lk).then(t=>{LEX[lk]=JSON.parse(t);KWC.clear();if(uiMode==="reader")renderSheet(true)}).catch(()=>{LEX[lk]="failed"})}}
/* Original words of a verse (STEPBible, pinned): each word leads with the English this verse uses for it,
   then a short dictionary meaning; the full entry sits behind "More". Hebrew lists read right to left. */
/* STEPBible marks grammar-only words with <...> or [...]: say what they are in plain words. */
const plainGloss=g=>/^(and )?<obj\.>$/i.test(g||"")?(g.startsWith("and")?"and (marks the object; not translated)":"(marks the object; not translated)"):/^\[obj\.\]$/i.test(g||"")?"object marker, not translated":(g||"").replace(/<([^>]+)>/g,"($1)");
const stepUrl=k=>`https://www.stepbible.org/?q=strong=${encodeURIComponent((k||"").replace(/[A-Za-z]$/,""))}`;
function wordsHtml(v){const [bn,c,x]=vr(v),b=chs[chOf[v]].b,W=WCACHE[b],lx=LEX[b<39?"lexh":"lexg"],he=b<39;
 if(!W||W==="loading")return`<p class="meta">Loading the ${he?"Hebrew":"Greek"} words…</p>`;if(W==="failed")return`<p class="meta">The ${he?"Hebrew":"Greek"} words could not be loaded right now.</p>`;
 const ws=W[c+":"+x]||[];if(!ws.length)return`<p class="meta">No word data for this verse.</p>`;
 return`<p class="meta">The ${he?"Hebrew":"Greek"} words of this verse${he?", read right to left":""}. Under each word: how it sounds, the English used for it in this verse, and its basic meaning. Data: STEPBible.org (CC BY)${he?"":"; Greek meanings: Dodson Lexicon (public domain)"}.</p><div class="owl${he?" he":""}">`+ws.map(w=>{const L=lx&&typeof lx==="object"?lx[w[3]]:null,mean=w[5]||(L?L[2]:"");
  return`<div class="ow"><span class="o${he?" he":""}" lang="${he?"he":"grc"}">${esc(w[0])}</span><span class="t">${esc(w[1])}</span><span class="g">${esc(plainGloss(w[2]))}</span>${mean?`<span class="m">Meaning: ${esc(plainGloss(mean))}</span>`:""}${L&&L[3]?`<details><summary>More about ${esc(L[0])}</summary><p>${esc(L[3])}</p><p class="meta">Used ${fmt(L[5]||0)} times in the ${he?"Old":"New"} Testament · ${esc(w[3])} · <a href="${stepUrl(w[3])}" target="_blank" rel="noopener">Full entry on STEPBible</a></p></details>`:""}</div>`}).join("")+`</div>`}
async function explainVerse(v){const out=$("vx"+v);if(!out)return;const s=await getSample();if(!s){out.textContent="Explanations by AI are only available when this app is opened inside Claude. The word list and the linked passages above still explain the verse.";return}
 out.textContent="Thinking…";const b=chs[chOf[v]].b,[bn,c,x]=vr(v),W=WCACHE[b]&&typeof WCACHE[b]==="object"?WCACHE[b][c+":"+x]:null,lx=LEX[b<39?"lexh":"lexg"];
 const words=W?W.map(w=>`${w[1]} (${w[3]}) = ${w[2]}${lx&&lx[w[3]]?"; dictionary: "+lx[w[3]][2]:""}`).join("\n"):"(not loaded)";
 const links=verseLinks(v).slice(0,5).map(([i,sd])=>{const s0=sd?oS[i]:nS[i];return`${refRange(s0,sd?oE[i]:nE[i])}: ${vtext(s0)}`}).join("\n");
 const before=v>0?vtext(v-1):"",after=v<31101?vtext(v+1):"";
 const p=`You are a warm, careful Bible teacher in a Christian study app used by children and adults. Explain ${bn} ${c}:${x} using ONLY the material below and widely known background.\n\nVERSE (KJV): ${vtext(v)}\nVerse before: ${before}\nVerse after: ${after}\n\nORIGINAL ${b<39?"HEBREW":"GREEK"} WORDS (transliteration, Strong's number, meaning):\n${words}\n\nCONNECTED PASSAGES:\n${links||"none"}\n\nWrite at most 180 words, plain language, in this order:\n1) What it says (one or two sentences).\n2) Key words: explain one to three original-language words that matter, with transliteration.\n3) How it connects to the rest of the Bible, citing the connected passages by reference.\n4) For life today: one short sentence from a Christian perspective.\nDo not invent facts. Do not claim proof.`;
 try{const r=await s(p,{onText:({text})=>{out.textContent=text},modelTier:"default",cache:true});out.textContent=r.text+"\n\nWritten by AI from the verse, its original words and the linked passages. Check it against Scripture."}catch(e){out.textContent=e&&e.code==="not_granted"?"Permission was declined, so no explanation was written.":"The explanation could not be written right now."}}
const bn0=v=>{const r=vr(v);return`${r[0]} ${r[1]}:${r[2]}`};

/* ---------- v12: version picker sheet, chapter key words (footnotes) ---------- */
let vpkMode=null;
function openVpk(mode){vpkMode=mode;const cur=mode==="main"?rdVer:(rdPar||"");const list=VERS.filter(x=>mode==="main"||x[0]!==rdVer);
 const desc={kjv:"The classic English Bible, 1769 text",asv:"A careful revision of the KJV, 1901",bbe:"Simple everyday English, good for children and new readers",ylt:"Very literal, follows the Hebrew and Greek word order",darby:"Literal translation by J. N. Darby, 1890",webster:"Noah Webster’s light update of the KJV, 1833",tel:"పాత తెలుగు బైబిలు · Telugu Old Version"};
 $("vpkb").innerHTML=`<div class="vh"><b>${mode==="main"?"Choose a version":"Compare with"}</b><button class="btn" data-vpkx>Done</button></div>
${mode==="par"?`<button class="vo" data-vsel="" aria-checked="${!rdPar}"><span class="ab">None</span><span class="nm">Show one version only</span><span class="ck"></span></button>`:""}
<p class="vsec">Included in this app</p>${list.map(x=>`<button class="vo" data-vsel="${x[0]}" aria-checked="${x[0]===cur}"><span class="ab">${esc(x[1])}</span><span class="nm">${esc(x[2])}<small>${esc(desc[x[0]]||"")}</small></span><span class="ck"></span></button>`).join("")}
<p class="vsec">Read this chapter online</p><div class="bgl">${EXTV.map(x=>`<a href="https://www.biblegateway.com/passage/?search=${encodeURIComponent(books[rdB].name+" "+rdC)}&version=${x}" target="_blank" rel="noopener noreferrer">${x} \u2197</a>`).join("")}</div><p class="vfoot">NKJV, NIV, ESV, NLT and NASB are protected by copyright, so they cannot be copied into this free app. These links open ${esc(books[rdB].name)} ${rdC} on BibleGateway.</p>`;
 $("vpk").classList.add("on")}
function closeVpk(){const v=$("vpk");if(v)v.classList.remove("on");vpkMode=null}
$("vpk").addEventListener("click",e=>{const t=e.target;if(t===$("vpk")||t.closest("[data-vpkx]")){closeVpk();return}const o=t.closest("[data-vsel]");if(!o)return;const v=o.dataset.vsel;
 if(vpkMode==="main"){rdVer=v||"kjv";if(rdPar===rdVer)rdPar=null}else rdPar=v||null;
 try{localStorage.setItem("su_ver",JSON.stringify([rdVer,rdPar]))}catch(e){}closeVpk();renderSheet(true)});
function keyWordsHtml(b,c){needWords(b);const kw=keyWords(b,c),he=b<39;
 if(!kw)return`<div class="kw"><div class="kwsrc">Loading the ${he?"Hebrew":"Greek"} key words for this chapter…</div></div>`;if(!kw.length&&!kw.names.length)return"";
 const first=l=>{const t=(l||"").split("\n")[0];return t.length>180?t.slice(0,180)+"…":t};
 const gl=g=>(g||"").split(":")[0].trim(); // STEPBible glosses like "land: country/planet" -> "land"
 return`<details class="kw"${kwOpen?" open":""} data-kw><summary>Key ${he?"Hebrew":"Greek"} words in this chapter<small>${kw.length?kw.map(k=>esc(gl(k.L[2]))).join(" · "):"People and places"}</small></summary>
${kw.map(k=>`<div class="kwi"><span class="o${he?" he":""}" lang="${he?"he":"grc"}">${esc(k.L[0])}</span><span class="t">${esc(k.L[1])}</span><span class="g">“${esc(gl(k.L[2]))}” · ${k.n} times in this chapter</span>${k.L[3]?`<details><summary>Meaning</summary><p>${esc(first(k.L[3]))}</p><p class="meta"><a href="${stepUrl(k.s)}" target="_blank" rel="noopener">Full entry on STEPBible</a></p></details>`:""}<div class="vv">${k.verses.slice(0,10).map(v=>`<button data-kwv="${chs[chBase[b]+c-1].v0+Math.max(v,1)-1}">v. ${v}</button>`).join("")}${k.verses.length>10?`<span class="meta" style="margin:6px 0 0">+${k.verses.length-10} more</span>`:""}</div></div>`).join("")}
${kw.names.length?`<div class="kwn"><b>People and places named:</b> ${kw.names.map(n=>`<span lang="${he?"he":"grc"}">${esc(n.L[0])}</span> ${esc(n.L[2])}`).join(" · ")}</div>`:""}
<div class="kwsrc">Words used two or more times in this chapter, most frequent first (everyday words like \u201csay\u201d, \u201cbe\u201d and \u201ccome\u201d, and names, are left out). Tap a verse number to read that verse with its original words. Words and meanings: STEPBible.org (CC BY 4.0)${he?"":", Dodson Lexicon (public domain)"}.</div></details>`}
let kwOpen=false;
const KWSTOP=new Set(['G1510','G3004','G2036','G2046','G2064','G1096','G3956','G4160','G1325','G2192','G3708','G1492','H0559','H1961','H6213','H0935','H5414','H3605','H1696','H7200','H3212','H1980','H3318']);

/* ---------- v13: chapter connections, reader toolbar and pickers, caches ---------- */
let frameSkip=0,CCK=null,CCV=null;
function chapConn(){const key=selBook+"|"+selChap+"|"+T();if(key===CCK)return CCV;const cnt=new Map(),t=T();
 if(selBook===null){CCK=key;CCV={list:[],rank:new Map(),cnt};return CCV}
 if(selChap!==null){for(let i=0;i<L;i++){if(vo[i]<t)continue;if(chOf[oS[i]]===selChap)cnt.set(nb[i],(cnt.get(nb[i])||0)+1);else if(chOf[nS[i]]===selChap)cnt.set(ob[i],(cnt.get(ob[i])||0)+1)}}
 else{const b=selBook;if(b<39){for(let j=0;j<27;j++)if(M[b*27+j])cnt.set(j+39,M[b*27+j])}else{for(let o=0;o<39;o++)if(M[o*27+b-39])cnt.set(o,M[o*27+b-39])}}
 cnt.delete(selBook);const list=[...cnt.keys()].sort((a,b)=>cnt.get(b)-cnt.get(a));CCK=key;CCV={list,rank:new Map(list.map((k,i)=>[k,i+1])),cnt};return CCV}
const KWC=new Map(),CNTC=new Map();
function keyWords(b,c){const k=b+":"+c;if(KWC.has(k))return KWC.get(k);const W=WCACHE[b],lx=LEX[b<39?"lexh":"lexg"];if(!W||typeof W!=="object"||!lx||typeof lx!=="object")return null;
 const N=B[b].ch[c-1],tf=new Map(),where=new Map(),names=new Map();
 for(let v=0;v<=N;v++){const ws=W[c+":"+v]||[];const seen=new Set();ws.forEach(w=>{const L=lx[w[3]];if(!L)return;const ty=L[4]||"";
   if(/^N:/.test(ty)){if(!names.has(w[3]))names.set(w[3],{L,n:0});names.get(w[3]).n++;return}
   if(KWSTOP.has((w[3].match(/[HG]\d+/)||[""])[0])||!/^(H|G|A):(N|V|A)/.test(ty))return;
   tf.set(w[3],(tf.get(w[3])||0)+1);if(!seen.has(w[3])){seen.add(w[3]);if(!where.has(w[3]))where.set(w[3],[]);where.get(w[3]).push(v)}})}
 // Words that recur in this chapter (2+ times) carry its themes; among equals, the less common word first.
 const sc=[];tf.forEach((n,s)=>{if(n>=2)sc.push([s,n,lx[s][5]||1])});sc.sort((a,b)=>b[1]-a[1]||a[2]-b[2]);
 const out=sc.slice(0,6).map(([s,n],i)=>({s,n,L:lx[s],verses:where.get(s),mk:"abcdef"[i]}));
 out.names=[...names.values()].sort((a,b)=>b.n-a.n).slice(0,10);
 out.byVerse=new Map();out.forEach(k=>k.verses.forEach(v=>{const a=out.byVerse.get(v)||"";out.byVerse.set(v,a+k.mk)}));KWC.set(k,out);return out}
function fnMarks(b,c,x){return "";const kw=keyWords(b,c);if(!kw)return"";const m=kw.byVerse.get(x);return m?[...m].map(l=>`<span class="fn">${l}</span>`).join(""):""}
function chapCounts(v0,n){const k=v0+":"+n;let cnt=CNTC.get(k);if(cnt)return cnt;cnt=new Map();for(let i=0;i<L;i++){const a=oS[i],z=oE[i],a2=nS[i],z2=nE[i];if(z>=v0&&a<v0+n)for(let v=Math.max(a,v0);v<=Math.min(z,v0+n-1);v++)cnt.set(v,(cnt.get(v)||0)+1);if(z2>=v0&&a2<v0+n)for(let v=Math.max(a2,v0);v<=Math.min(z2,v0+n-1);v++)cnt.set(v,(cnt.get(v)||0)+1)}CNTC.set(k,cnt);return cnt}
let refStepBook=null;
function openRefPicker(){refStepBook=null;vpkMode="ref";renderRefPicker();$("vpk").classList.add("on")}
function renderRefPicker(){const te=rdVer==="tel",nm=i=>te?TELN[i]:books[i].name;
 if(refStepBook===null){let h=`<div class="vh"><b>Choose a book</b><button class="btn" data-vpkx>Done</button></div>`;let g=-1;
  books.forEach((b,i)=>{const gi=INFO[i][0];if(gi!==g){if(g!==-1)h+=`</div>`;g=gi;h+=`<p class="vsec">${GRP[gi]}</p><div class="bgrid">`}h+=`<button data-pkb="${i}" class="${i===rdB?"on":""}">${esc(nm(i))}</button>`});
  $("vpkb").innerHTML=h+`</div>`}
 else{const b=refStepBook,N=B[b].ch.length;$("vpkb").innerHTML=`<div class="vh"><b>${esc(nm(b))}</b><button class="btn" data-pkback>\u2039 Books</button></div><p class="vsec">Choose a chapter</p><div class="cgrid">${Array.from({length:N},(_,k)=>`<button data-pkc="${k+1}" class="${b===rdB&&k+1===rdC?"on":""}">${k+1}</button>`).join("")}</div>`}}
$("vpk").addEventListener("click",e=>{const t=e.target;let el;
 if(el=t.closest("[data-pkb]")){const b=+el.dataset.pkb;if(B[b].ch.length===1){closeVpk();openReader(b,1);return}refStepBook=b;renderRefPicker();$("vpkb").scrollTop=0;return}
 if(t.closest("[data-pkback]")){refStepBook=null;renderRefPicker();return}
 if(el=t.closest("[data-pkc]")){const b=refStepBook,c=+el.dataset.pkc;closeVpk();openReader(b,c);return}},true);
function readerHtml(){const b=rdB,c=rdC,N=B[b].ch.length,g=chBase[b]+c-1,v0=chs[g].v0,n=chs[g].n,te=rdVer==="tel";
 needVer(rdVer);if(rdPar)needVer(rdPar);needWords(b);
 const cnt=chapCounts(v0,n),vn=k=>VERS.find(x=>x[0]===k),nm=te?TELN[b]:books[b].name;
 let h=`<div class="rtool"><button class="nav" data-rnav="-1" aria-label="Previous chapter" ${b===0&&c===1?"disabled":""}>\u2039</button><button class="ref" data-rpick aria-haspopup="dialog">${esc(nm)} ${c}</button><button class="ver" data-vpick="main" aria-haspopup="dialog">${esc(vn(rdVer)[1])}</button><button class="par${rdPar?" on":""}" data-vpick="par" aria-haspopup="dialog" aria-label="Compare with another version">\u21c4 ${rdPar?esc(vn(rdPar)[1]):"Compare"}</button><button class="nav" data-rnav="1" aria-label="Next chapter" ${b===65&&c===N?"disabled":""}>\u203a</button></div>
<h2 class="rtitle">${esc(nm)} ${c}</h2><p class="rsub">${esc(vn(rdVer)[2])}${rdPar?" \u00b7 with "+esc(vn(rdPar)[2]):""} \u00b7 ${n} verses</p>
${keyWordsHtml(b,c)}`;
 const st=k=>VERR[k]==="failed"?`<p class="meta">${esc(vn(k)[2])} could not be loaded right now. Showing KJV.</p>`:(k!=="kjv"&&!VTX[k])?`<p class="meta">Loading ${esc(vn(k)[2])}\u2026</p>`:"";
 h+=st(rdVer)+(rdPar?st(rdPar):"");if(!FULL&&!VT.get(v0))h+=`<p class="meta">Loading the full Bible text\u2026</p>`;
 for(let k=0;k<n;k++){const v=v0+k,main=vtextV(rdVer,v),useV=main==null||VERR[rdVer]==="failed"?"kjv":rdVer,t=useV==="kjv"?vtext(v):main,x=cnt.get(v)||0;
  const pt=rdPar?vtextV(rdPar,v):null;
  h+=`<button class="rv${rdV===v?" on":""}${useV==="tel"?" te":""}" data-rv="${v}"><sup>${k+1}</sup>${esc(t||"")}${fnMarks(b,c,k+1)}${x?`<span class="xr">\u2192 ${x}</span>`:""}${rdPar&&pt?`<span class="par${rdPar==="tel"?" te":""}"><b style="font:600 10.5px Inter,sans-serif;color:var(--mute)">${esc(vn(rdPar)[1])}</b> ${esc(pt)}</span>`:""}</button>`;
  if(rdV===v){const ls=verseLinks(v);
   h+=`<div class="xl"><div class="vt" role="tablist"><button data-rtab="links" aria-pressed="${rdTab==="links"}">Links (${ls.length})</button><button data-rtab="words" aria-pressed="${rdTab==="words"}">${b<39?"Hebrew":"Greek"} words</button><button data-rtab="explain" aria-pressed="${rdTab==="explain"}">Explain</button></div>`;
   if(rdTab==="links")h+=ls.length?ls.slice(0,8).map(([i,side])=>{const s=side?oS[i]:nS[i],e=side?oE[i]:nE[i];return`<p><b>${refRange(s,e)}</b>${esc(vtext(s))}${e>s?" \u2026":""}</p><button class="lnk" data-xo="${i}">See this link in 3D</button>`}).join(""):`<p>No Old\u2013New Testament links are listed for this verse.</p>`;
   else if(rdTab==="words")h+=wordsHtml(v);
   else h+=`<p class="meta">A short explanation for this verse, written by AI from the verse, its ${b<39?"Hebrew":"Greek"} words and its linked passages.</p><button class="btn p" data-vexp="${v}" style="width:100%">Explain ${bn0(v)}</button><div class="expl" id="vx${v}" aria-live="polite"></div>`;
   h+=`</div>`}}
 const pb=c>1?[b,c-1]:b>0?[b-1,B[b-1].ch.length]:null,nx=c<N?[b,c+1]:b<65?[b+1,1]:null,lab=x=>`${te?TELN[x[0]]:books[x[0]].name} ${x[1]}`;
 h+=`<div class="rfoot">${pb?`<button class="btn" data-rnav="-1">\u2039 ${esc(lab(pb))}</button>`:""}${nx?`<button class="btn p" data-rnav="1">${esc(lab(nx))} \u203a</button>`:""}</div>`;
 return h}

/* ---------- v14: badge spacing, calmer interactions ---------- */
function relaxBadges(BD,taken,w,h){if(!BD.length)return;const top=66;
 BD.forEach(b=>{b.ox=b.x;b.oy=b.y});
 for(let it=0;it<40;it++){for(let i=0;i<BD.length;i++){const a=BD[i];
   for(let j=i+1;j<BD.length;j++){const b=BD[j],D=a.r+b.r+3;let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=D)continue;if(d<0.01){dx=Math.cos(i*2.4+j);dy=Math.sin(i*2.4+j);d=1}const m=(D-d)/2/d;a.x-=dx*m;a.y-=dy*m;b.x+=dx*m;b.y+=dy*m}
   for(const t of taken){if(t[1]===0&&t[0]===w-120)continue;const cx=Math.max(t[0],Math.min(t[2],a.x)),cy=Math.max(t[1],Math.min(t[3],a.y));let dx=a.x-cx,dy=a.y-cy,d=Math.hypot(dx,dy);if(d>=a.r+2)continue;if(d<0.01){dy=a.y<(t[1]+t[3])/2?-1:1;dx=0;d=1}const m=(a.r+2-d)/d;a.x+=dx*m;a.y+=dy*m}
   if(it<20){a.x+=(a.ox-a.x)*0.03;a.y+=(a.oy-a.y)*0.03}a.x=Math.max(a.r+2,Math.min(w-a.r-2,a.x));a.y=Math.max(a.r+2,Math.min(h-a.r-2,a.y));if(a.x>w-130&&a.y<top)a.y=top}}
 BD.forEach(b=>{b.d.style.display="block";b.d.style.opacity=b.f<-0.2?"0.8":"1";b.d.style.zIndex=String(100-b.k);b.d.style.transform=`translate(${b.x.toFixed(1)}px,${b.y.toFixed(1)}px) translate(-50%,-50%)`})}
let readerFull=false;
const ICO_EXP='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
const ICO_COL='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';

/* ---------- v15: tap a number or name on the ring ---------- */
labDiv.addEventListener("click",e=>{const d=e.target.closest(".lab.nb,.lab.cnl");if(!d||selBook===null)return;const k=+d.dataset.bi;if(isNaN(k)||k===selBook)return;
 const o=selBook<39?selBook:k,n=selBook<39?k:selBook;if(uiMode!=="book"){select(selBook)}selPair={o,n};selChap=null;shown=6;frameBooks([o,n]);applyLook();panel()});
/* ---------- loop ---------- */
let last=performance.now(),frames=0;
let slowN=0,slowSum=0;
/* v15: keep the wheel smooth on slower phones by adjusting render sharpness every ~1.5 s */
const PR_MAX=Math.min(devicePixelRatio||1,1.5),PR_STEPS=[1.5,1.25,1,0.85,0.7].filter(x=>x<=PR_MAX+1e-6);if(!PR_STEPS.length||PR_STEPS[0]<PR_MAX)PR_STEPS.unshift(PR_MAX);
let prI=0,arN=0,arSum=0,arGood=0;
function adaptRes(raw){if(QUALITY!=="auto"||intro||(sheetState==="full"&&!panelMin)||document.hidden||raw>0.5)return;arSum+=raw;arN++;if(arN<90)return;const avg=arSum/arN;arN=0;arSum=0;
 if(avg>0.034&&prI<PR_STEPS.length-1){prI++;arGood=0;renderer.setPixelRatio(PR_STEPS[prI]);resize()}
 else if(avg<0.019&&prI>0){if(++arGood>=3){prI--;arGood=0;renderer.setPixelRatio(PR_STEPS[prI]);resize()}}else arGood=0}
function frame(now){if(sheetState==="full"&&!panelMin&&$("panel").classList.contains("on")&&(frameSkip=(frameSkip+1)%3)!==0){requestAnimationFrame(frame);return}const raw=(now-last)/1000,dt=Math.min(0.05,raw);last=now;frames++;
 if(intro){intro.t+=dt;const k=Math.min(1,intro.t/2.6),e=1-Math.pow(1-k,3);rad=intro.r0+(intro.r1-intro.r0)*e;el=0.15+(0.52-0.15)*e;th+=dt*0.25*(1-k);if(k>=1)intro=null}
 else if(tTh!==null){let d=((tTh-th+Math.PI*3)%(Math.PI*2))-Math.PI;th+=d*Math.min(1,dt*5);if(Math.abs(d)<0.002)tTh=null}
 else if(spin&&selBook===null&&now-lastTouch>2500&&ptrs.size===0)th+=dt*0.12;
 TARGET.lerp(tTgt,Math.min(1,dt*3));
 if(tRad!==null&&!intro){rad+=(tRad-rad)*Math.min(1,dt*3);if(Math.abs(tRad-rad)<0.05)tRad=null}
 if(selBook!==null){halo.scale.setScalar(3.6+0.5*Math.sin(now/350));halo.material.opacity=0.55+0.2*Math.sin(now/350)}
 if(pulseT>=0){pulseT+=dt;pulse.scale.setScalar(0.5+pulseT*5);pulse.material.opacity=Math.max(0,1-pulseT/1.1)*.8;if(pulseT>1.1){pulseT=-1;pulse.material.opacity=0}}
 if(pOn)stepParticles(dt,!reduce);
 if(QUALITY==="auto"&&frames>20&&frames<=140){slowSum+=raw;slowN++;if(frames===140&&slowSum/slowN>0.05){pOn=false;pGeo.setDrawRange(0,0);prI=Math.max(prI,PR_STEPS.indexOf(1));renderer.setPixelRatio(1);resize();$("perf").style.display="block";setTimeout(()=>{$("perf").style.display="none"},5000)}}
 adaptRes(raw);
 evTick(now);placeCam();updateLabels();ntLabel();renderer.render(scene,cam);requestAnimationFrame(frame)}
new ResizeObserver(()=>{resize();if(!ptrs.size&&selBook===null)rad=Math.max(rad,fit())}).observe(stage);
resize();rad=fit();if(!reduce){intro={t:0,r0:fit()*1.7,r1:fit()};rad=intro.r0;el=0.15}buildThreads();syncTools();requestAnimationFrame(frame);
{let seen=false;try{seen=localStorage.getItem("su_intro_v1")==="1"}catch(e){}uiMode="none";panelHidden=true;sheetState="peek";startLanding();renderSheet();syncTools()}
window.UNI={credits,chapConn,openRefPicker,keyWords,openVpk,closeVpk,rotate:a=>{th+=a;tTh=null},get el(){return el},get rdVer(){return rdVer},get VTX(){return VTX},get WCACHE(){return WCACHE},get LEX(){return LEX},get CONN(){return CONN},labs:()=>labs.map(d=>d.style.display!=="none"?d.textContent:null).filter(Boolean),openReader,navBack,get navDepth(){return navStack.length},get fullReady(){return !!FULL},vtext,get panelHidden(){return panelHidden},closeIntro,openIntro,storyGo,get storyK(){return storyK},faceP,whyOf,EVD,pick,get uiMode(){return uiMode},get jState(){return jState},get sheet(){return sheetState},get panelMin(){return panelMin},setMin,get lastHits(){return lastHits},JI,J,goStep,openJourney,runSearch:search,promptFor,setSheet,jCount:()=>jCur.length,refQuery,selectChapter,get selChap(){return selChap},chMeta:()=>chMeta,chCur:()=>chCur,get capped(){return chCapped},chapScreen:g=>{const m=chMeta.find(x=>x.g===g);if(!m)return null;tmp.copy(m.pos).project(cam);return{x:(tmp.x*.5+.5)*SW,y:(-tmp.y*.5+.5)*SH}},chs,thumb,INFO,get particles(){return pOn?pCount:0},get perf(){return !pOn},halo,get intro(){return intro},get tRad(){return tRad},surprise,covers,meshes,books,screenOf,get sel(){return selBook},get pair(){return selPair},get labelsOn(){return labelsOn},get th(){return th},get rad(){return rad},get curves(){return curves.length},info:renderer.info,get frames(){return frames},cntBook,M:()=>M,T,L,select,clearSel,tap,facing}}
