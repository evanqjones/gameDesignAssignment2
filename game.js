/* All scene artwork comes from the original files in png/. No generated art. */
'use strict';
const canvas = document.querySelector('#scene');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const assets = {};
const names = ['window','blinds_open','blinds_closed','table','pot','plant1','plant2','plant3','plant4','weed1','weed2','dude1','dude2','dude3','dude4','dude_daydreaming','dude_daydreaming_stagger','dude_shears1','dude_shears2','dude_flyswatter1','sitting_wateringcan','sitting_plantfood','sitting_shears','sitting_flyswatter','hold_wateringcan','hold_plantfood','hold_shears1','hold_shears2','hold_flyswatter1','hold_flyswatter2','dog','dog_happy','dog_bonebag','clicker_bone','fly','heart','swatter_smack'];
const lossTypes=['bugs','overwater','underwater','overfeed','underfeed','dog','too-much-sun','too-little-sun','overgrowth','oversnip'];
const deathBlurbs={
  oversnip:['Chopped','One snip too many. The shears cut your plant down.'],
  overfeed:['Overfed','Too much plant food was more than it could handle.'],
  underfeed:['Underfed','Your plant ran out of the nutrients it needed.'],
  dog:['Dog','Your dog knocked the plant over. A treat might have saved it.'],
  'too-much-sun':['Burnt','Too much sunlight scorched your plant.'],
  'too-little-sun':['Cold','Your plant went too long without sunlight.'],
  overwater:['Overwatered','Too much water drowned your plant.'],
  underwater:['Dried out','Your plant ran out of water.'],
  bugs:['Eaten by bugs','The flies made a meal of your flower.'],
  overgrowth:['Overgrown','Too many leaves made your plant topple over.']
};
const focusColors={loss:'rgba(38, 15, 65, .78)',win:'rgba(255, 218, 85, .68)',dream:'rgba(239, 126, 181, .72)'};
const difficulties={easy:{events:1.8,resources:1},medium:{events:1,resources:1},hard:{events:.55,resources:1.65},debug:{events:1,resources:1}};
function difficulty(){return difficulties[state.mode]||difficulties.medium;}
function eventDelay(min,max){return random(min,max)*difficulty().events;}
function easyHelpEntries(){
  const hints=[];
  if(state.water<10)hints.push(['water','Water is low: click here or the watering can (1). Hold/release left-click or Space to keep the marker green.']);
  if(state.water>90)hints.push(['down','Too much water: click here, right-click, or press Esc to put the can down. Let water drop.']);
  if(state.food<10)hints.push(['food','Food is low: click here or the food box (2), then click or press Space when the light is green.']);
  if(state.food>90)hints.push(['down','Too much food: click here, right-click, or press Esc to stop feeding. Let food drop.']);
  if(state.sun<10)hints.push(['open','Too cold: click here or the blinds, or press B, to open them for sunlight.']);
  if(state.sun>90)hints.push(['close','Too much sun: click here or the blinds, or press B, to close them.']);
  if(state.bugs.length)hints.push(['swat','Flies! Click here or the fly swatter (4), then click each fly to swat it.']);
  if(state.weed)hints.push(['prune','Weeds! Click here or the shears (3), then click the plant or pot once per weed layer. Stop when the weeds are gone!']);
  if(state.dog)hints.push(['treat','Dog! Click here or Dog treats (5), then drag a bone from the bag onto the dog.']);
  if(state.dream)hints.unshift(['wake','Daydream! Click the game repeatedly or tap Space nine times to wake up. Tools are locked until you wake.']);
  return hints;
}
function easyGuidance(){return easyHelpEntries().map(([,text])=>text).join(' ');}
const toolNames = ['water','food','prune','swat','treat'];
const restingTools={
  water:['sitting_wateringcan',330,482,217.5,168],
  food:['sitting_plantfood',170,445,146.25,249.375],
  prune:['sitting_shears',600,512,283.5,283.5*684/924],
  swat:['sitting_flyswatter',610,112,352.5,352.5*389/935*1.25],
  treat:['clicker_bone',45,450,90,90]
};
function returnTool(tool){
  if(!tool||tool==='treat')return;
  const pose=carePose();
  const hand=pose===2?{x:865,y:485}:{x:830,y:465};
  state.returning=state.returning.filter(item=>item.tool!==tool);
  state.returning.push({tool,age:0,x:hand.x,y:hand.y});
}
function restingTool(tool){
  if(state.tool!==tool&&!state.returning.some(item=>item.tool===tool))interactiveArt(...restingTools[tool]);
}
function foodLight(){return state.foodReady>0?'red':state.foodPhase<.8?'red':state.foodPhase<1.5?'yellow':'green';}
function sprinkleFood(count){
  const p=state.foodOrigin||{x:570,y:350};
  for(let i=0;i<count;i++)state.foodPellets.push({x:p.x+random(-10,10),y:p.y+random(-6,6),vx:random(-70,100),vy:random(40,120),age:0,size:random(6.25,10)});
}
function carePose(){if(state.debug)return state.debugPose;return 1+[state.water,state.sun,state.food].filter(value=>value<50).length;}
names.push('clicker_hand','clicker_swatter','slash','leaf','flower','dude_dog');
const plantEffectNames=['smoke1','smoke2','cold1','cold2',...[1,2,3].flatMap(stage=>['burn','full','starve'].map(effect=>`plant${stage}_${effect}`))];
plantEffectNames.push(...[1,2,3].flatMap(stage=>['top','bottom'].map(part=>`plant${stage}chop_${part}`)));
const endingPoseNames=['dude_lose1','dude_lose2','dude_win1','dude_win2'];
names.push(...endingPoseNames);
names.push(...plantEffectNames);
let pointerInside = false;
let mouseHeld = false;
let lossSequenceId=0;
let state, last = 0, pointer = {x:500,y:400}, space = false, dragging = false;
const random = (a,b) => a + Math.random()*(b-a);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
// One flow curve drives both the refill rate and the visible stream.
// A shared 120 BPM pulse keeps the character and plant bouncing together.
function rhythmBounce(time,strength=1){
  if(state&&(state.preview?state.preview!=='win':state.ended&&!state.win))return 0;
  return Math.sin(time*Math.PI*4)*.055*strength;
}
function waterFlowRate(tilt){
  const balance=clamp(1-Math.abs(tilt-.515)/.165,0,1);
  return 2+8*balance;
}

// Preserve the complete PNG canvas, including transparent margins. The layout was
// designed with these coordinates, and must match under file:// and HTTP alike.
async function loadArt(name) {
  const img = new Image();
  img.src = `${(['slash','leaf','flower','dude_dog'].includes(name)||plantEffectNames.includes(name)||endingPoseNames.includes(name))?'png2':'png'}/${name}.png`;
  await img.decode();
  assets[name]={img,x:0,y:0,w:img.width,h:img.height};
}
let poseTransform={x:0,y:0,sx:1,sy:1};
function applyPoseTransform(){
  const p=poseTransform;ctx.translate(p.x,p.y);ctx.scale(p.sx,p.sy);ctx.translate(-p.x,-p.y);
}
function posePoint(point){const p=poseTransform;return {x:p.x+(point.x-p.x)*p.sx,y:p.y+(point.y-p.y)*p.sy};}
function art(name,x,y,w,h,angle=0,animatePose=true) {
  const a=assets[name]; if(!a)return;
  ctx.save();if(animatePose&&(name.startsWith('dude')||name.startsWith('hold_')))applyPoseTransform();ctx.translate(x+w/2,y+h/2);ctx.rotate(angle);
  ctx.drawImage(a.img,a.x,a.y,a.w,a.h,-w/2,-h/2,w,h);ctx.restore();
}
// Trace the PNG's opaque silhouette instead of outlining its transparent rectangle.
function interactiveArt(name,x,y,w,h,hoverArea=null){
  const a=assets[name];
  let hovered=a&&pointerInside&&state.running&&!state.paused&&!state.dream&&pointer.x>=x&&pointer.x<=x+w&&pointer.y>=y&&pointer.y<=y+h;
  if(hoverArea)hovered=a&&pointerInside&&state.running&&!state.paused&&!state.dream&&pointer.x>=hoverArea.x&&pointer.x<=hoverArea.x+hoverArea.w&&pointer.y>=hoverArea.y&&pointer.y<=hoverArea.y+hoverArea.h;
  if(hovered&&a.pixels&&!hoverArea){
    const px=clamp(Math.floor(a.x+(pointer.x-x)/w*a.w),a.x,a.x+a.w-1);
    const py=clamp(Math.floor(a.y+(pointer.y-y)/h*a.h),a.y,a.y+a.h-1);
    hovered=a.pixels[(py*a.img.width+px)*4+3]>20;
  }
  if(hovered){
    if(!a.highlight){
      const mask=document.createElement('canvas');mask.width=a.w;mask.height=a.h;
      const g=mask.getContext('2d');g.drawImage(a.img,a.x,a.y,a.w,a.h,0,0,a.w,a.h);
      g.globalCompositeOperation='source-in';g.fillStyle='#ffe47a';g.fillRect(0,0,a.w,a.h);a.highlight=mask;
    }
    ctx.save();ctx.shadowColor='#ffe47a';ctx.shadowBlur=8;
    for(let i=0;i<8;i++){const angle=i*Math.PI/4;ctx.drawImage(a.highlight,x+Math.cos(angle)*3,y+Math.sin(angle)*3,w,h);}
    ctx.restore();
  }
  art(name,x,y,w,h);
}
// Attach the sleeve end to a fixed shoulder, even while the tool rotates.
function held(name,w,h,angle=0,offsetX=0,offsetY=0){
  ctx.save();applyPoseTransform();ctx.translate(680+offsetX,495+offsetY);ctx.rotate(angle);
  art(name,-w,-h*.82,w,h,0,false);ctx.restore();
}
function heldPoint(name,w,h,angle,offsetX,offsetY,sourceX,sourceY){
  const a=assets[name];if(!a)return null;
  const x=-w+(sourceX-a.x)/a.w*w;
  const y=-h*.82+(sourceY-a.y)/a.h*h;
  return posePoint({x:680+offsetX+x*Math.cos(angle)-y*Math.sin(angle),y:495+offsetY+x*Math.sin(angle)+y*Math.cos(angle)});
}
function fresh() {
  state={running:false,paused:false,ended:false,win:false,time:0,water:55,food:55,sun:65,health:100,tool:null,tilt:.5,foodPhase:0,foodReady:0,weed:0,weedClock:0,weedTarget:13,dog:0,dogNext:random(15,22),dogHappy:0,bugNext:random(8,12),bugs:[],dream:0,dreamNext:random(20,28),dreamHits:0,open:true,snip:0,smack:0,toast:0,overgrown:0};
  state.debug=false;state.debugPose=1;state.debugStage=1;state.liveNeeds=false;
  state.foodPellets=[];state.foodOrigin=null;state.foodShake=0;state.dreamPelletTime=0;
  state.preview=null;state.lossReason=null;state.endingPose=null;state.lastGuidance=null;state.resourceLimits={};
  state.effects=[];
  state.returning=[];
  state.snipShake=0;state.slash=null;
  state.poseElapsed=.32;state.poseKey=null;state.posePulse=0;
  state.animationTime=0;state.rhythmTime=0;
  state.camera={x:0,y:0,time:0,strength:0};
  state.finisherTime=0;state.winFlowers=[];
  state.lossTime=0;state.lossPhase=null;state.skeletonSource=null;
  state.plantPoseKey=null;state.plantPoseElapsed=.32;state.plantMotionTime=0;
  state.blindsAmount=0;state.blindsVelocity=0;
  state.dogEntrance=0;
}
function dogPosition(){
  const progress=state.dogEntrance;
  const ease=progress*progress*(3-2*progress);
  return {x:637.5+(1-ease)*440+(state.dog>7?Math.sin(state.time*12)*9:0),y:392.5+(1-ease)*280};
}
function boneAngle(){return Math.sin(state.animationTime*4.5)*.3;}
function launchArt(name,x,y,w,h,angle,vx,vy,spin){
  state.effects.push({name,x,y,w,h,angle,vx,vy,spin,age:0});
}
function scatterLeaves(x,y){
  const aspect=assets.leaf?assets.leaf.h/assets.leaf.w:.66;
  for(let i=0;i<6;i++){
    const direction=i%2?1:-1;
    const width=random(28,48),height=width*aspect;
    launchArt('leaf',x-width/2+random(-14,14),y-height/2+random(-12,12),width,height,
      random(-Math.PI,Math.PI),direction*random(130,310),-random(240,430),direction*random(6,13));
  }
}
function say(message,seconds=3){$('toast').textContent=message;state.toast=seconds;}
function selectTool(tool){
  if(state.preview)return;
  if(!state.running||state.paused||state.dream)return;
  returnTool(state.tool);
  if(state.tool!==tool)state.returning=state.returning.filter(item=>item.tool!==tool);
  state.tool=state.tool===tool?null:tool; dragging=false; space=false;mouseHeld=false;
  if(state.tool==='water')state.tilt=.5;
  if(state.tool==='food')state.foodPhase=0;
  const tips={water:'Hold Space to tilt up. Release to tilt down.',food:'Click or press Space on green. Wait between shakes.',prune:'Click the leaves. Cutting a bare plant hurts it!',swat:'Click the flies before they settle on your flower.',treat:'Drag a bone from the treat bag to your dog.'};
  say(tips[state.tool]||'Tools down. Keep an eye on your flower.'); updateUI();
}
function toggleBlinds(){if(state.preview)return;if(!state.running||state.paused||state.dream)return;state.open=!state.open;say(state.open?'Sunshine is in. Watch for flies!':'Blinds closed. Sunlight will run down.');updateUI();}
function end(win,reason,lossReason=null){
  if(state.debug||state.ended)return;
  state.endingPose=`dude_${win?'win':'lose'}${Math.random()<.5?1:2}`;
  state.finisherTime=0;state.lossTime=0;state.lossPhase=null;state.skeletonSource=null;
  state.running=false;state.ended=true;state.win=win;state.lossReason=lossReason;state.tool=null;state.dream=0;space=false;mouseHeld=false;dragging=false;
  $('overlay').hidden=true;
  $('pause').disabled=true;updateUI();
}

function mainMenu(){
  fresh();space=false;mouseHeld=false;dragging=false;
  $('debug-panel').hidden=true;$('overlay').hidden=false;
  $('pause').disabled=true;$('pause').textContent='Pause ? P';
  updateUI();$('start').focus();
}
function start(mode='medium'){fresh();state.mode=typeof mode==='string'?mode:'medium';state.debug=state.mode==='debug';state.dogNext*=difficulty().events;state.bugNext*=difficulty().events;state.dreamNext*=difficulty().events;state.weedTarget*=difficulty().events;state.running=true;$('debug-panel').hidden=!state.debug;$('overlay').hidden=true;$('pause').disabled=false;$('pause').textContent='Pause · P';say('Make her day. Keep water and food in the middle!',4);canvas.focus();updateUI();}
function debugAction(action){
  if(!state.debug||!state.running)return;
  if(action.startsWith('loss-')||action==='win'){state.lossTime=0;state.lossPhase=null;state.skeletonSource=null;state.endingPose=`dude_${action==='win'?'win':'lose'}${Math.random()<.5?1:2}`;state.finisherTime=0;state.preview=action==='win'?'win':action.slice(5);state.lossReason=action==='win'?null:action.slice(5);state.dream=0;state.paused=false;space=false;mouseHeld=false;dragging=false;updateUI();return;}
  state.preview=null;state.endingPose=null;
  if(action.startsWith('pose')){state.debugPose=Number(action.slice(4));state.dream=0;state.dreamHits=0;if(['prune','swat'].includes(state.tool))state.tool=null;}
  if(action==='dog'){state.dog=.01;state.dogHappy=0;state.dogEntrance=0;}
  if(action==='happy'){state.dog=0;state.dogHappy=2;}
  if(action==='fly')state.bugs.push({x:-100,y:random(170,280),phase:random(0,6),age:0,bite:0});
  if(action==='dream'){state.dream=1;state.dreamHits=0;space=false;mouseHeld=false;}
  if(action==='wake'){state.dream=0;state.dreamHits=0;space=false;mouseHeld=false;}
  if(action==='weed')state.weed=(state.weed+1)%4;
  if(action==='growth')state.debugStage=state.debugStage%4+1;
  if(action==='snip'){state.dream=0;state.tool='prune';state.snip=state.snip?0:1;state.snipShake=.22;state.slash={x:585,y:390};scatterLeaves(585,390);}
  if(action==='smack'){state.dream=0;state.tool='swat';state.smack=.4;}
  if(action==='reset'){start('debug');return;}
  say('Debug: '+action+' · No win or loss conditions.');
  updateUI();canvas.focus();
}
function pause(){if(!state.running)return;state.paused=!state.paused;space=false;mouseHeld=false;dragging=false;$('pause').textContent=state.paused?'Resume · P':'Pause · P';say(state.paused?'Paused. Take a breath.':'Back to your little flower.');updateUI();}

function isWinEnding(){return state.preview==='win'||(!state.preview&&state.ended&&state.win);}
function newWinFlower(initial=false){
  const size=random(35,100);
  return {x:random(-60,1000),y:initial?random(-650,600):-140,w:size*random(.7,1.3),h:size*random(.7,1.3),
    angle:random(0,Math.PI*2),spin:random(.5,2)*(Math.random()<.5?-1:1),vx:random(-20,20),vy:random(45,105)};
}
function updateWinFlowers(dt){
  if(!isWinEnding()){state.winFlowers=[];return;}
  if(state.paused)return;
  if(!state.winFlowers.length)state.winFlowers=Array.from({length:28},()=>newWinFlower(true));
  for(let i=0;i<state.winFlowers.length;i++){
    const flower=state.winFlowers[i];flower.x+=flower.vx*dt;flower.y+=flower.vy*dt;flower.angle+=flower.spin*dt;
    if(flower.y>650+Math.max(flower.w,flower.h)||flower.x < -150||flower.x>1150)state.winFlowers[i]=newWinFlower();
  }
}
function checkResourceLimits(dt=0){
  if(!state.running||state.debug||state.preview||state.paused)return false;
  const reasons={water:['underwater','overwater'],food:['underfeed','overfeed'],sun:['too-little-sun','too-much-sun']};
  for(const key of ['water','food','sun']){
    if(state[key]<=0||state[key]>=100){
      const high=state[key]>=100;state[key]=high?100:0;
      if(state.mode==='easy'){
        const side=high?'high':'low';
        const timer=state.resourceLimits[key];
        if(!timer||timer.side!==side)state.resourceLimits[key]={side,time:0};
        state.resourceLimits[key].time+=dt;
        if(state.resourceLimits[key].time<5)continue;
      }
      end(false,`${key} reached ${state[key]}%. Keep resources away from empty and full.`,reasons[key][high?1:0]);
      return true;
    }else delete state.resourceLimits[key];
  }
  return false;
}
function isLossEnding(){return state.preview?state.preview!=='win':state.ended&&!state.win;}
function updateLossSequence(dt){
  const effect=$('loss-effect');
  if(!isLossEnding()){
    effect.hidden=true;effect.innerHTML='';state.lossTime=0;state.lossPhase=null;state.skeletonSource=null;return;
  }
  if(!state.skeletonSource){
    const choices=['gifs/skeleton1.gif','gifs/skeleton2.gif','gifs/skeleton3.gif','gifs/skeleton4.gif','screenshots/skelly.png'];
    state.skeletonSource=choices[Math.floor(Math.random()*choices.length)];lossSequenceId++;
  }
  if(!state.paused)state.lossTime=Math.min(8.4,state.lossTime+dt);
  // Two full 1.7-second GIF plays after the initial five-second hold.
  const phase=state.lossTime<5?'wait':state.lossTime<8.4?'blast'+Math.min(1,Math.floor((state.lossTime-5)/1.7)):'skeleton';
  if(phase===state.lossPhase)return;
  const burning=phase==='wait'&&(state.preview||state.lossReason)==='too-much-sun';
  state.lossPhase=phase;effect.hidden=phase==='wait'&&!burning;
  if(phase==='wait'&&!burning){effect.innerHTML='';return;}
  const stage=plantStage(),plantHeight=stage===1?112.5:[0,150,210,260,280][stage];
  effect.style.left=((stage===4?600:582.5)-150)/10+'%';
  effect.style.top=(phase==='skeleton'?200:500-plantHeight/2-150)/650*100+'%';
  const source=burning?'gifs/fire.gif':phase==='skeleton'?state.skeletonSource:`gifs/explosion.gif?sequence=${lossSequenceId}&play=${phase}`;
  effect.innerHTML=`<img src="${source}" alt="">`;
}
function updateCamera(dt){
  if(!state.running||state.paused||state.preview)return;
  const camera=state.camera;camera.time+=dt;
  const amount=1-Math.exp(-dt*2.5);
  // A handheld operator gently reframes toward events.
  const target=state.dream?[-5,3]:state.dog?[-6,-3]:state.bugs.length?[-3,2]:state.snipShake>0?[3,1]:[0,0];
  camera.x+=(target[0]-camera.x)*amount;camera.y+=(target[1]-camera.y)*amount;
  camera.strength+=(1-camera.strength)*amount;
}
function cameraView(){
  if(!state.running||state.ended||state.preview)return {x:0,y:0,angle:0,zoom:1};
  const c=state.camera;
  return {x:c.x,y:c.y,angle:0,zoom:1+.03*c.strength};
}
function step(dt){
  updateCamera(dt);
  updateLossSequence(dt);
  if(!state.paused)state.rhythmTime+=dt;
  updateWinFlowers(dt);
  if(isShearsEnding()&&!state.paused)state.finisherTime=Math.min(3,state.finisherTime+dt);
  if(!state.running||state.paused||state.preview)return;
  if(checkResourceLimits())return;
  const s=state;s.time+=dt;s.toast-=dt;s.smack=Math.max(0,s.smack-dt);s.dogHappy=Math.max(0,s.dogHappy-dt);
  s.animationTime+=dt;
  s.foodShake=Math.max(0,s.foodShake-dt);
  const cooling=s.foodReady>0;
  s.foodReady=Math.max(0,s.foodReady-dt);
  for(const p of s.foodPellets){p.age+=dt;p.vy+=500*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
  s.foodPellets=s.foodPellets.filter(p=>p.age<.65&&p.y<650);
  s.poseElapsed=Math.min(.32,s.poseElapsed+dt);
  s.plantPoseElapsed=Math.min(.32,s.plantPoseElapsed+dt);s.plantMotionTime+=dt;
  // Spring toward the new height, with a small overshoot before settling.
  const blindsTarget=s.open?0:1;
  s.blindsVelocity+=(160*(blindsTarget-s.blindsAmount)-20*s.blindsVelocity)*dt;
  s.blindsAmount+=s.blindsVelocity*dt;
  if(Math.abs(blindsTarget-s.blindsAmount)<.001&&Math.abs(s.blindsVelocity)<.01){s.blindsAmount=blindsTarget;s.blindsVelocity=0;}
  s.snipShake=Math.max(0,s.snipShake-dt);
  s.dogEntrance=clamp(s.dogEntrance+dt*(s.dog?1.2:-1),0,1);
  for(const e of s.effects){e.age+=dt;e.vy+=850*dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.angle+=e.spin*dt;}
  s.effects=s.effects.filter(e=>e.age<3&&e.y<900);
  for(const item of s.returning)item.age+=dt;
  s.returning=s.returning.filter(item=>item.age<.55);
  const load=1+s.weed*.38;
  const resourceSpeed=difficulty().resources;
  if(!s.debug||s.liveNeeds){s.water-=dt*1.7*load*resourceSpeed;s.food-=dt*.95*load*resourceSpeed;s.sun+=(dt*(s.open?3.2:-2.8)-dt*s.weed*1.05)*resourceSpeed;}
  s.sun=clamp(s.sun,0,100);
  if(s.tool==='water'){
    if(!s.dream)s.tilt=clamp(s.tilt+dt*((space||mouseHeld)?.9:-.57),0,1);
    // Match the artwork's green zone (35%-68%): balance near its center for the best flow.
    s.water+=dt*waterFlowRate(s.tilt)*resourceSpeed;
  }
  if(s.tool==='food'){
    if(cooling)s.foodPhase=0;else s.foodPhase=(s.foodPhase+dt)%2.1;
    if(s.dream){s.food+=dt*8*resourceSpeed;s.dreamPelletTime+=dt;if(s.dreamPelletTime>.12){sprinkleFood(2);s.dreamPelletTime=0;}}
  }
  s.weedClock+=dt*(1+Math.max(0,s.food-45)/60+s.time/100);
  if(!s.debug&&s.weedClock>=s.weedTarget){s.weedClock=0;s.weedTarget=eventDelay(14,19);s.weed++;say(s.weed>2?'Too many leaves! Prune now!':'New leaves! Extra growth drains the plant faster.');}
  if(s.weed>2){s.overgrown+=dt;if(s.overgrown>3&&!s.debug){end(false,'The leaves grew beyond the second layer and toppled your flower. Prune whenever weeds appear.','overgrowth');return;}}
  else s.overgrown=0;
  if(!s.debug&&!s.dog&&s.time>=s.dogNext){s.dog=.01;say('Your dog wants a treat. Drag him a bone!',4);}
  if(s.dog){s.dog+=dt;if(s.dog>7&&s.dog-dt<=7)say('That snout is getting dangerously close…');if(s.dog>12&&!s.debug){end(false,'Your dog knocked the pot off the table. Next time, drag a treat from the bag to his head.','dog');return;}}
  if(!s.debug&&s.time>=s.bugNext){s.bugNext=s.time+(random(7,12)-s.time/40)*difficulty().events;if(s.open){s.bugs.push({x:-100,y:random(170,280),phase:random(0,6),age:0,bite:0});say('An uninvited guest! Grab the fly swatter.');}}
  for(const b of s.bugs){b.age+=dt;b.x+=(585-b.x)*dt*.3;b.y+=(295-b.y)*dt*.3;if(b.age>5){b.bite+=dt;s.health-=dt*3.2;}if(b.bite>12&&!s.debug){end(false,'A fly made a meal of your flower. Swat bugs before they settle in for too long.','bugs');return;}}
  if(!s.debug&&!s.dream&&s.time>=s.dreamNext){s.dream=1;s.dreamHits=0;space=false;mouseHeld=false;say('Thinking about her… Mash Space 9 times to snap out!',5);}
  if(s.dream)s.dream+=dt;
  s.water=clamp(s.water,0,100);s.food=clamp(s.food,0,100);
  if(checkResourceLimits(dt))return;
  const stressed=s.water<8||s.water>94||s.food<8||s.food>94||s.sun<8;
  if(stressed&&s.mode!=='easy')s.health-=dt*12;else if(!s.bugs.some(b=>b.age>5))s.health=Math.min(100,s.health+dt*2);
  if(s.health<=0&&!s.debug){let why=s.water<8?'dried out':s.water>94?'was overwatered':s.food<8?'ran out of nutrients':s.food>94?'got too much plant food':s.sun<8?'ran out of sunlight':'was eaten by bugs';end(false,`Your flower ${why}. Keep the care bars balanced and respond to trouble early.`,s.water<8?'underwater':s.water>94?'overwater':s.food<8?'underfeed':s.food>94?'overfeed':s.sun<8?'too-little-sun':'bugs');return;}
  if(s.time>=90&&!s.debug){s.time=90;end(true,'A flower, grown just for her. You survived the flies, the daydreams, and one very persistent dog.');return;}
  if(s.toast<=0)$('toast').textContent=stressed?'Your flower is struggling! Fix the low or overflowing bars.':s.weed>2?'Prune immediately — the plant is about to fall!':'A little attention goes a long way.';
  updateUI();
}
// Keep the new minigame layers in their shared PNG coordinates.
function minigameBar(kind,value){
  const progress=clamp(value,0,1);
  const image=(name,extra='')=>`<image href="png2/${name}.png" width="1024" height="1024" ${extra}/>`;
  if(kind==='water'){
    // Leave half a marker's width at each end so it never slides off the bar.
    const offset=111+(821-59)*progress-482;
    return `<svg class="minigame-art" viewBox="91 432 869 199" role="meter" aria-label="Watering can tilt" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress*100)}">${image('balance_bar_backrground')}${image('balance_bar_outline')}${image('balance_bar_marker',`transform="translate(${offset} 0)"`)}</svg>`;
  }
  return `<svg class="minigame-art" viewBox="91 432 869 199" role="progressbar" aria-label="Progress toward waking up" aria-valuemin="0" aria-valuemax="9" aria-valuenow="${Math.round(progress*9)}"><defs><clipPath id="love-progress-clip" clipPathUnits="userSpaceOnUse"><rect x="115" y="432" width="${811*progress}" height="199"/></clipPath></defs>${image('love_bar_background')}${image('love_bar_fill','clip-path="url(#love-progress-clip)"')}${image('love_bar_outline')}</svg>`;
}
function plantStage(){return state.preview==='win'?4:state.debug?state.debugStage:state.win?4:Math.min(3,1+Math.floor(state.time/30));}
function plantVisual(stage=plantStage()){
  let mode='healthy';
  if(stage<4){
    if(state.sun>90)mode='burn';
    else if(state.sun<10)mode='freeze';
    else {
      const excess=Math.max(state.water,state.food)-90;
      const shortage=10-Math.min(state.water,state.food);
      if(excess>0||shortage>0)mode=excess>=shortage?'full':'starve';
    }
  }
  return {mode,name:mode==='healthy'?`plant${stage}`:`plant${stage}_${mode==='freeze'?'burn':mode}`};
}
function updateUI(){
  if(checkResourceLimits())return;
  updateLossSequence(0);
  const plant=plantVisual();
  const plantKey=plantStage()+':'+plant.mode;
  if(plantKey!==state.plantPoseKey){
    if(state.plantPoseKey!==null)state.plantPoseElapsed=0;
    state.plantPoseKey=plantKey;state.plantMotionTime=0;
  }
  const guidance=state.mode==='easy'?easyGuidance():'';
  if(guidance!==state.lastGuidance){
    $('care-guidance').innerHTML=guidance?'<strong>NEED A HAND? Click a tip below</strong>'+easyHelpEntries().map(([action,text])=>`<button type="button" data-help="${action}">${text}</button>`).join(''):'';
    state.lastGuidance=guidance;
  }
  $('care-guidance').hidden=!guidance||!state.running||state.paused||!!state.preview;
  $('toast').hidden=true;
  $('ending-actions').hidden=!(state.ended||state.preview);
  const lost=state.preview?state.preview!=='win':state.ended&&!state.win;
  const blurb=deathBlurbs[state.preview||state.lossReason]||['Plant lost','Your plant could not hold on.'];
  const won=isWinEnding();
  $('death-blurb').hidden=!(lost||won);
  $('dog-ending').hidden=!(lost&&(state.preview||state.lossReason)==='dog');
  $('death-title').textContent=won?'Bloomed':lost?blurb[0]:'';
  $('death-description').textContent=lost?blurb[1]:'';
  $('preview-status').textContent=state.preview?'Preview: '+state.preview+' · Backspace returns to debug.':'';
  $('live-needs').checked=state.liveNeeds;
  document.querySelectorAll('[data-tool] small').forEach((el,i)=>{const labels=['Balance','Time it','Snip leaves','Aim & click','Drag a bone'];el.textContent=(state.debug?['Q','W','E','R','T'][i]:i+1)+' · '+labels[i];});
  document.querySelectorAll('[data-stat]').forEach(input=>{input.value=state[input.dataset.stat];});
  for(const key of ['water','sun','food']){$(key).value=state[key];$(key+'Value').textContent=Math.round(state[key])+'%';$(key+'Value').hidden=!state.debug;
    // Reveal only the filled portion; the background and outline stay full size.
    const fill=clamp(state[key],0,100)/100;
    $(key+'Bar').className='care-bar'+(state[key]>90||state[key]<10?' is-danger':'');
    $(key+'FillClip').setAttribute('width',({food:862,water:865,sun:873}[key])*fill);}
  const stage=state.preview==='win'?4:state.debug?state.debugStage:state.win?4:Math.min(3,1+Math.floor(state.time/30));
  $('stage').textContent=`0${stage} / 04 · ${['Sprout','Growing','Almost there','In bloom'][stage-1]}`;
  $('growth').style.width=(Math.min(100,state.time/90*100))+'%';$('clock').textContent=state.debug?'Debug · No endings · Manual events':state.win?'A gift worth the effort':`${Math.ceil(90-state.time)} seconds`;
  $('condition').textContent=`Leaves: ${['clear','one layer','two layers — prune!','overgrown!'][Math.min(3,state.weed)]} · Flower: ${state.health>70?'healthy':state.health>35?'stressed':'in danger!'}`;
  document.querySelectorAll('[data-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.tool===state.tool);b.setAttribute('aria-pressed',b.dataset.tool===state.tool);b.disabled=!state.running||!!state.dream||state.paused;});
  $('blinds').innerHTML=`Blinds ${state.open?'open':'closed'}<small>B · ${state.open?'Sun in, bugs in':'Keep bugs out'}</small>`;
  $('blinds').disabled=!state.running||!!state.dream||state.paused;
  const mini=$('mini');mini.hidden=!!state.preview||!state.running||(!state.tool&&!state.dream)||state.paused;
  if(state.dream)mini.innerHTML=`<b>Lost in a daydream…</b>${minigameBar('dream',state.dreamHits/9)}Mash Space · ${state.dreamHits} / 9`;
  else if(state.tool==='water')mini.innerHTML=`<b>Keep the tilt in the green for the best flow</b>${minigameBar('water',state.tilt)}Hold Space to raise · Release to lower`;
  else if(state.tool==='food')mini.innerHTML=`<b>Feed on green</b><div class="traffic-lights">${['red','yellow','green'].map(color=>`<i class="${color} ${foodLight()===color?'lit':''}"></i>`).join('')}</div>${state.foodReady>0?'Wait… '+state.foodReady.toFixed(1)+'s until ready':'Click / Space · Early = a small helping'}`;
  else mini.innerHTML={prune:'<b>Snip carefully</b><br>Click the plant · One click, one layer',swat:'<b>Protect your flower</b><br>Click the flying bugs',treat:'<b>A very good distraction</b><br>Drag from the treat bag to the dog'}[state.tool]||'';
}
function label(text,x,y){ctx.font='12px "DM Sans",sans-serif';ctx.fillStyle='#657150';ctx.textAlign='center';ctx.fillText(text,x,y);}
function isShearsEnding(){
  return state.preview==='oversnip'||(state.ended&&!state.win&&state.lossReason==='oversnip');
}
function chopMotion(time){
  const tremble=time<.65?Math.sin(time*95)*4*(1-time/.65):0;
  const slide=clamp((time-.65)/1.8,0,1);
  return {shakeX:tremble,shakeY:tremble*.4,x:220*slide*slide,y:450*slide*slide,angle:.5*slide*slide};
}
function drawChoppedPlant(stage){
  const artStage=Math.min(stage,3);
  const top=assets[`plant${artStage}chop_top`],bottom=assets[`plant${artStage}chop_bottom`];
  if(!top||!bottom)return;
  // Crop both halves to the SAME union, preserving their shared source coordinates.
  const left=Math.min(top.x,bottom.x),upper=Math.min(top.y,bottom.y);
  const width=Math.max(top.x+top.w,bottom.x+bottom.w)-left;
  const height=Math.max(top.y+top.h,bottom.y+bottom.h)-upper;
  const displayWidth=stage===1?116.25:155+(stage===4?35:0);
  const displayHeight=stage===1?112.5:[0,150,210,260,280][stage];
  const center=stage===1?582.5:505+displayWidth/2;
  const motion=chopMotion(state.finisherTime);
  for(const [part,isTop] of [[bottom,false],[top,true]]){
    ctx.save();
    ctx.translate(center+motion.shakeX+(isTop?motion.x:0),500-displayHeight/2+motion.shakeY+(isTop?motion.y:0));
    if(isTop)ctx.rotate(motion.angle);
    ctx.drawImage(part.img,left,upper,width,height,-displayWidth/2,-displayHeight/2,displayWidth,displayHeight);
    ctx.restore();
  }
}
function drawPlant(stage,shake){
  const s=state,{mode,name}=plantVisual(stage);
  const lost=s.preview?s.preview!=='win':s.ended&&!s.win;
  const height=stage===1?112.5:[0,150,210,260,280][stage];
  const baseWidth=stage===1?116.25:155+(stage===4?35:0);
  const width=mode!=='healthy'&&assets[name]?height*assets[name].w/assets[name].h:baseWidth;
  const center=(stage===1?582.5:505+baseWidth/2)+shake;
  const top=500-height;
  const burning=mode==='burn',freezing=mode==='freeze';
  if(burning){
    const frame=1+Math.floor(s.plantMotionTime/.14)%2;
    const smokeHeight=height+65;
    const smokeWidth=assets['smoke'+frame]?smokeHeight*assets['smoke'+frame].w/assets['smoke'+frame].h:width;
    art('smoke'+frame,center-smokeWidth/2,top-55-Math.sin(s.plantMotionTime*4)*6,smokeWidth,smokeHeight);
  }
  // The same damped squash-and-stretch used for the dude, anchored at the soil.
  const t=lost?1:s.plantPoseElapsed/.32;
  const squash=Math.sin(t*Math.PI*2)*(1-t)*.16+rhythmBounce(s.rhythmTime,mode==='full'?1.25:mode==='starve'||freezing?.45:burning?.6:.8);
  const pulse=!lost&&(burning||freezing)?Math.sin(s.plantMotionTime*Math.PI*2*(burning?5:1.5)):0;
  ctx.save();ctx.translate(center,500-Math.abs(pulse)*(burning?5:2));
  ctx.rotate(pulse*(burning?.025:.012));
  ctx.scale(1+squash*.65-Math.abs(pulse)*.035,1-squash+Math.abs(pulse)*.08);
  art(name,-width/2,-height,width,height);ctx.restore();
  if(freezing){
    const frame=1+Math.floor(s.plantMotionTime/.4)%2;
    const coldWidth=width+55;
    const coldHeight=assets['cold'+frame]?coldWidth*assets['cold'+frame].h/assets['cold'+frame].w:height;
    art('cold'+frame,center-coldWidth/2,top+(height-coldHeight)/2+Math.sin(s.plantMotionTime*3)*4,coldWidth,coldHeight);
  }
}
function currentDudePose(){
  const s=state;
  if(s.dream)return space||mouseHeld?'dude_daydreaming_stagger':'dude_daydreaming';
  if(!s.tool&&(s.dog>0||s.dogEntrance>0))return 'dude_dog';
  if(s.tool==='prune')return s.snip?'dude_shears2':'dude_shears1';
  if(s.tool==='swat')return 'dude_flyswatter1';
  return `dude${carePose()}`;
}
function render(){
  const s=state;ctx.clearRect(0,0,1000,650);ctx.fillStyle='#f3ead8';ctx.fillRect(0,0,1000,650);
  const camera=cameraView();ctx.save();ctx.translate(500+camera.x,325+camera.y);
  ctx.rotate(camera.angle);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-500,-325);
  // Layer order: wall, window, blinds, character/dog, table, plant, weeds, pot, tools, hands, flies.
  ctx.fillStyle=s.open?'#fff5c94d':'#8f967419';ctx.beginPath();ctx.moveTo(60,125);ctx.lineTo(450,90);ctx.lineTo(710,600);ctx.lineTo(30,600);ctx.fill();
  art('window',0,90,587.5,493.75);
  const blindsBlend=clamp(s.blindsAmount,0,1);
  const blindsHeight=156.25+312.5*s.blindsAmount;
  const blindsWidth=575+Math.sin(blindsBlend*Math.PI)*12;
  const blindsX=(575-blindsWidth)/2;
  const windowHover={x:0,y:90,w:587.5,h:493.75};
  ctx.save();
  if(blindsBlend<1){ctx.globalAlpha=1-blindsBlend;interactiveArt('blinds_open',blindsX,90,blindsWidth,blindsHeight,windowHover);}
  if(blindsBlend>0){ctx.globalAlpha=blindsBlend;interactiveArt('blinds_closed',blindsX,90,blindsWidth,blindsHeight,windowHover);}
  ctx.restore();
  const dude=currentDudePose();
  const sharedHoldPose=['dude2','dude3','dude4'].includes(dude);
  const dudeX=dude.startsWith('dude_daydreaming')?475:(dude==='dude2'?570:580)-((sharedHoldPose||dude==='dude_flyswatter1')?20:0);
  const dudeY=dude.startsWith('dude_daydreaming')?170:dude==='dude2'?190:220;
  const dudeW=dude.startsWith('dude_daydreaming')?630:dude==='dude_flyswatter1'?393.75:dude==='dude2'?420:350;
  const dudeH=dude.startsWith('dude_daydreaming')?603:dude==='dude_flyswatter1'?376.875:dude==='dude2'?402:335;
  const poseKey=[dude,s.tool,s.snip,!!s.smack,s.posePulse].join(':');
  if(poseKey!==s.poseKey){if(s.poseKey!==null)s.poseElapsed=0;s.poseKey=poseKey;}
  const t=s.poseElapsed/.32;
  const squash=Math.sin(t*Math.PI*2)*(1-t)*.16+rhythmBounce(s.rhythmTime,s.dream?.65:1);
  poseTransform={x:dudeX+dudeW/2,y:dudeY+dudeH,sx:1+squash*.65,sy:1-squash};
  // His right arm is on the viewer's left. Tuck each sleeve behind his body.
  const waterTransform=['hold_wateringcan',290,235,(s.tilt-.5)*.2,dude==='dude3'?0:dude==='dude4'?30:sharedHoldPose?50:-30,sharedHoldPose?-20:-50];
  if(s.tool==='water')held(...waterTransform);
  if(s.tool==='swat'&&!s.smack)held('hold_flyswatter1',377,292.5,15*Math.PI/180,(sharedHoldPose?-20:0)+80,0);
  if(s.tool==='food'){
    // A successful feed starts the cooldown; use its first 0.35s for a short shake.
    const shakeStrength=s.foodShake/.35;
    const feedShake=Math.sin((.35-s.foodShake)*65)*shakeStrength;
    const foodTransform=['hold_plantfood',285,195,10*Math.PI/180+feedShake*.07,dude==='dude2'?30:dude==='dude3'?0:dude==='dude4'?30:sharedHoldPose?50:-30,(dude==='dude2'?-20:sharedHoldPose?-10:-40)+feedShake*7];
    held(...foodTransform);
    s.foodOrigin=heldPoint(...foodTransform,730,335);
  }
  restingTool('swat');
  if(!s.ended&&!s.preview)art(dude,dudeX,dudeY,dudeW,dudeH,(sharedHoldPose||dude==='dude_flyswatter1')?15*Math.PI/180:0);
  if(s.tool==='prune'&&!s.snip)held('hold_shears1',300,230,0,10,-80);
  art('table',-20,220,1040,430);
  if(s.tool==='swat'&&s.smack)art('hold_flyswatter2',710,360,377,292.5);
  if(s.tool==='prune'&&s.snip)art('hold_shears2',800,420,300,230);
  const shake=s.snipShake>0?Math.sin((.22-s.snipShake)*90)*8*(s.snipShake/.22):s.weed>2?Math.sin(s.time*25)*5:s.dog>9?Math.sin(s.time*20)*4:0;
  const stage=plantStage();
  art('pot',486+shake,446,200,158);
  if(!isShearsEnding()&&s.lossPhase!=='skeleton')drawPlant(stage,shake);
  if(s.weed&&!isShearsEnding()&&s.lossPhase!=='skeleton')interactiveArt(`weed${Math.min(s.weed,2)}`,486+shake,446,200,158);
  restingTool('food');
  restingTool('water');
  restingTool('prune');
  interactiveArt('dog_bonebag',-40,406.25,256.5,243);
  if(!s.running&&!s.ended){label('SUNSHINE + THE OCCASIONAL FLY',247,70);label('A FLOWER FOR HER',540,635);}
  if(s.running)label('B · '+(s.open?'CLOSE BLINDS':'OPEN BLINDS'),235,113);
  if(s.tool==='water'){
    // Spout holes measured in the original PNG; use the exact held-arm transform.
    const spout=heldPoint(...waterTransform,685,615);
    if(spout){ctx.save();ctx.strokeStyle='#75b9d6';ctx.lineCap='round';
      const flow=waterFlowRate(s.tilt)/10;
      ctx.lineWidth=2.5+5*flow;
      ctx.globalAlpha=.55+.45*flow;
      const count=Math.round(flow*10);
      for(let i=0;i<count;i++){
        const t=(s.animationTime*2.8+i/count)%1;
        const spread=(i%3-1)*6;
        const fan=count>1?(i/(count-1)-.5)*60:0;
        const x=spout.x+spread+(22+fan)*t;const y=spout.y+5+60*t*t;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+5,y+12.5+12.5*t);ctx.stroke();
      }
      ctx.restore();
    }
  }
  ctx.save();ctx.fillStyle='#ed922e';ctx.strokeStyle='#b76420';ctx.lineWidth=1;
  for(const p of s.foodPellets){ctx.globalAlpha=Math.min(1,(.65-p.age)*5);ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();ctx.stroke();}
  ctx.restore();
  for(const b of s.bugs){const p=bugPosition(b);interactiveArt('fly',p.x-48,p.y-44,96,88);if(b.age>5){ctx.fillStyle='#c77b57';ctx.fillRect(p.x-40,p.y+47,80*(1-b.bite/12),3);}}
  // Brief slash flash at the cut, above the plant and held tools.
  if(s.slash&&s.snipShake>0&&assets.slash){
    const progress=1-s.snipShake/.22;
    const height=180*(.85+.15*progress);
    const width=height*assets.slash.w/assets.slash.h;
    ctx.save();ctx.globalAlpha=Math.min(1,s.snipShake/.08);
    art('slash',s.slash.x-width/2,s.slash.y-height/2,width,height);
    ctx.restore();
  }
  if(s.smack)art('swatter_smack',pointer.x-34,pointer.y-34,68,68);
  // Foreground dog sits above all scene artwork; cursor and game UI remain usable.
  if(s.dogEntrance>0){const p=dogPosition();interactiveArt(s.dogHappy?'dog_happy':'dog',p.x,p.y,382.5,307.5);}
  if(s.running&&s.dog){ctx.fillStyle='#fff9e9';ctx.fillRect(740,364,176,23);label(s.dog>7?'HEY! THE POT!':'A treat, please?',828,380);ctx.fillStyle='#cf8e64';ctx.fillRect(740,389,176*(1-s.dog/12),5);}
  const customCursor=s.running&&!s.paused&&pointerInside;
  canvas.style.cursor=customCursor?'none':'default';
  for(const e of s.effects)art(e.name,e.x,e.y,e.w,e.h,e.angle);
  for(const item of s.returning){
    const [name,x,y,w,h]=restingTools[item.tool];
    const t=clamp(item.age/.55,0,1);const ease=1-Math.pow(1-t,3);
    art(name,(item.x-w/2)*(1-ease)+x*ease,(item.y-h/2)*(1-ease)+y*ease,w,h);
  }
  if(customCursor){const size=dragging?189:63;const hotspot=dragging?54:18;art(dragging?'clicker_bone':s.tool==='swat'?'clicker_swatter':'clicker_hand',pointer.x-hotspot,pointer.y-hotspot,size,size,dragging?boneAngle():0);}
  if(s.dream&&!s.preview&&!s.ended){
    ctx.fillStyle=focusColors.dream;ctx.fillRect(0,0,1000,650);
    art(dude,dudeX,dudeY,dudeW,dudeH,(sharedHoldPose||dude==='dude_flyswatter1')?15*Math.PI/180:0);
  }
  if(s.ended||s.preview){
    const winning=s.preview?s.preview==='win':s.win;
    // Falling flowers sit beneath the yellow wash and the ending characters.
    if(winning)for(const flower of s.winFlowers)art('flower',flower.x,flower.y,flower.w,flower.h,flower.angle);
    ctx.fillStyle=winning?focusColors.win:focusColors.loss;ctx.fillRect(0,0,1000,650);
    const endingArt=assets[s.endingPose];
    if(endingArt){
      const scale=Math.min(310/endingArt.w,410/endingArt.h);
      const width=endingArt.w*scale,height=endingArt.h*scale;
      const bounce=rhythmBounce(s.rhythmTime,winning?1.3:.65);
      ctx.save();ctx.translate(835,650);ctx.scale(1+bounce*.65,1-bounce);
      art(s.endingPose,-width/2,-height,width,height,0,false);ctx.restore();
    }
    art('pot',486+(isShearsEnding()?0:shake),446,200,158);
    if(s.lossPhase!=='skeleton'){if(isShearsEnding())drawChoppedPlant(stage);else drawPlant(stage,shake);}
  }
  if(s.paused&&!s.preview&&!s.ended){ctx.fillStyle='#f7f5ede0';ctx.fillRect(0,0,1000,650);ctx.font='40px Georgia';ctx.fillStyle='#45563a';ctx.textAlign='center';ctx.fillText('Take a little breather.',500,315);label('Press P or Resume to keep growing.',500,350);}
  ctx.restore();
}
function bugPosition(b){return{x:b.x+Math.sin(b.age*4+b.phase)*27,y:b.y+Math.cos(b.age*3+b.phase)*20};}
function pos(e){
  const r=canvas.getBoundingClientRect(),camera=cameraView();
  const x=(e.clientX-r.left)*1000/r.width-500-camera.x,y=(e.clientY-r.top)*650/r.height-325-camera.y;
  const cos=Math.cos(camera.angle),sin=Math.sin(camera.angle);
  return {x:500+(x*cos+y*sin)/camera.zoom,y:325+(-x*sin+y*cos)/camera.zoom};
}
canvas.addEventListener('pointermove',e=>{pointer=pos(e);});
canvas.addEventListener('pointerenter',()=>{pointerInside=true;});
canvas.addEventListener('pointerleave',()=>{pointerInside=false;});
function putToolAway(){
  if(!state.running||state.paused||state.dream)return;
  returnTool(state.tool);
  state.tool=null;space=false;mouseHeld=false;dragging=false;updateUI();
}
function primaryAction(){
  if(!state.running||state.paused)return;
    if(state.dream){state.dreamHits++;if(state.dreamHits>=9){state.dream=0;state.dreamNext=state.time+eventDelay(22,30);say('Back to reality! Check what you were holding.');}updateUI();return;}
    if(state.tool==='food'&&state.foodReady<=0){
      const perfect=foodLight()==='green';
      state.food+=(perfect?19:4)*difficulty().resources;
      sprinkleFood(perfect?18:4);
      state.foodPhase=0;state.foodReady=.9;state.foodShake=.35;state.posePulse++;
      say(perfect?'Green! A full helping.':'Too early — just a few pellets.');
      updateUI();
    }
}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function swatAt(x,y){state.smack=.16;state.posePulse++;let hit=false;state.bugs=state.bugs.filter(b=>{const p=bugPosition(b);if(Math.hypot(x-p.x,y-p.y)<65){hit=true;const direction=p.x>=x?1:-1;launchArt('fly',p.x-48,p.y-44,96,88,0,direction*random(320,480),-random(350,500),direction*random(8,13));return false;}return true;});if(hit)say('Got it. Hands off the flower!');}
canvas.addEventListener('pointerdown',e=>{
  pointer=pos(e);canvas.focus();if(state.preview)return;
  if(e.button===2){e.preventDefault();putToolAway();return;}
  if(e.button!==undefined&&e.button!==0)return;
  if(!state.running||state.paused)return;
  if(state.dream){mouseHeld=true;canvas.setPointerCapture(e.pointerId);primaryAction();return;}
  const {x,y}=pointer;
  if(state.tool==='swat'&&state.bugs.some(b=>{const p=bugPosition(b);return Math.hypot(x-p.x,y-p.y)<65;})){swatAt(x,y);return;}
  if(x>-40&&x<216.5&&y>406.25&&y<649.25){if(state.tool!=='treat')selectTool('treat');dragging=true;canvas.setPointerCapture(e.pointerId);return;}
  // With shears equipped, the pot also counts as a cut, even over a resting tool.
  if(state.tool==='prune'&&((x>480&&x<700&&y>185&&y<500)||(x>=486&&x<=686&&y>=446&&y<=604))){state.snip=state.snip?0:1;state.snipShake=.22;state.slash={x,y};scatterLeaves(x,y);if(state.weed){state.weed--;state.overgrown=0;say('One layer trimmed. Room to breathe.');}else{state.health-=state.mode==='medium'||state.mode==='hard'?Math.max(0,state.health):38;say('Ouch! No weeds left — you cut the flower.');if(state.health<=0)end(false,'Too much pruning cut the flower down. Only snip when weed layers are visible.','oversnip');}updateUI();return;}
  // Pickups take priority over the held tool's action, enabling one-click swaps.
  for(const tool of ['food','water','prune','swat']){
    if(tool===state.tool)continue;
    const [,tx,ty,tw,th]=restingTools[tool];
    if(x>tx&&x<tx+tw&&y>ty&&y<ty+th){selectTool(tool);return;}
  }
  if(x>=0&&x<587.5&&y>90&&y<352.5){toggleBlinds();return;}
  if(state.tool==='water'||state.tool==='food'){mouseHeld=true;canvas.setPointerCapture(e.pointerId);primaryAction();return;}
  if(state.tool==='swat'){swatAt(x,y);return;}
});
canvas.addEventListener('pointerup',e=>{
  if(e.button!==undefined&&e.button!==0)return;
  mouseHeld=false;
  pointer=pos(e);
  if(dragging&&state.running&&!state.paused){
    const dog=dogPosition();
    if(!state.dream&&state.dog&&pointer.x>dog.x&&pointer.x<dog.x+382.5&&pointer.y>dog.y&&pointer.y<dog.y+307.5){state.dog=0;state.dogHappy=2;state.dogNext=state.time+eventDelay(19,26);say('Good dog! Enjoy your treat.');}
    else {const angle=boneAngle();const direction=angle>=0?1:-1;launchArt('clicker_bone',pointer.x-54,pointer.y-54,189,189,angle,direction*140,100,direction*2.8);}
  }
  dragging=false;
});
canvas.addEventListener('pointercancel',()=>{dragging=false;mouseHeld=false;});
canvas.addEventListener('lostpointercapture',()=>{mouseHeld=false;});
document.addEventListener('keydown',e=>{
  if(state.debug&&!e.repeat){
    if(e.shiftKey&&/^Digit[0-9]$/.test(e.code)){e.preventDefault();const n=Number(e.code.slice(5));debugAction('loss-'+lossTypes[n===0?9:n-1]);return;}
    if(e.code==='KeyV'){debugAction('win');return;}
    if(e.code==='Backspace'){e.preventDefault();debugAction('clear-preview');return;}
  }
  if(state.preview)return;
  if(e.code==='Space'){
    if(!state.running)return;e.preventDefault();if(state.paused||e.repeat)return;
    space=true;
    primaryAction();
    return;
  }
  if(e.repeat)return;
  if(e.code==='KeyP')pause();
  if(e.code==='KeyB')toggleBlinds();
  if(e.code==='Escape')putToolAway();
  const n=Number(e.key);
  if(state.debug){
    if(n>=1&&n<=4)debugAction('pose'+n);
    const shortcuts={'5':'dog','6':'fly','7':'dream','8':'weed','9':'growth','0':'reset',q:'water',w:'food',e:'prune',r:'swat',t:'treat'};
    const action=shortcuts[e.key.toLowerCase()];
    if(action){if(toolNames.includes(action))selectTool(action);else debugAction(action);}
  }else if(n>=1&&n<=5)selectTool(toolNames[n-1]);
});
document.addEventListener('keyup',e=>{if(e.code==='Space')space=false;});
window.addEventListener('blur',()=>{space=false;mouseHeld=false;dragging=false;if(state.running&&!state.paused)pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.running&&!state.paused)pause();});
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>selectTool(b.dataset.tool));
$('blinds').onclick=toggleBlinds;$('pause').onclick=pause;
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>start(b.dataset.mode));
document.querySelectorAll('[data-debug]').forEach(b=>b.onclick=()=>debugAction(b.dataset.debug));
document.querySelectorAll('[data-stat]').forEach(input=>input.oninput=()=>{state[input.dataset.stat]=Number(input.value);updateUI();});
$('live-needs').onchange=e=>{state.liveNeeds=e.target.checked;};
$('care-guidance').onclick=e=>{
  const button=e.target.closest('[data-help]');
  if(!button||state.mode!=='easy'||!state.running||state.paused||state.preview)return;
  const action=button.dataset.help;
  if(state.dream){primaryAction();canvas.focus();return;}
  if(action==='down')putToolAway();
  else if(action==='open'||action==='close'){if(state.open!==(action==='open'))toggleBlinds();}
  else if(toolNames.includes(action)&&state.tool!==action)selectTool(action);
  canvas.focus();
};
$('retry').onclick=()=>start(state.mode||'medium');
$('ending-menu').onclick=mainMenu;
$('menu').onclick=mainMenu;
fresh();
Promise.all(names.map(loadArt)).then(()=>{document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=false);$('loading').textContent='Easy: fewer events and hints. Medium: standard pace. Hard: faster needs and more events.';updateUI();}).catch(err=>{$('loading').textContent='Artwork failed to load';$('toast').textContent='Serve this folder locally and reload. See README.md.';console.error(err);});
function frame(t){const dt=last?Math.min((t-last)/1000,.05):0;last=t;step(dt);render();requestAnimationFrame(frame);}
requestAnimationFrame(frame);
