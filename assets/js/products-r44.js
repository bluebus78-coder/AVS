(() => {
  'use strict';
  const products={'avs-pc':'AVS Web PRO','avs-mobile':'AVS Mobile PRO','avs-coin':'AVS Coin PRO'};
  const product=products[new URLSearchParams(location.search).get('product')];
  if(!product||!document.querySelector('[data-contact]'))return;
  const purpose=document.querySelector('select[name=purpose]'),message=document.querySelector('textarea[name=message]');
  if(purpose){purpose.value='AVS 제품 문의';for(const option of purpose.options)option.defaultSelected=option.value==='AVS 제품 문의';}
  if(message&&!message.value){const t=value=>window.DKI18n?.t(value)||value;message.value=product+'\n\n'+t('문의 내용')+':';}
})();
