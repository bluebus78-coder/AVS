(() => {
  'use strict';

  function initializeHomeCinematic() {
    const body = document.body;
    const hero = document.querySelector('[data-hc-hero]');
    if (!body || !body.classList.contains('home-cinematic') || !hero || hero.dataset.hcInitialized === 'true') return;

    const slides = Array.from(hero.querySelectorAll('[data-hc-slide]'));
    const selectors = Array.from(hero.querySelectorAll('[data-hc-select]'));
    const controls = hero.querySelector('[data-hc-controls]');
    const motionButton = hero.querySelector('[data-hc-motion-toggle]');
    const motionLabel = hero.querySelector('[data-hc-motion-label]');
    const motionDescription = hero.querySelector('[data-hc-motion-description]');
    const status = hero.querySelector('[data-hc-status]');
    const header = document.querySelector('.site-header');
    const menuToggle = header && header.querySelector('[data-menu]');
    const navigation = header && header.querySelector('[data-nav]');

    // If the fragment is incomplete, keep its first scene and real links usable.
    if (slides.length !== 4 || selectors.length !== slides.length || !controls || !motionButton || !motionLabel || !motionDescription || !status) return;

    const motionPreference = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    const intervalMs = 8000;
    let reducedMotion = Boolean(motionPreference && motionPreference.matches);
    let requestedPlayback = !reducedMotion;
    let activeIndex = 0;
    let timer = null;
    let headerFrame = null;
    let pendingPointerChoice = null;
    let pageVisible = !document.hidden;
    const initialBounds = hero.getBoundingClientRect();
    let heroVisible = initialBounds.bottom > 0 && initialBounds.top < window.innerHeight;

    function clearRotationTimer() {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    }

    function renderScene(index, announce) {
      activeIndex = (index + slides.length) % slides.length;
      hero.dataset.hcScene = String(activeIndex);
      slides.forEach((slide, i) => { slide.hidden = i !== activeIndex; });
      selectors.forEach((button, i) => button.setAttribute('aria-pressed', String(i === activeIndex)));
      if (announce) {
        const label = selectors[activeIndex].querySelector('.hc-scene-label');
        status.textContent = `${label ? label.textContent.trim() : ''}. ${slides.length}개 장면 중 ${activeIndex + 1}번째 장면.`;
      }
    }

    function synchronizePlayback() {
      clearRotationTimer();
      const running = requestedPlayback && !reducedMotion && pageVisible && heroVisible;
      hero.dataset.hcMotion = running ? 'playing' : 'paused';
      motionButton.disabled = reducedMotion;
      motionLabel.textContent = reducedMotion ? '모션 꺼짐' : running ? '일시정지' : '재생';
      motionButton.setAttribute('aria-label', reducedMotion
        ? '움직임 줄이기 설정으로 자동 전환 꺼짐'
        : running ? '장면 자동 전환 및 배경 움직임 정지' : '장면 자동 전환 및 배경 움직임 재생');
      motionDescription.textContent = reducedMotion
        ? '기기의 움직임 줄이기 설정에 따라 자동 전환이 꺼져 있습니다. 장면 선택 버튼으로 이동할 수 있습니다.'
        : '장면은 8초마다 전환됩니다. 장면을 선택하거나 키보드로 탐색하면 자동 전환이 멈춥니다.';

      if (running) {
        timer = window.setTimeout(() => {
          timer = null;
          renderScene(activeIndex + 1, false);
          synchronizePlayback();
        }, intervalMs);
      }
    }

    function pauseForInteraction() {
      if (!requestedPlayback) return;
      requestedPlayback = false;
      synchronizePlayback();
    }

    function selectScene(index, moveFocus) {
      requestedPlayback = false;
      renderScene(index, true);
      synchronizePlayback();
      if (moveFocus) selectors[activeIndex].focus({ preventScroll: true });
    }

    selectors.forEach((button, index) => {
      button.addEventListener('click', () => selectScene(index, false));
    });

    hero.addEventListener('focusin', pauseForInteraction);
    if (header) header.addEventListener('focusin', pauseForInteraction);

    // main.js owns opening/toggling. Complete the existing close behavior here.
    if (menuToggle && navigation) {
      function closeNavigation(restoreFocus) {
        navigation.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', window.DKI18n?.t('메뉴 열기') || '메뉴 열기');
        if (restoreFocus) menuToggle.focus({ preventScroll: true });
      }
      navigation.addEventListener('click', (event) => {
        if (event.target instanceof Element && event.target.closest('a')) closeNavigation(false);
      });
      header.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !navigation.classList.contains('open')) return;
        if (event.target instanceof Element && event.target.closest('.locale-switcher')) return;
        event.preventDefault();
        closeNavigation(true);
      });
    }

    hero.addEventListener('keydown', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      // An explicit play action may restart motion while this control retains focus.
      if (target.closest('[data-hc-motion-toggle]') && (event.key === 'Enter' || event.key === ' ')) return;
      pauseForInteraction();
      const selectedButton = target.closest('[data-hc-select]');
      if (!selectedButton) return;
      const current = selectors.indexOf(selectedButton);
      let next = current;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = current + 1;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = current - 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = slides.length - 1;
      else return;
      event.preventDefault();
      selectScene(next, true);
    });

    // Pointer focus happens before click. Preserve the user's original play/pause intent.
    motionButton.addEventListener('pointerdown', () => { pendingPointerChoice = !requestedPlayback; });
    motionButton.addEventListener('pointercancel', () => { pendingPointerChoice = null; });
    motionButton.addEventListener('click', (event) => {
      if (reducedMotion) return;
      requestedPlayback = event.detail > 0 && pendingPointerChoice !== null
        ? pendingPointerChoice
        : !requestedPlayback;
      pendingPointerChoice = null;
      synchronizePlayback();
    });

    document.addEventListener('visibilitychange', () => {
      pageVisible = !document.hidden;
      synchronizePlayback();
    });

    if (typeof window.IntersectionObserver === 'function') {
      const visibilityObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (!entry || heroVisible === entry.isIntersecting) return;
        heroVisible = entry.isIntersecting;
        synchronizePlayback();
      }, { threshold: 0 });
      visibilityObserver.observe(hero);
    }

    function synchronizeHeader() {
      headerFrame = null;
      body.classList.toggle('hc-header-scrolled', window.scrollY > 16);
      // Fallback for browsers without IntersectionObserver.
      if (typeof window.IntersectionObserver !== 'function') {
        const bounds = hero.getBoundingClientRect();
        const visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
        if (visible !== heroVisible) {
          heroVisible = visible;
          synchronizePlayback();
        }
      }
    }

    function scheduleHeaderUpdate() {
      if (headerFrame === null) headerFrame = window.requestAnimationFrame(synchronizeHeader);
    }

    window.addEventListener('scroll', scheduleHeaderUpdate, { passive: true });
    window.addEventListener('resize', scheduleHeaderUpdate, { passive: true });

    function onMotionPreferenceChange(event) {
      reducedMotion = event.matches;
      if (reducedMotion) requestedPlayback = false;
      synchronizePlayback();
    }

    if (motionPreference && typeof motionPreference.addEventListener === 'function') {
      motionPreference.addEventListener('change', onMotionPreferenceChange);
    } else if (motionPreference && typeof motionPreference.addListener === 'function') {
      motionPreference.addListener(onMotionPreferenceChange);
    }

    window.addEventListener('pagehide', () => {
      pageVisible = false;
      synchronizePlayback();
    });
    window.addEventListener('pageshow', () => {
      pageVisible = !document.hidden;
      synchronizeHeader();
      synchronizePlayback();
    });

    hero.dataset.hcInitialized = 'true';
    controls.hidden = false;
    renderScene(0, false);
    synchronizeHeader();
    synchronizePlayback();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHomeCinematic, { once: true });
  } else {
    initializeHomeCinematic();
  }
})();
