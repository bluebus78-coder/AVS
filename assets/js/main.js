const menuButton = document.querySelector('[data-menu]');
const nav = document.querySelector('[data-nav]');
if (menuButton && nav) {
  menuButton.addEventListener('click', () => nav.classList.toggle('open'));
}

document.querySelectorAll('[data-contact]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const contact = data.get('contact') || '';
    const message = data.get('message') || '';
    const subject = encodeURIComponent('Alpha Viper System 도입 문의');
    const body = encodeURIComponent(`회신 연락처/이메일: ${contact}

문의 내용:
${message}`);
    window.location.href = `mailto:help@alphavipertrading.com?subject=${subject}&body=${body}`;
  });
});
