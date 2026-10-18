import {assets,sprite} from './assets.js';

// Presentation only: never changes health, timers, collision, or player state.
export function drawPlayerVisual(ctx,player,camera,inv,time,flash=0){
  const low=player.attackRemaining>0?.7:.45;
  ctx.save();
  ctx.globalAlpha=inv>0&&Math.floor(time*16)%2===1?low:1;
  player.draw(ctx,camera); // Always render, including every invulnerable frame.
  if(flash>0){
    ctx.globalAlpha=Math.min(.8,flash*.8);
    ctx.filter='brightness(0) invert(1)';
    player.draw(ctx,camera);
  }
  ctx.restore();
}

export class HealthHud {
  constructor(){this.world=null;this.hp=0;this.from=0;this.changedAt=-10;this.flashUntil=0;}
  hit(time){this.flashUntil=time+.09;}
  sync(world,time){
    if(this.world!==world){this.world=world;this.hp=world.hp;this.from=world.hp;this.changedAt=-10;this.flashUntil=0;}
    if(this.hp!==world.hp){
      this.from=this.hp;this.hp=world.hp;this.changedAt=time;
      if(this.hp<this.from)this.hit(time);
    }
  }
  flash(time){return Math.max(0,(this.flashUntil-time)/.09);}
  draw(ctx,world,time){
    const full=assets.hearts.data.animations.full.frames[0],empty=assets.hearts.data.animations.empty.frames[0];
    const age=time-this.changedAt,progress=Math.min(1,Math.max(0,age/.36));
    for(let i=0;i<world.maxHp;i++){
      const changed=age>=0&&age<.36&&i>=Math.min(this.from,this.hp)&&i<Math.max(this.from,this.hp);
      const gaining=this.hp>this.from;
      const x=28+i*32+(changed&&!gaining?Math.round(Math.sin(age*65)*2*(1-progress)):0);
      const y=38-(changed?Math.round(Math.sin(progress*Math.PI)*3):0);
      sprite(ctx,'hearts',i<world.hp?full:empty,x,y,32,32);
      if(changed){
        ctx.save();ctx.globalAlpha=(gaining?.4:.65)*(1-progress);
        if(gaining)ctx.filter='brightness(0) invert(1)';
        sprite(ctx,'hearts',full,x,y,32,32);ctx.restore();
      }
    }
  }
}
