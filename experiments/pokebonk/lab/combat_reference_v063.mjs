// Original partial balance model based on a dated third-party PokéBonk v0.6.3 review.
// This is NOT a copy of game code and has NOT been validated against the live game build.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source='https://poke-bonk.com/combat-mechanics/';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const typeMultiplier=({strong=0,resist=0,immune=0})=>clamp(1.35**strong*0.8**resist*0.5**immune,0.4,1.8);
function partialHit({base=100,level=1,upgrade=1,matching=false,type=1,weather=1}) {
 if(!(base>=0&&level>=1&&level<=99&&upgrade>=0&&type>=0&&weather>=0))throw Error('Out of range');
 return base*1.3*upgrade*(1+0.04*(level-1))*(matching?1.25:1)*type*weather;
}
function cooldown(base,modifier=1,speed=1) {
 if(!(base>=0&&modifier>=0&&speed>0))throw Error('Invalid cooldown inputs');
 return Math.max(0.12,base*modifier/speed);
}
assert.equal(typeMultiplier({strong:2}),1.8);
assert.ok(Math.abs(typeMultiplier({resist:2})-0.64)<1e-12);
assert.equal(typeMultiplier({immune:2}),0.4);
assert.equal(partialHit({base:100}),130);
assert.ok(Math.abs(partialHit({base:100,matching:true,type:1.35})-219.375)<1e-9);
assert.equal(cooldown(1.6,1,2),0.8);
const scenarios=[
 {name:'neutral',params:{base:100}},
 {name:'advantage_and_same_type',params:{base:100,matching:true,type:1.35}},
 {name:'dual_advantage_clamped',params:{base:100,type:typeMultiplier({strong:2})}},
 {name:'resisted_and_weather_reduced',params:{base:100,type:0.8,weather:0.75}},
 {name:'move_level_5_weather_boost',params:{base:100,level:5,matching:true,weather:1.3}}
].map(x=>({name:x.name,partialHit:Number(partialHit(x.params).toFixed(4))}));
const result={source,reviewedVersion:'0.6.3',reviewedDate:'2026-10-18',thirdPartySource:true,
 liveBuildVerified:false,model:'partial pre-mitigation hit estimate, NOT in-game DPS',
 caution:'Stats, crits, shields, status, positioning and other effects are deliberately excluded; these are hypothetical controlled calculations, not measured hits.',
 rules:{typeAdvantage:1.35,typeResist:0.8,typeImmunity:0.5,sameTypeBonus:1.25,weatherBoost:1.3,weatherReduced:0.75,moveLevelStep:0.04},scenarios};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');
if(process.env.GITHUB_STEP_SUMMARY) {
 const md=['## 旧版資料に基づく戦闘倍率の部分モデル','','**第三者が分析した0.6.3の数値であり、現行版の実測や最終DPSではありません。**','','| 比較例（仮の基礎威力100） | 部分計算値 |','|---|---:|',...scenarios.map(x=>'| '+x.name+' | '+x.partialHit+' |'),'','参照: '+source,''];
 fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md.join('\n')+'\n');
}
console.log('Source-labeled historical combat model assertions passed.');
