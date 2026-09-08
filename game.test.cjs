const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function game(){
 const els=new Map(),handlers={};
 const el=id=>{if(!els.has(id))els.set(id,{style:{},focus(){},getContext(){return{}},setPointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:1000,height:650}},addEventListener(n,f){handlers[id+':'+n]=f}});return els.get(id)};
 const sandbox={console,Math,Image:class{decode(){return new Promise(()=>{})}},document:{querySelector:()=>el('scene'),getElementById:el,querySelectorAll:()=>[],addEventListener:(n,f)=>handlers[n]=f},window:{addEventListener(){}},requestAnimationFrame(){}};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(__dirname+'/game.js','utf8'),sandbox);
 return {run:c=>vm.runInContext(c,sandbox),key:()=>handlers.keydown({code:'Space',repeat:false,preventDefault(){}}),click:(x,y)=>handlers['scene:pointerdown']({clientX:x,clientY:y,pointerId:1}),up:(x,y)=>handlers['scene:pointerup']({clientX:x,clientY:y})};
}
test('bloom at 90 seconds',()=>{const g=game();g.run('start();state.time=89.98;state.dogNext=200;state.bugNext=200;state.dreamNext=200;step(.03)');assert.equal(g.run('state.win'),true)});
test('neglect kills before bloom',()=>{const g=game();g.run('start();state.dogNext=200;state.bugNext=200;state.dreamNext=200;for(let i=0;i<1500&&state.running;i++)step(.05)');assert.equal(g.run('state.ended&&!state.win'),true)});
test('daydream freezes tilt but water continues; nine taps wake player',()=>{const g=game();g.run('start();state.tool="water";state.dream=1;state.tilt=.8;step(.5)');assert.ok(g.run('state.water>55'));assert.equal(g.run('state.tilt'),.8);for(let i=0;i<9;i++)g.key();assert.equal(g.run('state.dream'),0)});
test('daydream continues feeding and blocks switching',()=>{const g=game();g.run('start();state.tool="food";state.dream=1;selectTool("swat");step(.5)');assert.equal(g.run('state.tool'),'food');assert.ok(g.run('state.food>55'))});
test('late food gives more than center',()=>{const a=game(),b=game();a.run('start();state.tool="food";state.foodPhase=4');b.run('start();state.tool="food";state.foodPhase=8');a.key();b.key();assert.ok(b.run('state.food')>a.run('state.food'))});
test('pruning removes layers; bare cuts kill',()=>{const g=game();g.run('start();state.tool="prune";state.weed=2');g.click(500,400);assert.equal(g.run('state.weed'),1);for(let i=0;i<4;i++)g.click(500,400);assert.equal(g.run('state.ended'),true)});
test('third weed layer is fatal after rescue interval',()=>{const g=game();g.run('start();state.weed=3;state.overgrown=2.99;step(.05)');assert.equal(g.run('state.ended'),true)});
test('closed blinds stop new bugs and drain sunlight',()=>{const g=game();g.run('start();state.open=false;state.bugNext=0;step(.5)');assert.equal(g.run('state.bugs.length'),0);assert.ok(g.run('state.sun<65'))});
test('dragged treat dismisses dog',()=>{const g=game();g.run('start();state.dog=6;state.dogEntrance=1;state.tool="treat"');g.click(80,530);g.up(800,480);assert.equal(g.run('state.dog'),0);assert.equal(g.run('state.dogHappy'),2)});
test('care poses count bars strictly below 50 and recover',()=>{const g=game();g.run('start()');assert.equal(g.run('carePose()'),1);assert.equal(g.run('state.water=49;carePose()'),2);assert.equal(g.run('state.food=49;carePose()'),3);assert.equal(g.run('state.sun=49;carePose()'),4);assert.equal(g.run('state.water=50;state.food=50;state.sun=50;carePose()'),1)});
test('ignored dog knocks pot over',()=>{const g=game();g.run('start();state.dog=11.99;step(.05)');assert.equal(g.run('state.ended'),true)});
test('swat removes fly at rendered position',()=>{const g=game();g.run('start();state.tool="swat";state.bugs=[{x:500,y:350,phase:0,age:0,bite:0}]');g.click(500,370);assert.equal(g.run('state.bugs.length'),0)});
test('pause freezes time and restart clears threats',()=>{const g=game();g.run('start();pause();step(10)');assert.equal(g.run('state.time'),0);g.run('state.weed=2;state.dog=5;start()');assert.equal(g.run('state.weed+state.dog'),0)});
