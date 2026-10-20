// Standalone synthetic survival model; not PokéBonk game mechanics or extracted code.
import fs from 'node:fs';
const defaults={speed:1.2,spawn:1.15,xp:1.25,trials:40};
const cli={'--enemy-speed':'speed','--spawn-frequency':'spawn','--xp-cost':'xp','--trials':'trials','--output':'output'};
const opt={...defaults,output:''};
for(let i=2;i<process.argv.length;i+=2){const k=cli[process.argv[i]];if(!k || !process.argv[i+1])throw Error('Unexpected arguments');opt[k]=k==='output'?process.argv[i+1]:Number(process.argv[i+1]);}
for(const k of ['speed','spawn','xp'])if(!Number.isFinite(opt[k])||opt[k]<0.5||opt[k]>2)throw Error(k+' must be 0.5..2');
if(!Number.isInteger(opt.trials)||opt.trials<5||opt.trials>200)throw Error('trials must be 5..200');
function randomGen(seed){let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function simulate(seed,p){
 const rnd=randomGen(seed),dt=.2,T=180,es=[];let hp=135,level=1,xp=0,kills=0,damage=0,t=0,next=0;
 while(t<T&&hp>0){
  if(t>=next){es.push({dist:12+rnd()*10,hp:30+.29*t,speed:(.9+rnd()*.65)*p.speed,hit:2.3+.017*t});next=t+Math.max(.65,(2.35-.005*t)/p.spawn);}
  for(const e of es){e.dist=Math.max(0,e.dist-e.speed*dt);if(e.dist<1.25){const d=e.hit*dt;hp-=d;damage+=d;}}
  let index=-1,near=Infinity;for(let j=0;j<es.length;j++)if(es[j].dist<near){near=es[j].dist;index=j;}
  if(index>=0&&near<=7.5){
   const e=es[index];e.hp-=12.5*Math.pow(1.15,level-1)*dt;
   if(e.hp<=0){es.splice(index,1);kills++;xp+=9;let need=17*Math.pow(1.28,level-1)*p.xp;
    while(xp>=need&&level<60){xp-=need;level++;need=17*Math.pow(1.28,level-1)*p.xp;}
   }
  }
  t+=dt;
 }
 return{survival:Math.min(T,t),kills,level,damage,completed:hp>0};
}
function stats(a){const s=[...a].sort((x,y)=>x-y);return{mean:Number((a.reduce((x,y)=>x+y,0)/a.length).toFixed(2)),median:s[Math.round((s.length-1)/2)]};}
function summary(rs){const m={};for(const k of ['survival','kills','level','damage'])m[k]=stats(rs.map(x=>x[k]));m.completedPct=Number((100*rs.filter(x=>x.completed).length/rs.length).toFixed(1));return m;}
const seeds=Array.from({length:opt.trials},(_,i)=>(0x9e3779b9+i*137)>>>0);
const base=summary(seeds.map(x=>simulate(x,{speed:1,spawn:1,xp:1})));
const changed=summary(seeds.map(x=>simulate(x,opt)));
const data={source:'independent-synthetic-model',pokebonkMechanicsVerified:false,trialCount:opt.trials,baseline:{speed:1,spawn:1,xp:1,metrics:base},modified:{speed:opt.speed,spawn:opt.spawn,xp:opt.xp,metrics:changed}};
if(opt.output)fs.writeFileSync(opt.output,JSON.stringify(data,null,2)+'\n');
const rows=[['生存時間 (秒)',base.survival.mean,changed.survival.mean],['撃破数',base.kills.mean,changed.kills.mean],['到達レベル',base.level.mean,changed.level.mean],['被ダメージ',base.damage.mean,changed.damage.mean],['180秒生存率 (%)',base.completedPct,changed.completedPct]];
const md=['## ゲームバランス仮モデルのA/B比較','','**実ゲームの計算式・実測結果ではありません。** 独立シミュレーターの仮定値です。','','乱数シードを一致させて '+opt.trials+'回ずつ実行。変更：敵速度 '+opt.speed+'倍／敵出現 '+opt.spawn+'倍／必要XP '+opt.xp+'倍。','','| 指標 | 基準 | 変更後 |','|---|---:|---:|',...rows.map(r=>'| '+r[0]+' | '+r[1]+' | '+r[2]+' |'),''];
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md.join('\n')+'\n');
console.log('Independent synthetic balance model completed '+opt.trials+' paired trials; game code not used.');
