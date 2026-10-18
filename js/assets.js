export const ASSET_NAMES=['player_sheet','tileset','bg_far','bg_mid','spikes','fire','lava','doors','torches','barrels','skulls','level_clear','knight_attack','slash_fx','zombie','slime','boss_ash_warden','fireball','hearts'];
export const assets={};
export async function loadAssets(){await Promise.all(ASSET_NAMES.map(async name=>{const [data,img]=await Promise.all([fetch(`assets/${name}.json`).then(r=>{if(!r.ok)throw Error(name);return r.json()}),new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=`assets/${name}.png`})]);assets[name]={data,img};}));}
export function sprite(ctx,name,frame,x,y,w,h,flip=false){const a=assets[name];if(!a)return;const f=a.data.frames[frame%a.data.frames.length];ctx.save();ctx.translate(Math.round(x)+(flip?w:0),Math.round(y));if(flip)ctx.scale(-1,1);ctx.drawImage(a.img,f.x,f.y,f.w,f.h,0,0,w,h);ctx.restore();}
export class AudioHooks{
  constructor(){
    this.enabled=true;this.sounds={};this.loading={};this.resolved={};this.requested={};
    for(const name of ['jump','death','win','bgm']){
      const a=new Audio();a.preload='none';a.loop=name==='bgm';a.volume=name==='bgm'?.25:.5;this.sounds[name]=a;
    }
  }
  async resolve(name){
    // Cache success and exhaustion, and share concurrent requests for each sound.
    if(Object.hasOwn(this.resolved,name))return this.resolved[name];
    if(this.loading[name])return this.loading[name];
    this.loading[name]=(async()=>{
      for(const extension of ['ogg','mp3','wav']){
        const url=`assets/audio/${name}.${extension}`;
        try{const response=await fetch(url,{method:'HEAD'});if(response.ok){this.resolved[name]=url;return url;}}catch{}
      }
      this.resolved[name]=null;return null;
    })();
    return this.loading[name];
  }
  play(name){
    const a=this.sounds[name];if(!this.enabled||!a)return;
    const request=this.requested[name]=(this.requested[name]||0)+1;
    const start=url=>{if(!url||!this.enabled||this.requested[name]!==request)return;if(!a.getAttribute('src'))a.src=url;if(name!=='bgm')a.currentTime=0;const p=a.play();if(p)p.catch(()=>{});};
    if(Object.hasOwn(this.resolved,name))start(this.resolved[name]);else this.resolve(name).then(start);
  }
  toggle(){this.enabled=!this.enabled;for(const a of Object.values(this.sounds))a.muted=!this.enabled;if(this.enabled)this.play('bgm');}
}
