/* =====================================================================
   GAME: âm thanh, pháo hoa, huy hiệu, bản đồ phiêu lưu, Quick review
   (nạp sau app.js – dùng chung các hàm $, lsGet, LESSONS, VOCAB, say…)
   ===================================================================== */
const SND_KEY = 'grad-sound', BADGE_KEY = 'grad-badges', REV_KEY = 'grad-review';

/* ---------- Âm thanh (tự tạo bằng WebAudio, không cần file) ---------- */
let AC = null;
const soundOn = () => lsGet(SND_KEY) !== false;
const TUNES = {
  pop: [[660, .05], [990, .07]], tick: [[880, .05]], ok: [[660, .08], [880, .08], [1320, .14]],
  bad: [[200, .2]], win: [[523, .1], [659, .1], [784, .1], [1047, .34]], badge: [[784, .1], [988, .1], [1175, .1], [1568, .36]],
};
function sfx(kind){
  if (!soundOn() || !TUNES[kind]) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    let t = AC.currentTime + .01;
    TUNES[kind].forEach(([f, d]) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = kind === 'bad' ? 'square' : 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'bad' ? .05 : .16, t + .012);
      g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + .03); t += d * .9;
    });
  } catch (e) {}
}
function paintSnd(){
  const b = document.getElementById('sndBtn'); if (!b) return;
  b.textContent = soundOn() ? '🔊' : '🔇';
  b.title = soundOn() ? 'Tắt âm thanh' : 'Bật âm thanh';
}
(function(){
  const b = document.getElementById('sndBtn'); if (!b) return;
  b.addEventListener('click', () => { lsSet(SND_KEY, !soundOn()); paintSnd(); sfx('tick'); });
  paintSnd();
})();

/* ---------- Pháo hoa giấy ---------- */
function confetti(n){
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  n = reduce ? 30 : (n || 150);
  const box = document.createElement('div'); box.className = 'confetti';
  const C = ['#22e3ff', '#ff2e88', '#b6ff3b', '#ffc83d', '#8f6cf6', '#ffffff'];
  for (let i = 0; i < n; i++){
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw'; p.style.background = C[i % C.length];
    p.style.animationDelay = Math.random() * .7 + 's'; p.style.animationDuration = 2.2 + Math.random() * 1.8 + 's';
    p.style.setProperty('--dx', Math.round(Math.random() * 200 - 100) + 'px'); p.style.setProperty('--r', Math.round(Math.random() * 900) + 'deg');
    if (i % 3 === 0) p.style.borderRadius = '50%';
    box.appendChild(p);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 5000);
}
// gọi sau khi nộp bài (app.js)
function afterSubmit(){
  const r = S.r2 || S.r1;
  if (S.phase === 'done' && r && r.score === r.total){ confetti(); sfx('win'); }
  else sfx('ok');
  if (S.phase === 'done') setTimeout(checkBadges, 2200);
}

/* ---------- Số liệu tổng (sao, từ, chuỗi tuần, ôn từ) ---------- */
function gameData(){
  const weeks = Object.keys(LESSONS).map(Number).filter(w => w <= OPEN_WEEK).sort((a, b) => a - b);
  const states = [];
  weeks.forEach(w => lessonsOf(w).forEach((L, i) => states.push({ w, b: i + 1, L, s: lsGet(storeKey(w, i + 1)) || {} })));
  const rev = Object.assign({ plays: 0, best: 0, stars: 0, days: {} }, lsGet(REV_KEY) || {});
  let lessonStars = 0, words = 0, done = 0, run = 0, maxStreak = 0;
  const pool = [];
  states.forEach(x => {
    const n = starsOf(x.s); lessonStars += n;
    if (n){ done++; wordsOf(x.L, true).forEach(k => { if (VOCAB[k] && !pool.includes(k)) pool.push(k); }); }
  });
  words = pool.length;
  weeks.forEach(w => { const ok = states.filter(x => x.w === w).every(x => x.s.phase === 'done'); run = ok ? run + 1 : 0; maxStreak = Math.max(maxStreak, run); });
  const bt = Object.assign({ stars: 0, beaten: {}, wins: 0, flawless: 0, boss: {} }, lsGet('grad-battle') || {});
  const bat = { beaten: Object.keys(bt.beaten).length, wins: bt.wins, flawless: bt.flawless, bossWins: Object.values(bt.boss).filter(x => x && x.win).length };
  const stars = lessonStars + rev.stars + (bt.stars || 0);
  return { weeks, states, rev, lessonStars, stars, words, done, maxStreak, pool, bat };
}

/* ---------- Rank (theo tổng sao) ---------- */
const RANKS = [
  { n: 'Bronze', min: 0, e: '🥉' }, { n: 'Silver', min: 6, e: '🥈' }, { n: 'Gold', min: 15, e: '🥇' },
  { n: 'Platinum', min: 27, e: '💠' }, { n: 'Diamond', min: 42, e: '💎' }, { n: 'Master', min: 60, e: '👑' },
];
function rankHtml(stars){
  let i = 0; RANKS.forEach((r, j) => { if (stars >= r.min) i = j; });
  const r = RANKS[i], nx = RANKS[i + 1];
  const pct = nx ? Math.round((stars - r.min) / (nx.min - r.min) * 100) : 100;
  return `<div class="rank"><img class="rkimg" src="img/ui/rank-${i + 1}.webp" alt="${r.e}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'rkemo',textContent:'${r.e}'}))">
    <div class="rkinfo"><div class="rkname">${r.n} <small>RANK</small></div>
      <div class="lvbar"><i style="width:${pct}%"></i></div>
      <div class="rkx">${nx ? `⭐ ${stars}/${nx.min} to <b>${nx.n}</b>` : '⭐ ' + stars + ' · Top rank! 👑'}</div></div></div>`;
}

const rankIdx = stars => { let i = 0; RANKS.forEach((r, j) => { if (stars >= r.min) i = j; }); return i; };
// khung avatar neon theo rank (body.rk-1 … rk-6)
function applyRankFrame(){ try { const i = rankIdx(gameData().stars) + 1; document.body.className = document.body.className.replace(/\brk-\d\b/g, '').trim(); document.body.classList.add('rk-' + i); } catch (e) {} }


/* ---------- Side quest (video cô làm) ---------- */
function sideQuestCard(){
  const qs = SIDEQUESTS.filter(x => x.week <= OPEN_WEEK || PREVIEW); if (!qs.length) return '';
  return `<section class="card sqc"><h2>🎬 Side quests <small>Watch · answer · copy new words</small></h2><div class="sqgrid">${qs.map(x => {
    const s = lsGet('grad-sq-' + x.id) || {}, r = s.r2 || s.r1;
    const tag = s.phase === 'done' ? `<span class="sst">${starRow(starsOf(s))} ${r ? r.score + '/' + r.total : ''}</span>` : s.startedAt ? '<span class="sst warn">⏳ In progress</span>' : '<span class="sst new">🆕 New</span>';
    return `<a class="sqi" href="?sq=${encodeURIComponent(x.id)}${PREVIEW ? '&preview' : ''}"><span class="sqth" style="background-image:url('https://drive.google.com/thumbnail?id=${encodeURIComponent(x.video)}&sz=w480')"><i>▶</i>${x.mins ? `<em>${x.mins} min</em>` : ''}</span><b>${esc(x.title)}</b>${tag}</a>`; }).join('')}</div></section>`;
}
function sqVideo(L){
  return `<div class="sqvid"><iframe src="https://drive.google.com/file/d/${encodeURIComponent(L.video)}/preview" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe></div>
    <div class="note">🎬 Xem hết video trước, rồi làm các câu hỏi bên dưới. Nhớ chép từ mới vào vở nha!</div>`;
}

/* ---------- Huy hiệu ---------- */
const BADGES = [
  { id: 'first', img: 1, icon: '🗺️', name: 'Explorer', vi: 'Làm xong bài đầu tiên', test: d => d.done >= 1 },
  { id: 'focus', img: 2, icon: '🎯', name: 'Super Focus', vi: 'Làm xong 1 bài mà không rời trang lần nào',
    test: d => d.states.some(x => x.s.phase === 'done' && x.s.r1 && !x.s.r1.leaves && (!x.s.r2 || x.s.r2.leaves === x.s.r1.leaves)) },
  { id: 'perfect', img: 3, icon: '💯', name: 'Perfect!', vi: 'Đúng hết ngay lần nộp đầu', test: d => d.states.some(x => x.s.r1 && x.s.r1.total && x.s.r1.score === x.s.r1.total) },
  { id: 'never', img: 4, icon: '🔁', name: 'Never Give Up', vi: 'Làm lại câu sai và sửa đúng hết', test: d => d.states.some(x => x.s.r2 && x.s.r2.score === x.s.r2.total) },
  { id: 'quick', img: 5, icon: '⚡', name: 'Quick Thinker', vi: 'Đạt 10/10 trong Quick review', test: d => d.rev.best >= 10 },
  { id: 'streak', img: 6, icon: '🔥', name: '3-Week Streak', vi: 'Làm xong bài 3 tuần liên tiếp', test: d => d.maxStreak >= 3 },
  { id: 'stars', img: 7, icon: '🌟', name: 'Star Collector', vi: 'Có 15 sao', test: d => d.stars >= 15 },
  { id: 'words', img: 8, icon: '📚', name: 'Word Hunter', vi: 'Học được 60 từ mới', test: d => d.words >= 60 },
];
const badgeImg = b => `<img class="bi" src="img/ui/badge-${b.img}.webp" alt="${b.icon}">`;
const earnedBadges = d => BADGES.filter(b => b.test(d)).map(b => b.id);
function badgesHtml(d){
  const got = earnedBadges(d);
  return `<section class="card badges"><h2>🏆 Achievements <span class="bcount">${got.length}/${BADGES.length}</span></h2>
    <div class="bgrid">${BADGES.map(b => { const on = got.includes(b.id);
      return `<div class="bdg${on ? ' on' : ''}"><span class="bwrap">${badgeImg(b)}${on ? '' : '<i class="block">🔒</i>'}</span><b>${b.name}</b><small>${b.vi}</small></div>`; }).join('')}</div></section>`;
}
// huy hiệu mới → màn chúc mừng
function checkBadges(){
  const d = gameData(), got = earnedBadges(d), seen = lsGet(BADGE_KEY) || [];
  const fresh = got.filter(id => !seen.includes(id));
  if (!fresh.length) return;
  lsSet(BADGE_KEY, seen.concat(fresh));
  const ov = document.createElement('div'); ov.className = 'fxov';
  ov.innerHTML = `<div class="fxcard"><img class="fxmas" src="img/ui/mascot-2.webp" alt=""><div class="fxt">🏅 New badge${fresh.length > 1 ? 's' : ''}!</div>
    ${fresh.map(id => { const b = BADGES.find(x => x.id === id); return `<div class="fxb">${badgeImg(b)}<div><b>${b.name}</b><small>${b.vi}</small></div></div>`; }).join('')}
    <button class="btn orange" type="button">Yay! 🎉</button></div>`;
  ov.addEventListener('click', ev => { if (ev.target === ov || ev.target.closest('button')) ov.remove(); });
  document.body.appendChild(ov); confetti(110); sfx('badge');
}

/* ---------- Bản đồ phiêu lưu ---------- */
const ZONES = [['🌴', '🌊'], ['🌲', '🍄'], ['🏔️', '🦅'], ['🌵', '🐪'], ['❄️', '⛄'], ['🌋', '🦖'], ['🎡', '🏙️'], ['🪐', '🛸']];
const XS = [50, 76, 50, 24];
function mapHtml(d){
  const me = lsGet(ME_KEY) || {};
  const cur = d.states.find(x => x.s.phase !== 'done') || null;
  const here = cur || d.states[d.states.length - 1];
  const rows = d.states.map(x => ({ x }));
  if (LESSONS[OPEN_WEEK + 1]) rows.push({ lock: OPEN_WEEK + 1 });
  // Boss: đã mở → đứng sau tuần B.after; chưa mở → hiện Boss kế tiếp (khoá) trước đích
  let nextShown = false;
  BOSSES.forEach(B => {
    const st = (lsGet('grad-battle') || {}).boss || {}, row = { boss: B, open: bossOpen(B), rec: st[B.id] || null };
    if (row.open){ let at = rows.length; rows.forEach((r, i) => { if (r.x && r.x.w <= B.after) at = i + 1; }); rows.splice(at, 0, row); }
    else if (!nextShown){ nextShown = true; rows.push(row); }
  });
  rows.push({ exam: true });
  return `<section class="map" id="map"><h2 class="maph">🎮 Season map</h2><svg class="mpath" id="mpath" aria-hidden="true"></svg>
    ${rows.map((r, i) => {
      const z = ZONES[i % ZONES.length], X = XS[i % XS.length], deco = '';
      if (r.exam) return `<div class="mrow">${deco}<div class="st lock exam" style="left:${X}%"><span class="node"><img src="img/ui/node-4.webp" alt=""></span><span class="slab"><b>FINAL BOSS</b><span>FCE exam 🎓</span></span></div></div>`;
      if (r.boss){ const B = r.boss, n = BOSSES.indexOf(B) + 1, win = r.rec && r.rec.win;
        return `<div class="mrow">${deco}<a class="st boss${r.open ? '' : ' lock'}${win ? ' done' : ''}${r.open && !win ? ' cur' : ''}" style="left:${X}%" href="#" data-boss="${B.id}">
          <span class="node"><img src="img/ui/${B.img}.webp" alt="🐉" onerror="this.src='img/ui/node-4.webp'">${r.open && !win ? '<em class="go">⚔️ Fight</em>' : ''}</span>
          <span class="slab"><b>BOSS ${n} · ${esc(B.name)}</b><span>${r.open ? (win ? '✔ Defeated' : r.rec ? 'Try again!' : 'Mini mock test') : 'Opens after Week ' + B.after}</span>${r.rec ? `<span class="sst">Best ${r.rec.best}/${B.qs.length}</span>` : ''}</span></a></div>`; }
      if (r.lock) return `<div class="mrow">${deco}<div class="st lock" style="left:${X}%"><span class="node"><img src="img/ui/node-3.webp" alt=""></span><span class="slab"><b>STAGE ${r.lock}</b><span>Unlocks soon!</span></span></div></div>`;
      const { w, b, L, s } = r.x, res = s.r2 || s.r1;
      const tag = s.phase === 'done' ? `<span class="sst">${starRow(starsOf(s))}${res ? ' ' + res.score + '/' + res.total : ''}</span>`
        : s.phase === 'retry' || s.phase === 'review' ? '<span class="sst warn">✏️ Làm lại câu sai</span>'
        : s.startedAt ? '<span class="sst">⏳ In progress</span>' : '<span class="sst new">🆕 New</span>';
      const isHere = here === r.x;
      return `<div class="mrow">${deco}<a class="st${s.phase === 'done' ? ' done' : ''}${cur === r.x ? ' cur' : ''}" style="left:${X}%" href="?w=${w}&b=${b}">
        ${isHere ? `<span class="me">${avHtml(me.av || AVATARS[0], 'av')}</span>` : ''}
        <span class="node k-${esc(String(L.kind).toLowerCase())}"><img src="img/ui/node-${/vocab/i.test(L.kind) ? 2 : 1}.webp" alt="${esc(L.icon || '')}">${cur === r.x ? '<em class="go">▶ Play</em>' : ''}</span>
        <span class="slab"><b>STAGE ${w} · ${esc(String(L.kind).toUpperCase())}</b><span>${esc(L.title)}</span>${tag}</span></a></div>`;
    }).join('')}</section>`;
}
// vẽ đường đi nối các chặng (sau khi trang đã hiện)
function drawMap(){
  const m = $('#map'), svg = $('#mpath'); if (!m || !svg) return;
  const mr = m.getBoundingClientRect();
  const pts = $$('#map .node').map(n => { const r = n.getBoundingClientRect(); return [r.left - mr.left + r.width / 2, r.top - mr.top + r.height / 2]; });
  svg.setAttribute('width', mr.width); svg.setAttribute('height', mr.height); svg.setAttribute('viewBox', `0 0 ${mr.width} ${mr.height}`);
  let dd = '';
  pts.forEach((p, i) => { if (!i){ dd = `M${p[0]},${p[1]}`; return; } const q = pts[i - 1], my = (q[1] + p[1]) / 2; dd += ` C${q[0]},${my} ${p[0]},${my} ${p[0]},${p[1]}`; });
  const doneN = $$('#map .st.done').length;
  let dDone = '';
  pts.slice(0, doneN + 1).forEach((p, i) => { if (!i){ dDone = `M${p[0]},${p[1]}`; return; } const q = pts[i - 1], my = (q[1] + p[1]) / 2; dDone += ` C${q[0]},${my} ${p[0]},${my} ${p[0]},${p[1]}`; });
  svg.innerHTML = `<path d="${dd}" class="pth"/>${doneN ? `<path d="${dDone}" class="pth done"/>` : ''}`;
}
window.addEventListener('resize', () => { if (!LESSON) drawMap(); });

/* ---------- Quick review: 10 từ / 60 giây ---------- */
function reviewCard(d){
  const ok = d.pool.length >= 4;
  return `<section class="card qr${ok ? '' : ' off'}"><img class="qri" src="img/ui/qr-1.webp" alt="⚡">
    <div class="qrt"><b>Quick review</b><span>${ok ? `${Math.min(10, d.pool.length)} words · 60 seconds · win up to ⭐⭐⭐` : 'Làm xong 1 bài để mở khoá trò chơi ôn từ!'}</span>
    ${d.rev.plays ? `<small>Best: ${d.rev.best}/10 · Played ${d.rev.plays}×</small>` : ''}</div>
    <button class="btn orange" id="qrBtn" type="button"${ok ? '' : ' disabled'}>Play ▶</button></section>`;
}
const today = () => new Date().toLocaleDateString('en-CA');
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const viShort = v => (v.vi.replace(/\s*\([^)]*\)/g, '').trim() || v.vi);
function startReview(){
  const d = gameData(); if (d.pool.length < 4) return;
  const keys = shuffle(d.pool).slice(0, 10);
  const others = shuffle(Object.keys(VOCAB).filter(k => !keys.includes(k)));
  const Q = keys.map((k, i) => {
    const mode = i % 2 ? 'vi' : 'en';
    const wrong = shuffle(d.pool.filter(x => x !== k)).concat(others).filter(x => viShort(VOCAB[x]) !== viShort(VOCAB[k]) && VOCAB[x].w !== VOCAB[k].w);
    const opts = shuffle([k].concat(wrong.slice(0, 3)));
    return { k, mode, opts };
  });
  const G = { i: 0, score: 0, left: 60, lock: false, timer: null };
  const ov = document.createElement('div'); ov.className = 'fxov game';
  ov.innerHTML = `<div class="gcard"><div class="ghead"><b>⚡ Quick review</b><span class="gsc" id="gSc">0</span><button class="gx" type="button" aria-label="Close">✕</button></div>
    <div class="gtime"><i id="gT"></i></div><div id="gBody"></div></div>`;
  document.body.appendChild(ov);
  const body = ov.querySelector('#gBody');
  const close = () => { clearInterval(G.timer); ov.remove(); document.removeEventListener('keydown', onKey); renderHome(); };
  const onKey = ev => { if (ev.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  ov.querySelector('.gx').onclick = close;
  function show(){
    const q = Q[G.i], v = VOCAB[q.k];
    body.innerHTML = `<div class="gno">${G.i + 1} / ${Q.length}</div>
      ${q.mode === 'en' ? `<div class="gq"><button class="gsay" type="button" aria-label="Listen">🔊</button> ${esc(v.w)}</div><div class="gh">What does it mean?</div>`
        : `<div class="gq vi">${esc(viShort(v))}</div><div class="gh">Which English word?</div>`}
      <div class="gopts">${q.opts.map(o => `<button class="gopt" type="button" data-k="${esc(o)}">${esc(q.mode === 'en' ? viShort(VOCAB[o]) : VOCAB[o].w)}</button>`).join('')}</div>`;
    if (q.mode === 'en') say(v.w);
    const s = body.querySelector('.gsay'); if (s) s.onclick = () => say(v.w);
    G.lock = false;
  }
  body.addEventListener('click', ev => {
    const b = ev.target.closest('.gopt'); if (!b || G.lock) return;
    G.lock = true;
    const q = Q[G.i], right = b.dataset.k === q.k;
    body.querySelectorAll('.gopt').forEach(x => { if (x.dataset.k === q.k) x.classList.add('ok'); });
    if (right){ G.score++; sfx('ok'); ov.querySelector('#gSc').textContent = G.score; }
    else { b.classList.add('bad'); sfx('bad'); }
    if (q.mode === 'vi') say(VOCAB[q.k].w);
    setTimeout(() => { if (G.over) return; G.i++; G.i < Q.length ? show() : end(); }, right ? 750 : 1500);
  });
  function end(){
    if (G.over) return; G.over = true;
    clearInterval(G.timer);
    if (window.YumiAvatar && G.score >= 5) YumiAvatar.gamePlayed('quick-review'); // +5 xu (≥5 câu đúng, máy chủ giới hạn 3 lượt/ngày)
    const st = G.score >= Q.length ? 3 : G.score >= Q.length * .7 ? 2 : G.score >= Q.length * .4 ? 1 : 0;
    const r = Object.assign({ plays: 0, best: 0, stars: 0, days: {} }, lsGet(REV_KEY) || {});
    const t = today(), n = r.days[t] || 0, gain = n < 3 ? st : 0; // mỗi ngày tính sao 3 lượt đầu
    r.plays++; r.best = Math.max(r.best, Q.length >= 10 ? G.score : 0); r.stars += gain; r.days = { [t]: n + 1 };
    lsSet(REV_KEY, r);
    body.innerHTML = `<div class="gend"><img class="gmas" src="img/ui/mascot-${st >= 2 ? 2 : 3}.webp" alt=""><div class="gbig">${G.score} / ${Q.length}</div>
      <div class="gst">${[1, 2, 3].map(i => `<span class="${i <= st ? '' : 'off'}">⭐</span>`).join('')}</div>
      <p>${G.score === Q.length ? 'Amazing! You know them all! 🏆' : G.score >= Q.length * .7 ? 'Great job! Keep it up! 💪' : 'Good try! Play again to remember more. 🌱'}</p>
      <p class="muted small">${gain ? `+${gain} ⭐ added to your stars` : st ? 'Hôm nay em đã nhận đủ sao ôn từ (3 lượt). Vẫn chơi tiếp để nhớ từ nhé!' : ''}</p>
      <div class="gbtns"><button class="btn" type="button" id="gAgain">Play again 🔁</button><button class="btn lite" type="button" id="gClose">Close</button></div></div>`;
    if (st === 3){ confetti(); sfx('win'); } else sfx('ok');
    body.querySelector('#gAgain').onclick = () => { clearInterval(G.timer); ov.remove(); document.removeEventListener('keydown', onKey); startReview(); };
    body.querySelector('#gClose').onclick = close;
  }
  const bar = ov.querySelector('#gT');
  G.timer = setInterval(() => {
    G.left -= .25; bar.style.width = Math.max(0, G.left / 60 * 100) + '%';
    bar.classList.toggle('low', G.left <= 10);
    if (G.left <= 0){ G.lock = true; end(); }
  }, 250);
  show();
}

/* ---------- Gắn vào trang chủ ---------- */
function afterHome(){
  drawMap(); setTimeout(drawMap, 300); // vẽ lại khi font/ảnh avatar tải xong
  const b = $('#qrBtn'); if (b) b.onclick = () => { sfx('tick'); startReview(); };
  const cur = $('#map .st.cur');
  if (cur && $$('#map .st').indexOf(cur) >= 3) cur.scrollIntoView({ block: 'center' });
  setTimeout(checkBadges, 600);
  applyRankFrame();
  if (typeof afterHomeBattle === 'function') afterHomeBattle();
}
applyRankFrame();
