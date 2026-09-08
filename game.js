/* All scene artwork comes from the original files in png/. No generated art. */
'use strict';
const canvas = document.querySelector('#scene');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const assets = {};
const names = ['window','blinds_open','blinds_closed','table','pot','plant1','plant2','plant3','plant4','weed1','weed2','dude1','dude2','dude3','dude4','dude_daydreaming','dude_daydreaming_stagger','dude_shears1','dude_shears2','dude_flyswatter1','sitting_wateringcan','sitting_plantfood','sitting_shears','sitting_flyswatter','hold_wateringcan','hold_plantfood','hold_shears1','hold_shears2','hold_flyswatter1','hold_flyswatter2','dog','dog_happy','dog_bonebag','clicker_bone','fly','heart','swatter_smack'];
const toolNames = ['water','food','prune','swat','treat'];
function carePose(){return 1+[state.water,state.sun,state.food].filter(value=>value<50).length;}
names.push('clicker_hand','clicker_swatter');
let pointerInside = false;
let state, last = 0, pointer = {x:500,y:400}, space = false, dragging = false;
const random = (a,b) => a + Math.random()*(b-a);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

// Trim alpha margins into an in-memory canvas; the artist's source files stay intact.
async function loadArt(name) {
  const img = new Image(); img.src = `png/${name}.png`; await img.decode();
  const c = document.createElement('canvas'); c.width=img.width; c.height=img.height;
  const g = c.getContext('2d',{willReadFrequently:true}); g.drawImage(img,0,0);
  try {
    const d=g.getImageData(0,0,c.width,c.height).data;
    let left=c.width,top=c.height,right=0,bottom=0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>20){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    assets[name]={img:c,x:left,y:top,w:right-left+1,h:bottom-top+1};
  } catch { assets[name]={img,x:0,y:0,w:img.width,h:img.height}; }
}
function art(name,x,y,w,h,angle=0) {
  const a=assets[name]; if(!a)return;
  ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(angle);
  ctx.drawImage(a.img,a.x,a.y,a.w,a.h,-w/2,-h/2,w,h);ctx.restore();
}
// Attach the sleeve end to a fixed shoulder, even while the tool rotates.
function held(name,w,h,angle=0,offsetX=0,offsetY=0){
  ctx.save();ctx.translate(680+offsetX,495+offsetY);ctx.rotate(angle);
  art(name,-w,-h*.82,w,h);ctx.restore();
}
function fresh() {
  state={running:false,paused:false,ended:false,win:false,time:0,water:55,food:55,sun:65,health:100,tool:null,tilt:.5,foodPhase:0,foodReady:0,weed:0,weedClock:0,weedTarget:13,dog:0,dogNext:random(15,22),dogHappy:0,bugNext:random(8,12),bugs:[],dream:0,dreamNext:random(20,28),dreamHits:0,open:true,snip:0,smack:0,toast:0,overgrown:0};
  state.effects=[];
  state.animationTime=0;
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
function say(message,seconds=3){$('toast').textContent=message;state.toast=seconds;}
function selectTool(tool){
  if(!state.running||state.paused||state.dream)return;
  state.tool=state.tool===tool?null:tool; dragging=false; space=false;
  if(state.tool==='water')state.tilt=.5;
  if(state.tool==='food'){state.foodPhase=0;state.foodReady=0;}
  const tips={water:'Hold Space to tilt up. Release to tilt down.',food:'Tap Space when the middle green dot lights up.',prune:'Click the leaves. Cutting a bare plant hurts it!',swat:'Click the flies before they settle on your flower.',treat:'Drag a bone from the treat bag to your dog.'};
  say(tips[state.tool]||'Tools down. Keep an eye on your flower.'); updateUI();
}
function toggleBlinds(){if(!state.running||state.paused||state.dream)return;state.open=!state.open;say(state.open?'Sunshine is in. Watch for flies!':'Blinds closed. Sunlight will run down.');updateUI();}
function end(win,reason){
  state.running=false;state.ended=true;state.win=win;state.tool=null;state.dream=0;space=false;dragging=false;
  $('overlay').hidden=false;
  $('overlay').innerHTML=`<div class="card"><p class="eyebrow">${win?'A LITTLE LOVE, FULLY GROWN':'EVERY GARDENER STARTS SOMEWHERE'}</p><h2>${win?'You made love bloom.':'Oh no, little flower.'}</h2><p>${reason}</p><p class="fine">${Math.floor(state.time)} seconds cared for · ${win?'4 / 4':' '+Math.min(3,1+Math.floor(state.time/30))+' / 4'} growth stages</p><button class="primary" id="again">${win?'Grow another gift':'Try again'}</button></div>`;
  $('again').onclick=start; $('pause').disabled=true; updateUI();
}
function start(){fresh();state.running=true;$('overlay').hidden=true;$('pause').disabled=false;$('pause').textContent='Pause · P';say('Make her day. Keep water and food in the middle!',4);canvas.focus();updateUI();}
function pause(){if(!state.running)return;state.paused=!state.paused;space=false;dragging=false;$('pause').textContent=state.paused?'Resume · P':'Pause · P';say(state.paused?'Paused. Take a breath.':'Back to your little flower.');updateUI();}

function step(dt){
  if(!state.running||state.paused)return;
  const s=state;s.time+=dt;s.toast-=dt;s.smack=Math.max(0,s.smack-dt);s.dogHappy=Math.max(0,s.dogHappy-dt);
  s.animationTime+=dt;
  s.dogEntrance=clamp(s.dogEntrance+dt*(s.dog?1.2:-1),0,1);
  for(const e of s.effects){e.age+=dt;e.vy+=850*dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.angle+=e.spin*dt;}
  s.effects=s.effects.filter(e=>e.age<3&&e.y<900);
  const load=1+s.weed*.38;
  s.water-=dt*1.7*load;s.food-=dt*.95*load;s.sun+=dt*(s.open?3.2:-2.8)-dt*s.weed*1.05;s.sun=clamp(s.sun,0,100);
  if(s.tool==='water'){
    if(!s.dream)s.tilt=clamp(s.tilt+dt*(space?.9:-.57),0,1);
    s.water+=dt*(.6+s.tilt*11);
  }
  if(s.tool==='food'){
    s.foodPhase=(s.foodPhase+dt*5)%9;s.foodReady=Math.max(0,s.foodReady-dt);
    if(s.dream)s.food+=dt*8;
  }
  s.weedClock+=dt*(1+Math.max(0,s.food-45)/60+s.time/100);
  if(s.weedClock>=s.weedTarget){s.weedClock=0;s.weedTarget=random(14,19);s.weed++;say(s.weed>2?'Too many leaves! Prune now!':'New leaves! Extra growth drains the plant faster.');}
  if(s.weed>2){s.overgrown+=dt;if(s.overgrown>3){end(false,'The leaves grew beyond the second layer and toppled your flower. Prune whenever weeds appear.');return;}}
  else s.overgrown=0;
  if(!s.dog&&s.time>=s.dogNext){s.dog=.01;say('Your dog wants a treat. Drag him a bone!',4);}
  if(s.dog){s.dog+=dt;if(s.dog>7&&s.dog-dt<=7)say('That snout is getting dangerously close…');if(s.dog>12){end(false,'Your dog knocked the pot off the table. Next time, drag a treat from the bag to his head.');return;}}
  if(s.time>=s.bugNext){s.bugNext=s.time+random(7,12)-s.time/40;if(s.open){s.bugs.push({x:-100,y:random(170,280),phase:random(0,6),age:0,bite:0});say('An uninvited guest! Grab the fly swatter.');}}
  for(const b of s.bugs){b.age+=dt;b.x+=(585-b.x)*dt*.3;b.y+=(295-b.y)*dt*.3;if(b.age>5){b.bite+=dt;s.health-=dt*3.2;}if(b.bite>12){end(false,'A fly made a meal of your flower. Swat bugs before they settle in for too long.');return;}}
  if(!s.dream&&s.time>=s.dreamNext){s.dream=1;s.dreamHits=0;space=false;say('Thinking about her… Mash Space 9 times to snap out!',5);}
  if(s.dream)s.dream+=dt;
  s.water=clamp(s.water,0,100);s.food=clamp(s.food,0,100);
  const stressed=s.water<8||s.water>94||s.food<8||s.food>94||s.sun<8;
  if(stressed)s.health-=dt*12;else if(!s.bugs.some(b=>b.age>5))s.health=Math.min(100,s.health+dt*2);
  if(s.health<=0){let why=s.water<8?'dried out':s.water>94?'was overwatered':s.food<8?'ran out of nutrients':s.food>94?'got too much plant food':s.sun<8?'ran out of sunlight':'was eaten by bugs';end(false,`Your flower ${why}. Keep the care bars balanced and respond to trouble early.`);return;}
  if(s.time>=90){s.time=90;end(true,'A flower, grown just for her. You survived the flies, the daydreams, and one very persistent dog.');return;}
  if(s.toast<=0)$('toast').textContent=stressed?'Your flower is struggling! Fix the low or overflowing bars.':s.weed>2?'Prune immediately — the plant is about to fall!':'A little attention goes a long way.';
  updateUI();
}
function updateUI(){
  for(const key of ['water','sun','food']){$(key).value=state[key];$(key+'Value').textContent=Math.round(state[key])+'%';}
  const stage=state.win?4:Math.min(3,1+Math.floor(state.time/30));
  $('stage').textContent=`0${stage} / 04 · ${['Sprout','Growing','Almost there','In bloom'][stage-1]}`;
  $('growth').style.width=(state.time/90*100)+'%';$('clock').textContent=state.win?'A gift worth the effort':`${Math.ceil(90-state.time)} seconds to make her day`;
  $('condition').textContent=`Leaves: ${['clear','one layer','two layers — prune!','overgrown!'][Math.min(3,state.weed)]} · Flower: ${state.health>70?'healthy':state.health>35?'stressed':'in danger!'}`;
  document.querySelectorAll('[data-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.tool===state.tool);b.setAttribute('aria-pressed',b.dataset.tool===state.tool);b.disabled=!state.running||!!state.dream||state.paused;});
  $('blinds').innerHTML=`Blinds ${state.open?'open':'closed'}<small>B · ${state.open?'Sun in, bugs in':'Keep bugs out'}</small>`;
  $('blinds').disabled=!state.running||!!state.dream||state.paused;
  const mini=$('mini');mini.hidden=!state.running||(!state.tool&&!state.dream)||state.paused;
  if(state.dream)mini.innerHTML=`<b>Lost in a daydream…</b><div class="track"><div style="height:100%;background:#d49baf;width:${state.dreamHits/9*100}%"></div></div>Mash Space · ${state.dreamHits} / 9`;
  else if(state.tool==='water')mini.innerHTML=`<b>Keep the tilt in the green</b><div class="track"><i class="needle" style="left:${state.tilt*98}%"></i></div>Hold Space to raise · Release to lower`;
  else if(state.tool==='food')mini.innerHTML=`<b>Feed on the green dot</b><div class="dots">${Array.from({length:9},(_,i)=>`<i class="${i===4?'center ':''}${i===Math.floor(state.foodPhase)?'lit':''}"></i>`).join('')}</div>Space · Early = less, late = too much`;
  else mini.innerHTML={prune:'<b>Snip carefully</b><br>Click the plant · One click, one layer',swat:'<b>Protect your flower</b><br>Click the flying bugs',treat:'<b>A very good distraction</b><br>Drag from the treat bag to the dog'}[state.tool]||'';
}
function label(text,x,y){ctx.font='12px "DM Sans",sans-serif';ctx.fillStyle='#657150';ctx.textAlign='center';ctx.fillText(text,x,y);}
function render(){
  const s=state;ctx.clearRect(0,0,1000,650);ctx.fillStyle='#f3ead8';ctx.fillRect(0,0,1000,650);
  // Layer order: wall, window, blinds, character/dog, table, plant, weeds, pot, tools, hands, flies.
  ctx.fillStyle=s.open?'#fff5c94d':'#8f967419';ctx.beginPath();ctx.moveTo(60,125);ctx.lineTo(450,90);ctx.lineTo(710,600);ctx.lineTo(30,600);ctx.fill();
  art('window',0,90,587.5,493.75);art(s.open?'blinds_open':'blinds_closed',0,90,575,s.open?156.25:468.75);
  const dude=s.dream?(s.dreamHits%2?'dude_daydreaming_stagger':'dude_daydreaming'):s.tool==='prune'?(s.snip?'dude_shears2':'dude_shears1'):s.tool==='swat'?'dude_flyswatter1':`dude${carePose()}`;
  const sharedHoldPose=['dude2','dude3','dude4'].includes(dude);
  // His right arm is on the viewer's left. Tuck each sleeve behind his body.
  if(s.tool==='water')held('hold_wateringcan',290,235,(s.tilt-.5)*.2,dude==='dude3'?0:dude==='dude4'?30:sharedHoldPose?50:-30,sharedHoldPose?-20:-50);
  if(s.tool==='swat'&&!s.smack)held('hold_flyswatter1',377,292.5,15*Math.PI/180,(sharedHoldPose?-20:0)+80,0);
  if(s.tool==='food'){
    // A successful feed starts the cooldown; use its first 0.35s for a short shake.
    const shakeStrength=clamp((s.foodReady-.3)/.35,0,1);
    const feedShake=Math.sin((.65-s.foodReady)*65)*shakeStrength;
    held('hold_plantfood',285,195,10*Math.PI/180+feedShake*.07,dude==='dude2'?30:dude==='dude3'?0:dude==='dude4'?30:sharedHoldPose?50:-30,(dude==='dude2'?-20:sharedHoldPose?-10:-40)+feedShake*7);
  }
  if(s.tool!=='swat')art('sitting_flyswatter',610,112,352.5,352.5*389/935*1.25);
  art(dude,(dude==='dude2'?570:580)-((sharedHoldPose||dude==='dude_flyswatter1')?20:0),dude.startsWith('dude_daydreaming')?170:dude==='dude2'?190:220,dude.startsWith('dude_daydreaming')?420:dude==='dude_flyswatter1'?393.75:dude==='dude2'?420:350,dude.startsWith('dude_daydreaming')?402:dude==='dude_flyswatter1'?376.875:dude==='dude2'?402:335,(sharedHoldPose||dude==='dude_flyswatter1')?15*Math.PI/180:0);
  if(s.tool==='prune'&&!s.snip)held('hold_shears1',300,230,0,10,-80);
  art('table',-20,220,1040,430);
  if(s.tool==='swat'&&s.smack)art('hold_flyswatter2',710,360,377,292.5);
  if(s.tool==='prune'&&s.snip)art('hold_shears2',800,420,300,230);
  const shake=s.weed>2?Math.sin(s.time*25)*5:s.dog>9?Math.sin(s.time*20)*4:0;
  const stage=s.win?4:Math.min(3,1+Math.floor(s.time/30));
  const heights=[0,150,210,260,280];const h=heights[stage];
  art('pot',486+shake,446,200,158);
  if(stage!==1)art(`plant${stage}`,505+shake,500-h,155+(stage===4?35:0),h);
  if(stage===1)art('plant1',524.375+shake,387.5,116.25,112.5);
  if(s.weed)art(`weed${Math.min(s.weed,2)}`,486+shake,446,200,158);
  if(s.tool!=='food')art('sitting_plantfood',170,445,146.25,249.375);
  if(s.tool!=='water')art('sitting_wateringcan',330,482,217.5,168);
  if(s.tool!=='prune')art('sitting_shears',600,512,283.5,283.5*684/924);
  art('dog_bonebag',-40,406.25,256.5,243);
  if(!s.running&&!s.ended){label('SUNSHINE + THE OCCASIONAL FLY',247,70);label('A FLOWER FOR HER',540,635);}
  if(s.running)label('B · '+(s.open?'CLOSE BLINDS':'OPEN BLINDS'),235,113);
  if(s.tool==='water'){ctx.strokeStyle='#75b9d6';ctx.lineWidth=3;for(let i=0;i<Math.ceil(s.tilt*8);i++){const y=380+(sharedHoldPose?30:0)+(s.time*180+i*13)%53;const dx=dude==='dude3'?30:dude==='dude4'?60:sharedHoldPose?80:0;ctx.beginPath();ctx.moveTo(406+dx+i*3,y);ctx.lineTo(402+dx+i*3,y+8);ctx.stroke();}}
  for(const b of s.bugs){const p=bugPosition(b);art('fly',p.x-48,p.y-44,96,88);if(b.age>5){ctx.fillStyle='#c77b57';ctx.fillRect(p.x-40,p.y+47,80*(1-b.bite/12),3);}}
  if(s.smack)art('swatter_smack',pointer.x-34,pointer.y-34,68,68);
  // Foreground dog sits above all scene artwork; cursor and game UI remain usable.
  if(s.dogEntrance>0){const p=dogPosition();art(s.dogHappy?'dog_happy':'dog',p.x,p.y,382.5,307.5);}
  if(s.running&&s.dog){ctx.fillStyle='#fff9e9';ctx.fillRect(740,364,176,23);label(s.dog>7?'HEY! THE POT!':'A treat, please?',828,380);ctx.fillStyle='#cf8e64';ctx.fillRect(740,389,176*(1-s.dog/12),5);}
  const customCursor=s.running&&!s.paused&&pointerInside;
  canvas.style.cursor=customCursor?'none':'default';
  for(const e of s.effects)art(e.name,e.x,e.y,e.w,e.h,e.angle);
  if(customCursor){const size=dragging?189:63;const hotspot=dragging?54:18;art(dragging?'clicker_bone':s.tool==='swat'?'clicker_swatter':'clicker_hand',pointer.x-hotspot,pointer.y-hotspot,size,size,dragging?boneAngle():0);}
  if(s.dream){ctx.fillStyle='#edd9e066';ctx.fillRect(0,0,1000,650);for(let i=0;i<5;i++)art('heart',700+Math.sin(i*2+s.time)*80,150-i*20+Math.sin(s.time+i)*12,30+i*4,30+i*4);}
  if(s.paused){ctx.fillStyle='#f7f5ede0';ctx.fillRect(0,0,1000,650);ctx.font='40px Georgia';ctx.fillStyle='#45563a';ctx.textAlign='center';ctx.fillText('Take a little breather.',500,315);label('Press P or Resume to keep growing.',500,350);}
}
function bugPosition(b){return{x:b.x+Math.sin(b.age*4+b.phase)*27,y:b.y+Math.cos(b.age*3+b.phase)*20};}
function pos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*1000/r.width,y:(e.clientY-r.top)*650/r.height};}
canvas.addEventListener('pointermove',e=>{pointer=pos(e);});
canvas.addEventListener('pointerenter',()=>{pointerInside=true;});
canvas.addEventListener('pointerleave',()=>{pointerInside=false;});
canvas.addEventListener('pointerdown',e=>{
  pointer=pos(e);canvas.focus();if(!state.running||state.paused||state.dream)return;
  const {x,y}=pointer;
  if(x>-40&&x<216.5&&y>406.25&&y<649.25){if(state.tool!=='treat')selectTool('treat');dragging=true;canvas.setPointerCapture(e.pointerId);return;}
  if(state.tool==='swat'){state.smack=.16;let hit=false;state.bugs=state.bugs.filter(b=>{const p=bugPosition(b);if(Math.hypot(x-p.x,y-p.y)<65){hit=true;const direction=p.x>=x?1:-1;launchArt('fly',p.x-48,p.y-44,96,88,0,direction*random(320,480),-random(350,500),direction*random(8,13));return false;}return true;});if(hit)say('Got it. Hands off the flower!');return;}
  if(state.tool==='prune'&&x>480&&x<700&&y>185&&y<500){state.snip=state.snip?0:1;if(state.weed){state.weed--;state.overgrown=0;say('One layer trimmed. Room to breathe.');}else{state.health-=38;say('Ouch! No weeds left — you cut the flower.');if(state.health<=0)end(false,'Too much pruning cut the flower down. Only snip when weed layers are visible.');}updateUI();return;}
  if(x>=0&&x<587.5&&y>90&&y<352.5){toggleBlinds();return;}
  if(x>170&&x<316.25&&y>445&&y<694.375)selectTool('food');else if(x>330&&x<547.5&&y>482&&y<650)selectTool('water');else if(x>600&&x<883.5&&y>512&&y<512+283.5*684/924)selectTool('prune');else if(x>610&&x<962.5&&y>112&&y<112+352.5*389/935*1.25)selectTool('swat');
});
canvas.addEventListener('pointerup',e=>{
  pointer=pos(e);
  if(dragging&&state.running&&!state.paused){
    const dog=dogPosition();
    if(!state.dream&&state.dog&&pointer.x>dog.x&&pointer.x<dog.x+382.5&&pointer.y>dog.y&&pointer.y<dog.y+307.5){state.dog=0;state.dogHappy=2;state.dogNext=state.time+random(19,26);say('Good dog! Enjoy your treat.');}
    else {const angle=boneAngle();const direction=angle>=0?1:-1;launchArt('clicker_bone',pointer.x-54,pointer.y-54,189,189,angle,direction*140,100,direction*2.8);}
  }
  dragging=false;
});
canvas.addEventListener('pointercancel',()=>{dragging=false;});
document.addEventListener('keydown',e=>{
  if(e.code==='Space'){
    if(!state.running)return;e.preventDefault();if(state.paused||e.repeat)return;
    if(state.dream){state.dreamHits++;if(state.dreamHits>=9){state.dream=0;state.dreamNext=state.time+random(22,30);say('Back to reality! Check what you were holding.');}updateUI();return;}
    space=true;
    if(state.tool==='food'&&state.foodReady<=0){const dot=Math.floor(state.foodPhase);const dose=dot<4?5+dot*2:dot===4?19:26+(dot-5)*7;state.food+=dose;state.foodReady=.65;say(dot===4?'Perfect timing! A balanced helping.':dot<4?'A small helping. A little early.':'Too late — that was a big helping!');}
    return;
  }
  if(e.repeat)return;
  if(e.code==='KeyP')pause();
  if(e.code==='KeyB')toggleBlinds();
  if(e.code==='Escape'&&state.running&&!state.dream&&!state.paused){state.tool=null;space=false;dragging=false;updateUI();}
  const n=Number(e.key);
  if(n>=1&&n<=5)selectTool(toolNames[n-1]);
});
document.addEventListener('keyup',e=>{if(e.code==='Space')space=false;});
window.addEventListener('blur',()=>{space=false;dragging=false;if(state.running&&!state.paused)pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.running&&!state.paused)pause();});
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>selectTool(b.dataset.tool));
$('blinds').onclick=toggleBlinds;$('pause').onclick=pause;$('start').onclick=start;
fresh();
Promise.all(names.map(loadArt)).then(()=>{$('start').disabled=false;$('start').textContent='Let’s grow something';updateUI();}).catch(err=>{$('start').textContent='Artwork failed to load';$('toast').textContent='Serve this folder locally and reload. See README.md.';console.error(err);});
function frame(t){const dt=last?Math.min((t-last)/1000,.05):0;last=t;step(dt);render();requestAnimationFrame(frame);}
requestAnimationFrame(frame);
