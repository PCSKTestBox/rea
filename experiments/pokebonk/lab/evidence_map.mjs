// Passive AST candidate finder. Never publishes downloaded JS, variable names, paths, URLs or snippets.
// Static evidence candidates only: results do NOT prove PokéBonk's actual gameplay formulas.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const [root,out,deps]=process.argv.slice(2);
if(!root||!out||!deps)throw Error('Usage: evidence_map.mjs input_dir output_json deps_dir');
const req=createRequire(path.resolve(deps,'package.json'));
const acorn=req('acorn'),walk=req('acorn-walk');
const rules={
 enemyAI:[/(?:\benem(?:y|ies)\b|\bmob\b|\bmonster\b|enemy[A-Z]|Enemy|\baggro\b)/,/(?:\btarget\b|\bchase\b|\bfollow\b|\bseek\b|target[A-Z]|Target|\bsteer\b|\bdistance\b|\bvelocity\b|moveSpeed)/],
 experienceLevel:[/(?:\bexperience\b|\bXP\b|\bxp\b|currentXp|totalXp|experiencePoints|exp(?:Gain|Needed|Required))/,/(?:\blevel\b|levelUp|nextLevel|levelThreshold|levelCost|currentLevel|\bupgrade\b)/],
 combatDamage:[/(?:\bdamage\b|\battack\b|\bhitbox\b|damage[A-Z]|attack[A-Z]|\bcrit(?:ical)?\b)/,/(?:\bhp\b|\bhealth\b|\bcooldown\b|\bprojectile\b|\bdefense\b|\bcollision\b|\btarget\b)/],
 spawningDifficulty:[/(?:\bspawn\b|spawn[A-Z]|spawnRate|spawnInterval|\bwave\b|wave[A-Z])/,/(?:\benemy\b|\bmonster\b|\bdifficulty\b|\bspawnCount\b|\bspawnLimit\b|\binterval\b|\bfrequency\b)/],
 skillsAndEvolution:[/(?:\bskill\b|\bability\b|\bperk\b|\bupgrade\b|\bevolution\b|skill[A-Z]|ability[A-Z])/,/(?:\bxp\b|\blevel\b|\bdamage\b|\battack\b|\bhealth\b)/]
};
const buckets=Object.fromEntries(Object.keys(rules).map(k=>[k,{n:0,sourceIds:new Set(),rank:[]}]));
const report={schema:'rea-mechanic-candidate-map-v1',classification:'static-heuristic',mechanicsVerified:false,rawSourceIncluded:false,
 caveat:'Term co-occurrence inside JavaScript functions is not proof of active PokéBonk gameplay mechanics, exact formulas or server logic.',
 files:0,bytes:0,parsed:0,parseErrors:0,functionsExamined:0,candidates:0,categories:{}};
let accepted=0;
function gather(dir,depth=0){
 if(depth>8||accepted>=80||!fs.existsSync(dir))return [];
 const arr=[];
 for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  if(accepted>=80)break;
  const file=path.join(dir,e.name),st=fs.lstatSync(file);
  if(st.isSymbolicLink())continue;
  if(e.isDirectory()){arr.push(...gather(file,depth+1));continue;}
  if(!e.isFile()||!/\.(?:js|mjs|cjs)$/i.test(e.name)||st.size>14*1024*1024||report.bytes+st.size>80*1024*1024)continue;
  arr.push(file);accepted++;report.bytes+=st.size;
 }
 return arr;
}
for(const file of gather(root)){
 report.files++;
 const s=fs.readFileSync(file,'utf8'),digest=crypto.createHash('sha256').update(s).digest('hex').slice(0,20);
 let ast;
 for(const sourceType of ['module','script'])try{ast=acorn.parse(s,{ecmaVersion:'latest',sourceType,allowHashBang:true});break;}catch{}
 if(!ast){report.parseErrors++;continue;}
 report.parsed++;
 const funcs=[];
 walk.simple(ast,{FunctionDeclaration:n=>funcs.push(n),FunctionExpression:n=>funcs.push(n),ArrowFunctionExpression:n=>funcs.push(n)});
 for(const f of funcs){
  report.functionsExamined++;
  const span=f.end-f.start;
  if(span<40||span>50000)continue;
  const text=s.slice(f.start,f.end);
  const kinds=Object.keys(rules).filter(k=>rules[k].every(rx=>rx.test(text)));
  if(!kinds.length)continue;
  let ops=0,cmp=0,numbers=0,branches=0,loops=0;
  try{walk.simple(f.body||f,{
   BinaryExpression:n=>{ops++;if(['<','<=','>','>=','===','!==','==','!='].includes(n.operator))cmp++;},
   LogicalExpression:()=>ops++,AssignmentExpression:()=>ops++,Literal:n=>{if(typeof n.value==='number')numbers++;},
   IfStatement:()=>branches++,ConditionalExpression:()=>branches++,
   ForStatement:()=>loops++,ForOfStatement:()=>loops++,WhileStatement:()=>loops++
  });}catch{continue;}
  report.candidates++;
  const score=Math.min(25,kinds.length*4+Math.min(5,cmp)+Math.min(4,branches)+(span<8000?3:0));
  const pointer={sourceHash:digest,offset:f.start,spanBytes:span,score,
   shape:{operations:ops,comparisons:cmp,numericLiterals:numbers,branches,loops}};
  for(const k of kinds){const b=buckets[k];b.n++;b.sourceIds.add(digest);b.rank.push(pointer);}
 }
}
for(const [k,b]of Object.entries(buckets)){
 b.rank.sort((a,z)=>z.score-a.score||a.spanBytes-z.spanBytes);
 report.categories[k]={candidateFunctions:b.n,sourceBundles:b.sourceIds.size,topCandidates:b.rank.slice(0,5)};
}
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
const summary=['## REA: 敵AI・経験値・戦闘のコード構造候補','','**関数の候補を検出しただけです。実際の計算式・挙動を特定した結果ではありません。**','','解析対象JS '+report.files+'個、構文解析成功 '+report.parsed+'個、失敗 '+report.parseErrors+'個。','','| 分野 | 候補関数 | 該当JS |','|---|---:|---:|',
 ...Object.entries(report.categories).map(([k,v])=>'| '+k+' | '+v.candidateFunctions+' | '+v.sourceBundles+' |'),
 '', '候補の位置はハッシュとバイト位置で記録。公開レポート・Artifactsにソース本文は含めていません。',''];
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary.join('\n')+'\n');
console.log('AST evidence triage complete; parsed='+report.parsed+' matching-candidates='+report.candidates);
