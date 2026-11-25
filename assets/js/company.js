const menu = document.querySelector('[data-menu]');
const companyNav = document.querySelector('.company-nav');
if (menu && companyNav) {
  // main.js owns the toggle; keep accessible state in sync and close after navigation.
  menu.addEventListener('click', () => {
    const open = companyNav.classList.contains('open');
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  });
  companyNav.addEventListener('click', (event) => {
    if (event.target.closest('a')) { companyNav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
  });
}
const appCards = [...document.querySelectorAll('[data-app-group]')];
function filterApps(group) {
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === group)));
  let count = 0;
  appCards.forEach(card => { card.hidden = group !== '전체' && card.dataset.appGroup !== group; if (!card.hidden) count++; });
  const counter = document.querySelector('[data-app-count]');
  if (counter) counter.textContent = `${group} ${count}개 앱`;
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => filterApps(button.dataset.filter)));
window.addEventListener('hashchange', () => { const card = appCards.find(c => `#${c.id}` === location.hash); if (card) filterApps('전체'); });
const screenModal = document.querySelector('[data-screen-modal]');
document.querySelectorAll('[data-screen]').forEach(button => button.addEventListener('click', () => {
  const img = screenModal.querySelector('[data-screen-image]');
  img.src = button.dataset.screen;
  img.alt = `${button.dataset.title} 실제 앱 화면`;
  screenModal.querySelector('#screen-title').textContent = button.dataset.title;
  screenModal.showModal();
}));
document.querySelector('[data-close-screen]')?.addEventListener('click', () => screenModal.close());
screenModal?.addEventListener('click', event => { if (event.target === screenModal) { const r = screenModal.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) screenModal.close(); } });
