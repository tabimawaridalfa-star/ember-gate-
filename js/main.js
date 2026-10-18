import {CREATOR_NAME,isTouchDevice,setupMobile} from './mobile.js';
import {drawPlayerVisual,HealthHud} from './visuals.js';
const healthHud=new HealthHud();
import {loadAssets,sprite} from './assets.js';
import {World,CHECKPOINTS,SAVE_KEY,LEGACY_SAVE_KEY,normalizeSave} from './world.js';
import {drawActor,drawSlash,animationFrame,attackFrame} from './actors.js';
import {Camera} from './camera.js';
import {Sound} from './audio.js';
const $=s=>document.querySelector(s),canvas=$('canvas'),ctx=canvas.getContext('2d'),audio=new Sound(),camera=new Camera(960,540),keys=new Set();
const SAVE=SAVE_KEY;
let saved=null;
for(const key of [SAVE,LEGACY_SAVE_KEY]){try{saved=normalizeSave(JSON.parse(localStorage.getItem(key)));}catch{}if(saved)break;}
let world=null,debug=false,state='loading',last=0,acc=0,scene=0,toastTimer=0,pressed={},best=0;
try{best=Number(localStorage.getItem(LEGACY_SAVE_KEY+'-best'))||0;}catch{}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');toastTimer=4;}
function persist(){try{localStorage.setItem(SAVE,JSON.stringify(world.snapshot()));localStorage.removeItem(LEGACY_SAVE_KEY);$('#saveStatus').textContent='✓ Progres tersimpan di browser ini';}catch{$('#saveStatus').textContent='Penyimpanan tidak tersedia — tetap bisa bermain';}}
function menu(title,text,button){$('#creatorCredit').textContent=state==='won'?'Terima kasih sudah bermain · '+CREATOR_NAME:'Dibuat oleh '+CREATOR_NAME;$('#title').textContent=title;$('#message').textContent=text;$('#start').textContent=button;$('#overlay').classList.remove('hidden');$('#restart').hidden=false;$('#difficultyLabel').hidden=true;}
function begin(fresh=false){if(state==='loading')return;if(fresh||state==='won'||(state==='ready'&&!saved)){world=new World($('#difficulty').value);camera.update(world.player,world.level,0,true);persist();}state='playing';resetRestart();document.querySelector('#eyebrow').textContent='THE LAST FLAME';keys.clear();pressed={};$('#overlay').classList.add('hidden');canvas.focus();audio.music(true);$('#creatorCredit').textContent='Dibuat oleh '+CREATOR_NAME;toast(isTouchDevice()?'◀ ▶ Jalan · Lompat · Pedang · Dash · Ramuan':'J / X: pedang · Spasi: lompat · Shift: dash · E: ramuan');mobile.orientation();}
function pause(){if(state!=='playing')return;state='paused';keys.clear();pressed={};audio.music(false);persist();menu('Api masih menyala.','Permainan dijeda. Progres terakhir tersimpan di checkpoint.','Lanjutkan');$('#difficultyLabel').hidden=false;}
$('#start').onclick=()=>begin();$('#restart').onclick=()=>{if(state!=='confirm'){state='confirm';menu('Mulai dari awal?','Segel dan checkpoint petualangan ini akan direset.','Ya, mulai baru');$('#start').onclick=()=>{begin(true);$('#start').onclick=()=>begin();};$('#restart').textContent='Batal';$('#restart').onclick=()=>{state='paused';menu('Api masih menyala.','Petualanganmu masih tersimpan.','Lanjutkan');$('#start').onclick=()=>begin();resetRestart();};}};
const restartHandler=$('#restart').onclick;
function resetRestart(){$('#restart').textContent='Petualangan baru';$('#restart').onclick=restartHandler;}
$('#pause').onclick=()=>state==='playing'?pause():state==='paused'?begin():null;
$('#sound').onclick=()=>{$('#sound').textContent=audio.toggle()?'♫ AUDIO ON':'♫ AUDIO OFF';};
$('#fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else $('.game').requestFullscreen?.().catch(()=>toast('Layar penuh tidak tersedia di browser ini.'));};
function down(code){if(code==='F3'){debug=!debug;return;}if(state!=='playing'){if(code==='Enter'&&state!=='confirm')begin();else if(code==='Escape'&&state==='paused')begin();return;}if(code==='Escape'){pause();return;}keys.add(code);if(code==='Space'||code==='KeyW'||code==='ArrowUp')pressed.jump=true;if(code==='KeyJ'||code==='KeyX')pressed.attack=true;if(code==='ShiftLeft'||code==='ShiftRight')pressed.dash=true;if(code==='KeyE')pressed.heal=true;}
window.addEventListener('keydown',e=>{if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','F3'].includes(e.code)&&e.target.tagName!=='SELECT')e.preventDefault();if(e.target.tagName==='SELECT')return;if(!e.repeat)down(e.code);});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
$('#creatorCredit').textContent='Dibuat oleh '+CREATOR_NAME;
$('#footerCredit').textContent='Dibuat oleh '+CREATOR_NAME;
const mobile=setupMobile({down,up:code=>keys.delete(code),pause,resume:()=>begin(),isPlaying:()=>state==='playing',clear:()=>{keys.clear();pressed={};}});
function events(){for(const e of world.events){if(e.type==='hurt')healthHud.hit(scene);if(e.text)toast(e.text);if(e.type==='save')persist();else if(e.type==='boss'){audio.boss=true;audio.music(true);}else if(e.type==='death'){camera.update(world.player,world.level,0,true);audio.boss=false;audio.music(true);audio.play('death');}else if(e.type==='win'){state='won';audio.music(false);audio.play('win');const score=Math.max(0,1000+world.coins+world.seals.filter(Boolean).length*100-world.deaths*30-Math.floor(world.time));best=Math.max(best,score);try{localStorage.removeItem(SAVE);localStorage.removeItem(LEGACY_SAVE_KEY);localStorage.setItem(LEGACY_SAVE_KEY+'-best',String(best));}catch{}saved=null;menu('LEVEL CLEAR!','Tiga segel menyatu. Ash Warden tumbang.\nKamu keluar dari Ember Gate dan membawa api terakhir pulang.\n'+formatTime(world.time)+' · '+world.deaths+' kali bangkit · Skor '+score+' · Rekor '+best,'Main lagi');$('#eyebrow').textContent='PETUALANGAN TAMAT';$('#restart').hidden=true;$('#difficultyLabel').hidden=false;}else audio.play(e.type);}world.events=[];}
function formatTime(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');}
function text(t,x,y,color='#e8d8b5',size=12){ctx.fillStyle=color;ctx.font=`${isTouchDevice()?Math.max(size,14):size}px monospace`;ctx.fillText(t,x,y);}
function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#00000000');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function draw(){const w=world,p=w.player,b=w.boss,cx=camera.x;healthHud.sync(w,scene);ctx.imageSmoothingEnabled=false;w.level.draw(ctx,camera,scene);ctx.save();ctx.translate(-Math.round(cx),0);
 for(let i=0;i<35;i++){const x=(i*139+scene*(8+i%4))%w.level.width,y=120+(i*79+Math.sin(scene+i)*15)%320;ctx.fillStyle=i%3?'#e4a85955':'#ffdfa988';ctx.fillRect(x,y,2,2);}
 CHECKPOINTS.forEach((c,i)=>{const active=i<=w.checkpoint;glow(c.x+10,390,55,active?'#5deed52b':'#c3b29612');ctx.fillStyle='#403c49';ctx.fillRect(c.x+5,413,14,35);ctx.fillStyle=active?'#86efe2':'#74747b';ctx.beginPath();ctx.moveTo(c.x+12,388+Math.sin(scene*3)*3);ctx.lineTo(c.x+21,404);ctx.lineTo(c.x+12,416);ctx.lineTo(c.x+3,404);ctx.closePath();ctx.fill();});
 w.sealItems.forEach((s,i)=>{if(w.seals[i])return;const y=s.y+17+Math.sin(scene*3+i)*6;glow(s.x+14,y,55,'#63e5f03f');ctx.save();ctx.translate(s.x+14,y);ctx.rotate(scene*.9);ctx.strokeStyle='#a4ffff';ctx.lineWidth=2;ctx.strokeRect(-13,-13,26,26);ctx.rotate(-scene*1.8);ctx.strokeStyle='#e7c881';ctx.strokeRect(-8,-8,16,16);ctx.restore();text('SEGEL '+(i+1),s.x-10,s.y-17,'#a6edee',10);});
 for(const e of w.enemies){
  drawActor(ctx,e);
  if(e.hp>0){ctx.fillStyle='#261f34';ctx.fillRect(e.x,e.y-9,e.w,3);ctx.fillStyle=e.type==='zombie'?'#c7be93':'#92c783';ctx.fillRect(e.x,e.y-9,e.w*e.hp/e.maxHp,3);}
 }
 drawActor(ctx,b);
 if(b.state==='telegraph'&&b.hp>0){
  text('!',b.cx-6,b.y-14,'#ffcf72',26);
  ctx.strokeStyle='#ff9d5e66';ctx.setLineDash([5,8]);ctx.beginPath();ctx.moveTo(b.cx,424);ctx.lineTo(b.cx+b.dir*(b.nextAttack==='charge'?100:450),424);ctx.stroke();ctx.setLineDash([]);
 }
 for(const s of w.shots){
  const frame=animationFrame('fireball','fly',s.animTime),flip=s.vx<0;
  sprite(ctx,'fireball',frame,s.x+s.w/2-(flip?9:23),s.y+s.h/2-16,32,32,flip);
 }
 drawPlayerVisual(ctx,p,{x:0},w.inv,scene,healthHud.flash(scene));
 if(w.dash>0){ctx.fillStyle='#8ff8ed55';ctx.fillRect(p.x-p.facing*25,p.y+10,30,30);}
 drawSlash(ctx,p,w.attack);
 if(debug){
  const box=(r,color)=>{if(!r)return;ctx.strokeStyle=color;ctx.lineWidth=1;ctx.strokeRect(r.x,r.y,r.w,r.h);};
  box(p,'#5be5ff');for(const e of w.enemies)if(e.hp>0)box(e,'#a8ef74');if(b.hp>0)box(b,'#e9a5ff');
  box(w.attackBox(),'#ff644f');for(const shot of w.shots)box(shot,'#ffd45f');
 }
 for(const q of w.particles){ctx.globalAlpha=Math.min(1,q.life*2);ctx.fillStyle=q.color;ctx.fillRect(q.x,q.y,4,4);}ctx.globalAlpha=1;
 for(const [x,y,t] of [[160,360,'J / X · PEDANG'],[560,290,'SPASI · LOMPAT'],[1150,300,'SHIFT · DASH'],[2060,290,'E · RAMUAN'],[3400,295,'LOMPATI BOLA API']])text(isTouchDevice()?t.replace('J / X · ','').replace('SPASI · ','').replace('SHIFT · ','').replace('E · ',''):t,x,y,'#d5c69f',11);
 ctx.restore();
 if(debug)text(`F3 DEBUG · attack ${attackFrame(w.attack)??'-'} · ${w.attackBox()?'ACTIVE':'inactive'} · boss ${b.state}`,20,107,'#9af5df',12);
 ctx.fillStyle='#0a1021d9';ctx.fillRect(16,16,280,isTouchDevice()?100:80);text('NYAWA',28,31,'#b0b7ca',10);healthHud.draw(ctx,w,scene);if(isTouchDevice()){text(`RAMUAN ${w.potions} · BARA ${w.coins}`,28,86,'#e5d4ae',15);text(`SEGEL ${w.seals.filter(Boolean).length}/3`,28,106,'#a7ede4',15);}else text(`RAMUAN ${w.potions}   BARA ${w.coins}   SEGEL ${w.seals.filter(Boolean).length}/3`,28,86,'#e5d4ae',11);
 ctx.fillStyle='#0a1021d9';ctx.fillRect(650,16,294,48);let target=w.sealItems.findIndex((s,i)=>!w.seals[i]);const objective=target>=0?`${w.sealItems[target].x<p.x?'←':'→'} SEGEL ${target+1} · ${Math.floor(Math.abs(w.sealItems[target].x-p.x)/32)} m`:!b.defeated?(b.hp>0?'→ KALAHKAN ASH WARDEN':'TUNGGU BARA PADAM…'):'→ MASUKI GERBANG';text(objective,666,37,'#a7ede4',12);text(w.dashCooldown<=0?'DASH SIAP':'DASH MENGISI…',666,54,'#8e9aac',10);
 if(b.active&&b.hp>0){ctx.fillStyle='#0a1021e8';ctx.fillRect(310,16,322,47);text('THE ASH WARDEN',327,34,'#eebda4',11);ctx.fillStyle='#4c3039';ctx.fillRect(327,43,288,7);ctx.fillStyle='#ed8d69';ctx.fillRect(327,43,288*b.hp/b.maxHp,7);}
 ctx.fillStyle='#ffffff16';ctx.fillRect(0,536,960,4);ctx.fillStyle='#dab576';ctx.fillRect(0,536,960*p.x/w.level.width,4);
 $('#phase').textContent=w.level.phase(p.x);$('#stats').textContent=formatTime(w.time)+' · '+w.deaths+' BANGKIT';
}
function frame(ms){const dt=Math.min((ms-last)/1000,.05);last=ms;scene+=dt;toastTimer-=dt;if(toastTimer<=0)$('#toast').classList.remove('show');if(state==='playing'){acc+=dt;while(acc>=1/120){const input={axis:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),...pressed};world.step(1/120,input);pressed={};events();acc-=1/120;if(state!=='playing'){acc=0;break;}}camera.update(world.player,world.level,dt);}else acc=0;draw();requestAnimationFrame(frame);}
loadAssets().then(()=>{world=new World(saved?.difficulty||'normal',saved);state='ready';$('#start').disabled=false;$('#message').textContent=saved?'Api checkpoint-mu masih menyala. Lanjutkan perjalanan.':'Reruntuhan menyimpan tiga segel cahaya.\nBangunkan semuanya, kalahkan Ash Warden, dan buka gerbang.';$('#start').textContent=saved?'Lanjutkan petualangan':'Mulai petualangan';$('#restart').hidden=!saved;$('#difficulty').value=world.difficulty;camera.update(world.player,world.level,0,true);requestAnimationFrame(frame);}).catch(err=>{$('#message').textContent='Aset belum berhasil dimuat. Buka file MAIN-KLIK-DUA-KALI.html. Detail: '+err.message;});


