// Hash-only static call graph hypothesis; no source, names or URLs are emitted.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const [root,out,deps]=process.argv.slice(2);
if(!root||!out||!deps)throw Error('Usage: node callgraph_map.mjs exported_dir out.json deps_dir');
const req=createRequire(path.resolve(deps,'package.json'));
const acorn=req('acorn'),walk=req('acorn-walk'),hash=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,16);
const groups={
  ai:[/(?:enemy|monster|chase|target|aggro|patrol)/i,/(?:move|distanc|veloc|speed|attack|cooldown)/i],
  xp:[/(?:experience|expPoints|levelUp|currentXp|totalXp|expRequired|xpNeeded)/i,/(?:level|threshold|upgrade|reward)/i],
  combat:[/(?:damage|attack|hitbox|projectile|crit(?:ical)?)/i,/(?:health|hp|target|cooldown|collision|defense)/i],
  spawn:[/(?:spawn|wave|enemyCount|mobCount)/i,/(?:enemy|frequency|interval|difficulty|rate|timer)/i]
};
function files(dir,depth=0){
 if(depth>8||!fs.existsSync(dir))return[];
 return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>{
  const p=path.join(dir,e.name),st=fs.lstatSync(p);
  if(st.isSymbolicLink())return[];
  if(e.isDirectory())return files(p,depth+1);
  return e.isFile()&&/\.(?:js|mjs|cjs)$/i.test(e.name)&&st.size<13*1024*1024?[p]:[];
 });
}
const res={kind:'static-callgraph-hypothesis-v1',verifiedExecution:false,gameMechanicsConfirmed:false,files:0,sourceBytes:0,parseErrors:0,
 scannedFunctions:0,lexicalCandidates:0,uniqueIdentifierCallMatches:0,possibleCandidateEdges:0,ambiguousCalls:0,byCategory:{},candidates:[],
 limitations:'Lexical direct-call matches within the same JS bundle. Shadowed identifiers, dynamic dispatch and minification make these incomplete or wrong; not a runtime call graph.'};
res.byCategory=Object.fromEntries(Object.keys(groups).map(k=>[k,{candidates:0,possibleOutgoingCalls:0,possibleCandidateLinks:0}]));
for(const file of files(root).slice(0,80)){
 const src=fs.readFileSync(file,'utf8');
 if(res.sourceBytes+Buffer.byteLength(src)>80*1024*1024)break;
 res.sourceBytes+=Buffer.byteLength(src);res.files++;
 let ast;for(const st of ['module','script']){try{ast=acorn.parse(src,{ecmaVersion:'latest',sourceType:st,allowHashBang:true});break;}catch{}}
 if(!ast){res.parseErrors++;continue;}
 const digest=hash(src),funcs=[],named=new Map();
 walk.fullAncestor(ast,(node,state,anc)=>{
  if(!['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(node.type))return;
  const parent=anc[anc.length-2];let name;
  if(node.type==='FunctionDeclaration'&&node.id?.name)name=node.id.name;
  else if(parent?.type==='VariableDeclarator'&&parent.id?.name)name=parent.id.name;
  else if(parent?.type==='AssignmentExpression'&&parent.left?.type==='Identifier')name=parent.left.name;
  else if(parent?.type==='Property'&&parent.key?.type==='Identifier')name=parent.key.name;
  const entry={node,id:hash(digest+':'+node.start)};
  funcs.push(entry);
  if(name){if(!named.has(name))named.set(name,[]);named.get(name).push(entry);}
 });
 res.scannedFunctions+=funcs.length;
 const typeOf=f=>{
  if(f.node.end-f.node.start<50||f.node.end-f.node.start>50000)return[];
  const s=src.slice(f.node.start,f.node.end);
  return Object.entries(groups).filter(([k,arr])=>arr.every(rx=>rx.test(s))).map(([k])=>k);
 };
 const candidates=funcs.filter(f=>{f.groups=typeOf(f);return f.groups.length>0;});
 const candIds=new Set(candidates.map(f=>f.id));
 for(const f of candidates){
  res.lexicalCandidates++;
  const edges=new Set();let calls=0,ambiguous=0;
  walk.simple(f.node.body||f.node,{CallExpression:n=>{
   if(n.callee.type!=='Identifier')return;
   const found=named.get(n.callee.name)||[];
   if(found.length===1){calls++;const tgt=found[0];if(tgt.id!==f.id&&candIds.has(tgt.id))edges.add(tgt.id);}
   else if(found.length>1)ambiguous++;
  }});
  res.uniqueIdentifierCallMatches+=calls;res.possibleCandidateEdges+=edges.size;res.ambiguousCalls+=ambiguous;
  for(const group of f.groups){const c=res.byCategory[group];c.candidates++;c.possibleOutgoingCalls+=calls;c.possibleCandidateLinks+=edges.size;}
  if(res.candidates.length<100)res.candidates.push({id:f.id,sourceHash:digest,byteOffset:f.node.start,bytes:f.node.end-f.node.start,
   categories:f.groups,possibleOutgoingCalls:calls,possibleCandidateEdges:[...edges].slice(0,12),ambiguousCalls:ambiguous});
 }
}
fs.writeFileSync(out,JSON.stringify(res,null,2)+'\n');
const rows=Object.entries(res.byCategory).map(([k,v])=>'| '+k+' | '+v.candidates+' | '+v.possibleOutgoingCalls+' | '+v.possibleCandidateLinks+' |');
const md=['## 静的な関数間参照の候補','','**ゲーム内で実行されたことを示すものではありません。**','','JS: '+res.files+'、関数: '+res.scannedFunctions+'、候補: '+res.lexicalCandidates+'。','','| 領域 | 候補関数 | 参照候補 | 候補間の参照候補 |','|---|---:|---:|---:|',...rows,'','公開データはハッシュ・位置・集計のみです。識別子名・ソース本文は公開しません。',''];
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md.join('\n')+'\n');
console.log('Static call graph hypothesis completed. No source code printed.');
