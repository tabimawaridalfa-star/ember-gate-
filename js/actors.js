import {assets,sprite} from './assets.js';

export const ATTACK_DURATION=.22;
export const PLAYER_SPRITE={size:56,offsetX:-16,offsetY:-6,scale:56/64};

export function animationDuration(sheet,state){
  const a=assets[sheet].data.animations[state];
  return a.frames.length/a.fps;
}
export function animationFrame(sheet,state,time,duration=null){
  const a=assets[sheet].data.animations[state];
  const index=Math.floor(Math.max(0,time)*(duration?a.frames.length/duration:a.fps)+1e-8);
  return a.frames[a.loop&&duration===null?index%a.frames.length:Math.min(index,a.frames.length-1)];
}
export function attackFrame(remaining){
  return remaining>0?animationFrame('knight_attack','attack',ATTACK_DURATION-remaining,ATTACK_DURATION):null;
}

// Measured core-body rectangles in SOURCE pixels, not full canvas/content bounds.
// Zombie reaching hands, boss cape/raised gauntlet, slime droplets are excluded.
const ZOMBIE_BODY=[[16,7,33,46],[16,7,33,46],[16,6,33,46],[16,6,33,46],[14,8,32,46]];
const SLIME_BODY=[[6,19,26,30],[6,11,26,30],[7,6,25,23],[5,18,26,30],[7,16,25,30]];
const BOSS_BODY=[
 [50,22,96,122],[49,22,96,122],[56,20,100,122],[61,22,107,122],
 [52,22,101,122],[46,23,103,122],[53,22,108,122],[57,20,112,122],
 [59,20,113,122],[54,22,94,122],[47,24,91,122],
 [37,21,80,122],[40,23,83,122],[49,23,89,122],
 [49,23,91,122],[49,30,112,122],[51,30,110,122],[40,35,86,122]
];
export function actorFrame(actor){
  if(actor.type==='slime'&&actor.state==='hop'){
    const frames=assets.slime.data.animations.hop.frames;
    return frames[actor.airborne?2:actor.hopPhase==='windup'?1:actor.hopPhase==='land'?3:0];
  }
  return animationFrame(actor.sheet,actor.state,actor.animTime);
}
export function actorLayout(actor){
  const frame=actorFrame(actor),data=assets[actor.sheet].data,f=data.frames[frame];
  const regions=actor.type==='zombie'?ZOMBIE_BODY:actor.type==='slime'?SLIME_BODY:BOSS_BODY;
  const r=regions[frame]||[f.contentOffset[0],f.contentOffset[1],f.contentOffset[0]+f.contentSize[0],f.contentOffset[1]+f.contentSize[1]];
  const scale=actor.scale,center=(r[0]+r[2])/2,baseline=f.pivot[1];
  // Pin body center and JSON foot baseline. Mirroring is around the body, not cape.
  const flip=actor.dir<0;
  const sourceCenter=flip?data.frameWidth-center:center;
  const draw={x:actor.cx-sourceCenter*scale,y:actor.feet-baseline*scale,w:data.frameWidth*scale,h:data.frameHeight*scale};
  const box={x:actor.cx-(r[2]-r[0])*scale/2,y:draw.y+r[1]*scale,w:(r[2]-r[0])*scale,h:(r[3]-r[1])*scale};
  return {frame,draw,box,flip};
}
export function syncActor(actor){Object.assign(actor,actorLayout(actor).box);}
export function drawActor(ctx,actor){
  if(actor.hidden)return;
  const {frame,draw,flip}=actorLayout(actor);
  sprite(ctx,actor.sheet,frame,draw.x,draw.y,draw.w,draw.h,flip);
}
export function drawSlash(ctx,player,remaining){
  const progress=1-remaining/ATTACK_DURATION;
  if(remaining<=0||progress<.2)return;
  const frame=animationFrame('slash_fx','slash',(progress-.2)/.8,1);
  // Align the bright arc (rather than canvas center) to the short blade tip.
  const centers=[[44,29],[42,32],[38,36],[42,32]];
  const [cx,cy]=centers[frame],scale=.9375,dir=player.attackFacing;
  const targetX=player.x+12+dir*36,targetY=player.y+27;
  sprite(ctx,'slash_fx',frame,targetX-(dir>0?cx:64-cx)*scale,targetY-cy*scale,64*scale,64*scale,dir<0);
}
