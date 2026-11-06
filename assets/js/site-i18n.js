(() => {
  'use strict';
  const locale=document.documentElement.lang;
  const dictionary=window.DKTranslations||{};
  const normalize=value=>String(value).replace(/\s+/g,' ').trim();
  const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const patterns=Object.entries(dictionary).filter(([key])=>/\{\d+\}/.test(key)).map(([key,value])=>{
    const slots=[...key.matchAll(/\{(\d+)\}/g)].map(match=>match[1]);
    const parts=key.split(/\{\d+\}/g).map(escape);
    return {re:new RegExp('^'+parts.join('(.+?)')+'$'),value,slots};
  });
  function t(value,depth=0) {
    const key=normalize(value);
    if(dictionary[key])return String(value).match(/^\s*/)[0]+dictionary[key]+String(value).match(/\s*$/)[0];
    if(depth<2 && /[\uac00-\ud7a3]/.test(key))for(const pattern of patterns){
      const match=key.match(pattern.re);if(!match)continue;
      const translated=pattern.value.replace(/\{(\d+)\}/g,(_,index)=>{const at=pattern.slots.indexOf(index);return at<0?'':t(match[at+1],depth+1);});
      return String(value).replace(key,translated);
    }
    if(depth<3 && /[\uac00-\ud7a3]/.test(key) && key.includes(' · '))return String(value).split(' · ').map(part=>t(part,depth+1)).join(' · ');
    return value;
  }
  const route=document.documentElement.dataset.page||'/';
  const pageRoutes=new Set(['/', '/about','/services','/product','/projects','/education','/ascent','/apps','/avs','/avs-mobile','/avs-coin','/features','/workflow','/dashboard','/security','/download','/install','/contact','/bug-report','/privacy','/terms','/dk-ai-shield','/das-features','/das-workflow','/das-dashboard','/das-architecture','/das-brochure']);
  const prefix=locale==='ko'?'':'/'+locale;
  function localizeLink(el){
    if(el.closest('[data-locale-switcher]'))return;
    const raw=el.getAttribute('href');if(!raw || raw.startsWith('#'))return;
    let url;try{url=new URL(raw,location.href);}catch{return;}
    if(url.origin!==location.origin)return;
    const pathname=url.pathname.replace(/\.html$/,'').replace(/\/$/,'')||'/';
    if(!pageRoutes.has(pathname))return;
    const target=prefix+(pathname==='/'?(prefix?'':'/'):pathname)+url.search+url.hash;
    if(raw!==target)el.setAttribute('href',target);
  }
  const skipped=el=>el.closest('script,style,noscript,code,pre,[translate="no"],[contenteditable],[data-locale-switcher]');
  function visit(node){
    if(node.nodeType===3){if(!node.parentElement || skipped(node.parentElement))return;const next=t(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;return;}
    if(node.nodeType!==1 || skipped(node))return;
    if(node.matches('option:not([value])'))node.setAttribute('value',node.textContent);
    for(const key of ['alt','title','placeholder','aria-label'])if(node.hasAttribute(key)){const raw=node.getAttribute(key),next=t(raw);if(next!==raw)node.setAttribute(key,next);}
    if(node.matches('a[href]'))localizeLink(node);
    for(const child of [...node.childNodes])visit(child);
  }
  window.DKI18n=Object.freeze({locale,t});
  document.querySelectorAll('[data-language]').forEach(link=>{
    const lang=link.dataset.language;
    const suffix=location.search+location.hash;
    link.href=(lang==='ko'?route:'/'+lang+(route==='/'?'':route))+suffix;
  });
  document.addEventListener('click',event=>{document.querySelectorAll('[data-locale-switcher][open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false;});});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('[data-locale-switcher][open]').forEach(menu=>{menu.open=false;menu.querySelector('summary').focus();});});
  if(locale==='ko')return;
  visit(document.body);
  const observer=new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='childList')record.addedNodes.forEach(visit);
      else if(record.type==='characterData')visit(record.target);
      else visit(record.target);
    }
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','alt','placeholder','aria-label','href']});
  // Product-specific inquiry scripts also update the document title.
  new MutationObserver(()=>{const title=t(document.title);if(title!==document.title)document.title=title;}).observe(document.querySelector('title'),{childList:true,subtree:true,characterData:true});
})();
