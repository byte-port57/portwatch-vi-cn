import { MILESTONES, GROUNDWORK, STABILITY, scoreEffort, overall, ladderValue } from './scoring.js';
import { backendReady, getLiveViewers, trackView } from './backend.js';
import { coverHtml, articlePath } from './news-shared.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Everything rendered comes from data/tracker.json, part of which is written by an
// automated scout reading untrusted repos, so every string is escaped.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const repoUrl = (repo, branch) => (REPO_RE.test(repo || '') ? `https://github.com/${repo}${branch && branch !== 'main' && branch !== 'master' ? `/tree/${encodeURIComponent(branch)}` : ''}` : '#');
const owner = (repo) => (repo || '').split('/')[0];
const avatar = (repo) => (REPO_RE.test(repo || '') ? `https://github.com/${encodeURIComponent(owner(repo))}.png?size=88` : '');
const safeHttp = (u) => (/^https:\/\//.test(u || '') ? u : '#');
const pct = (v) => `${Math.round(v * 10) / 10}`;

/* ---------- i18n ----------
   Chinese is the default; English strings stay in the code as fallbacks.
   Sections re-render on the "pw:lang" event (see relabel() at the bottom). */
const I = window.PWI18N;
const t = (key, fallback, vars) => (I ? I.t(key, fallback, vars) : (fallback ?? key));
const msLabel = (m) => (I ? I.milestone(m.key, m.label) : m.label);
const msDesc = (m) => (I ? I.milestoneDesc(m.key, m.desc) : m.desc);
const gwLabel = (g) => (I ? I.groundwork(g.key, g.label) : g.label);
const gwDesc = (g) => (I ? I.groundworkDesc(g.key, g.desc) : g.desc);
const stLabel = (k) => (I ? I.stability(k, (STABILITY[k] || STABILITY.unknown).label) : (STABILITY[k] || STABILITY.unknown).label);
// tracker.json is written in English; translate its human-readable fields on the way to the DOM.
const D = (s) => (window.PWCONTENT ? window.PWCONTENT.text(s) : s);
const DC = (s) => (window.PWCONTENT ? window.PWCONTENT.change(s) : s);
// Dynamic text that isn't in the dictionary gets a marker; live() translates it async.
const L = (s) => (window.PWCONTENT ? window.PWCONTENT.markup(s) : esc(s));

function ago(iso) {
  const t0 = Date.parse(iso);
  if (!Number.isFinite(t0)) return '';
  const s = (Date.now() - t0) / 1000;
  if (s < 60) return t('ago.now', 'just now');
  const m = s / 60;
  if (m < 60) return t('ago.minutes', '{n}m ago', { n: Math.round(m) });
  const h = m / 60;
  if (h < 24) return t('ago.hours', '{n}h ago', { n: Math.round(h) });
  const d = h / 24;
  if (d < 30) return t('ago.days', '{n}d ago', { n: Math.round(d) });
  return new Date(t0).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' });
}
const daysSince = (iso) => (Date.now() - Date.parse(iso)) / 864e5;
const fmtK = (n) => (n == null ? '-' : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

const ICON = {
  star: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 .8l2.2 4.6 5 .7-3.6 3.5.9 5L8 12.2 3.5 14.6l.9-5L.8 6.1l5-.7z"/></svg>',
  fork: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M5 3.3a1.8 1.8 0 1 0-2.3 1.7v.8A2.5 2.5 0 0 0 5.2 8.3h1.9v2.7a1.8 1.8 0 1 0 1.8 0V8.3h1.9a2.5 2.5 0 0 0 2.5-2.5V5a1.8 1.8 0 1 0-1.5 0v.8a1 1 0 0 1-1 1H5.2a1 1 0 0 1-1-1V5A1.8 1.8 0 0 0 5 3.3Z"/></svg>',
  issue: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/></svg>',
  commit: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 5a3 3 0 0 1 2.9 2.2H15v1.6h-4.1a3 3 0 0 1-5.8 0H1V7.2h4.1A3 3 0 0 1 8 5Zm0 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"/></svg>',
  clock: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 4.5V8l2.4 1.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  gh: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0a8 8 0 0 0-2.5 15.6c.4 0 .5-.2.5-.4v-1.5c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.3 1.9.9 2.4.7 0-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.5 7.5 0 0 1 4 0c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3.1-1.9 3.8-3.6 4 .3.3.6.8.6 1.5v2.2c0 .2.1.5.6.4A8 8 0 0 0 8 0Z"/></svg>',
};

const state = { data: null, filter: 'all', sort: 'score' };

async function main() {
  const res = await fetch(`data/tracker.json?ts=${Math.floor(Date.now() / 6e4)}`, { cache: 'no-cache' });
  const data = await res.json();
  state.data = data;
  for (const e of data.efforts) Object.assign(e, { _s: scoreEffort(e) });

  renderMeta(data);
  renderHeroArt(data.site || {});
  startCountdown(data.exe || {});
  renderOverall(data);
  renderChanges(data.changes || []);
  renderRace();
  renderNews(data.news || []);
  renderWatchlist(data);
  renderTools(data.tools || []);
  renderInbox(data);
  renderFlags(data.flagged || []);
  renderMethod();
  bindControls();
  observeBars();
  trackView('/').then(watchViewers); // afterwards, so this visitor is in the count
}

/* ---------- Meta & hero ---------- */
// The scout stores one pre-formatted English line; pull the numbers out so it can be shown in either language.
function scoutSummary(text) {
  const m = /^(\d+)\s+refreshed,\s+(\d+)\s+READMEs? changed,\s+(\d+)\s+new candidates?,\s+(\d+)\s+flagged/.exec(String(text || ''));
  if (!m) return text;
  return t('scout.summary', '{a} refreshed, {b} READMEs changed, {c} new candidates, {d} flagged', { a: m[1], b: m[2], c: m[3], d: m[4] });
}

function renderMeta(data) {
  $('#nav-updated').textContent = t('nav.updated', 'Updated {ago}', { ago: ago(data.updated) });
  $('#nav-updated').title = new Date(data.updated).toLocaleString();
  const sc = data.scout || {};
  $('#scout-status').textContent = sc.lastRun
    ? t('scout.lastRun', 'Last scout run {ago}', { ago: ago(sc.lastRun) }) + (sc.lastSummary ? `: ${scoutSummary(sc.lastSummary)}` : '')
    : t('scout.every3h', 'The scout runs every 3 hours.');
  if (!renderMeta.bound) {
    renderMeta.bound = true;
    window.addEventListener('scroll', () => $('#nav').classList.toggle('is-scrolled', window.scrollY > 8), { passive: true });
  }
}

function renderHeroArt(site) {
  if (!site.heroImage) return;
  const img = new Image();
  img.onload = () => {
    $('#hero-photo').style.backgroundImage = `url("${encodeURI(site.heroImage)}")`;
    $('#top').classList.add('has-photo');
    if (site.heroCredit) $('#art-credit').textContent = D(site.heroCredit);
  };
  img.src = site.heroImage;
}

/* ---------- Live viewers ----------
   Read on load, then every 5 minutes from visible tabs only: the free backend plan has tight egress, log and
   realtime-connection limits, so don't poll faster or hold a connection open. */
const LIVE_REFRESH_MS = 5 * 60_000;
function watchViewers() {
  const pill = $('#watching');
  let last = 0;
  const refresh = async () => {
    if (document.hidden) return;
    last = Date.now();
    const n = await getLiveViewers();
    pill.hidden = n === null;
    if (n !== null) pill.textContent = t('hero.watching', '{n} watching now', { n: n.toLocaleString() });
  };
  refresh();
  setInterval(refresh, LIVE_REFRESH_MS);
  document.addEventListener('visibilitychange', () => { if (Date.now() - last >= LIVE_REFRESH_MS) refresh(); });
}

/* ---------- Countdown ---------- */
let countdownTimer = null;
function startCountdown(exe) {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  const box = $('#countdown');
  const by = exe.by ? t('cd.titleBy', "{by}'s executable drop", { by: exe.by }) : t('cd.title', 'Executable drop');
  const released = exe.status === 'released' && exe.releasedAt;
  const target = Date.parse(released ? exe.releasedAt : exe.expectedAt || `${exe.expected}T00:00:00Z`);
  const dayFmt = new Intl.DateTimeFormat(dateLocale(), { weekday: 'short', day: 'numeric', month: 'short' });
  const timeFmt = new Intl.DateTimeFormat(dateLocale(), { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

  $('#cd-title').textContent = released ? t('cd.released', 'Executable released') : by;
  const src = exe.source ? ` · <a href="${esc(safeHttp(exe.source))}" target="_blank" rel="noopener">${esc(t('cd.source', 'source'))}</a>` : '';
  if (!Number.isFinite(target)) {
    $('#cd-status').textContent = t('cd.noDate', 'No release date announced.');
    return;
  }
  if (released) {
    box.classList.add('is-released');
    $('#cd-foot').innerHTML = esc(t('cd.outSince', 'Out since {d}, {t}', { d: dayFmt.format(target), t: timeFmt.format(target) })) + src;
  } else {
    const when = exe.timeAnnounced
      ? `${dayFmt.format(target)}, ${timeFmt.format(target)}`
      : t('cd.exactUnknown', '{d} · exact time not announced, counting to 00:00 UTC', { d: dayFmt.format(target) });
    $('#cd-foot').innerHTML = esc(t('cd.expected', 'Expected {w}', { w: when })) + src;
  }

  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    let diff = released ? Date.now() - target : target - Date.now();
    const due = !released && diff <= 0;
    if (due) diff = 0;
    const d = Math.floor(diff / 864e5);
    const h = Math.floor((diff % 864e5) / 36e5);
    const m = Math.floor((diff % 36e5) / 6e4);
    const s = Math.floor((diff % 6e4) / 1e3);
    $('#cd-d').textContent = pad(d);
    $('#cd-h').textContent = pad(h);
    $('#cd-m').textContent = pad(m);
    $('#cd-s').textContent = pad(s);
    box.classList.toggle('is-due', due);
    let status;
    if (released) status = t('cd.statusReleased', 'Time since release. Projects can now try to boot the real thing.');
    else if (!due) status = t('cd.statusWaiting', 'Left until the missing executable is due. Until then, nobody can boot GTA VI.');
    else {
      const late = (Date.now() - target) / 36e5;
      status = late < 24
        ? t('cd.statusDue', 'Due now. Waiting for it to appear (and be readable).')
        : t('cd.statusOverdue', 'Overdue by {d}d {h}h. Still not released.', { d: Math.floor(late / 24), h: Math.floor(late % 24) });
    }
    $('#cd-status').textContent = status;
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

/* ---------- Overall ---------- */
let resizeBound = false;
function renderOverall(data) {
  const all = data.efforts;
  const ov = overall(all);
  const leader = ov.leader?.effort;
  animateNumber($('#ov-score'), ov.score);
  if (leader) {
    const state = ov.leader.reached === 'groundwork'
      ? t('ov.leaderGroundwork', 'Still groundwork. Nothing has run GTA VI yet.')
      : t('ov.leaderReached', 'Has reached “{label}”.', { label: msLabel(MILESTONES.find((m) => m.key === ov.leader.reached) || ov.furthest) });
    $('#ov-leader').innerHTML = t('ov.leader', 'Leader: <a href="#effort-{id}">{name}</a> by {owner}. {state}', {
      id: esc(leader.id), name: esc(leader.name), owner: esc(owner(leader.repo)), state: esc(state),
    });
  } else {
    $('#ov-leader').innerHTML = esc(t('ov.none', 'No efforts tracked yet.'));
  }
  $('#ov-stage').textContent = msLabel(ov.furthest);
  $('#ov-top3').textContent = `${pct(ov.top3)}%`;
  const booted = all.filter((e) => ladderValue(e.gta?.boots) >= 1).length;
  $('#ov-boot').textContent = `${booted} / ${all.length}`;
  $('#ov-count').textContent = `${all.length}`;

  const answer = { groundwork: 'Not yet.', loads: 'Not yet.', boots: 'Not yet.', menu: 'Not yet.', ingame: 'Sort of.', fps30: 'Mostly.', stable: 'Yes.' };
  $('#answer').textContent = t('answer.' + ov.furthest.key, answer[ov.furthest.key]);

  // Ticks + labels
  const furthestIdx = MILESTONES.findIndex((m) => m.key === ov.furthest.key);
  $('#mega-ticks').innerHTML = MILESTONES.slice(1, -1).map((m) => `<i style="left:${m.at}%"></i>`).join('');
  $('#mega-labels').innerHTML = MILESTONES.map((m, i) => {
    const cls = i <= furthestIdx ? 'is-reached' : i === furthestIdx + 1 ? 'is-next' : '';
    return `<div class="mega-label ${cls}" style="left:${m.at}%" data-tip="${esc(msDesc(m))}" data-tip-title="${esc(msLabel(m))}"><b>${m.at}%</b><span class="dot"></span>${esc(msLabel(m))}</div>`;
  }).join('');
  $('#mega-fill').dataset.width = ov.score;

  const top = ov.ranked.slice(0, 6);
  const draw = () => drawMarkers(top, leader);
  draw();
  if (!resizeBound) {
    resizeBound = true;
    let raf;
    window.addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); });
  }

  renderHistory(data.history || []);
}

// Avatars sit in one row above the bar, spread apart so they never overlap,
// with a curved leader line down to each effort's true position.
function drawMarkers(ranked, leader) {
  const box = $('#mega-markers');
  const W = box.clientWidth;
  const H = box.clientHeight;
  if (!W) return;
  const GAP = 42;
  const items = ranked.map((r) => ({ r, x: (r.score / 100) * W })).sort((a, b) => a.x - b.x);
  items.forEach((it, i) => { it.a = i ? Math.max(it.x, items[i - 1].a + GAP) : it.x; });
  const shift = items.reduce((s, it) => s + (it.x - it.a), 0) / Math.max(1, items.length);
  items.forEach((it, i) => {
    it.a += shift;
    it.a = Math.max(18, i ? Math.max(it.a, items[i - 1].a + GAP) : it.a);
  });
  const overflow = items.length ? items[items.length - 1].a - (W - 18) : 0;
  if (overflow > 0) items.forEach((it) => { it.a -= overflow; });

  const avatarY = H - 66;
  const lines = items.map((it) => {
    const y0 = avatarY + 32;
    return `<path d="M${it.a} ${y0} C ${it.a} ${y0 + 18}, ${it.x} ${H - 18}, ${it.x} ${H}" fill="none" stroke="${it.r.effort === leader ? '#ff2e7e' : 'var(--line-2)'}" stroke-width="1.6"/>
            <circle cx="${it.x}" cy="${H - 1}" r="3" fill="${it.r.effort === leader ? '#ff2e7e' : 'var(--faint)'}"/>`;
  }).join('');
  box.innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;inset:0;overflow:visible" aria-hidden="true">${lines}</svg>` +
    items.map((it) => {
      const e = it.r.effort;
      const src = avatar(e.repo);
      return `<a class="marker ${e === leader ? 'is-leader' : ''}" href="#effort-${esc(e.id)}" style="left:${it.a}px;bottom:${H - avatarY - 32}px"
                data-tip-title="${esc(e.name)} · ${pct(it.r.score)}%" data-tip="${esc(msLabel(MILESTONES.find((m) => m.key === it.r.reached) || MILESTONES[0]))} · ${esc(D(e.approach || ''))}">
                <span class="mk-name">${esc(e.name)} · ${pct(it.r.score)}%</span>
                ${src ? `<img src="${esc(src)}" alt="" loading="lazy" data-fallback="${esc(e.name.slice(0, 2))}">` : `<span class="mk-fallback">${esc(e.name.slice(0, 2))}</span>`}
              </a>`;
    }).join('');
}

function renderHistory(history) {
  const box = $('#ov-history');
  const pts = history.filter((h) => Number.isFinite(h.leader));
  if (pts.length < 2) return;
  box.hidden = false;
  const W = 1000, H = 70, max = Math.max(30, ...pts.map((p) => p.leader)) * 1.1;
  const x = (i) => (i / (pts.length - 1)) * W;
  const y = (v) => H - (v / max) * (H - 6) - 3;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.leader).toFixed(1)}`).join(' ');
  box.innerHTML = `<p>${esc(t('ov.history', "Leader's score, day by day"))}</p>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="${esc(t('ov.historyAria', 'Leader score history'))}">
      <defs><linearGradient id="hg" x1="0" x2="1"><stop offset="0" stop-color="#7a5cff"/><stop offset=".55" stop-color="#ff2e7e"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient>
      <linearGradient id="hf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff2e7e" stop-opacity=".18"/><stop offset="1" stop-color="#ff2e7e" stop-opacity="0"/></linearGradient></defs>
      <path d="${d} L${W} ${H} L0 ${H} Z" fill="url(#hf)"/>
      <path d="${d}" fill="none" stroke="url(#hg)" stroke-width="3" vector-effect="non-scaling-stroke"/>
    </svg>`;
}

/* ---------- Changes ---------- */
function renderChanges(changes) {
  const list = $('#changes-list');
  const items = [...changes].reverse().slice(0, 12);
  if (!items.length) { $('#changes').hidden = true; return; }
  const cls = { up: 'ck-up', down: 'ck-down', flag: 'ck-flag', new: 'ck-new', removed: 'ck-down', claim: 'ck-flag' };
  list.innerHTML = items.map((c) => `<li><span class="ck ${cls[c.kind] || ''}"></span><time>${esc(new Date(`${c.date}T12:00:00Z`).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' }))}</time><span>${esc(DC(c.text))}</span></li>`).join('');
}

/* ---------- Race ---------- */
function isGtaSpecific(e) { return /gta/i.test(e.target || ''); }

function renderRace() {
  const { data, filter, sort } = state;
  let list = data.efforts.filter((e) => e.tier === 'tracked');
  if (filter === 'gta') list = list.filter(isGtaSpecific);
  if (filter === 'generic') list = list.filter((e) => !isGtaSpecific(e));
  const byScore = (a, b) => b._s.score - a._s.score;
  const sorters = {
    score: byScore,
    stars: (a, b) => (b.stats?.stars || 0) - (a.stats?.stars || 0),
    active: (a, b) => Date.parse(b.stats?.pushedAt || 0) - Date.parse(a.stats?.pushedAt || 0),
  };
  const ranked = [...data.efforts.filter((e) => e.tier === 'tracked')].sort(byScore);
  list.sort(sorters[sort] || byScore);
  $('#race-list').innerHTML = list.map((e, i) => effortCard(e, ranked.indexOf(e) + 1, sort === 'score' ? i < 3 : false)).join('') ||
    `<li class="empty">${esc(t('race.empty', 'No efforts match this filter yet.'))}</li>`;
  observeBars();
}

function ladderCells(e) {
  const g = e.gta || {};
  const gw = e._s.groundwork;
  const st = (v) => (v >= 1 ? 'is-reached' : v > 0 ? 'is-partial' : '');
  const fpsV = Math.min(1, (+g.fps || 0) / 30);
  const stabV = (STABILITY[g.stability] || STABILITY.unknown).value;
  const fpsLabel = g.fps ? `${Math.round(g.fps)} FPS` : t('e.30fps', '30 FPS');
  const stabLabel = g.stability && g.stability !== 'unknown' ? stLabel(g.stability) : t('st.stable', 'Stable');
  const ms = (key) => msLabel(MILESTONES.find((m) => m.key === key));
  return `
    <span class="${st(gw)}" title="${esc(msDesc(MILESTONES[0]))}">${esc(t('e.gwPct', 'Groundwork {n}%', { n: Math.round(gw * 100) }))}</span>
    <span class="${st(ladderValue(g.loads))}">${esc(ms('loads'))}</span>
    <span class="${st(ladderValue(g.boots))}">${esc(ms('boots'))}</span>
    <span class="${st(ladderValue(g.menu))}">${esc(ms('menu'))}</span>
    <span class="${st(ladderValue(g.ingame))}">${esc(ms('ingame'))}</span>
    <div><span class="${st(fpsV)}">${esc(fpsLabel)}</span><span class="${st(stabV)}">${esc(stabLabel)}</span></div>`;
}

function effortCard(e, rank, open) {
  const s = e._s;
  const st = e.stats || {};
  const ticks = MILESTONES.slice(1, -1).map((m) => `<i style="left:${m.at}%"></i>`).join('');
  const stale = st.pushedAt && daysSince(st.pushedAt) > 3;
  const tags = [
    e.approach && `<span class="tag">${L(e.approach)}</span>`,
    e.target && `<span class="tag ${isGtaSpecific(e) ? 'tag-gta' : ''}">${L(e.target)}</span>`,
    e.verification === 'reproduced'
      ? `<span class="tag tag-ok">${esc(t('e.reproduced', 'Independently reproduced'))}</span>`
      : `<span class="tag tag-self" title="${esc(t('e.selfTitle', "Based on the project's own README; not yet reproduced by others"))}">${esc(t('e.selfReported', 'Self-reported'))}</span>`,
    e.provenOn && ladderValue(e.groundwork?.proven) > 0 && `<span class="tag tag-proven" title="${esc(t('e.runsTitle', 'Runs another game'))}">${esc(t('e.runs', 'Runs: {x}', { x: D(e.provenOn) }))}</span>`,
    stale && `<span class="tag tag-stale">${esc(t('e.quiet', 'Quiet for {n}d', { n: Math.floor(daysSince(st.pushedAt)) }))}</span>`,
    st.missing && `<span class="tag tag-stale">${esc(t('e.repoGone', 'Repo gone (404)'))}</span>`,
    st.dmca && `<a class="tag tag-stale" href="${esc(safeHttp(st.dmca.url))}" target="_blank" rel="noopener" title="${esc(t('e.dmcaTitle', "Named in a DMCA notice in GitHub's public log"))}">${esc(t('e.dmca', 'DMCA notice {date}', { date: st.dmca.date || '' }))}</a>`,
  ].filter(Boolean).join('');
  const gwRows = GROUNDWORK.map((g) => {
    const v = Math.max(0, Math.min(1, +(e.groundwork?.[g.key]) || 0));
    return `<div class="gw-row" title="${esc(gwDesc(g))}"><span>${esc(gwLabel(g))}</span><b>${Math.round(v * 100)}%</b><div class="gw-bar"><i data-width="${v * 100}"></i></div></div>`;
  }).join('');
  const claims = (e.claims || []).slice(0, 2).map((c) => {
    const m = MILESTONES.find((x) => x.key === c.milestone) || { key: c.milestone, label: c.milestone };
    return `<div class="claim"><b>${esc(t('e.claimPre', 'Unverified claim in README:'))}</b> “${L(c.text)}”${esc(t('e.claimMid', ', which may mean '))}<em>${esc(msLabel(m))}</em>${esc(t('e.claimEnd', '. Awaiting review.'))}</div>`;
  }).join('');
  const src = avatar(e.repo);
  return `
  <li class="effort ${rank <= 3 ? 'is-top' : ''}" id="effort-${esc(e.id)}">
    <div class="e-rank">${rank}</div>
    <div class="e-main">
      <div class="e-top">
        ${src ? `<img class="e-avatar" src="${esc(src)}" alt="" loading="lazy" data-hide-on-error>` : ''}
        <div class="e-title">
          <h3><a href="${esc(repoUrl(e.repo, e.branch))}" target="_blank" rel="noopener">${esc(e.name)}</a></h3>
          <p class="e-by">${esc(e.repo)}${e.branch && !['main', 'master'].includes(e.branch) ? esc(t('e.branch', ' · branch {b}', { b: e.branch })) : ''}</p>
        </div>
        <div class="e-score"><b>${pct(s.score)}<span>%</span></b><small>${esc(msLabel(MILESTONES.find((m) => m.key === s.reached) || MILESTONES[0]))}</small></div>
      </div>
      <div class="tags">${tags}</div>
      <p class="e-summary">${L(e.summary)}</p>
      <div class="bar" aria-label="${esc(t('e.progressAria', '{name} progress {p} percent', { name: e.name, p: pct(s.score) }))}">
        <div class="bar-track"><div class="bar-fill" data-width="${s.score}"></div><div class="bar-ticks">${ticks}</div></div>
        <div class="ladder">${ladderCells(e)}</div>
      </div>
      ${claims}
      <div class="e-details" ${open ? '' : 'hidden'}>
        <div class="gw">
          <h4>${esc(t('e.gwBreakdown', 'Groundwork breakdown'))}</h4>
          ${gwRows}
          ${e.provenOn ? `<p class="gw-proven">${esc(t('e.provenOn', 'Proven on: {x}', { x: D(e.provenOn) }))}</p>` : ''}
        </div>
        <div class="notes">
          <div class="works"><h4>${esc(t('e.whatWorks', 'What works'))}</h4><ul>${(e.highlights || []).map((h) => `<li>${L(h)}</li>`).join('')}</ul></div>
          <div class="blocks"><h4>${esc(t('e.whatBlocking', "What's blocking"))}</h4><ul>${(e.blockers || []).map((h) => `<li>${L(h)}</li>`).join('')}</ul></div>
        </div>
      </div>
      <div class="e-foot">
        <span class="stat-i" title="${esc(t('e.stars', 'Stars'))}">${ICON.star}${fmtK(st.stars)}</span>
        <span class="stat-i" title="${esc(t('e.forks', 'Forks'))}">${ICON.fork}${fmtK(st.forks)}</span>
        <span class="stat-i" title="${esc(t('e.issues', 'Open issues'))}">${ICON.issue}${fmtK(st.openIssues)}</span>
        ${st.commits7d != null ? `<span class="stat-i" title="${esc(t('e.commitsTitle', 'Commits in the last 7 days'))}">${ICON.commit}${esc(t('e.commits', '{n} commits / 7d', { n: st.commits7d >= 100 ? '100+' : st.commits7d }))}</span>` : ''}
        <span class="stat-i" title="${esc(t('e.pushedTitle', 'Last push'))}">${ICON.clock}${esc(t('e.pushed', 'pushed {ago}', { ago: ago(st.pushedAt) }))}</span>
        <span class="spacer"></span>
        <span class="w-muted" title="${esc(t('e.assessedTitle', 'When this score was last reviewed'))}">${esc(e.assessedBy === 'claude' ? t('e.assessedClaude', 'Assessed by Claude') : t('e.reviewed', 'Reviewed'))} ${esc(e.assessedAt || '')}</span>
        ${backendReady() ? `<a class="discuss" href="board.html#/b/${esc(e.id)}">${esc(t('e.discuss', 'Discuss'))}</a>` : ''}
        <button class="toggle" data-toggle aria-expanded="${open}">${esc(open ? t('e.hideDetails', 'Hide details') : t('e.details', 'Details'))}</button>
        <a class="gh-link" href="${esc(repoUrl(e.repo, e.branch))}" target="_blank" rel="noopener">${ICON.gh}GitHub</a>
      </div>
    </div>
  </li>`;
}

/* ---------- Watchlist ---------- */
function renderWatchlist(data) {
  const rows = data.efforts.filter((e) => e.tier === 'watchlist').sort((a, b) => b._s.score - a._s.score);
  if (!rows.length) { $('#watchlist').hidden = true; return; }
  $('#watch-list').innerHTML = `
    <div class="w-row w-head" role="row"><span>${esc(t('watch.project', 'Project'))}</span><span>${esc(t('watch.approach', 'Approach'))}</span><span>${esc(t('watch.progress', 'Progress'))}</span><span>${esc(t('watch.stars', 'Stars'))}</span><span>${esc(t('watch.lastPush', 'Last push'))}</span></div>` +
    rows.map((e) => `
    <div class="w-row" role="row" id="effort-${esc(e.id)}">
      <div class="w-name"><a href="${esc(repoUrl(e.repo, e.branch))}" target="_blank" rel="noopener">${esc(e.name)}</a><p>${L(e.summary)}</p></div>
      <span class="w-muted">${L(e.approach)}${e.target && /gta|ps5/i.test(e.target) ? ` · ${L(e.target)}` : ''}</span>
      <div class="w-bar"><div class="bar-track"><div class="bar-fill" data-width="${e._s.score}"></div></div><b>${pct(e._s.score)}%</b></div>
      <span class="w-muted">★ ${fmtK(e.stats?.stars)}</span>
      <span class="w-muted">${esc(ago(e.stats?.pushedAt))}</span>
    </div>`).join('');
}

/* ---------- Toolkit ---------- */
function renderTools(tools) {
  $('#tools-list').innerHTML = tools.map((tool) => `
    <a class="tool" href="${esc(repoUrl(tool.repo))}" target="_blank" rel="noopener">
      <span class="t-kind">${L(tool.kind)}</span>
      <h3>${L(tool.name)}</h3>
      <p>${L(tool.desc)}</p>
      <span class="t-meta">★ ${fmtK(tool.stats?.stars)} · ${esc(t('tool.pushed', 'pushed {ago}', { ago: ago(tool.stats?.pushedAt) }))}</span>
    </a>`).join('');
}

/* ---------- Inbox ---------- */
function renderInbox(data) {
  const c = (data.candidates || []).filter((x) => x.status !== 'rejected');
  if (!c.length) {
    $('#inbox-list').innerHTML = `<div class="empty">${esc(t('inbox.empty', 'Nothing waiting for review.'))} ${data.scout?.lastRun ? esc(t('inbox.emptyScout', 'The scout last ran {ago}.', { ago: ago(data.scout.lastRun) })) : esc(t('scout.every3h', 'The scout runs every 3 hours.'))}</div>`;
    return;
  }
  // Deliberately plain text: unreviewed repos can be copies or lures, so we don't link them.
  $('#inbox-list').innerHTML = c.slice(0, 12).map((x) => `
    <div class="cand">
      <div>
        <b>${esc(x.repo)}</b> <span class="tag tag-self">${esc(t('inbox.unreviewed', 'Unreviewed · not linked'))}</span>
        <p>${L(x.description || t('inbox.noDesc', 'No description'))}</p>
        <p>${esc(t('inbox.foundVia', 'Found via {x} · {ago} · ★ {stars}', {
          x: (x.sources || [x.source]).filter(Boolean).map(D).join(', '),
          ago: ago(x.foundAt),
          stars: fmtK(x.stars),
        }))}${x.signals?.length ? esc(` · ${x.signals.slice(0, 4).map(D).join(', ')}`) : ''}</p>
      </div>
      <div class="c-score"><b>${Math.round(x.substance || 0)}</b>${esc(t('inbox.substance', 'substance'))}</div>
    </div>`).join('');
}

/* ---------- News ---------- */
// Dates follow the interface language, not the browser locale.
const dateLocale = () => (document.documentElement.lang === 'en' ? 'en-GB' : 'zh-CN');
const safeLink = (u) => (/^#[\w-]+$/.test(u || '') ? u : safeHttp(u));
const catLabel = (c) => t('news.cat.' + String(c || '').toLowerCase(), c);
const fmtDay = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
let newsBound = false;

function storyMedia(n) {
  const img = n.image && /^https:\/\//.test(n.image.url || '')
    ? `<img src="${esc(n.image.url)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-cover="${esc(n.category)}">`
    : coverHtml(n.category);
  return `<div class="story-media">${img}<span class="story-cat">${esc(catLabel(n.category))}</span></div>`;
}

function renderNews(news) {
  // Newest day first; stories from the same day keep their order in the data (newest first).
  const items = [...news].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (!items.length) { $('#news').hidden = true; return; }
  // Real links to each article's own page (built at deploy) so search engines can follow them;
  // a plain click opens the article in the reader instead.
  const card = (n, small) => `
    <a class="story ${small ? 'is-small' : ''}" href="${esc(articlePath(n) || '#news')}" data-story="${esc(n.id)}">
      ${storyMedia(n)}
      <div class="story-body">
        <time>${esc(fmtDay(n.date))}</time>
        <h3>${L(n.title)}</h3>
        <p>${L(n.dek)}</p>
        ${!small && n.image?.credit ? `<span class="story-credit">${esc(t('news.image', 'Image: {credit}', { credit: D(n.image.credit) }))}</span>` : ''}
      </div>
    </a>`;
  const list = $('#news-list');
  list.innerHTML = card(items[0], false) + `<div class="news-list">${items.slice(1, 7).map((n) => card(n, true)).join('')}</div>`;
  const heads = (state.data.headlines || []).slice(0, 10);
  list.parentNode.querySelectorAll('.headlines').forEach((el) => el.remove());
  if (heads.length) {
    list.insertAdjacentHTML('afterend', `
      <div class="headlines card">
        <h3 class="mini-title">${esc(t('news.headlines', 'Latest headlines'))} <span class="w-muted">${esc(t('news.headlinesSub', "· gathered automatically from news feeds every 3 hours"))}</span></h3>
        <ul>${heads.map((h) => `<li><a href="${esc(safeHttp(h.link))}" target="_blank" rel="noopener noreferrer">${L(h.title)}</a><span>${esc(h.outlet)} · ${esc(ago(h.date))}</span></li>`).join('')}</ul>
      </div>`);
  }

  if (newsBound) return;
  newsBound = true;
  const dlg = $('#reader');
  list.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-story]');
    if (!btn) return;
    if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return; // new tab/window: let the link work
    const n = (state.data.news || []).find((x) => x.id === btn.dataset.story);
    if (!n) return;
    ev.preventDefault();
    const page = articlePath(n);
    const credit = n.image?.credit ? `<a href="${esc(safeHttp(n.image.link || n.image.url))}" target="_blank" rel="noopener">${esc(n.image.credit)}</a>` : '';
    $('#reader-body').innerHTML = `
      ${storyMedia(n)}
      <div class="reader-inner">
        <p class="meta">${esc(catLabel(n.category))} · ${esc(fmtDay(n.date))}</p>
        <h2 id="reader-title">${L(n.title)}</h2>
        <p class="dek">${L(n.dek)}</p>
        <div class="article">${(n.body || []).map((p) => `<p>${L(p)}</p>`).join('')}</div>
        <div class="sources">
          <h4>${esc(t('news.sources', 'Sources'))}</h4>
          <ul>${(n.sources || []).map((s) => `<li><a href="${esc(safeLink(s.url))}" ${s.url?.startsWith('#') ? '' : 'target="_blank" rel="noopener"'}>${esc(s.outlet)}: ${L(s.title)}</a></li>`).join('')}</ul>
          <p class="fine">${credit ? esc(t('news.imagePre', 'Image: ')) + credit + esc(t('news.imageEnd', '. ')) : ''}${esc(n.by === 'claude' ? t('news.byClaude', 'Written automatically by Claude from the linked sources.') : t('news.bySite', 'Written by PortWatch from the linked sources.'))}${page ? ` <a href="${esc(page)}">${esc(t('news.linkArticle', 'Link to this article'))}</a>` : ''}</p>
        </div>
      </div>`;
    dlg.showModal();
    dlg.scrollTop = 0;
  });
  $('#reader-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); });
  $('#reader-body').addEventListener('click', (ev) => { if (ev.target.closest('a[href^="#"]')) dlg.close(); });
}

/* ---------- Safety ---------- */
function renderFlags(flags) {
  $('#flag-list').innerHTML = flags.map((f) => `
    <li><b>${L(f.pattern)}<span>${esc(f.members?.length ? t('flags.seen', '{n} seen', { n: f.members.length }) : D(f.label || ''))}</span></b><p>${L(f.reason)}</p></li>`).join('');
}

/* ---------- Method ---------- */
function renderMethod() {
  $('#ladder-explain').innerHTML = MILESTONES.map((m, i) => `
    <li><span class="le-at">${i === 0 ? '0–25' : m.at}</span><div><h4>${esc(msLabel(m))}</h4><p>${esc(msDesc(m))}</p></div></li>`).join('');
  $('#gw-explain').innerHTML = GROUNDWORK.map((g) => `<li><b>${esc(gwLabel(g))}<span>${esc(t('method.pts', '{n} pts', { n: Math.round(g.weight * 25 * 10) / 10 }))}</span></b>${esc(gwDesc(g))}</li>`).join('');
}

/* ---------- Interaction ---------- */
function bindControls() {
  $$('.chip[data-filter]').forEach((b) => b.addEventListener('click', () => {
    $$('.chip[data-filter]').forEach((x) => x.classList.toggle('is-on', x === b));
    state.filter = b.dataset.filter;
    renderRace();
  }));
  $('#sort').addEventListener('change', (ev) => { state.sort = ev.target.value; renderRace(); });
  $('#race-list').addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-toggle]');
    if (!btn) return;
    const det = btn.closest('.effort').querySelector('.e-details');
    det.hidden = !det.hidden;
    btn.setAttribute('aria-expanded', String(!det.hidden));
    btn.textContent = det.hidden ? t('e.details', 'Details') : t('e.hideDetails', 'Hide details');
    observeBars();
  });

  // Avatar fallbacks without inline handlers.
  document.addEventListener('error', (ev) => {
    const img = ev.target;
    if (!(img instanceof HTMLImageElement)) return;
    if (img.dataset.cover != null) {
      img.insertAdjacentHTML('afterend', coverHtml(img.dataset.cover));
      img.remove();
    } else if (img.dataset.fallback != null) {
      const span = document.createElement('span');
      span.className = 'mk-fallback';
      span.textContent = img.dataset.fallback;
      img.replaceWith(span);
    } else if (img.hasAttribute('data-hide-on-error')) {
      img.style.visibility = 'hidden';
    }
  }, true);

  const tip = $('#tooltip');
  document.addEventListener('pointerover', (ev) => {
    const t = ev.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.innerHTML = `${t.dataset.tipTitle ? `<b>${esc(t.dataset.tipTitle)}</b>` : ''}${esc(t.dataset.tip)}`;
    tip.hidden = false;
  });
  document.addEventListener('pointermove', (ev) => {
    if (tip.hidden) return;
    const x = Math.min(ev.clientX + 14, window.innerWidth - tip.offsetWidth - 10);
    tip.style.left = `${x}px`;
    tip.style.top = `${ev.clientY + 16}px`;
  });
}

let io;
function observeBars() {
  // Watch each bar's track, not the fill: a fill clipped to 0% counts as invisible.
  io ??= new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      for (const el of en.target.querySelectorAll('[data-width]')) reveal(el);
      io.unobserve(en.target);
    }
  }, { threshold: 0.2 });
  $$('[data-width]:not([data-seen])').forEach((el) => { el.dataset.seen = '1'; io.observe(el.parentElement); });
}
function reveal(el) {
  el.style.setProperty('--p', `${Math.max(0, Math.min(100, +el.dataset.width || 0))}%`);
}

function animateNumber(node, to) {
  const start = performance.now();
  const dur = 1600;
  const step = (t) => {
    const p = Math.min(1, (t - start) / dur);
    const eased = 1 - (1 - p) ** 3;
    node.textContent = (to * eased).toFixed(to % 1 ? 1 : 0);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML('afterbegin', `<p style="padding:12px 20px;background:#fff3f3;color:#b4262b;margin:0">${esc(t('ui.loadError', "Couldn't load tracker data:"))} ${esc(err.message)}</p>`);
});

/* ---------- Language switch ----------
   Re-render every section in the new language, keeping the filter, sort and any
   expanded project cards open. */
function relabel() {
  const data = state.data;
  if (!data) return;
  const openIds = new Set([...document.querySelectorAll('.effort .e-details:not([hidden])')]
    .map((d) => d.closest('.effort')?.id).filter(Boolean));
  renderMeta(data);
  startCountdown(data.exe || {});
  renderOverall(data);
  renderChanges(data.changes || []);
  renderRace();
  renderNews(data.news || []);
  renderWatchlist(data);
  renderTools(data.tools || []);
  renderInbox(data);
  renderFlags(data.flagged || []);
  renderMethod();
  if (openIds.size) {
    document.querySelectorAll('.effort').forEach((li) => {
      if (!openIds.has(li.id)) return;
      const det = li.querySelector('.e-details');
      const btn = li.querySelector('[data-toggle]');
      if (det) det.hidden = false;
      if (btn) { btn.textContent = t('e.hideDetails', 'Hide details'); btn.setAttribute('aria-expanded', 'true'); }
    });
  }
  observeBars();
}
document.addEventListener('pw:lang', relabel);

/* Live-translate dynamic text nodes as they are rendered (see i18n-content.js). */
if (window.PWCONTENT && window.PWCONTENT.live) {
  var liveObserver = new MutationObserver(function () {
    if (document.documentElement.lang !== 'zh-CN') return;
    window.PWCONTENT.live(document);
  });
  liveObserver.observe(document.body, { childList: true, subtree: true });
  window.PWCONTENT.live(document);
}
