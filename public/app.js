import { loadBuilding } from './js/building.js';
import { attachTypeahead } from './js/typeahead.js';
import { createMap } from './js/map.js';
import { canListen, createListener, stopSpeaking } from './js/voice.js';
import { createMessages } from './js/messages.js';
import { createToaster } from './js/toast.js';
import { icon } from './js/icons.js';
import * as store from './js/store.js';

const MAX_LENGTH = 500;
const COUNTER_FROM = 400;
const MAX_INPUT_HEIGHT = 132;
const THEME_KEY = 'campus-navigator-theme';

const $ = (id) => document.getElementById(id);
const messages = $('messages');
const conversation = document.querySelector('.conversation');
const emptyState = $('empty-state');
const form = $('composer');
const input = $('question-input');
const sendButton = $('send-button');
const micButton = $('mic-button');
const counter = $('char-counter');
const historyList = $('history-list');
const newChatButton = $('new-chat');
const offlineBanner = $('offline-banner');
const menuToggle = $('menu-toggle');
const sidebar = $('sidebar');
const scrim = $('scrim');
const themeToggle = $('theme-toggle');
const placeholder = input.placeholder;

let inFlight = null;
let reveal = null;
let stoppedByUser = false;

const toaster = createToaster($('toast-region'));
const mapView = createMap({ panel: $('map-panel'), onAsk: submitQuestion });
const ui = createMessages({
  onAsk: submitQuestion,
  onRewind: rewindAndAsk,
  onMap: (map, trigger) => mapView.open(map, trigger)
});
const typeahead = attachTypeahead({ input, listbox: $('suggest-list'), onPick: submitQuestion });
const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

/* ---------- composer ---------- */

function isBusy() {
  return Boolean(inFlight) || Boolean(reveal && reveal.running);
}

// While an answer is on its way the send button becomes a stop button.
function syncSend() {
  const busy = isBusy();
  const label = busy ? 'Stop answering' : 'Send question';
  sendButton.classList.toggle('is-stop', busy);
  sendButton.replaceChildren(icon(busy ? 'stop' : 'send', busy ? 16 : 18));
  sendButton.setAttribute('aria-label', label);
  sendButton.title = label;
  sendButton.disabled = !busy && input.value.trim().length === 0;
}

function resize() {
  input.style.height = 'auto';
  const needed = input.scrollHeight;
  input.style.height = `${Math.min(needed, MAX_INPUT_HEIGHT)}px`;
  input.style.overflowY = needed > MAX_INPUT_HEIGHT ? 'auto' : 'hidden';
}

function syncComposer() {
  const length = input.value.length;
  counter.hidden = length < COUNTER_FROM;
  if (!counter.hidden) {
    counter.textContent = `${length} / ${MAX_LENGTH}`;
    counter.classList.toggle('char-counter-warn', length >= MAX_LENGTH);
  }
  resize();
  syncSend();
}

input.addEventListener('input', syncComposer);
input.addEventListener('keydown', (event) => {
  if (typeahead.handleKey(event)) return;
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  // Only a click on the stop button stops; pressing Enter with a new question
  // typed sends it, replacing the answer still in progress.
  if (event.submitter === sendButton && isBusy()) { stop(); return; }
  submitQuestion(input.value);
});

function stop() {
  if (inFlight) { stoppedByUser = true; inFlight.abort(); }
  if (reveal && reveal.running) reveal.finish();
  syncSend();
}

/* ---------- conversation ---------- */

function scrollToEnd() {
  conversation.scrollTop = conversation.scrollHeight;
}

// Follow a growing answer only if the reader is already at the bottom; if
// they scrolled up to reread something, leave them where they are.
function followScroll() {
  const distance = conversation.scrollHeight - conversation.scrollTop - conversation.clientHeight;
  if (distance < 160) scrollToEnd();
}

function renderConversation() {
  messages.replaceChildren();
  const chat = store.activeChat();
  if (!chat || chat.messages.length === 0) {
    messages.appendChild(emptyState);
    return;
  }
  chat.messages.forEach((message, index) => {
    if (message.role === 'user') {
      messages.appendChild(ui.userRow(message.text, index));
      return;
    }
    const shell = ui.assistantShell();
    ui.fillAnswer(shell, message);
    messages.appendChild(shell.row);
  });
  scrollToEnd();
}

async function askServer(question) {
  if (inFlight) inFlight.abort();
  const controller = new AbortController();
  inFlight = controller;
  syncSend();
  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error('bad status');
    return await response.json();
  } finally {
    if (inFlight === controller) inFlight = null;
    syncSend();
  }
}

async function submitQuestion(rawQuestion) {
  const question = String(rawQuestion).trim();
  if (!question) return;
  if (reveal && reveal.running) reveal.finish();
  typeahead.close();

  let chat = store.activeChat();
  if (!chat) chat = store.createChat(question);
  chat.messages.push({ role: 'user', text: question });
  const userIndex = chat.messages.length - 1;
  store.touch(chat);
  store.save();

  if (emptyState.parentNode) emptyState.remove();
  messages.appendChild(ui.userRow(question, userIndex));
  input.value = '';
  syncComposer();
  closeSidebar();
  renderSidebar();

  const shell = ui.assistantShell();
  ui.showThinking(shell);
  messages.appendChild(shell.row);
  scrollToEnd();

  try {
    const result = await askServer(question);
    const message = {
      role: 'assistant',
      text: result.answer,
      source: result.source,
      followUps: result.followUps,
      map: result.map || null
    };
    chat.messages.push(message);
    store.touch(chat);
    store.save();
    reveal = ui.fillAnswer(shell, message, {
      animate: true,
      onTick: followScroll,
      onDone: () => { reveal = null; syncSend(); followScroll(); }
    });
    syncSend();
  } catch (error) {
    if (error && error.name === 'AbortError') {
      if (stoppedByUser) {
        stoppedByUser = false;
        ui.fillNotice(shell, 'You stopped this answer.', 'Ask again', () => rewindAndAsk(userIndex, question));
      } else {
        shell.row.remove();
      }
      syncSend();
      return;
    }
    ui.fillNotice(shell, 'I could not reach the campus directory just now.', 'Try again', () => rewindAndAsk(userIndex, question));
    followScroll();
  }
}

// Editing, retrying and asking again all rewind to a question and continue.
function rewindAndAsk(index, question) {
  const chat = store.activeChat();
  if (!chat) return;
  if (inFlight) inFlight.abort();
  if (reveal && reveal.running) reveal.finish();
  chat.messages = chat.messages.slice(0, index);
  if (index === 0) chat.title = store.titleFor(question);
  store.save();
  renderConversation();
  submitQuestion(question);
}

document.addEventListener('click', (event) => {
  const chip = event.target.closest('#empty-state .chip');
  if (chip) submitQuestion(chip.dataset.question || chip.textContent);
});

/* ---------- sidebar ---------- */

function openChat(id) {
  if (inFlight) inFlight.abort();
  stopSpeaking();
  store.state.activeId = id;
  renderConversation();
  renderSidebar();
  closeSidebar();
}

function deleteChat(id, byKeyboard) {
  const removed = store.removeChat(id);
  if (!removed) return;
  if (removed.wasActive) {
    if (inFlight) inFlight.abort();
    stopSpeaking();
    renderConversation();
  }
  renderSidebar();
  // Undo instead of an "are you sure": faster, and forgiving of mistakes.
  toaster.show('Chat deleted', {
    action: 'Undo',
    onAction: () => {
      store.restoreChat(removed);
      renderSidebar();
      if (removed.wasActive) renderConversation();
    }
  });
  if (byKeyboard) {
    const undo = document.querySelector('#toast-region .toast-action');
    if (undo) undo.focus();
  }
}

function historyItem(chat) {
  const item = document.createElement('li');
  item.className = 'history-item';

  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'history-open';
  open.textContent = chat.title;
  open.title = chat.title;
  if (chat.id === store.state.activeId) open.setAttribute('aria-current', 'true');
  open.addEventListener('click', () => openChat(chat.id));

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'history-delete';
  remove.appendChild(icon('close', 14));
  remove.setAttribute('aria-label', `Delete chat: ${chat.title}`);
  remove.title = 'Delete chat';
  remove.addEventListener('click', (event) => {
    event.stopPropagation();
    deleteChat(chat.id, event.detail === 0);
  });

  item.append(open, remove);
  return item;
}

function renderSidebar() {
  historyList.replaceChildren(...store.groupChats().map((group) => {
    const section = document.createElement('li');
    section.className = 'history-section';
    const heading = document.createElement('h2');
    heading.className = 'sidebar-heading';
    heading.textContent = group.label;
    const list = document.createElement('ul');
    list.className = 'history-group';
    list.append(...group.chats.map(historyItem));
    section.append(heading, list);
    return section;
  }));
}

function startNewChat() {
  if (inFlight) inFlight.abort();
  if (reveal && reveal.running) reveal.finish();
  stopSpeaking();
  mapView.close();
  // A chat appears in the sidebar only once it has a first question, so
  // repeated clicks cannot pile up empty conversations.
  store.state.activeId = null;
  renderConversation();
  renderSidebar();
  input.value = '';
  syncComposer();
  closeSidebar();
  if (!isTouch) input.focus();
}

newChatButton.addEventListener('click', startNewChat);

function openSidebar() {
  sidebar.classList.add('is-open');
  scrim.hidden = false;
  menuToggle.setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  sidebar.classList.remove('is-open');
  scrim.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
}

menuToggle.addEventListener('click', () => (sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar()));
scrim.addEventListener('click', closeSidebar);

/* ---------- keyboard shortcuts ---------- */

document.addEventListener('keydown', (event) => {
  const typing = event.target.closest && event.target.closest('input, textarea, select, [contenteditable="true"]');
  if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    input.focus();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    startNewChat();
    return;
  }
  if (event.key === 'Escape') {
    if (mapView.isOpen()) { mapView.close(); return; }
    closeSidebar();
  }
});

/* ---------- voice ---------- */

const listener = canListen ? createListener({
  onInterim: (text) => { input.value = text; syncComposer(); },
  onFinal: (text) => submitQuestion(text),
  onStateChange: (listening) => {
    const label = listening ? 'Stop listening' : 'Ask by voice';
    micButton.classList.toggle('is-listening', listening);
    micButton.setAttribute('aria-pressed', String(listening));
    micButton.setAttribute('aria-label', label);
    micButton.title = label;
    input.placeholder = listening ? 'Listening…' : placeholder;
  },
  onError: (code) => toaster.show(/not-allowed/.test(code)
    ? 'Microphone access is blocked. Allow it in your browser to ask by voice.'
    : 'Voice input stopped. Try again, or type your question.')
}) : null;

if (listener) micButton.addEventListener('click', () => listener.toggle());
else micButton.hidden = true;

/* ---------- theme ---------- */

function currentTheme() {
  const explicit = document.documentElement.getAttribute('data-theme');
  if (explicit === 'dark' || explicit === 'light') return explicit;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function syncThemeLabel() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  themeToggle.setAttribute('aria-label', `Switch to ${next} mode`);
  themeToggle.title = `Switch to ${next} mode`;
}

themeToggle.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem(THEME_KEY, next); } catch (error) { /* applies for this view only */ }
  syncThemeLabel();
});

if (window.matchMedia) {
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = () => { if (!document.documentElement.hasAttribute('data-theme')) syncThemeLabel(); };
  if (query.addEventListener) query.addEventListener('change', onSystemChange);
}
syncThemeLabel();

/* ---------- offline ---------- */

const syncOnline = () => { offlineBanner.hidden = navigator.onLine; };
window.addEventListener('online', syncOnline);
window.addEventListener('offline', syncOnline);
syncOnline();

/* ---------- init ---------- */

store.load();
store.state.activeId = store.state.chats.length > 0 ? store.state.chats[0].id : null;
renderConversation();
renderSidebar();
syncComposer();
if (!isTouch) input.focus();

// Room tags and map buttons need the building data. Once it arrives, redraw
// the restored conversation, unless something is already happening in it.
loadBuilding().then(() => {
  const chat = store.activeChat();
  if (chat && chat.messages.length && !isBusy() && !document.querySelector('.is-editing')) renderConversation();
}).catch(() => { /* the chat works without the building data */ });

// The first measurement can run against fallback font metrics and land on the
// max-height cap. Re-measure once the webfonts have settled.
if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncComposer).catch(() => {});
window.addEventListener('resize', resize);
