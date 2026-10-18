import {Player} from './js/player.js';
import {Level,overlap} from './js/level.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const level=new Level(); const p=new Player(level.start); const dt=1/120;
const tick=(input={axis:0,jump:false})=>p.update(dt,input,level,()=>{});
for(let i=0;i<60;i++)tick();assert.equal(p.y,402);assert.ok(p.grounded);
tick({axis:0,jump:true});assert.ok(p.vy<0);for(let i=0;i<150;i++)tick();assert.equal(p.y,402);
p.reset({x:20,y:360});p.vy=100;let fired=false;for(let i=0;i<30;i++){p.update(dt,{axis:0,jump:p.y>385&&!fired},level,()=>{fired=true});}assert.ok(fired,'buffered jump fires on landing');
p.reset({x:34*32+8,y:402});p.grounded=true;for(let i=0;i<10;i++)tick({axis:1,jump:false});tick({axis:1,jump:true});assert.ok(p.vy<0,'coyote jump');
assert.equal(level.hazards.filter(h=>h.type==='L').length,12);
for(const b of level.solids)assert.ok(!overlap(level.start,b));
console.log('PASS: grounded collision, jump/landing, jump buffer, coyote time, lava metadata');

// Selection uses real asset metadata, including run cadence and state resets.
const animations=JSON.parse(readFileSync(new URL('./assets/player_sheet.json',import.meta.url))).animations;
const animated=new Player(level.start);animated.grounded=true;animated.vx=245;animated.updateAnimation(0);
assert.equal(animated.animationState,'run');
const runFrames=[];for(let i=0;i<6;i++){animated.anim=i/10;runFrames.push(animated.animationFrame(animations));}
assert.deepEqual(runFrames,[4,5,6,7,8,9]);assert.equal(animations.run.fps,10);
animated.grounded=false;animated.vy=100;animated.updateAnimation(dt);
assert.equal(animated.animationState,'fall');assert.equal(animated.anim,0);assert.equal(animated.animationFrame(animations),animations.fall.frames[0]);
animated.vy=-100;animated.updateAnimation(dt);assert.equal(animated.animationState,'jump');assert.equal(animated.anim,0);
animated.grounded=true;animated.landRemaining=.08;animated.updateAnimation(dt);assert.equal(animated.animationState,'land');
console.log('PASS: metadata animation selection, run frames 4–9 at 10 fps, airborne fall, state reset, jump and land');
