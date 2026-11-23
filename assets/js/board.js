// Anonymous discussion board. Routes: #/ (all boards), #/b/<board>, #/t/<thread-id>.
import { backendReady, getClient, trackView } from './backend.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const t = (key, fallback, vars) => (window.PWI18N ? window.PWI18N.t(key, fallback, vars) : (fallback ?? key));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOARD = /^[a-z0-9-]{1,40}$/;
// Mirrors the database's link check, so we can tell people up front that a post will wait for review.
const LINKISH = /(https?:\/\/|www\.|magnet:|discord\.gg|t\.me\/|[a-z0-9-]+\.(com|net|org|io|gg|me|ru|xyz|app|dev|ly|co|to|cc|link|zip|exe)(\W|$))/i;

function ago(iso) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (!Number.isFinite(s) || s < 60) return t('ago.now', 'just now');
  if (s < 3600) return t('ago.minutes', '{n}m ago', { n: Math.round(s / 60) });
  if (s < 86400) return t('ago.hours', '{n}h ago', { n: Math.round(s / 3600) });
  if (s < 2592000) return t('ago.days', '{n}d ago', { n: Math.round(s / 86400) });
  return new Date(iso).toLocaleDateString(document.documentElement.lang === 'en' ? 'en-GB' : 'zh-CN', { day: 'numeric', month: 'short' });
}

let boards = [];
let stats = new Map();

async function loadBoards() {
  const fixed = [
    { id: 'general', name: t('board.genName', 'General'), desc: t('board.genDesc', 'Anything about GTA VI on PC') },
    { id: 'news', name: t('board.newsName', 'News & leaks'), desc: t('board.newsDesc', 'Takedowns, the executable, confirmed news') },
  ];
  try {
    const data = await (await fetch(`data/tracker.json?ts=${Math.floor(Date.now() / 6e4)}`)).json();
    const efforts = (data.efforts || [])
      .filter((e) => (e.tier === 'tracked' || e.tier === 'watchlist') && BOARD.test(e.id))
      .map((e) => ({ id: e.id, name: e.name, desc: e.approach || '', effort: true, tier: e.tier }));
    boards = [...fixed, ...efforts.filter((e) => e.tier === 'tracked'), ...efforts.filter((e) => e.tier === 'watchlist')];
  } catch { boards = fixed; }
}

function renderNav(active) {
  const item = (b) => {
    const s = stats.get(b.id);
    return `<a href="#/b/${esc(b.id)}" class="${b.id === active ? 'is-on' : ''}"><span>${esc(b.name)}</span>${s ? `<small>${s.threads}</small>` : ''}</a>`;
  };
  $('#board-nav').innerHTML = `
    <a href="#/" class="${!active ? 'is-on' : ''}"><span>${esc(t('board.allBoards', 'All boards'))}</span></a>
    <p class="board-nav-label">${esc(t('board.discussion', 'Discussion'))}</p>${boards.filter((b) => !b.effort).map(item).join('')}
    <p class="board-nav-label">${esc(t('board.projects', 'Projects'))}</p>${boards.filter((b) => b.effort).map(item).join('')}`;
}

const boardName = (id) => boards.find((b) => b.id === id)?.name || id;

async function refreshStats(client) {
  const { data } = await client.rpc('board_stats');
  stats = new Map((data || []).map((r) => [r.board, r]));
}

/* ---------- Views ---------- */
async function viewIndex(client) {
  await refreshStats(client);
  renderNav(null);
  const { data: latest } = await client.from('threads')
    .select('id,board,title,author,reply_count,last_activity').eq('status', 'visible')
    .order('last_activity', { ascending: false }).limit(12);
  $('#board-main').innerHTML = `
    <h2 class="board-title">${esc(t('board.allBoards', 'All boards'))}</h2>
    <div class="board-grid">${boards.map((b) => {
      const s = stats.get(b.id);
      return `<a class="board-card" href="#/b/${esc(b.id)}"><b>${esc(b.name)}</b><span>${esc(b.desc)}</span><small>${s
        ? `${esc(t('board.threads', '{n} threads', { n: s.threads }))} · ${esc(t('board.active', 'active {ago}', { ago: ago(s.last_activity) }))}`
        : esc(t('board.noThreads', 'No threads yet'))}</small></a>`;
    }).join('')}</div>
    <h3 class="mini-title board-sub">${esc(t('board.latest', 'Latest activity'))}</h3>
    ${threadList(latest || [], true)}`;
}

function threadList(rows, showBoard) {
  if (!rows.length) return `<p class="empty">${esc(t('board.noThreadsStart', 'No threads yet. Start the first one.'))}</p>`;
  return `<ol class="threads">${rows.map((row) => `
    <li><a href="#/t/${esc(row.id)}">
      <span class="t-title">${esc(row.title)}</span>
      <span class="t-meta">${showBoard ? `<em>${esc(boardName(row.board))}</em> · ` : ''}${esc(row.author)} · ${esc(t('board.replies', '{n} replies', { n: row.reply_count }))} · ${esc(ago(row.last_activity))}</span>
    </a></li>`).join('')}</ol>`;
}

async function viewBoard(client, board) {
  if (!BOARD.test(board)) return viewIndex(client);
  await refreshStats(client);
  renderNav(board);
  const { data, error } = await client.from('threads')
    .select('id,board,title,author,reply_count,last_activity').eq('board', board).eq('status', 'visible')
    .order('last_activity', { ascending: false }).limit(60);
  $('#board-main').innerHTML = `
    <div class="board-title-row"><h2 class="board-title">${esc(boardName(board))}</h2>
      ${boards.find((b) => b.id === board && b.effort) ? `<a class="toggle" href="./#effort-${esc(board)}">${esc(t('board.seeInRace', 'See it in the race'))}</a>` : ''}</div>
    ${composer('thread')}
    ${error ? `<p class="empty">${esc(t('board.loadError', "Couldn't load threads: {msg}", { msg: error.message }))}</p>` : threadList(data || [], false)}`;
  bindComposer(client, 'thread', { board });
}

async function viewThread(client, id) {
  if (!UUID.test(id)) return viewIndex(client);
  const { data: thread } = await client.from('threads').select('id,board,title,body,author,created_at,reply_count').eq('id', id).maybeSingle();
  if (!thread) {
    $('#board-main').innerHTML = `<p class="empty">${esc(t('board.threadGone', "This thread doesn't exist or was removed."))} <a href="#/">${esc(t('board.backToBoards', 'Back to the boards'))}</a></p>`;
    return;
  }
  renderNav(thread.board);
  const getPosts = (cols) => client.from('posts').select(cols).eq('thread_id', id).eq('status', 'visible').order('created_at').limit(500);
  let { data: posts, error } = await getPosts('id,body,author,created_at,like_count');
  // A database without the likes column rejects the whole query: still show the replies, just without likes.
  if (error) ({ data: posts } = await getPosts('id,body,author,created_at'));
  $('#board-main').innerHTML = `
    <p class="crumbs"><a href="#/b/${esc(thread.board)}">← ${esc(boardName(thread.board))}</a></p>
    <article class="post post-op">
      <h2>${esc(thread.title)}</h2>
      <p class="p-meta"><b>${esc(thread.author)}</b> · ${esc(ago(thread.created_at))}</p>
      <div class="p-body">${esc(thread.body)}</div>
    </article>
    ${(posts || []).map((p, i) => `
      <article class="post" id="p-${esc(p.id)}">
        <p class="p-meta"><b>${esc(p.author)}</b> · ${esc(ago(p.created_at))} <span class="p-no">#${i + 1}</span></p>
        <div class="p-body">${esc(p.body)}</div>
        ${Number.isInteger(p.like_count) ? likeButton(p) : ''}
      </article>`).join('')}
    ${composer('reply')}`;
  bindLikes(client);
  bindComposer(client, 'reply', { thread: id });
}

/* ---------- Likes ----------
   No accounts: a random token in localStorage stands for this browser. The database does the counting. */
let voter = null;
let liked = new Set();

function loadLikes() {
  try {
    voter = localStorage.getItem('pw_voter');
    if (!UUID.test(voter || '')) { voter = crypto.randomUUID(); localStorage.setItem('pw_voter', voter); }
    liked = new Set(JSON.parse(localStorage.getItem('pw_liked') || '[]'));
  } catch { voter ||= crypto.randomUUID(); }
}

function likeButton(p) {
  return `<div class="p-actions">
          <button type="button" class="like" data-like="${esc(p.id)}" aria-pressed="false">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13.8S1.8 10.1 1.8 5.7A3 3 0 0 1 8 4.2a3 3 0 0 1 6.2 1.5c0 4.4-6.2 8.1-6.2 8.1Z"/></svg>
            <span>${esc(t('board.like', 'Like'))}</span> <b>${p.like_count}</b>
          </button>
          <span class="like-note" role="status"></span>
        </div>`;
}

function bindLikes(client) {
  const buttons = document.querySelectorAll('[data-like]');
  if (!buttons.length) return;
  loadLikes();
  buttons.forEach((btn) => {
    const id = btn.dataset.like;
    const note = btn.nextElementSibling;
    btn.setAttribute('aria-pressed', String(liked.has(id)));
    btn.addEventListener('click', async () => {
      if (btn.getAttribute('aria-busy') === 'true') return; // not disabled, which would drop keyboard focus
      btn.setAttribute('aria-busy', 'true');
      note.textContent = '';
      const { data, error } = await client.rpc('set_post_like', { p_post: id, p_token: voter, p_liked: !liked.has(id) });
      btn.removeAttribute('aria-busy');
      if (error) { note.textContent = error.message || t('board.likeFailed', "Couldn't save that like. Try again."); return; }
      if (data.liked) liked.add(id); else liked.delete(id);
      try { localStorage.setItem('pw_liked', JSON.stringify([...liked])); } catch { /* lasts until reload */ }
      btn.setAttribute('aria-pressed', String(data.liked));
      btn.querySelector('b').textContent = data.likes;
    });
  });
}

/* ---------- Posting ---------- */
function composer(kind) {
  const isThread = kind === 'thread';
  return `
  <details class="composer" ${isThread ? '' : 'open'}>
    <summary>${esc(isThread ? t('board.startThread', 'Start a new thread') : t('board.reply', 'Reply'))}</summary>
    <form id="composer" novalidate>
      <div class="c-row">
        <input name="author" maxlength="32" placeholder="${esc(t('board.namePlaceholder', 'Name (optional, shows as Anonymous)'))}" autocomplete="off">
      </div>
      ${isThread ? `<input name="title" required minlength="3" maxlength="120" placeholder="${esc(t('board.titlePlaceholder', 'Thread title'))}">` : ''}
      <textarea name="body" required maxlength="4000" rows="${isThread ? 6 : 4}" placeholder="${esc(isThread ? t('board.bodyThread', 'What do you want to talk about?') : t('board.bodyReply', 'Write a reply'))}"></textarea>
      <div class="c-foot">
        <span class="c-note" id="c-note">${esc(t('board.plainNote', 'Plain text. Posts with links wait for review.'))}</span>
        <span class="c-count" id="c-count">0 / 4000</span>
        <button class="gh-link" type="submit">${esc(isThread ? t('board.postThread', 'Post thread') : t('board.postReply', 'Post reply'))}</button>
      </div>
    </form>
  </details>`;
}

function bindComposer(client, kind, target) {
  const form = $('#composer');
  if (!form) return;
  const body = form.elements.body;
  const note = $('#c-note');
  const plain = t('board.plainNote', 'Plain text. Posts with links wait for review.');
  const update = () => {
    $('#c-count').textContent = `${body.value.length} / 4000`;
    const text = `${form.elements.title?.value || ''} ${body.value}`;
    note.textContent = LINKISH.test(text) ? t('board.linkNote', 'This contains a link, so it will wait for review before it appears.') : plain;
    note.classList.toggle('is-warn', LINKISH.test(text));
  };
  form.addEventListener('input', update);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = form.querySelector('button');
    const author = form.elements.author.value.trim();
    const title = form.elements.title?.value.trim();
    const text = body.value.trim();
    if (kind === 'thread' && (!title || title.length < 3)) { note.textContent = t('board.titleRequired', 'Give the thread a title (3+ characters).'); note.classList.add('is-warn'); return; }
    if (!text) { note.textContent = t('board.bodyRequired', 'Write something first.'); note.classList.add('is-warn'); return; }
    btn.disabled = true;
    btn.textContent = t('board.posting', 'Posting…');
    const { data, error } = kind === 'thread'
      ? await client.rpc('create_thread', { p_board: target.board, p_title: title, p_body: text, p_author: author })
      : await client.rpc('create_post', { p_thread: target.thread, p_body: text, p_author: author });
    btn.disabled = false;
    btn.textContent = kind === 'thread' ? t('board.postThread', 'Post thread') : t('board.postReply', 'Post reply');
    if (error) { note.textContent = error.message || t('board.somethingWrong', 'Something went wrong. Try again.'); note.classList.add('is-warn'); return; }
    if (data?.status === 'pending') {
      form.reset(); update();
      note.textContent = t('board.thanksReview', 'Thanks. Your post contains a link, so it will appear once it has been reviewed.');
      note.classList.add('is-warn');
      return;
    }
    if (kind === 'thread' && data?.id) location.hash = `#/t/${data.id}`;
    else route();
  });
}

/* ---------- Router ---------- */
async function route() {
  const client = await getClient();
  const [, kind, arg] = (location.hash.match(/^#\/(b|t)\/([\w-]+)/) || []);
  window.scrollTo(0, 0);
  try {
    if (kind === 'b') await viewBoard(client, arg);
    else if (kind === 't') await viewThread(client, arg);
    else await viewIndex(client);
  } catch (err) {
    $('#board-main').innerHTML = `<p class="empty">${esc(t('board.cantReach', "Couldn't reach the board right now."))} ${esc(err.message || '')}</p>`;
  }
  trackView(`/board${kind ? `/${kind}` : ''}${kind === 'b' ? `/${arg}` : ''}`);
}

async function main() {
  await loadBoards();
  if (!backendReady()) {
    renderNav(null);
    $('#board-main').innerHTML = `<p class="empty">${esc(t('board.launching', 'The board is launching soon.'))}</p>`;
    return;
  }
  window.addEventListener('hashchange', route);
  // Switching language rebuilds the board names and every rendered string.
  document.addEventListener('pw:lang', async () => { await loadBoards(); route(); });
  route();
}
main();
