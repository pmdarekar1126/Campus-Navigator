// Conversations, kept in browser storage. Storage can throw or be empty in a
// private window or with site data blocked, so every access is guarded and the
// app keeps working in memory without it.

const STORAGE_KEY = 'campus-navigator-chats';
// Browser storage is a few megabytes. Without a cap a long-lived session
// eventually overflows it, and every save after that would fail silently.
const MAX_STORED_CHATS = 40;

export const state = { chats: [], activeId: null };

// Chats saved before timestamps existed carry their creation time in the id.
function timeFromId(id) {
  const n = Number(String(id).slice(1, 14));
  return Number.isFinite(n) && n > 1e12 ? n : 0;
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    state.chats = Array.isArray(parsed)
      ? parsed.filter((c) => c && typeof c.id === 'string' && Array.isArray(c.messages))
      : [];
  } catch (error) {
    state.chats = [];
  }
  for (const chat of state.chats) {
    if (!chat.updatedAt) chat.updatedAt = timeFromId(chat.id);
  }
  sortChats();
}

export function save() {
  sortChats();
  if (state.chats.length > MAX_STORED_CHATS) state.chats.length = MAX_STORED_CHATS;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.chats));
  } catch (error) {
    /* storage unavailable or full; the session still works in memory */
  }
}

function sortChats() {
  state.chats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function activeChat() {
  return state.chats.find((c) => c.id === state.activeId) || null;
}

export function titleFor(question) {
  return question.length > 60 ? `${question.slice(0, 57)}…` : question;
}

export function createChat(question) {
  const now = Date.now();
  const chat = {
    id: `c${now}${Math.random().toString(36).slice(2, 7)}`,
    title: titleFor(question),
    messages: [],
    updatedAt: now
  };
  state.chats.unshift(chat);
  state.activeId = chat.id;
  return chat;
}

export function touch(chat) {
  chat.updatedAt = Date.now();
}

// Returns what undo needs to put the chat back exactly where it was.
export function removeChat(id) {
  const index = state.chats.findIndex((c) => c.id === id);
  if (index < 0) return null;
  const [chat] = state.chats.splice(index, 1);
  const wasActive = state.activeId === id;
  if (wasActive) state.activeId = null;
  save();
  return { chat, index, wasActive };
}

export function restoreChat(removed) {
  if (!removed || state.chats.some((c) => c.id === removed.chat.id)) return;
  state.chats.splice(Math.min(removed.index, state.chats.length), 0, removed.chat);
  if (removed.wasActive) state.activeId = removed.chat.id;
  save();
}

// Today, Yesterday, Earlier, by calendar day in the reader's own timezone.
export function groupChats(now = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const groups = [
    { label: 'Today', chats: [] },
    { label: 'Yesterday', chats: [] },
    { label: 'Earlier', chats: [] }
  ];
  for (const chat of state.chats) {
    const t = chat.updatedAt || 0;
    if (t >= startOfToday) groups[0].chats.push(chat);
    else if (t >= startOfYesterday) groups[1].chats.push(chat);
    else groups[2].chats.push(chat);
  }
  return groups.filter((g) => g.chats.length > 0);
}
