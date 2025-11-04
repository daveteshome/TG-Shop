// Simple global lock counter so multiple drawers won't fight each other
let locks = 0;

export function lockScroll() {
  if (locks++ === 0) {
    const body = document.body;
    // Preserve current scroll position
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    body.style.setProperty('--tgshop-scrollY', String(scrollY));
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.overflow = 'hidden';
    body.style.width = '100%';
  }
}

export function unlockScroll() {
  if (--locks <= 0) {
    locks = 0;
    const body = document.body;
    const y = Number(body.style.getPropertyValue('--tgshop-scrollY') || '0');
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.overflow = '';
    body.style.width = '';
    body.style.removeProperty('--tgshop-scrollY');
    // Restore scroll position
    window.scrollTo(0, y);
  }
}
