// Aggregate-only lexical source triage. Prints NO source, file names, URLs, cookies or snippets.
import fs from 'node:fs';
import path from 'node:path';
const root=process.argv[2],out=process.argv[3];
if(!root||!out)throw Error('Usage: source_signals.mjs <local-export-dir> <safe-report-json>');
const patterns={
 enemyAI:/(?:enemy|target|chase|aggro|seek|pursu|patrol|follow|behavio[u]?r)/gi,
 combat:/(?:damage|attack|projectile|hitbox|collision|cooldown|crit(?:ical)?|knockback)/gi,
 progression:/(?:experience|expPoints|levelUp|level_up|evolution|evolve|upgrade|unlock)/gi,
 spawning:/(?:spawn|wave|enemyCount|mobCount|difficulty|encounter)/gi,
 skills:/(?:skill|ability|buff|debuff|passive|ultimate|perk)/gi,
 rendering:/(?:webgl|three|babylon|shader|mesh|camera|renderer|texture|canvas)/gi,
 persistence:/(?:localStorage|indexedDB|saveGame|loadGame|sessionStorage)/gi
};
const counts=Object.fromEntries(Object.keys(patterns).map(k=>[k,{files:0,mentions:0}]));
let files=0,bytes=0,skipped=0;
function traverse(dir,depth=0){
 if(depth>8||files>=1200||bytes>=73400320||!fs.existsSync(dir))return;
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(files>=1200||bytes>=73400320)break;
  const name=path.join(dir,entry.name),st=fs.lstatSync(name);
  if(st.isSymbolicLink()){skipped++;continue;}
  if(entry.isDirectory()){traverse(name,depth+1);continue;}
  if(!entry.isFile()||!/\.(?:js|mjs|cjs)$/i.test(entry.name))continue;
  if(st.size>12582912||bytes+st.size>73400320){skipped++;continue;}
  const source=fs.readFileSync(name,'utf8');files++;bytes+=st.size;
  for(const[k,rx]of Object.entries(patterns)){rx.lastIndex=0;const m=source.match(rx);if(!m)continue;counts[k].files++;counts[k].mentions+=m.length;}
 }
}
traverse(root);
const data={kind:'aggregate-source-signal-report',rawSourceUploaded:false,filesScanned:files,bytesScanned:bytes,filesSkipped:skipped,lexicalGroups:counts,interpretation:'Triage only, not proof of executed game logic; vendor and unused code can match'};
fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');
const md=['## REA JavaScript検出シグナル（集計のみ）','','**検索語が見つかった事実と、その仕組みが使われていることは別です。** 誤検出・欠落・外部ライブラリ混入の可能性があります。','','スキャンしたJS: '+files+'ファイル、'+bytes+'バイト。スキップ: '+skipped+'。','','| 機能カテゴリ | 該当JS数 | 出現回数 |','|---|---:|---:|',...Object.entries(counts).map(([k,v])=>'| '+k+' | '+v.files+' | '+v.mentions+' |'),'','コードや素材、元URL、セッション情報は公開していません。',''];
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md.join('\n')+'\n');
console.log('Aggregate lexical report generated; source content not logged. JS files: '+files);
