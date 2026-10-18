import {overlap} from './level.js';
import {sprite,assets} from './assets.js';
import {ATTACK_DURATION,PLAYER_SPRITE,attackFrame} from './actors.js';
export const PHYSICS={gravity:1600,speed:245,jump:590,coyote:.1,buffer:.12};
export class Player {
 constructor(start){this.w=23;this.h=46;this.reset(start);}
 reset(start){this.x=start.x;this.y=start.y;this.vx=0;this.vy=0;this.grounded=false;this.coyote=0;this.buffer=0;this.facing=1;this.anim=0;this.animationState=null;this.landRemaining=0;this.attackRemaining=0;this.attackFacing=1;this.knockback=0;}
 update(dt,input,level,onJump){
  const wasGrounded=this.grounded;
  this.landRemaining=Math.max(0,this.landRemaining-dt);
  this.buffer=input.jump?PHYSICS.buffer:Math.max(0,this.buffer-dt);
  this.coyote=this.grounded?PHYSICS.coyote:Math.max(0,this.coyote-dt);
  this.vx=input.axis*PHYSICS.speed+this.knockback;
  this.knockback*=Math.exp(-10*dt);
  if(this.attackRemaining>0)this.facing=this.attackFacing;
  else if(input.axis)this.facing=Math.sign(input.axis);
  this.tryJump(onJump);this.vy+=PHYSICS.gravity*dt;
  this.x+=this.vx*dt;
  for(const b of level.solids)if(overlap(this,b)){this.x=this.vx>0?b.x-this.w:b.x+b.w;this.vx=0;this.knockback=0;}
  this.x=Math.max(0,Math.min(level.width-this.w,this.x));
  this.y+=this.vy*dt;this.grounded=false;
  for(const b of level.solids)if(overlap(this,b)){
   if(this.vy>0){this.y=b.y-this.h;this.grounded=true;}else this.y=b.y+b.h;
   this.vy=0;
  }
  if(this.grounded&&this.buffer>0){this.coyote=PHYSICS.coyote;this.tryJump(onJump);}
  if(!wasGrounded&&this.grounded)this.landRemaining=.08;
  if(!this.grounded)this.landRemaining=0;
  this.updateAnimation(dt);
 }
 updateAnimation(dt){
  const next=this.attackRemaining>0?'attack':!this.grounded?(this.vy>0?'fall':'jump'):this.landRemaining>0?'land':this.vx?'run':'idle';
  if(next!==this.animationState){this.animationState=next;this.anim=0;}else this.anim+=dt;
 }
 animationFrame(animations){
  if(this.animationState==='attack'){
   if(!animations)return attackFrame(this.attackRemaining);
   const a=animations.attack,index=Math.floor((ATTACK_DURATION-this.attackRemaining)/ATTACK_DURATION*a.frames.length+1e-8);
   return a.frames[Math.min(a.frames.length-1,Math.max(0,index))];
  }
  const a=(animations||assets.player_sheet.data.animations)[this.animationState||'idle'];
  const index=Math.floor(this.anim*a.fps);
  return a.frames[a.loop?index%a.frames.length:Math.min(index,a.frames.length-1)];
 }
 tryJump(onJump){if(this.buffer>0&&this.coyote>0){this.vy=-PHYSICS.jump;this.grounded=false;this.coyote=0;this.buffer=0;onJump();}}
 draw(ctx,camera){
  const attacking=this.attackRemaining>0;
  const frame=attacking?attackFrame(this.attackRemaining):this.animationFrame();
  sprite(ctx,attacking?'knight_attack':'player_sheet',frame,this.x-camera.x+PLAYER_SPRITE.offsetX,this.y+PLAYER_SPRITE.offsetY,PLAYER_SPRITE.size,PLAYER_SPRITE.size,(attacking?this.attackFacing:this.facing)<0);
 }
}
