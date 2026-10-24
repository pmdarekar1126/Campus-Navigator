// One stroke weight, one 20-unit grid, drawn once and reused everywhere.

const PATHS = {
  copy: '<rect x="6.5" y="6.5" width="9" height="9" rx="1.8"/><path d="M4.5 12.5h-.2A1.8 1.8 0 0 1 2.5 10.7V4.3A1.8 1.8 0 0 1 4.3 2.5h6.4a1.8 1.8 0 0 1 1.8 1.8v.2"/>',
  check: '<path d="M4 10.5l3.5 3.5L16 5.5"/>',
  edit: '<path d="M11.8 4.2l4 4M3 17l1-4.2 9.3-9.3a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2L8 16.8z"/>',
  close: '<path d="M5 5l10 10M15 5L5 15"/>',
  send: '<path d="M10 16V4M10 4l-5 5M10 4l5 5"/>',
  stop: '<rect x="5.5" y="5.5" width="9" height="9" rx="1.6" fill="currentColor" stroke="none"/>',
  mic: '<rect x="7.3" y="2.5" width="5.4" height="10" rx="2.7"/><path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5"/>',
  speaker: '<path d="M3.5 7.8h2.8l3.9-3.3v11l-3.9-3.3H3.5z"/><path d="M13.2 7.3a3.8 3.8 0 0 1 0 5.4M15.3 5.2a6.8 6.8 0 0 1 0 9.6"/>',
  map: '<path d="M2.5 5.2l5-2 5 2 5-2v11.6l-5 2-5-2-5 2z"/><path d="M7.5 3.2v11.6M12.5 5.2v11.6"/>'
};

export function icon(name, size = 15) {
  const wrap = document.createElement('span');
  wrap.className = 'icon';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `<svg viewBox="0 0 20 20" width="${size}" height="${size}" fill="none" stroke="currentColor"` +
    ` stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" focusable="false">${PATHS[name]}</svg>`;
  return wrap;
}
