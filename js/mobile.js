export const CREATOR_NAME='Alfa Tabi Mawarid';
export const isTouchDevice=()=>matchMedia('(pointer:coarse)').matches;

export function setupMobile({down,up,pause,resume,isPlaying,clear}){
  const active=new Map();
  const release=id=>{
    const button=active.get(id);if(!button)return;
    active.delete(id);
    if(![...active.values()].includes(button)){button.classList.remove('held');up(button.dataset.key);}
  };
  const releaseAll=()=>{for(const id of [...active.keys()])release(id);clear();};
  for(const button of document.querySelectorAll('[data-key]')){
    button.addEventListener('pointerdown',e=>{
      if(!isPlaying())return;e.preventDefault();
      active.set(e.pointerId,button);button.setPointerCapture(e.pointerId);
      button.classList.add('held');down(button.dataset.key);
    });
    button.addEventListener('pointermove',e=>{
      const r=button.getBoundingClientRect();
      if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)release(e.pointerId);
    });
    for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,e=>release(e.pointerId));
  }
  let resumeAfterRotation=false;
  const orientation=()=>{
    const portrait=isTouchDevice()&&matchMedia('(orientation:portrait)').matches;
    document.querySelector('#rotateHint').hidden=!portrait;
    if(portrait){if(isPlaying()){resumeAfterRotation=true;pause();}releaseAll();}
    else if(resumeAfterRotation){resumeAfterRotation=false;resume();}
  };
  window.addEventListener('resize',orientation);
  window.addEventListener('blur',releaseAll);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){resumeAfterRotation=false;releaseAll();}});
  document.addEventListener('contextmenu',e=>{if(isTouchDevice())e.preventDefault();});
  document.addEventListener('dblclick',e=>{if(isTouchDevice())e.preventDefault();});
  // Called directly from a tap; unsupported fullscreen/orientation APIs are optional.
  const enterLandscape=async()=>{
    if(!isTouchDevice())return;
    try{await document.querySelector('.game').requestFullscreen?.();}catch{}
    try{await screen.orientation?.lock?.('landscape');}catch{}
    orientation();
  };
  document.querySelector('#start').addEventListener('click',enterLandscape,true);
  document.querySelector('#pause').addEventListener('click',releaseAll,true);
  orientation();
  return {orientation,releaseAll};
}
