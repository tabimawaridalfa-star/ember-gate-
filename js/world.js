import {Player} from './player.js';
import {Level,overlap} from './level.js';
import {assets} from './assets.js';
import {ATTACK_DURATION,PLAYER_SPRITE,attackFrame,animationDuration,syncActor} from './actors.js';
export const SAVE_VERSION=3;
export const SAVE_KEY='ember-gate-complete-v3';
export const LEGACY_SAVE_KEY='ember-gate-complete-v2';
export const CHECKPOINTS=[{x:100,y:402},{x:1280,y:402},{x:2050,y:402},{x:3370,y:402}];
// Broad ground shelves only. Patrol limits leave takeoff/landing and checkpoint space.
export const ENEMY_SPAWNS=[
 {id:'crossing-zombie-01',type:'zombie',cx:1395,min:1352,max:1440},
 {id:'crossing-slime-01',type:'slime',cx:1770,min:1718,max:1828},
 {id:'embers-zombie-01',type:'zombie',cx:2170,min:2144,max:2192},
 {id:'embers-slime-01',type:'slime',cx:2294,min:2260,max:2314}
];
const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
export function normalizeSave(raw){
 if(!raw||![2,SAVE_VERSION].includes(raw.version)||!Array.isArray(raw.seals)||!Array.isArray(raw.dead))return null;
 return {version:SAVE_VERSION,difficulty:raw.difficulty==='story'?'story':'normal',
  checkpoint:Math.max(0,Math.min(3,Math.floor(finite(raw.checkpoint)))),
  seals:[0,1,2].map(i=>raw.seals[i]===true),
  // Numeric IDs from v2 belong to skull enemies. Never map them onto new actors.
  dead:raw.version===SAVE_VERSION?raw.dead.filter(id=>typeof id==='string'&&ENEMY_SPAWNS.some(e=>e.id===id)):[],
  bossDefeated:raw.version===2?raw.bossDead===true:raw.bossDefeated===true,
  bossDying:raw.version===SAVE_VERSION&&raw.bossDying===true,
  coins:Math.max(0,Math.floor(finite(raw.coins))),potions:Math.max(0,Math.min(5,Math.floor(finite(raw.potions,3)))),
  deaths:Math.max(0,Math.floor(finite(raw.deaths))),time:Math.max(0,finite(raw.time))};
}
export function setActorState(a,state){a.state=state;a.animTime=0;}
function makeEnemy(spawn){
 const hp=spawn.type==='zombie'?3:2;
 const e={...spawn,sheet:spawn.type,scale:spawn.type==='zombie'?1.25:1.5,feet:448,hp,maxHp:hp,
  state:spawn.type==='zombie'?'walk':'hop',animTime:0,dir:1,vy:0,airborne:false,hopPhase:'rest',hopTimer:.8,hidden:false,rewarded:false};
 syncActor(e);return e;
}
function makeBoss(difficulty){
 const hp=difficulty==='story'?10:16;
 const b={id:'ash-warden',type:'boss',sheet:'boss_ash_warden',scale:1,cx:3760,feet:448,hp,maxHp:hp,
  state:'idle',animTime:0,dir:-1,active:false,timer:.85,cycle:0,hidden:false,defeated:false,shotFired:false,resume:null};
 syncActor(b);return b;
}
export class World {
 constructor(difficulty='normal',saved=null){
  const clean=normalizeSave(saved);
  this.difficulty=clean?.difficulty||(difficulty==='story'?'story':'normal');
  this.level=new Level();this.player=new Player(this.level.start);this.maxHp=this.difficulty==='story'?8:5;
  this.hp=this.maxHp;this.potions=3;this.time=0;this.deaths=0;this.coins=0;this.checkpoint=0;this.seals=[false,false,false];
  this.sealItems=[{x:844,y:300,w:28,h:34},{x:1780,y:387,w:28,h:34},{x:2700,y:335,w:28,h:34}];
  this.enemies=ENEMY_SPAWNS.map(makeEnemy);this.boss=makeBoss(this.difficulty);
  this.shots=[];this.particles=[];this.inv=0;this.attack=0;this.attackFacing=1;this.cooldown=0;this.dash=0;this.dashCooldown=0;
  this.hitIds=new Set();this.events=[];this.won=false;this.lockMessage=0;
  if(clean)this.restore(clean);
 }
 emit(type,text){this.events.push({type,text});}
 snapshot(){return {version:SAVE_VERSION,difficulty:this.difficulty,checkpoint:this.checkpoint,seals:[...this.seals],
  dead:this.enemies.filter(e=>e.hp<=0).map(e=>e.id),bossDefeated:this.boss.defeated,bossDying:this.boss.hp<=0&&!this.boss.defeated,
  coins:this.coins,potions:this.potions,deaths:this.deaths,time:this.time};}
 restore(raw){
  const s=normalizeSave(raw);if(!s)return;
  this.checkpoint=s.checkpoint;this.seals=s.seals;this.coins=s.coins;this.potions=s.potions;this.deaths=s.deaths;this.time=s.time;
  for(const e of this.enemies)if(s.dead.includes(e.id)){e.hp=0;e.hidden=true;e.rewarded=true;setActorState(e,'death');}
  if(s.bossDefeated){this.boss.hp=0;this.boss.defeated=true;this.boss.hidden=true;setActorState(this.boss,'death');}
  else if(s.bossDying){this.boss.hp=0;this.boss.active=true;setActorState(this.boss,'death');}
  this.player.reset(CHECKPOINTS[this.checkpoint]);
 }
 burst(x,y,color,count=15){for(let i=0;i<count;i++)this.particles.push({x,y,vx:(Math.random()-.5)*180,vy:-Math.random()*170,life:.35+Math.random()*.4,color});}
 respawn(){
  this.deaths++;this.hp=this.maxHp;this.potions=Math.max(2,this.potions);this.player.reset(CHECKPOINTS[this.checkpoint]);
  this.inv=1.8;this.attack=0;this.dash=0;this.shots=[];
  this.enemies=this.enemies.map((e,i)=>e.hp>0?makeEnemy(ENEMY_SPAWNS[i]):e);
  if(this.boss.hp>0)this.boss=makeBoss(this.difficulty);
  this.emit('death','Bangkit di checkpoint. Coba lagi — segel tetap tersimpan.');this.emit('save');
 }
 hurt(amount=1,sourceX=null){
  if(this.inv>0||this.dash>0||this.won)return;
  this.hp-=amount;this.inv=1.1;
  if(sourceX!==null){this.player.knockback=(this.player.x+this.player.w/2>=sourceX?1:-1)*100;this.player.vy=Math.min(this.player.vy,-110);this.player.grounded=false;}
  this.burst(this.player.x+12,this.player.y+20,'#ff6d61');this.emit('hurt');
  if(this.hp<=0)this.respawn();
 }
 attackBox(){
  if(this.attack<=0||!assets.knight_attack.data.activeFrames.includes(attackFrame(this.attack)))return null;
  const p=this.player,s=PLAYER_SPRITE.scale;
  // Source frame 2: hand/blade x44..63, y35..46 (small collision tolerance).
  const sourceX=this.attackFacing>0?44:64-63;
  return {x:p.x+PLAYER_SPRITE.offsetX+sourceX*s,y:p.y+PLAYER_SPRITE.offsetY+35*s,w:19*s,h:11*s};
 }
 damageEnemy(e,amount=1){
  if(e.hp<=0)return;
  e.hp=Math.max(0,e.hp-amount);this.burst(e.cx,e.y+e.h/2,'#ffd58b');this.emit('hit');
  if(e.hp===0){
   setActorState(e,'death');
   if(!e.rewarded){e.rewarded=true;this.coins+=10;if(this.coins%30===0){this.potions=Math.min(5,this.potions+1);this.emit('coin','Bonus ramuan dari musuh!');}this.emit('save');}
  }else setActorState(e,'hurt');
  syncActor(e);
 }
 groundAhead(e,cx){
  return this.level.solids.some(t=>cx>=t.x&&cx<t.x+t.w&&Math.abs(t.y-e.feet)<3);
 }
 moveEnemy(e,distance){
  const old=e.cx,next=old+distance,lead=next+e.dir*(e.w/2+4);
  if(next<e.min||next>e.max||(!e.airborne&&!this.groundAhead(e,lead))){e.dir*=-1;return;}
  e.cx=next;syncActor(e);
  if(this.level.solids.some(t=>overlap(e,t))){e.cx=old;e.dir*=-1;syncActor(e);}
 }
 slimeGravity(e,dt){
  if(!e.airborne)return;
  const previous=e.feet;e.vy+=1100*dt;e.feet+=e.vy*dt;syncActor(e);
  for(const t of this.level.solids){
   if(e.x+e.w>t.x&&e.x<t.x+t.w&&previous<=t.y+.01&&e.feet>=t.y&&e.vy>=0){
    e.feet=t.y;e.vy=0;e.airborne=false;e.hopPhase='land';e.hopTimer=.14;break;
   }
  }
  syncActor(e);
 }
 updateEnemy(e,dt){
  if(e.hidden)return;
  e.animTime+=dt;
  if(e.state==='death'){
   this.slimeGravity(e,dt);
   if(e.animTime>=animationDuration(e.sheet,'death'))e.hidden=true;
   syncActor(e);return;
  }
  if(e.state==='hurt'){
   this.slimeGravity(e,dt);
   if(e.animTime>=animationDuration(e.sheet,'hurt'))setActorState(e,e.type==='zombie'?'walk':'hop');
   syncActor(e);return;
  }
  if(e.type==='zombie')this.moveEnemy(e,e.dir*(this.difficulty==='story'?24:32)*dt);
  else {
   e.hopTimer-=dt;
   if(!e.airborne&&e.hopTimer<=0){
    if(e.hopPhase==='rest'){e.hopPhase='windup';e.hopTimer=.16;}
    else if(e.hopPhase==='windup'){
     const landing=e.cx+e.dir*28;
     if(landing<e.min||landing>e.max||!this.groundAhead(e,landing+e.dir*(e.w/2+6)))e.dir*=-1;
     e.airborne=true;e.vy=-230;e.hopPhase='air';e.hopTimer=0;
    }else{e.hopPhase='rest';e.hopTimer=this.difficulty==='story'?1.1:.85;}
   }
   if(e.airborne){this.moveEnemy(e,e.dir*(this.difficulty==='story'?48:60)*dt);this.slimeGravity(e,dt);}
  }
  syncActor(e);
 }
 startBossState(state,duration){setActorState(this.boss,state);this.boss.timer=duration;}
 damageBoss(){
  const b=this.boss;if(b.hp<=0)return;
  b.hp--;this.burst(b.cx,b.y+b.h/2,'#ffbc6b',20);this.emit('hit');
  if(b.hp===0){setActorState(b,'death');b.resume=null;this.shots=[];this.emit('save');}
  else {
   if(b.state!=='hurt')b.resume={state:b.state,animTime:b.animTime,timer:b.timer};
   setActorState(b,'hurt');
  }
  syncActor(b);
 }
 fireBoss(){
  const b=this.boss,dir=b.dir;
  const spawn=(cy,speed)=>this.shots.push({x:b.cx+dir*(b.w/2+15)-10,y:cy-10,w:20,h:20,vx:dir*speed,life:4,animTime:0});
  spawn(423,this.difficulty==='story'?210:290);
  if(b.hp<b.maxHp/2)spawn(359,240);
  this.emit('fire');
 }
 updateBoss(dt){
  const b=this.boss,p=this.player;
  if(b.defeated)return;
  b.animTime+=dt;
  if(b.state==='death'){
   if(b.animTime>=animationDuration(b.sheet,'death')){
    b.defeated=true;b.hidden=true;this.coins+=100;
    this.burst(b.cx,b.feet-30,'#8aece5',70);this.emit('seal','Penjaga tumbang! Bawa ketiga segel ke gerbang.');this.emit('save');
   }
   syncActor(b);return;
  }
  if(p.x>3460&&!b.active){b.active=true;this.emit('boss','THE ASH WARDEN · Tanda !: siap menyerang. Lompati bola api.');}
  if(!b.active){syncActor(b);return;}
  if(b.state==='hurt'){
   if(b.animTime>=animationDuration(b.sheet,'hurt')){const resume=b.resume||{state:'idle',animTime:0,timer:.5};Object.assign(b,resume);b.resume=null;}
   syncActor(b);return;
  }
  b.timer-=dt;
  if(b.state==='walk'){
   b.dir=p.x+p.w/2<b.cx?-1:1;
   if(Math.abs(p.x+p.w/2-b.cx)>100)b.cx=Math.max(3440,Math.min(3830,b.cx+b.dir*32*dt));
  }
  if(b.state==='charge')b.cx=Math.max(3440,Math.min(3830,b.cx+b.dir*(this.difficulty==='story'?150:190)*dt));
  if(b.state==='shoot'&&!b.shotFired&&b.animTime>=animationDuration(b.sheet,'shoot')/3){b.shotFired=true;this.fireBoss();}
  if(b.timer<=0){
   if(b.state==='idle')this.startBossState('walk',.5);
   else if(b.state==='walk'){
    b.dir=p.x+p.w/2<b.cx?-1:1;b.cycle++;b.nextAttack=b.cycle%3===0?'charge':'shoot';
    this.startBossState('telegraph',.7);
   }else if(b.state==='telegraph'){
    b.shotFired=false;this.startBossState(b.nextAttack,b.nextAttack==='charge'?.45:animationDuration(b.sheet,'shoot'));
   }else this.startBossState('idle',b.hp<b.maxHp/2?.4:.7);
  }
  syncActor(b);
 }
 step(dt,input={}){
  if(this.won)return;
  this.time+=dt;
  for(const k of ['inv','attack','cooldown','dash','dashCooldown','lockMessage'])this[k]=Math.max(0,this[k]-dt);
  const p=this.player,previousFeet=p.y+p.h,previousDeaths=this.deaths;
  if(input.attack&&this.cooldown<=0){this.attack=ATTACK_DURATION;this.attackFacing=p.facing;this.cooldown=.36;this.hitIds.clear();this.emit('attack');}
  p.attackRemaining=this.attack;p.attackFacing=this.attackFacing;
  if(input.dash&&this.dashCooldown<=0){this.dash=.17;this.dashCooldown=1;this.emit('dash');}
  if(input.heal&&this.potions>0&&this.hp<this.maxHp){this.hp=Math.min(this.maxHp,this.hp+3);this.potions--;this.emit('heal','Ramuan memulihkan 3 nyawa.');this.burst(p.x,p.y,'#79efbe');}
  p.update(dt,{axis:this.dash>0?p.facing*2.4:(input.axis||0),jump:input.jump},this.level,()=>this.emit('jump'));
  if(p.y>this.level.height+80||this.level.hazards.some(h=>h.type==='L'&&overlap(p,h))){this.respawn();return;}
  if(this.level.hazards.some(h=>h.type!=='L'&&overlap(p,h)))this.hurt();
  if(this.deaths!==previousDeaths)return;
  for(let i=1;i<CHECKPOINTS.length;i++)if(this.checkpoint<i&&p.x>=CHECKPOINTS[i].x&&p.grounded){this.checkpoint=i;this.hp=this.maxHp;this.potions=Math.max(2,this.potions);this.emit('checkpoint',`Checkpoint ${i+1}/4 menyala · Nyawa dipulihkan`);this.emit('save');}
  this.sealItems.forEach((s,i)=>{if(!this.seals[i]&&overlap(p,s)){this.seals[i]=true;this.burst(s.x,s.y,'#77eced',35);this.emit('seal',`Segel ${this.seals.filter(Boolean).length}/3 dibangunkan`);this.emit('save');}});
  const blade=this.attackBox();
  for(const e of this.enemies){
   this.updateEnemy(e,dt);
   if(e.hp<=0)continue;
   if(blade&&!this.hitIds.has(e.id)&&overlap(blade,e)){this.hitIds.add(e.id);this.damageEnemy(e);}
   if(e.hp>0&&overlap(p,e)){
    if(p.vy>80&&previousFeet<=e.y+8){this.damageEnemy(e,e.hp);p.vy=-400;p.grounded=false;}
    else this.hurt(1,e.cx);
   }
  }
  this.updateBoss(dt);
  const b=this.boss;
  if(b.hp>0){
   if(blade&&!this.hitIds.has(b.id)&&overlap(blade,b)){this.hitIds.add(b.id);this.damageBoss();}
   if(overlap(p,b))this.hurt(1,b.cx);
  }
  for(const s of this.shots){s.x+=s.vx*dt;s.life-=dt;s.animTime+=dt;if(overlap(p,s)){this.hurt(1,s.x+s.w/2);s.life=0;}}
  this.shots=this.shots.filter(s=>s.life>0);
  for(const q of this.particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=300*dt;q.life-=dt;}this.particles=this.particles.filter(q=>q.life>0);
  if(this.seals.every(Boolean)&&b.defeated){this.level.updateDoor(p,dt);if(overlap(p,this.level.exit)){this.won=true;this.emit('win');}}
  else if(overlap(p,this.level.exit)&&this.lockMessage<=0){this.lockMessage=4;this.emit('notice',!b.defeated?'Kalahkan Ash Warden dan tunggu baranya padam.':`Masih perlu ${3-this.seals.filter(Boolean).length} segel. Ikuti penunjuk di atas.`);}
 }
}
