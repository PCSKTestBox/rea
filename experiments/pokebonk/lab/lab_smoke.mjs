// Offline smoke tests for the independently written HTML simulator. No website contact.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('./balance_lab.html',import.meta.url),'utf8');
assert.ok(html.includes('独立シミュレーター'));
assert.ok(!/(?:fetch\s*\(|XMLHttpRequest|WebSocket\s*\()/i.test(html),'No remote network calls allowed');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Embedded simulator script missing');
new vm.Script(script,{filename:'balance_lab_inline.js'});
const elements=new Map();
const fakeElement=id=>({
 id,value:0,textContent:'',className:'',style:{},children:[],listeners:{},
 addEventListener(event,handler){this.listeners[event]=handler;},
 append(...children){this.children.push(...children);},
 replaceChildren(...children){this.children=children;},
 getContext(){return null;}
});
const doc={
 getElementById(id){if(!elements.has(id))elements.set(id,fakeElement(id));return elements.get(id);},
 createElement(tag){return fakeElement(tag);}
};
const ctx=vm.createContext({document:doc,Math,Number,Object,Array,String,console,requestAnimationFrame:()=>{}});
vm.runInContext(script,ctx,{timeout:12000});
const same=vm.runInContext('analyze({speed:1,spawn:1,xp:1,trials:20})',ctx,{timeout:12000});
for(const [key,[a,b]] of Object.entries(same)){
 assert.ok(Number.isFinite(a)&&Number.isFinite(b),'Finite metric: '+key);
 assert.ok(Math.abs(a-b)<1e-8,'Identical parameters must produce identical metrics');
}
const different=vm.runInContext('analyze({speed:1.5,spawn:1.5,xp:1.5,trials:20})',ctx,{timeout:12000});
assert.notEqual(different.survival[0],different.survival[1],'A/B simulation should vary for changed parameters');
assert.ok(elements.get('survival').textContent,'Summary UI renders metrics');
assert.ok(elements.get('bars').children.length>=6,'Comparison rows rendered');
console.log('HTML lab passed browserless UI smoke tests and seeded baseline assertions.');
