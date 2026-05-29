const menuButton = document.querySelector('[data-menu]');
const nav = document.querySelector('[data-nav]');

if (menuButton && nav) {
  menuButton.addEventListener('click', () => nav.classList.toggle('open'));
}

document.querySelectorAll('[data-contact]').forEach((form) => {
  const status = form.querySelector('[data-contact-status]');
  const button = form.querySelector('button[type="submit"]');
  const defaultButtonText = button ? button.textContent : '';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const payload = {
      name: data.get('name') || '',
      contact: data.get('contact') || '',
      message: data.get('message') || '',
      consent: data.get('consent') === 'on',
    };

    if (status) {
      status.textContent = '메일을 발송하고 있습니다.';
      status.dataset.state = 'pending';
    }
    if (button) {
      button.disabled = true;
      button.textContent = '메일 발송 중';
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.ok === false) {
        const message = result.code === 'MAIL_ENV_MISSING'
          ? '메일 발송 설정이 필요합니다. 배포 환경변수 RESEND_API_KEY, CONTACT_TO, CONTACT_FROM을 확인해 주세요.'
          : result.message || '메일 발송에 실패했습니다.';
        throw new Error(message);
      }

      if (status) {
        status.textContent = result.message || '문의 메일이 정상 발송되었습니다.';
        status.dataset.state = 'success';
      }
      form.reset();
    } catch (error) {
      if (status) {
        status.textContent = error.message || '메일 발송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
        status.dataset.state = 'error';
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = defaultButtonText;
      }
    }
  });
});
