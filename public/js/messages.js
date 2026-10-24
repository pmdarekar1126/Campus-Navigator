// Builds the rows of the conversation: questions with copy and edit, answers
// with room tags, provenance, copy, read-aloud and the floor map. Knows nothing
// about storage or the network; everything it triggers goes through callbacks.

import { icon } from './icons.js';
import { building } from './building.js';
import { renderAnswer, inferMap } from './answer.js';
import { canSpeak, speak } from './voice.js';

// Only answers drawn from the boards or the curated directory carry a label.
const PROVENANCE = {
  directory: { label: 'From the floor boards', className: 'provenance' },
  curated: { label: 'From campus directory', className: 'provenance' },
  fallback: { label: 'Closest match', className: 'provenance provenance-fallback' }
};

const MAX_LENGTH = 500;

function actionButton(name, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-button';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.appendChild(icon(name));
  return button;
}

// The clipboard API needs a secure context; fall back to a hidden selection.
function writeClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'absolute';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    if (ok) resolve(); else reject(new Error('copy failed'));
  });
}

function copyButton(text, label) {
  const button = actionButton('copy', label);
  button.addEventListener('click', () => {
    writeClipboard(text).then(() => {
      button.replaceChildren(icon('check'));
      button.classList.add('is-done');
      button.setAttribute('aria-label', 'Copied');
      button.title = 'Copied';
      setTimeout(() => {
        button.replaceChildren(icon('copy'));
        button.classList.remove('is-done');
        button.setAttribute('aria-label', label);
        button.title = label;
      }, 1600);
    }).catch(() => { button.title = 'Select the text and press Ctrl+C'; });
  });
  return button;
}

function speakButton(text) {
  const button = actionButton('speaker', 'Read answer aloud');
  button.addEventListener('click', () => speak(text, button));
  button.addEventListener('speech-start', () => {
    button.replaceChildren(icon('stop'));
    button.classList.add('is-done');
    button.setAttribute('aria-label', 'Stop reading');
    button.title = 'Stop reading';
  });
  button.addEventListener('speech-end', () => {
    button.replaceChildren(icon('speaker'));
    button.classList.remove('is-done');
    button.setAttribute('aria-label', 'Read answer aloud');
    button.title = 'Read answer aloud';
  });
  return button;
}

export function createMessages({ onAsk, onRewind, onMap }) {
  function userRow(text, index) {
    const row = document.createElement('div');
    row.className = 'message message-user';
    const stack = document.createElement('div');
    stack.className = 'user-stack';
    const bubble = document.createElement('div');
    bubble.className = 'bubble-user';
    bubble.textContent = text;
    const actions = document.createElement('div');
    actions.className = 'user-actions';
    actions.appendChild(copyButton(text, 'Copy question'));
    const edit = actionButton('edit', 'Edit question');
    edit.addEventListener('click', () => startEdit(row, text, index));
    actions.appendChild(edit);
    stack.append(bubble, actions);
    row.appendChild(stack);
    return row;
  }

  // Editing rewinds the conversation to this question and continues from the
  // edited version, the way any chat does.
  function startEdit(row, text, index) {
    const stack = row.querySelector('.user-stack');
    if (!stack || row.classList.contains('is-editing')) return;
    row.classList.add('is-editing');

    const editor = document.createElement('div');
    editor.className = 'user-editor';
    const field = document.createElement('textarea');
    field.className = 'edit-input';
    field.value = text;
    field.maxLength = MAX_LENGTH;
    field.rows = 1;
    field.setAttribute('aria-label', 'Edit your question');
    const buttons = document.createElement('div');
    buttons.className = 'edit-buttons';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'edit-cancel';
    cancel.textContent = 'Cancel';
    const send = document.createElement('button');
    send.type = 'button';
    send.className = 'edit-send';
    send.textContent = 'Send';
    buttons.append(cancel, send);
    editor.append(field, buttons);
    stack.replaceWith(editor);

    const grow = () => {
      field.style.height = 'auto';
      field.style.height = `${Math.min(field.scrollHeight, 200)}px`;
      send.disabled = field.value.trim().length === 0;
    };
    const close = () => {
      row.classList.remove('is-editing');
      editor.replaceWith(stack);
      stack.querySelector('[aria-label="Edit question"]').focus();
    };
    const commit = () => {
      const next = field.value.trim();
      if (!next) return;
      if (next === text.trim()) { close(); return; }
      onRewind(index, next);
    };

    field.addEventListener('input', grow);
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); commit(); }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    });
    cancel.addEventListener('click', close);
    send.addEventListener('click', commit);
    grow();
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }

  function assistantShell() {
    const row = document.createElement('div');
    row.className = 'message message-assistant';
    const avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.src = 'img/rait-crest.png';
    avatar.alt = '';
    avatar.width = 28;
    avatar.height = 28;
    avatar.setAttribute('aria-hidden', 'true');
    const body = document.createElement('div');
    body.className = 'assistant-body';
    const bubble = document.createElement('div');
    bubble.className = 'bubble-assistant';
    body.appendChild(bubble);
    row.append(avatar, body);
    return { row, body, bubble };
  }

  function showThinking(shell) {
    const thinking = document.createElement('div');
    thinking.className = 'thinking';
    thinking.setAttribute('aria-label', 'Finding the answer');
    thinking.innerHTML = '<span></span><span></span><span></span>';
    shell.bubble.replaceChildren(thinking);
  }

  function addMeta(shell, message) {
    const meta = document.createElement('div');
    meta.className = 'meta';
    const descriptor = PROVENANCE[message.source];
    if (descriptor) {
      const tag = document.createElement('span');
      tag.className = descriptor.className;
      tag.textContent = descriptor.label;
      meta.appendChild(tag);
    }
    // Small talk never gets a map, even when it mentions a floor in passing.
    const map = message.source === 'conversation'
      ? null
      : (message.map || inferMap(message.text, building()));
    if (map && building()) {
      const mapButton = document.createElement('button');
      mapButton.type = 'button';
      mapButton.className = 'map-button';
      mapButton.append(icon('map', 14), 'Show on map');
      mapButton.addEventListener('click', () => onMap(map, mapButton));
      meta.appendChild(mapButton);
    }
    meta.appendChild(copyButton(message.text, 'Copy answer'));
    if (canSpeak) meta.appendChild(speakButton(message.text));
    shell.body.appendChild(meta);

    if (message.followUps && message.followUps.length) {
      const wrap = document.createElement('div');
      wrap.className = 'followups';
      for (const question of message.followUps) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.textContent = question;
        chip.addEventListener('click', () => onAsk(question));
        wrap.appendChild(chip);
      }
      shell.body.appendChild(wrap);
    }
  }

  // Returns the reveal controller so the stop button can finish it early.
  function fillAnswer(shell, message, { animate = false, onDone, onTick } = {}) {
    return renderAnswer(shell.bubble, message.text, {
      data: building(),
      onTag: onAsk,
      animate,
      onTick,
      onDone: () => { addMeta(shell, message); if (onDone) onDone(); }
    });
  }

  function fillNotice(shell, text, actionLabel, onAction) {
    shell.bubble.textContent = text;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'retry';
    button.textContent = actionLabel;
    button.addEventListener('click', onAction);
    shell.body.appendChild(button);
  }

  return { userRow, assistantShell, showThinking, fillAnswer, fillNotice };
}
