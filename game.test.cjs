const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function game(){
 const els=new Map(),handlers={};
 const el=id=>{if(!els.has(id))els.set(id,{style:{},setAttribute(name,value){this[name]=String(value)},focus(){},getContext(){return{}},setPointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:1000,height:650}},addEventListener(n,f){handlers[id+':'+n]=f}});return els.get(id)};
 const sandbox={console,Math,Image:class{decode(){return new Promise(()=>{})}},document:{querySelector:()=>el('scene'),getElementById:el,querySelectorAll:()=>[],addEventListener:(n,f)=>handlers[n]=f},window:{addEventListener(){}},requestAnimationFrame(){}};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(__dirname+'/game.js','utf8'),sandbox);
 return {run:c=>vm.runInContext(c,sandbox),key:()=>handlers.keydown({code:'Space',repeat:false,preventDefault(){}}),click:(x,y,button=0)=>handlers['scene:pointerdown']({clientX:x,clientY:y,pointerId:1,button,preventDefault(){}}),up:(x,y)=>handlers['scene:pointerup']({clientX:x,clientY:y})};
}
test('bloom at 90 seconds',()=>{const g=game();g.run('start();state.time=89.98;state.dogNext=200;state.bugNext=200;state.dreamNext=200;step(.03)');assert.equal(g.run('state.win'),true)});
test('left hold balances water and release lowers tilt',()=>{const g=game();g.run('start();selectTool("water")');g.click(500,400);g.run('step(.1)');assert.ok(g.run('state.tilt>.5'));g.up(500,400);const tilt=g.run('state.tilt');g.run('step(.1)');assert.ok(g.run('state.tilt')<tilt)});
test('clicking another tool swaps instead of feeding or swatting',()=>{const g=game();g.run('start();selectTool("food");state.foodPhase=4');g.click(400,550);assert.equal(g.run('state.tool'),'water');assert.equal(g.run('state.food'),55);assert.equal(g.run('state.returning[0].tool'),'food');g.click(750,150);assert.equal(g.run('state.tool'),'swat');g.click(700,570);assert.equal(g.run('state.tool'),'prune');assert.equal(g.run('state.smack'),0)});
test('left click feeds and wakes from daydream',()=>{const g=game();g.run('start();selectTool("food");state.foodPhase=4');g.click(500,400);assert.equal(g.run('state.food'),74);g.up(500,400);g.run('state.dream=1');for(let i=0;i<9;i++){g.click(500,400);g.up(500,400)}assert.equal(g.run('state.dream'),0)});
test('right click puts tool away without firing it',()=>{const g=game();g.run('start();selectTool("food");state.foodPhase=4');g.click(500,400,2);assert.equal(g.run('state.tool'),null);assert.equal(g.run('state.food'),55);g.run('state.tool="water";state.dream=1');g.click(500,400,2);assert.equal(g.run('state.tool'),'water')});
test('neglect kills before bloom',()=>{const g=game();g.run('start();state.dogNext=200;state.bugNext=200;state.dreamNext=200;for(let i=0;i<1500&&state.running;i++)step(.05)');assert.equal(g.run('state.ended&&!state.win'),true)});
test('daydream freezes tilt but water continues; nine taps wake player',()=>{const g=game();g.run('start();state.tool="water";state.dream=1;state.tilt=.8;step(.5)');assert.ok(g.run('state.water>55'));assert.equal(g.run('state.tilt'),.8);for(let i=0;i<9;i++)g.key();assert.equal(g.run('state.dream'),0)});
test('daydream continues feeding and blocks switching',()=>{const g=game();g.run('start();state.tool="food";state.dream=1;selectTool("swat");step(.5)');assert.equal(g.run('state.tool'),'food');assert.ok(g.run('state.food>55'))});
test('green feeds more pellets than an early click and resets red',()=>{const a=game(),b=game();a.run('start();state.tool="food";state.foodPhase=.9');b.run('start();state.tool="food";state.foodPhase=1.6');a.key();b.key();assert.equal(a.run('state.food'),59);assert.equal(b.run('state.food'),74);assert.equal(a.run('state.foodPellets.length'),4);assert.equal(b.run('state.foodPellets.length'),18);assert.equal(b.run('foodLight()'),'red');assert.equal(b.run('state.foodPhase'),0)});
test('food cooldown blocks spam and cannot be bypassed by switching',()=>{const g=game();g.run('start();selectTool("food");state.foodPhase=1.6');g.key();for(let i=0;i<10;i++)g.key();assert.equal(g.run('state.food'),74);g.run('selectTool("water");selectTool("food")');g.key();assert.equal(g.run('state.food'),74);g.run('step(.91)');g.key();assert.equal(g.run('state.foodPellets.length'),4)});
test('food lights cycle red yellow green and back to red',()=>{const g=game();g.run('start("debug");selectTool("food")');assert.equal(g.run('foodLight()'),'red');g.run('step(.85)');assert.equal(g.run('foodLight()'),'yellow');g.run('step(.7)');assert.equal(g.run('foodLight()'),'green');g.run('step(.6)');assert.equal(g.run('foodLight()'),'red')});
test('pruning removes layers; bare cuts kill',()=>{const g=game();g.run('start();state.tool="prune";state.weed=2');g.click(500,400);assert.equal(g.run('state.weed'),1);for(let i=0;i<4;i++)g.click(500,400);assert.equal(g.run('state.ended'),true)});
test('third weed layer is fatal after rescue interval',()=>{const g=game();g.run('start();state.weed=3;state.overgrown=2.99;step(.05)');assert.equal(g.run('state.ended'),true)});
test('closed blinds stop new bugs and drain sunlight',()=>{const g=game();g.run('start();state.open=false;state.bugNext=0;step(.5)');assert.equal(g.run('state.bugs.length'),0);assert.ok(g.run('state.sun<65'))});
test('full sunlight burns immediately',()=>{const g=game();g.run('start();state.sun=100;step(.01)');assert.equal(g.run('state.lossReason'),'too-much-sun');assert.equal(g.run('state.ended'),true)});
test('sunlight below full allows recovery',()=>{const g=game();g.run('start();state.sun=99;state.open=false;step(.1)');assert.equal(g.run('state.ended'),false);assert.ok(g.run('state.sun<99'))});
test('dragged treat dismisses dog',()=>{const g=game();g.run('start();state.dog=6;state.dogEntrance=1;state.tool="treat"');g.click(80,530);g.up(800,480);assert.equal(g.run('state.dog'),0);assert.equal(g.run('state.dogHappy'),2)});
test('care poses count bars strictly below 50 and recover',()=>{const g=game();g.run('start()');assert.equal(g.run('carePose()'),1);assert.equal(g.run('state.water=49;carePose()'),2);assert.equal(g.run('state.food=49;carePose()'),3);assert.equal(g.run('state.sun=49;carePose()'),4);assert.equal(g.run('state.water=50;state.food=50;state.sun=50;carePose()'),1)});
test('debug survives all failure conditions and time limit',()=>{const g=game();g.run('start("debug");state.time=95;state.sun=100;state.water=0;state.food=100;state.health=-10;state.weed=3;state.overgrown=5;state.dog=15;state.bugs=[{x:585,y:295,phase:0,age:20,bite:20}];step(.1)');assert.equal(g.run('state.running&&!state.ended'),true);assert.ok(g.run('state.bugs[0].age>20'));g.run('end(false,"test");end(true,"test")');assert.equal(g.run('state.running'),true)});
test('debug has manual events and no random events',()=>{const g=game();g.run('start("debug");for(let i=0;i<2000;i++)step(.05)');assert.equal(g.run('state.dog+state.dream+state.weed+state.bugs.length'),0);g.run('debugAction("dog");debugAction("fly");debugAction("dream");debugAction("weed");debugAction("growth")');assert.equal(g.run('state.bugs.length'),1);assert.ok(g.run('state.dog>0&&state.dream>0'));assert.equal(g.run('state.weed'),1);assert.equal(g.run('state.debugStage'),2)});
test('debug pose selection, bloom preview, and reset work',()=>{const g=game();g.run('start("debug");debugAction("pose4")');assert.equal(g.run('carePose()'),4);g.run('debugAction("growth");debugAction("growth");debugAction("growth")');assert.equal(g.run('state.debugStage'),4);g.run('debugAction("reset")');assert.equal(g.run('state.debug&&state.debugPose===1&&state.debugStage===1'),true)});
test('medium and hard leave debug and enforce immediate resource limits',()=>{const g=game();for(const mode of ['medium','hard']){g.run('start("debug");start("'+mode+'");state.sun=100;step(.1)');assert.equal(g.run('state.debug'),false);assert.equal(g.run('state.ended'),true)}});
test('all loss previews freeze play and can be cleared without ending debug',()=>{const g=game();for(const reason of ['bugs','overwater','underwater','overfeed','underfeed','dog','too-much-sun','too-little-sun','overgrowth','oversnip']){g.run('start("debug");debugAction("loss-'+reason+'");step(1)');assert.equal(g.run('state.lossReason'),reason);assert.equal(g.run('state.time'),0);assert.equal(g.run('state.running&&!state.ended'),true);g.run('debugAction("clear-preview");step(.1)');assert.equal(g.run('state.preview'),null);assert.ok(g.run('state.time>0'))}});
test('normal burn ending records its reason and win preview is available',()=>{const g=game();g.run('start();state.sun=100;step(.1)');assert.equal(g.run('state.lossReason'),'too-much-sun');g.run('start("debug");debugAction("win")');assert.equal(g.run('state.preview'),'win');assert.equal(g.run('state.ended'),false)});
test('ignored dog knocks pot over',()=>{const g=game();g.run('start();state.dog=11.99;step(.05)');assert.equal(g.run('state.ended'),true)});
test('swat removes fly at rendered position',()=>{const g=game();g.run('start();state.tool="swat";state.bugs=[{x:500,y:350,phase:0,age:0,bite:0}]');g.click(500,370);assert.equal(g.run('state.bugs.length'),0)});
test('fly in front of blinds takes priority, empty blinds still toggle',()=>{const g=game();g.run('start();state.tool="swat";state.bugs=[{x:300,y:200,phase:0,age:0,bite:0}]');g.click(300,220);assert.equal(g.run('state.bugs.length'),0);assert.equal(g.run('state.open'),true);assert.equal(g.run('state.effects.length'),1);g.click(300,220);assert.equal(g.run('state.open'),false);assert.equal(g.run('state.tool'),'swat')});
test('pause freezes time and restart clears threats',()=>{const g=game();g.run('start();pause();step(10)');assert.equal(g.run('state.time'),0);g.run('state.weed=2;state.dog=5;start()');assert.equal(g.run('state.weed+state.dog'),0)});

test('green center gives the best flow and both red ends pour slowly',()=>{
 const gains=[];
 for(const tilt of [.515,.415,.615,.2,.8,0,1]){
  const g=game();g.run(`start("debug");state.tool="water";state.dream=1;state.water=20;state.tilt=${tilt};step(1)`);
  gains.push(g.run('state.water-20'));
 }
 assert.ok(gains[0]>9&&gains[0]<=10);
 assert.ok(gains[0]>gains[1]&&gains[1]>gains[3]);
 assert.ok(Math.abs(gains[1]-gains[2])<.001);
 for(const gain of gains.slice(3))assert.ok(gain<=2.01);
});
test('balancing beats holding at full tilt and water stays capped',()=>{
 const centered=game(),held=game();
 for(const g of [centered,held])g.run('start("debug");state.tool="water";state.water=20');
 centered.run('state.dream=1;state.tilt=.515;step(.5)');
 held.run('space=true;state.tilt=1;step(.5)');
 assert.ok(centered.run('state.water-20')>held.run('state.water-20')*4);
 centered.run('state.water=99;step(.5)');assert.equal(centered.run('state.water'),100);
});

test('shears flash a slash at each cut and reset on a new game',()=>{
 const g=game();g.run('start("debug");state.tool="prune";state.weed=2');
 g.click(500,400);assert.equal(g.run('state.slash.x'),500);assert.equal(g.run('state.slash.y'),400);assert.ok(g.run('state.snipShake>0'));
 g.run('step(.3)');assert.equal(g.run('state.snipShake'),0);
 const cutX=g.run('pos({clientX:580,clientY:400}).x');g.click(580,400);assert.equal(g.run('state.slash.x'),cutX);assert.ok(g.run('state.snipShake>0'));
 g.run('start("debug")');assert.equal(g.run('state.slash'),null);
 g.run('debugAction("snip")');assert.ok(g.run('state.slash&&state.snipShake>0'));
});

test('cuts launch spinning leaves in both directions and clear them after flight',()=>{
 const g=game();g.run('start("debug");state.tool="prune";state.weed=2');g.click(500,400);
 assert.equal(g.run('state.effects.filter(e=>e.name==="leaf").length'),6);
 assert.ok(g.run('state.effects.some(e=>e.vx<0)&&state.effects.some(e=>e.vx>0)'));
 assert.ok(g.run('state.effects.every(e=>e.vy<0&&Math.abs(e.spin)>=6)'));
 const before=g.run('state.effects[0].angle');g.run('step(.1)');assert.notEqual(g.run('state.effects[0].angle'),before);
 g.run('step(3)');assert.equal(g.run('state.effects.length'),0);
 g.run('debugAction("snip")');assert.equal(g.run('state.effects.length'),6);
});

test('plant condition artwork follows strict thresholds at every supported stage',()=>{
 const g=game();g.run('start("debug")');
 for(const stage of [1,2,3]){
  for(const [stat,value,mode,suffix] of [['sun',91,'burn','burn'],['sun',9,'freeze','burn'],['water',91,'full','full'],['food',91,'full','full'],['water',9,'starve','starve'],['food',9,'starve','starve']]){
   g.run(`state.sun=65;state.water=55;state.food=55;state.debugStage=${stage};state.${stat}=${value};updateUI()`);
   assert.equal(g.run('plantVisual().mode'),mode);assert.equal(g.run('plantVisual().name'),`plant${stage}_${suffix}`);
  }
  for(const boundary of [10,90]){
   g.run(`state.sun=${boundary};state.water=${boundary};state.food=${boundary};updateUI()`);
   assert.equal(g.run('plantVisual().name'),`plant${stage}`);
  }
 }
 g.run('state.debugStage=4;state.sun=100;updateUI()');assert.equal(g.run('plantVisual().name'),'plant4');
});
test('plant state transitions bounce on change and recovery without restarting each update',()=>{
 const g=game();g.run('start("debug");state.sun=95;state.water=0;updateUI()');
 assert.equal(g.run('plantVisual().mode'),'burn');assert.equal(g.run('state.plantPoseElapsed'),0);
 g.run('step(.1)');assert.ok(g.run('state.plantPoseElapsed>0'));const elapsed=g.run('state.plantPoseElapsed');
 g.run('updateUI()');assert.equal(g.run('state.plantPoseElapsed'),elapsed);
 g.run('state.sun=65;state.water=55;updateUI()');assert.equal(g.run('plantVisual().mode'),'healthy');assert.equal(g.run('state.plantPoseElapsed'),0);
 g.run('step(.4)');assert.equal(g.run('state.plantPoseElapsed'),.32);
 g.run('state.food=99;state.water=8;updateUI()');assert.equal(g.run('plantVisual().mode'),'full');
 g.run('state.food=92;state.water=0;updateUI()');assert.equal(g.run('plantVisual().mode'),'starve');
});
test('smoke draws behind burn art and cold draws in front with both animation frames',()=>{
 const g=game();g.run('start("debug");Object.assign(ctx,{save(){},restore(){},translate(){},rotate(){},scale(){}});var drawn=[];art=(name)=>drawn.push(name)');
 for(const stage of [1,2,3]){
  g.run(`state.debugStage=${stage};state.sun=95;state.plantMotionTime=0;drawn=[];drawPlant(${stage},0)`);
  assert.equal(g.run('drawn.join(",")'),`smoke1,plant${stage}_burn`);
  g.run(`state.plantMotionTime=.15;drawn=[];drawPlant(${stage},0)`);assert.equal(g.run('drawn[0]'),'smoke2');
  g.run(`state.sun=5;state.plantMotionTime=0;drawn=[];drawPlant(${stage},0)`);
  assert.equal(g.run('drawn.join(",")'),`plant${stage}_burn,cold1`);
  g.run(`state.plantMotionTime=.45;drawn=[];drawPlant(${stage},0)`);assert.equal(g.run('drawn[1]'),'cold2');
 }
});

test('shears finisher runs after game over and only for oversnipping',()=>{
 const g=game();g.run('start();state.tool="prune";state.health=1');g.click(500,400);
 assert.equal(g.run('isShearsEnding()'),true);const time=g.run('state.time');g.run('step(.4)');
 assert.equal(g.run('state.time'),time);assert.equal(g.run('state.finisherTime'),.4);
 g.run('start()');assert.equal(g.run('state.finisherTime'),0);assert.equal(g.run('isShearsEnding()'),false);
 g.run('end(false,"burn","too-much-sun");step(1)');assert.equal(g.run('state.finisherTime'),0);
 g.run('start("debug");debugAction("loss-oversnip");step(1)');assert.equal(g.run('state.finisherTime'),1);
 g.run('debugAction("loss-oversnip")');assert.equal(g.run('state.finisherTime'),0);
 g.run('debugAction("clear-preview")');assert.equal(g.run('isShearsEnding()'),false);
});
test('split halves shake together before the top slides away using shared crop dimensions',()=>{
 const g=game();g.run('start("debug");var crops=[],positions=[];Object.assign(ctx,{save(){},restore(){},rotate(){},translate(...args){positions.push(args)},drawImage(...args){crops.push(args.slice(1))}});assets.plant2chop_top={img:{},x:200,y:50,w:500,h:700};assets.plant2chop_bottom={img:{},x:350,y:700,w:250,h:220};state.finisherTime=.2;drawChoppedPlant(2)');
 assert.equal(g.run('JSON.stringify(crops[0])'),g.run('JSON.stringify(crops[1])'));
 assert.equal(g.run('JSON.stringify(positions[0])'),g.run('JSON.stringify(positions[1])'));
 g.run('positions=[];state.finisherTime=1.5;drawChoppedPlant(2)');
 assert.ok(g.run('positions[1][0]>positions[0][0]&&positions[1][1]>positions[0][1]'));
 assert.equal(g.run('chopMotion(1.5).shakeX'),0);
});

test('ending poses choose either matching variant once per ending and reset',()=>{
 for(const [roll,variant] of [[.1,1],[.9,2]]){
  const g=game();g.run(`Math.random=()=>${roll}`);
  for(const win of [false,true]){
   g.run(`start();end(${win},"test","oversnip")`);
   const pose=`dude_${win?'win':'lose'}${variant}`;assert.equal(g.run('state.endingPose'),pose);
   g.run('step(.5);updateUI();end(false,"again")');assert.equal(g.run('state.endingPose'),pose);
  }
  g.run('start("debug");debugAction("loss-bugs")');assert.equal(g.run('state.endingPose'),`dude_lose${variant}`);
  g.run('debugAction("win")');assert.equal(g.run('state.endingPose'),`dude_win${variant}`);
  g.run('debugAction("clear-preview")');assert.equal(g.run('state.endingPose'),null);
  g.run('start()');assert.equal(g.run('state.endingPose'),null);
 }
});

test('ending buttons retry the same difficulty and return to the main menu',()=>{
 const g=game();
 for(const mode of ['easy','medium','hard'])for(const win of [false,true]){
  g.run(`start("${mode}");end(${win},"test","bugs")`);assert.equal(g.run('$("ending-actions").hidden'),false);
  g.run('$("retry").onclick()');assert.equal(g.run('state.mode'),mode);assert.equal(g.run('state.running&&!state.ended'),true);assert.equal(g.run('$("ending-actions").hidden'),true);
  g.run(`end(${win},"test","bugs");$("ending-menu").onclick()`);
  assert.equal(g.run('$("overlay").hidden'),false);assert.equal(g.run('state.running'),false);assert.equal(g.run('$("ending-actions").hidden'),true);
 }
 g.run('start("debug");debugAction("win");$("retry").onclick()');assert.equal(g.run('state.debug&&!state.preview'),true);
});

test('win flowers keep falling and spinning after gameplay ends and clear on other screens',()=>{
 const g=game();g.run('start();end(true);step(.1)');assert.equal(g.run('state.winFlowers.length'),28);
 g.run('state.winFlowers[0].x=400;state.winFlowers[0].y=100');const angle=g.run('state.winFlowers[0].angle');const time=g.run('state.time');
 g.run('step(.2)');assert.ok(g.run('state.winFlowers[0].y>100'));assert.notEqual(g.run('state.winFlowers[0].angle'),angle);assert.equal(g.run('state.time'),time);
 g.run('state.winFlowers[0].y=1000;step(.1)');assert.equal(g.run('state.winFlowers[0].y'),-140);
 g.run('start()');assert.equal(g.run('state.winFlowers.length'),0);
 g.run('end(false,"test","bugs");step(.1)');assert.equal(g.run('state.winFlowers.length'),0);
 g.run('start("debug");debugAction("win");step(.1)');assert.equal(g.run('state.winFlowers.length'),28);
 g.run('debugAction("loss-bugs");step(.1)');assert.equal(g.run('state.winFlowers.length'),0);
});

test('every resource endpoint ends medium and hard immediately but debug stays playable',()=>{
 for(const mode of ['medium','hard'])for(const [key,low,high] of [['water','underwater','overwater'],['food','underfeed','overfeed'],['sun','too-little-sun','too-much-sun']])for(const value of [0,100]){
  const g=game();g.run(`start("${mode}");state.${key}=${value};updateUI()`);
  assert.equal(g.run('state.ended'),true);assert.equal(g.run('state.lossReason'),value===0?low:high);
 }
 const g=game();g.run('start("debug");state.water=0;state.food=100;state.sun=100;updateUI()');assert.equal(g.run('state.running&&!state.ended'),true);
 g.run('start();state.tool="food";state.food=95;state.foodPhase=1.6;primaryAction()');assert.equal(g.run('state.lossReason'),'overfeed');assert.equal(g.run('state.food'),100);
});
test('fill clips match exact per-asset percentages including empty and full',()=>{
 const g=game();g.run('start("debug")');
 for(const [key,width] of [['food',862],['water',865],['sun',873]])for(const value of [0,10,50,90,100]){
  g.run(`state.${key}=${value};updateUI()`);
  assert.ok(Math.abs(Number(g.run(`$("${key}FillClip").width`))-width*value/100)<1e-9);
 }
});

test('ending blurbs match the cause, show Bloomed for wins and hide on retries',()=>{
 const g=game();
 for(const [cause,title] of [['oversnip','Chopped'],['overfeed','Overfed'],['underfeed','Underfed'],['dog','Dog'],['too-much-sun','Burnt'],['too-little-sun','Cold'],['overwater','Overwatered'],['underwater','Dried out'],['bugs','Eaten by bugs'],['overgrowth','Overgrown']]){
  g.run(`start();end(false,"test","${cause}")`);assert.equal(g.run('$("death-title").textContent'),title);assert.equal(g.run('$("death-blurb").hidden'),false);
  g.run(`start("debug");debugAction("loss-${cause}")`);assert.equal(g.run('$("death-title").textContent'),title);
 }
 g.run('debugAction("win")');assert.equal(g.run('$("death-blurb").hidden'),false);assert.equal(g.run('$("death-title").textContent'),'Bloomed');
 g.run('start();end(true)');assert.equal(g.run('$("death-blurb").hidden'),false);assert.equal(g.run('$("death-title").textContent'),'Bloomed');
 g.run('start()');assert.equal(g.run('$("death-blurb").hidden'),true);
});

test('shared rhythm loops, pauses with play, and continues on ending screens',()=>{
 const g=game();g.run('start()');
 assert.ok(g.run('rhythmBounce(.125)>0&&rhythmBounce(.375)<0'));
 assert.ok(Math.abs(g.run('rhythmBounce(.125)-rhythmBounce(.625)'))<1e-9);
 g.run('step(.1);pause()');const time=g.run('state.rhythmTime');g.run('step(.2)');assert.equal(g.run('state.rhythmTime'),time);
 g.run('pause();end(true);step(.2)');assert.ok(g.run('state.rhythmTime')>time);
 g.run('start()');assert.equal(g.run('state.rhythmTime'),0);
});

test('loss sequence waits five seconds, plays two explosions, then shows one skeleton',()=>{
 const g=game();g.run('start();end(false,"test","oversnip")');assert.equal(g.run('state.lossPhase'),'wait');
 g.run('step(4.99)');assert.equal(g.run('$("loss-effect").hidden'),true);
 g.run('step(.02)');assert.equal(g.run('state.lossPhase'),'blast0');assert.ok(g.run('$("loss-effect").innerHTML').includes('explosion.gif'));
 for(let i=1;i<2;i++){g.run('step(1.7)');assert.equal(g.run('state.lossPhase'),'blast'+i);}
 g.run('step(1.7)');assert.equal(g.run('state.lossPhase'),'skeleton');const chosen=g.run('state.skeletonSource');
 assert.ok(g.run('$("loss-effect").innerHTML').includes(chosen));g.run('step(10)');assert.equal(g.run('state.skeletonSource'),chosen);
 g.run('start()');assert.equal(g.run('$("loss-effect").hidden'),true);
 g.run('end(true);step(20)');assert.equal(g.run('$("loss-effect").hidden'),true);
});
test('all five skeleton choices are available in debug losses and clearing cancels the sequence',()=>{
 for(let i=0;i<5;i++){
  const g=game();g.run(`Math.random=()=>${(i+.1)/5};start("debug");debugAction("loss-bugs");step(14)`);
  assert.equal(g.run('state.skeletonSource'),i===4?'screenshots/skelly.png':`gifs/skeleton${i+1}.gif`);
  g.run('debugAction("clear-preview")');assert.equal(g.run('$("loss-effect").hidden'),true);assert.equal(g.run('state.lossPhase'),null);
 }
});

test('camera stays steady, eases toward events and preserves pointer alignment',()=>{
 const g=game();g.run('start("debug");step(1);state.dog=1;step(.1)');
 assert.ok(g.run('state.camera.x<0&&state.camera.x>-12'));
 assert.ok(g.run('cameraView().angle===0&&cameraView().zoom<=1.03'));
 g.run('var c=cameraView();var px=500+c.x+c.zoom*(80*Math.cos(c.angle)-40*Math.sin(c.angle));var py=325+c.y+c.zoom*(80*Math.sin(c.angle)+40*Math.cos(c.angle));var hit=pos({clientX:px,clientY:py})');
 assert.ok(g.run('Math.abs(hit.x-580)<1e-8&&Math.abs(hit.y-365)<1e-8'));
 g.run('pause()');const time=g.run('state.camera.time');g.run('step(1)');assert.equal(g.run('state.camera.time'),time);
 g.run('pause();debugAction("win")');assert.equal(g.run('cameraView().zoom'),1);
});

test('shears cut when clicking the pot including its overlap with the watering can',()=>{
 const g=game();g.run('start("debug");state.tool="prune";state.weed=2');
 g.click(500,550);assert.equal(g.run('state.weed'),1);assert.equal(g.run('state.tool'),'prune');assert.equal(g.run('state.slash.y'),550);
 g.click(580,590);assert.equal(g.run('state.weed'),0);assert.equal(g.run('state.effects.filter(e=>e.name==="leaf").length'),12);
 const health=g.run('state.health');g.click(580,590);assert.equal(g.run('state.health'),health-38);
 g.run('start();state.tool="prune";state.health=1');g.click(580,590);assert.equal(g.run('state.lossReason'),'oversnip');
});

test('difficulty scales initial and recurring event delays and hard resource rates',()=>{
 const results={};
 for(const mode of ['easy','medium','hard']){
  const g=game();g.run(`Math.random=()=>.5;start("${mode}")`);
  results[mode]={dog:g.run('state.dogNext'),bug:g.run('state.bugNext'),dream:g.run('state.dreamNext'),weed:g.run('state.weedTarget'),repeat:g.run('eventDelay(19,26)')};
  g.run('step(1)');results[mode].drain=g.run('55-state.water');results[mode].sun=g.run('state.sun-65');
  g.run('state.tool="food";state.food=20;state.foodPhase=1.6;primaryAction()');results[mode].feed=g.run('state.food-20');
 }
 for(const key of ['dog','bug','dream','weed','repeat'])assert.ok(results.easy[key]>results.medium[key]&&results.medium[key]>results.hard[key]);
 assert.ok(Math.abs(results.hard.drain/results.medium.drain-1.65)<1e-8);
 assert.ok(Math.abs(results.hard.sun/results.medium.sun-1.65)<1e-8);
 assert.equal(results.medium.feed,19);assert.ok(results.hard.feed>results.medium.feed);
});
test('red-bar directions appear only in easy and hide on other modes and endings',()=>{
 const g=game();
 for(const [key,value,text] of [['water',9,'Water is low'],['water',91,'Too much water'],['food',9,'Food is low'],['food',91,'Too much food'],['sun',9,'Too cold'],['sun',91,'Too much sun']]){
  g.run(`start("easy");state.${key}=${value};updateUI()`);assert.equal(g.run('$("care-guidance").hidden'),false);assert.ok(g.run('$("care-guidance").innerHTML').includes(text));
 }
 for(const mode of ['medium','hard','debug']){g.run(`start("${mode}");state.water=9;updateUI()`);assert.equal(g.run('$("care-guidance").hidden'),true);}
 g.run('start("easy");end(false,"test","bugs")');assert.equal(g.run('$("care-guidance").hidden'),true);
});
test('first bare cut kills in medium and hard while weeds and easy keep their rules',()=>{
 for(const mode of ['medium','hard']){
  const g=game();g.run(`start("${mode}");state.tool="prune";state.weed=1`);g.click(500,400);assert.equal(g.run('state.ended'),false);assert.equal(g.run('state.weed'),0);
  g.click(500,400);assert.equal(g.run('state.lossReason'),'oversnip');
 }
 const g=game();g.run('start("easy");state.tool="prune"');g.click(500,400);assert.equal(g.run('state.ended'),false);assert.equal(g.run('state.health'),62);
});

test('easy help covers threats and clickable tips select tools without toggling them off',()=>{
 const g=game();g.run('start("easy");state.bugs=[{}];state.weed=1;state.dog=1;updateUI()');
 for(const text of ['Flies!','Weeds!','Dog!'])assert.ok(g.run('$("care-guidance").innerHTML').includes(text));
 for(const tool of ['swat','prune','treat']){
  g.run(`$("care-guidance").onclick({target:{closest:()=>({dataset:{help:"${tool}"}})}})`);assert.equal(g.run('state.tool'),tool);
  g.run(`$("care-guidance").onclick({target:{closest:()=>({dataset:{help:"${tool}"}})}})`);assert.equal(g.run('state.tool'),tool);
 }
 g.run('$("care-guidance").onclick({target:{closest:()=>({dataset:{help:"close"}})}})');assert.equal(g.run('state.open'),false);
});

test('easy gives each empty or full resource five seconds and recovery resets the timer',()=>{
 for(const key of ['water','food','sun'])for(const value of [0,100]){
  const g=game();g.run(`start("easy");state.${key}=${value};checkResourceLimits(4.9);updateUI()`);
  assert.equal(g.run('state.ended'),false);assert.equal(g.run(`state.resourceLimits.${key}.time`),4.9);
  g.run(`state.${key}=50;checkResourceLimits();state.${key}=${value};checkResourceLimits(4.9)`);assert.equal(g.run('state.ended'),false);
  g.run('checkResourceLimits(.11)');assert.equal(g.run('state.ended'),true);
 }
});
test('easy grace advances once per simulation step without health bypassing it',()=>{
 const g=game();g.run('start("easy");state.water=0;state.health=20;step(4.9)');assert.equal(g.run('state.ended'),false);
 assert.equal(g.run('state.resourceLimits.water.time'),4.9);
 g.run('pause();step(2)');assert.equal(g.run('state.resourceLimits.water.time'),4.9);
 g.run('pause();step(.11)');assert.equal(g.run('state.lossReason'),'underwater');
 g.run('start("easy")');assert.equal(g.run('Object.keys(state.resourceLimits).length'),0);
});

test('burnt losses show fire during the wait then replace it with explosions',()=>{
 const g=game();g.run('start();end(false,"burnt","too-much-sun")');
 assert.equal(g.run('$("loss-effect").hidden'),false);assert.ok(g.run('$("loss-effect").innerHTML').includes('gifs/fire.gif'));
 g.run('step(4.9)');assert.ok(g.run('$("loss-effect").innerHTML').includes('gifs/fire.gif'));
 g.run('step(.2)');assert.ok(g.run('$("loss-effect").innerHTML').includes('explosion.gif'));assert.ok(!g.run('$("loss-effect").innerHTML').includes('fire.gif'));
 g.run('start("debug");debugAction("loss-too-much-sun")');assert.ok(g.run('$("loss-effect").innerHTML').includes('fire.gif'));
 g.run('debugAction("loss-too-little-sun")');assert.equal(g.run('$("loss-effect").hidden'),true);
});

test('idle dude reacts to the dog and returns to his previous pose without overriding tools',()=>{
 const g=game();g.run('start("debug");debugAction("pose3");debugAction("dog")');assert.equal(g.run('currentDudePose()'),'dude_dog');
 for(const tool of ['water','food','prune','swat','treat']){g.run(`state.tool="${tool}"`);assert.notEqual(g.run('currentDudePose()'),'dude_dog');}
 g.run('state.tool=null;state.dogEntrance=1;debugAction("happy")');assert.equal(g.run('currentDudePose()'),'dude_dog');
 g.run('step(2)');assert.equal(g.run('currentDudePose()'),'dude3');
 g.run('debugAction("dog");debugAction("dream")');assert.equal(g.run('currentDudePose()'),'dude_daydreaming');
});

test('moving dog screenshot appears only on dog-loss screens and clears on retry',()=>{
 const g=game();g.run('start();end(false,"dog","dog")');assert.equal(g.run('$("dog-ending").hidden'),false);
 g.run('start()');assert.equal(g.run('$("dog-ending").hidden'),true);
 g.run('end(false,"burnt","too-much-sun")');assert.equal(g.run('$("dog-ending").hidden'),true);
 g.run('start("debug");debugAction("loss-dog")');assert.equal(g.run('$("dog-ending").hidden'),false);
 g.run('debugAction("win")');assert.equal(g.run('$("dog-ending").hidden'),true);
});

test('art loading preserves full PNG coordinates without security-dependent canvas cropping',async()=>{
 const g=game();
 g.run('Image=class{constructor(){this.width=1024;this.height=768}async decode(){}};document.createElement=()=>{throw new Error("Canvas pixel access must not affect layout")};');
 for(const name of ['dude1','hold_wateringcan','plant1','plant1chop_top','plant1chop_bottom','dude_dog']){
  await g.run(`loadArt("${name}")`);
  assert.equal(g.run(`assets["${name}"].x`),0);assert.equal(g.run(`assets["${name}"].y`),0);
  assert.equal(g.run(`assets["${name}"].w`),1024);assert.equal(g.run(`assets["${name}"].h`),768);
 }
 assert.equal(g.run('assets.dude1.img.src'),'png/dude1.png');
 assert.equal(g.run('assets.dude_dog.img.src'),'png2/dude_dog.png');
});
