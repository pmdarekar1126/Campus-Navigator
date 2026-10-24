// A single status toast with an optional action, announced to screen readers.
// A new toast replaces the old one; hovering or focusing it pauses the timer so
// nobody loses an Undo while reaching for it.

export function createToaster(region) {
  let timer = null;
  let remaining = 0;
  let startedAt = 0;

  function clear() {
    clearTimeout(timer);
    region.replaceChildren();
    region.classList.remove('is-visible');
  }

  function schedule() {
    startedAt = Date.now();
    timer = setTimeout(clear, remaining);
  }

  function show(message, { action, onAction, duration = 5000 } = {}) {
    clearTimeout(timer);
    const toast = document.createElement('div');
    toast.className = 'toast';
    const text = document.createElement('span');
    text.textContent = message;
    toast.appendChild(text);

    if (action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'toast-action';
      button.textContent = action;
      button.addEventListener('click', () => { clear(); onAction(); });
      toast.appendChild(button);
    }

    toast.addEventListener('pointerenter', () => { clearTimeout(timer); remaining -= Date.now() - startedAt; });
    toast.addEventListener('pointerleave', schedule);
    toast.addEventListener('focusin', () => { clearTimeout(timer); remaining -= Date.now() - startedAt; });
    toast.addEventListener('focusout', schedule);

    region.replaceChildren(toast);
    requestAnimationFrame(() => region.classList.add('is-visible'));
    remaining = duration;
    schedule();
  }

  return { show, clear };
}
