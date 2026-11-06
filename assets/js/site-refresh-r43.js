(() => {
  'use strict';
  const dialog=document.querySelector('#case-gallery-dialog');
  const galleries=[];let active=null,returnFocus=null;
  function renderModal(){if(!dialog||!active)return;const current=active.slides[active.index],img=dialog.querySelector('[data-dialog-image]');img.src=current.querySelector('img').src;img.alt=current.querySelector('img').alt;dialog.querySelector('[data-dialog-count]').textContent=`${active.index+1} / ${active.slides.length}`;}
  document.querySelectorAll('[data-gallery]').forEach(root=>{
    const state={root,index:0,slides:[...root.querySelectorAll('[data-gallery-slide]')]};
    const show=index=>{state.index=(index+state.slides.length)%state.slides.length;state.slides.forEach((slide,i)=>{slide.hidden=i!==state.index;});root.querySelector('[data-gallery-count]').textContent=`${state.index+1} / ${state.slides.length}`;if(active===state&&dialog?.open)renderModal();};
    state.show=show;galleries.push(state);
    root.querySelector('[data-gallery-prev]').addEventListener('click',()=>show(state.index-1));root.querySelector('[data-gallery-next]').addEventListener('click',()=>show(state.index+1));
    root.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();show(state.index+(event.key==='ArrowLeft'?-1:1));}});
    let down=null;const stage=root.querySelector('.case-gallery-stage');
    stage.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse')down={x:event.clientX,y:event.clientY};});
    stage.addEventListener('pointerup',event=>{if(!down)return;const x=event.clientX-down.x,y=event.clientY-down.y;down=null;if(Math.abs(x)>40&&Math.abs(x)>Math.abs(y))show(state.index+(x<0?1:-1));});
    stage.addEventListener('pointercancel',()=>{down=null;});
    root.querySelector('[data-gallery-expand]').addEventListener('click',event=>{if(!dialog)return;active=state;returnFocus=event.currentTarget;renderModal();dialog.showModal();});
  });
  if(dialog){
    dialog.querySelector('[data-dialog-prev]').addEventListener('click',()=>active?.show(active.index-1));dialog.querySelector('[data-dialog-next]').addEventListener('click',()=>active?.show(active.index+1));dialog.querySelector('[data-dialog-close]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('keydown',event=>{if(active&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();active.show(active.index+(event.key==='ArrowLeft'?-1:1));}});
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
    dialog.addEventListener('close',()=>{returnFocus?.focus();active=null;});
  }
  const courses={ai:'AI 활용 및 디지털 업무',python:'파이썬 및 업무 자동화',web:'웹 개발',mobile:'모바일 앱 개발',maker:'전자제어 및 메이커',comfyui:'ComfyUI 이미지 제작',capcut:'CapCut 영상 제작'};
  const course=courses[new URLSearchParams(location.search).get('course')];
  if(course&&document.querySelector('[data-contact]')){
    const purpose=document.querySelector('select[name=purpose]'),message=document.querySelector('textarea[name=message]');
    if(purpose){purpose.value='AI 활용 교육';[...purpose.options].forEach(option=>{option.defaultSelected=option.value==='AI 활용 교육';});}
    if(message&&!message.value){const t=value=>window.DKI18n?.t(value)||value;message.value=t('교육과정')+': '+t(course)+'\n\n'+t('교육 대상')+':\n'+t('희망 일정')+':\n'+t('문의 내용')+':';}
  }
})();
