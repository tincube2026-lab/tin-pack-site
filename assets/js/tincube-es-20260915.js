(() => {
  'use strict';
  window.lucide?.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } });
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const menu = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');
  const closeMenu = () => {
    document.body.classList.remove('menu-open');
    menu?.setAttribute('aria-expanded', 'false');
    menu?.setAttribute('aria-label', 'Abrir menú');
  };
  menu?.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  links?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('menu-open')) { closeMenu(); menu?.focus(); }
  });
  matchMedia('(min-width: 1001px)').addEventListener('change', closeMenu);

  const carousel = document.querySelector('[data-carousel]');
  if (carousel) {
    const slides = [...carousel.querySelectorAll('.cinema-slide')];
    const selectors = [...carousel.querySelectorAll('[data-slide]')];
    const pause = carousel.querySelector('[data-pause]');
    const DURATION = 8000;
    let active = 0, elapsed = 0, last = null, raf = null;
    let userPaused = motion.matches, pointerInside = false, focusInside = false, onscreen = true, resumeOverride = false;
    const canPlay = () => !userPaused && !motion.matches && (resumeOverride || (!pointerInside && !focusInside)) && !document.hidden && onscreen;
    const updatePause = () => {
      pause.setAttribute('aria-pressed', String(userPaused));
      pause.setAttribute('aria-label', userPaused ? 'Reanudar presentación' : 'Pausar presentación');
      pause.title = pause.getAttribute('aria-label');
      pause.innerHTML = `<i data-lucide="${userPaused ? 'play' : 'pause'}"></i>`;
      window.lucide?.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' } });
    };
    const show = index => {
      active = (index + slides.length) % slides.length;
      elapsed = 0;
      carousel.style.setProperty('--progress', '0');
      slides.forEach((slide, i) => {
        const selected = i === active;
        slide.classList.toggle('is-active', selected);
        slide.setAttribute('aria-hidden', String(!selected));
        slide.inert = !selected;
      });
      selectors.forEach((selector, i) => {
        selector.classList.toggle('is-active', i === active);
        selector.setAttribute('aria-current', String(i === active));
      });
      carousel.classList.toggle('is-light', slides[active].classList.contains('light-slide'));
    };
    const tick = now => {
      raf = null;
      if (!canPlay()) { last = null; return; }
      if (last !== null) elapsed += Math.min(now - last, 100);
      last = now;
      if (elapsed >= DURATION) show(active + 1);
      carousel.style.setProperty('--progress', String(elapsed / DURATION));
      raf = requestAnimationFrame(tick);
    };
    const syncPlayback = () => {
      carousel.classList.toggle('is-paused', !canPlay());
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null; last = null;
      if (canPlay()) raf = requestAnimationFrame(tick);
    };
    carousel.querySelector('[data-next]').addEventListener('click', () => show(active + 1));
    carousel.querySelector('[data-prev]').addEventListener('click', () => show(active - 1));
    selectors.forEach((selector, i) => selector.addEventListener('click', () => show(i)));
    pause.addEventListener('click', () => {
      userPaused = !userPaused;
      // Explicit resume takes precedence over the current hover/focus pause.
      resumeOverride = !userPaused;
      updatePause(); syncPlayback();
    });
    carousel.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { pointerInside = true; syncPlayback(); } });
    carousel.addEventListener('pointerleave', () => { pointerInside = false; syncPlayback(); });
    carousel.addEventListener('focusin', () => { focusInside = true; resumeOverride = false; syncPlayback(); });
    carousel.addEventListener('focusout', () => queueMicrotask(() => { focusInside = carousel.contains(document.activeElement); syncPlayback(); }));
    document.addEventListener('visibilitychange', syncPlayback);
    carousel.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); show(active + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); show(active - 1); }
    });
    let start = null;
    carousel.addEventListener('touchstart', event => { const t = event.touches[0]; start = { x: t.clientX, y: t.clientY }; }, { passive: true });
    carousel.addEventListener('touchend', event => {
      if (!start) return;
      const t = event.changedTouches[0], dx = t.clientX - start.x, dy = t.clientY - start.y;
      if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) show(active + (dx < 0 ? 1 : -1));
      start = null;
    }, { passive: true });
    let scrollPending = false;
    const parallax = () => {
      scrollPending = false;
      const offset = !motion.matches && innerWidth > 600 && onscreen ? Math.max(-24, Math.min(24, -carousel.getBoundingClientRect().top * .07)) : 0;
      carousel.style.setProperty('--parallax', `${offset}px`);
    };
    addEventListener('scroll', () => { if (!scrollPending && onscreen && !motion.matches) { scrollPending = true; requestAnimationFrame(parallax); } }, { passive: true });
    addEventListener('resize', parallax, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => { onscreen = entries[0].isIntersecting; syncPlayback(); }, { threshold: .05 }).observe(carousel);
    motion.addEventListener('change', () => { if (motion.matches) userPaused = true; updatePause(); parallax(); syncPlayback(); });
    show(0); updatePause(); syncPlayback(); parallax();
  }

  const reveal = [...document.querySelectorAll('.reveal')];
  if (!motion.matches && 'IntersectionObserver' in window) {
    document.body.classList.add('motion-ready');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .05 });
    reveal.forEach(item => observer.observe(item));
  }
  const search = document.querySelector('#knowledge-search');
  if (search) {
    const category = document.querySelector('#knowledge-category');
    const cards = [...document.querySelectorAll('.knowledge-card')];
    const normalized = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const filter = () => {
      const query = normalized(search.value.trim());
      let count = 0;
      cards.forEach(card => {
        const match = normalized(card.textContent).includes(query) && (!category.value || card.dataset.category === category.value);
        card.hidden = !match; if (match) count++;
      });
      document.querySelector('.result-status').textContent = `${count} ${count === 1 ? 'guía encontrada' : 'guías encontradas'}`;
      document.querySelector('.resource-empty').hidden = count !== 0;
    };
    search.addEventListener('input', filter);
    category.addEventListener('change', filter);
    search.form.addEventListener('submit', event => { event.preventDefault(); filter(); });
  }
})();
