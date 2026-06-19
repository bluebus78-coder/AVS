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
    const bugType = String(data.get('bugType') || '').trim();
    const rawMessage = String(data.get('message') || '').trim();
    const message = bugType ? `[오류 유형] ${bugType}\n\n${rawMessage}` : rawMessage;
    const payload = {
      name: data.get('name') || '',
      contact: data.get('contact') || '',
      message,
      consent: data.get('consent') === 'on',
    };

    if (status) {
      status.textContent = '접수 내용을 전송하고 있습니다.';
      status.dataset.state = 'pending';
    }
    if (button) {
      button.disabled = true;
      button.textContent = '전송 중';
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.ok === false) {
        const messageText = result.code === 'MAIL_ENV_MISSING'
          ? '메일 발송 설정이 필요합니다. 관리자에게 문의해 주세요.'
          : result.message || '접수 전송에 실패했습니다.';
        throw new Error(messageText);
      }

      if (status) {
        status.textContent = result.message || '정상 접수되었습니다.';
        status.dataset.state = 'success';
      }
      form.reset();
    } catch (error) {
      if (status) {
        status.textContent = error.message || '접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
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
