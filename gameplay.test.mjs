import {drawPlayerVisual,HealthHud} from './js/visuals.js';
import {drawSlash} from './js/actors.js';
import {floorTorches} from './js/level.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assets,ASSET_NAMES} from './js/assets.js';
import {World,CHECKPOINTS,ENEMY_SPAWNS,SAVE_VERSION,normalizeSave,setActorState} from './js/world.js';
import {ATTACK_DURATION,attackFrame,actorFrame,actorLayout,syncActor,animationDuration} from './js/actors.js';
import {overlap} from './js/level.js';
for(const name of ASSET_NAMES)assets[name]={data:JSON.parse(readFileSync(new URL('./assets/'+name+'.json',import.meta.url),'utf8')),img:{name}};
const dt=1/120,tick=(w,n=1,input={})=>{for(let i=0;i<n;i++)w.step(dt,input);};
const close=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-6,msg||`${a} != ${b}`);
let w=new World();tick(w,30);assert.equal(w.player.y,402);

// Read actual JSON frames, including second/third sprite-sheet rows.
for(let i=0;i<5;i++){
 w.player.attackRemaining=ATTACK_DURATION*(1-(i+.1)/5);w.player.grounded=false;w.player.vy=-200;w.player.updateAnimation(dt);
 assert.equal(w.player.animationState,'attack');assert.equal(w.player.animationFrame(),assets.knight_attack.data.animations.attack.frames[i]);
}
// Both player sheets use the identical destination transform, including airborne attacks.
const calls=[],ctx={save(){},restore(){},scale(){},translate(...args){calls.push(['translate',...args]);},drawImage(...args){calls.push(['draw',...args]);}};
w.player.x=100;w.player.y=300;w.player.attackRemaining=.12;w.player.attackFacing=1;w.player.draw(ctx,{x:0});
assert.deepEqual(calls[0],['translate',84,294]);assert.equal(calls[1][1].name,'knight_attack');assert.deepEqual(calls[1].slice(-4),[0,0,56,56]);
calls.length=0;w.player.attackRemaining=0;w.player.animationState='idle';w.player.draw(ctx,{x:0});assert.deepEqual(calls[0],['translate',84,294]);assert.deepEqual(calls[1].slice(-4),[0,0,56,56]);

// Hitbox is absent during anticipation/recovery and mirrors around sprite center.
w=new World();for(let i=0;i<5;i++){w.attack=ATTACK_DURATION*(1-(i+.1)/5);assert.equal(w.attackBox()!==null,i===2);}
w.attack=.12;w.attackFacing=1;const right=w.attackBox();w.attackFacing=-1;const left=w.attackBox();close((right.x+right.w)+left.x,2*(w.player.x+12));assert.ok(right.w<18);assert.ok(right.x+right.w-w.player.x<40);
w.attack=0;assert.equal(w.attackBox(),null);

// A real swing only damages on active frame 2, once per unique actor ID.
w=new World();let e=w.enemies[0];e.min=e.max=e.cx;w.player.reset({x:e.x-31,y:402});w.inv=10;
tick(w,1,{attack:true});assert.equal(e.hp,3);assert.equal(attackFrame(w.attack),0);
let damageFrames=[],lastHp=e.hp;
for(let i=0;i<35;i++){tick(w);if(e.hp!==lastHp){damageFrames.push(attackFrame(w.attack));lastHp=e.hp;}}
assert.deepEqual(damageFrames,[2]);assert.equal(e.hp,2);assert.ok(w.hitIds.has(e.id));
for(let swing=0;swing<2;swing++){tick(w,Math.ceil(w.cooldown/dt)+1);w.player.x=e.x-31;tick(w,1,{attack:true});tick(w,45);}
assert.equal(e.hp,0);assert.equal(w.coins,10);

// Hurt/death are visible before removal; rewards cannot be collected twice.
w=new World();e=w.enemies[0];w.damageEnemy(e);assert.equal(e.state,'hurt');assert.equal(actorFrame(e),4);
w.updateEnemy(e,.13);assert.equal(e.state,'walk');w.damageEnemy(e,3);assert.equal(e.state,'death');assert.equal(e.hidden,false);assert.equal(actorFrame(e),5);
w.updateEnemy(e,.3);assert.equal(e.hidden,false);w.updateEnemy(e,.3);assert.equal(e.hidden,true);w.damageEnemy(e,3);assert.equal(w.coins,10);

// Zombies use floor and wall probes, not just authored patrol min/max.
w=new World();e=w.enemies[0];e.min=0;e.max=w.level.width;e.cx=1120-e.w/2-3;e.dir=1;syncActor(e);
w.updateEnemy(e,dt);assert.equal(e.dir,-1,'turn before leading foot leaves platform');assert.ok(e.x+e.w<1120);
e.cx=500;e.dir=1;syncActor(e);w.level.solids.push({x:e.x+e.w+1,y:380,w:16,h:68});const oldCx=e.cx;w.updateEnemy(e,.1);assert.equal(e.dir,-1);close(e.cx,oldCx);

// Slime hop has real vertical travel, landing and all four JSON hop poses.
w=new World();e=w.enemies.find(e=>e.type==='slime');let airborne=false,landed=false;const hopFrames=new Set();
for(let i=0;i<450;i++){w.updateEnemy(e,dt);hopFrames.add(actorFrame(e));if(e.airborne&&e.feet<440)airborne=true;if(airborne&&!e.airborne&&e.feet===448)landed=true;assert.ok(e.cx>=e.min&&e.cx<=e.max);}
assert.ok(airborne&&landed);assert.deepEqual([...hopFrames].sort(),[0,1,2,3]);w.damageEnemy(e,2);assert.equal(e.state,'death');assert.equal(e.hidden,false);w.updateEnemy(e,.5);assert.ok(e.hidden);

// Core-body hitboxes and foot baseline are independent of canvas/cape size.
w=new World();for(const a of [...w.enemies,w.boss]){const layout=actorLayout(a),f=assets[a.sheet].data.frames[layout.frame];close(layout.draw.y+f.pivot[1]*a.scale,a.feet);assert.ok(a.w<layout.draw.w);}
assert.equal(new Set(ENEMY_SPAWNS.map(e=>e.id)).size,ENEMY_SPAWNS.length);
for(const enemy of w.enemies){assert.ok(enemy.min>1024&&enemy.max<3072);const safety={x:enemy.min-40,y:380,w:enemy.max-enemy.min+80,h:68};assert.ok(!w.level.hazards.some(h=>overlap(safety,h)),'enemy separated from hazards');}

// Contact deals one point + directional knockback; invulnerability and dash survive.
w=new World();e=w.enemies[0];w.player.reset({x:e.x-8,y:402});tick(w);assert.equal(w.hp,4);assert.ok(w.player.knockback<0);tick(w);assert.equal(w.hp,4);
w=new World();e=w.enemies[0];w.player.reset({x:e.x-8,y:402});w.dash=.15;tick(w);assert.equal(w.hp,5);
w=new World();e=w.enemies[0];w.player.reset({x:e.x,y:e.y-w.player.h-1});w.player.vy=240;tick(w);assert.equal(e.hp,0);assert.ok(w.player.vy<0,'stomp bounces');

// Boss enters idle -> walk -> telegraph -> shoot, and telegraphs its charge.
w=new World('story');w.player.reset({x:3500,y:402});w.inv=100;
const states=new Set(),transitions=[];let lastState=w.boss.state;
for(let i=0;i<1500;i++){tick(w);states.add(w.boss.state);if(lastState!==w.boss.state){transitions.push([lastState,w.boss.state]);lastState=w.boss.state;}}
for(const state of ['idle','walk','telegraph','shoot','charge'])assert.ok(states.has(state),state);
assert.ok(transitions.some(([a,b])=>a==='telegraph'&&b==='charge'));
const previousState=w.boss.state;w.damageBoss();assert.equal(w.boss.state,'hurt');tick(w,16);assert.equal(w.boss.state,previousState,'hurt resumes the interrupted action');
// Low-health phase launches two distinct projectile heights, only after telegraph.
w=new World();w.player.reset({x:3500,y:402});w.inv=100;w.boss.active=true;w.boss.hp=7;w.boss.nextAttack='shoot';w.boss.dir=-1;w.startBossState('telegraph',.1);
tick(w,10);assert.equal(w.shots.length,0);tick(w,18);assert.equal(w.shots.length,2);assert.equal(new Set(w.shots.map(s=>s.y)).size,2);

// Death must finish before exit unlock, including save/reload halfway through death.
w=new World();w.seals=[true,true,true];w.player.reset({x:w.level.exit.x,y:402});w.inv=100;
while(w.boss.hp>0)w.damageBoss();assert.equal(w.boss.state,'death');assert.equal(w.boss.defeated,false);tick(w,30);assert.equal(w.won,false);assert.equal(w.level.doorTime,null);
const dyingSave=w.snapshot();assert.equal(dyingSave.bossDying,true);const pending=new World('normal',dyingSave);assert.equal(pending.boss.state,'death');assert.equal(pending.boss.defeated,false);
tick(w,100);assert.equal(w.boss.defeated,true);assert.equal(w.won,true);assert.equal(w.coins,100);
const completed=new World('normal',w.snapshot());assert.ok(completed.boss.defeated);tick(completed,130);assert.equal(completed.coins,100,'no repeated boss reward');

// Preserve seals/checkpoints/potions/modes and reject/migrate stale save fields.
w=new World('story');w.hurt();w.hurt();assert.equal(w.hp,7);tick(w,1,{heal:true});assert.equal(w.hp,8);assert.equal(w.potions,2);
w.checkpoint=2;w.seals[0]=true;w.damageEnemy(w.enemies[0],3);w.player.y=800;tick(w);assert.equal(w.deaths,1);assert.equal(w.player.x,CHECKPOINTS[2].x);assert.ok(w.seals[0]);
const snapshot=w.snapshot();assert.equal(snapshot.version,SAVE_VERSION);assert.deepEqual(snapshot.dead,['crossing-zombie-01']);
const restored=new World('normal',snapshot);assert.equal(restored.difficulty,'story');assert.equal(restored.maxHp,8);assert.equal(restored.checkpoint,2);assert.ok(restored.enemies[0].hidden);assert.equal(restored.enemies[1].hp,2);
const legacy={version:2,difficulty:'story',checkpoint:1,seals:[true,false,false],dead:[0,1],bossDead:false,coins:20,potions:2,time:12,deaths:1};
assert.deepEqual(normalizeSave(legacy).dead,[]);assert.equal(new World('normal',legacy).checkpoint,1);assert.equal(normalizeSave({version:99}),null);assert.doesNotThrow(()=>new World('normal',{version:3,seals:[],dead:null}));
const corrupt=normalizeSave({...legacy,checkpoint:Infinity,time:NaN,potions:-3});assert.equal(corrupt.checkpoint,0);assert.equal(corrupt.time,0);assert.equal(corrupt.potions,0);
w=new World();for(const s of w.sealItems){w.player.reset({x:s.x,y:s.y});tick(w);}assert.deepEqual(w.seals,[true,true,true]);
console.log('PASS: JSON attack and 56px drawing, active-only/mirrored sword, unique-hit swings, zombie edge/wall patrol, slime physics, hurt/death/stomp, body baselines, fair spawns, knockback/dash, all boss states/two-height fire/death gate, save v3+migration and existing progression');
// Verify terrain reachability using real movement/collision, including optional dash.
const terrain=new World().level,top=terrain.solids.filter(b=>!terrain.solids.some(a=>a.x===b.x&&a.y===b.y-32)),surfaces=[];
for(const b of top.sort((a,b)=>a.y-b.y||a.x-b.x)){const prior=surfaces.find(s=>s.y===b.y&&s.x+s.w===b.x);if(prior)prior.w+=32;else surfaces.push({...b});}
const edges=surfaces.map(()=>new Set());
for(let i=0;i<surfaces.length;i++){const s=surfaces[i];for(let x=s.x+2;x<s.x+s.w-22;x+=24)for(const dir of [-1,1])for(const dash of [false,true]){const trial=new World().player;trial.reset({x,y:s.y-46});trial.grounded=true;for(let k=0;k<160;k++){trial.update(dt,{axis:dir*(dash&&k<20?2.4:1),jump:k===0},terrain,()=>{});if(k>2&&trial.grounded){const j=surfaces.findIndex(t=>Math.abs(trial.y+46-t.y)<.1&&trial.x+23>t.x&&trial.x<t.x+t.w);if(j>=0)edges[i].add(j);break;}if(trial.y>600)break;}}}
const spawn=surfaces.findIndex(s=>s.x<=100&&s.x+s.w>100&&s.y===448),seen=new Set([spawn]),queue=[spawn];while(queue.length){for(const j of edges[queue.shift()])if(!seen.has(j)){seen.add(j);queue.push(j);}}
assert.equal(seen.size,surfaces.length,'every terrain surface is reachable using real jump/dash physics');
console.log('PASS: all '+surfaces.length+' terrain surfaces reachable from spawn with actual collision physics');


// Rendering must never skip an invulnerable player, including both blink phases.
{
 const stack=[],draws=[],transforms=[];
 const c={globalAlpha:1,filter:'none',save(){stack.push([this.globalAlpha,this.filter]);},restore(){[this.globalAlpha,this.filter]=stack.pop();},scale(){},translate(...v){transforms.push(v);},drawImage(...v){draws.push({name:v[0].name,alpha:this.globalAlpha,filter:this.filter,args:v});}};
 const v=new World(),p=v.player;
 for(const inv of [0,1])for(const attack of [0,.12])for(let frame=0;frame<120;frame++){
  p.attackRemaining=attack;p.updateAnimation(0);draws.length=0;
  drawPlayerVisual(c,p,{x:0},inv,frame/120);
  assert.equal(draws.length,1,'Player drawImage required on EVERY rendered frame');
  assert.equal(draws[0].name,attack?'knight_attack':'player_sheet');
  assert.equal(draws[0].alpha,inv&&Math.floor(frame/120*16)%2===1?(attack?.7:.45):1);
  assert.equal(c.globalAlpha,1);
 }
 draws.length=0;drawPlayerVisual(c,p,{x:0},1,.1,1);assert.equal(draws.length,2);assert.equal(draws[1].filter,'brightness(0) invert(1)');assert.equal(c.filter,'none');
 for(const dir of [-1,1]){p.attackFacing=dir;draws.length=0;drawSlash(c,p,.12);assert.equal(draws[0].name,'slash_fx');assert.deepEqual(draws[0].args.slice(-2),[60,60]);}
 const hud=new HealthHud();hud.sync(v,0);v.hp-=1;hud.sync(v,.1);assert.ok(hud.flash(.11)>0);assert.equal(hud.flash(.3),0);
 draws.length=0;hud.draw(c,v,1);assert.equal(draws.length,v.maxHp);assert.equal(draws.filter(d=>d.args[1]===16).length,1);assert.ok(draws.every(d=>d.args.at(-1)===32));
 v.hp+=1;hud.sync(v,2);draws.length=0;hud.draw(c,v,2.1);assert.ok(draws.some(d=>d.filter==='brightness(0) invert(1)'));
 assert.equal(floorTorches(v.level).length,9);
 for(const t of floorTorches(v.level))assert.ok(v.level.solids.some(b=>b.y===t.y&&b.x<=t.x+5&&b.x+b.w>=t.x+27),'Torch foot must rest on solid platform');
 console.log('PASS visual regressions: every-frame player rendering, attack alpha, hit flash, 60px slash, full/empty hearts and heal animation, supported torches');
}
