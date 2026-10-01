'use strict';

(() => {
  const $app = document.getElementById('app');

  const LEVELS = [
    { id: 'facile', label: 'Facile', dots: 1, color: '#2e9e6a' },
    { id: 'moyen', label: 'Moyen', dots: 2, color: '#3d6bce' },
    { id: 'difficile', label: 'Difficile', dots: 3, color: '#e08a1e' },
    { id: 'extreme', label: 'Extrême', dots: 4, color: '#d64560' },
  ];
  const levelInfo = (id) => LEVELS.find((l) => l.id === id) || LEVELS[1];

  const STATUS_LABEL = { en_cours: 'En cours', terminee: 'Terminée', abandonnee: 'Abandonnée' };

  const ICONS = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 3.5v4.2h4.2"/></svg>',
    eraser:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 4.6l4.2 4.2a1.5 1.5 0 0 1 0 2.1L11.3 19H7.1l-3-3a1.5 1.5 0 0 1 0-2.1l9-9.3a1.5 1.5 0 0 1 2.1 0z"/><path d="M9 9.9l5.1 5.1"/><path d="M14 20.5h6.5"/></svg>',
    pencil:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 3.5l4 4L8 20l-5 1 1-5z"/><path d="M14 6l4 4"/><path d="M13 21h8"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 21.5h4"/><path d="M12 2.5a6.5 6.5 0 0 0-3.9 11.7c.6.5.9 1.2.9 2V17h6v-.8c0-.8.3-1.5.9-2A6.5 6.5 0 0 0 12 2.5z"/></svg>',
    pause:
      '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="3.2" height="14" rx="1.2"/><rect x="14.3" y="5" width="3.2" height="14" rx="1.2"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.2-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
    history:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/><path d="M12 7v5l3 2"/></svg>',
    admin:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17 11h5M19.5 8.5v5"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8L20 3"/><path d="M17 6l3 3"/></svg>',
    logout:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/></svg>',
    install:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 20h16"/></svg>',
    chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  };

  let me = null;

  // ------------------------------------------------------------------ outils

  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  function fmtDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function statusText(g) {
    if (g.status === 'terminee') return `Terminée en ${fmtTime(g.elapsedSeconds)}`;
    if (g.status === 'abandonnee') return `Abandonnée (${fmtTime(g.elapsedSeconds)})`;
    return `En cours · ${fmtTime(g.elapsedSeconds)}`;
  }

  let toastTimer;
  function toast(msg, ms = 2600) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  function vibrate(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch {
      /* ignoré */
    }
  }

  async function api(method, url, body, { keepalive = false } = {}) {
    let res;
    try {
      res = await fetch(url, {
        method,
        credentials: 'same-origin',
        keepalive,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      const err = new Error('Connexion impossible. Vérifiez votre réseau.');
      err.offline = true;
      throw err;
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && url !== '/api/login') {
      me = null;
      leaveGame(false);
      go('#/login');
    }
    if (!res.ok) {
      const err = new Error(data.error || `Erreur ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function openDialog({ title, body = '', ok = 'OK', cancel = 'Annuler', danger = false }) {
    const dlg = document.getElementById('dialog');
    const form = document.getElementById('dialog-form');
    document.getElementById('dialog-title').textContent = title;
    document.getElementById('dialog-body').innerHTML = body;
    const $ok = document.getElementById('dialog-ok');
    const $cancel = document.getElementById('dialog-cancel');
    $ok.textContent = ok;
    $ok.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    $cancel.hidden = cancel === null;
    $cancel.textContent = cancel || '';
    return new Promise((resolve) => {
      dlg.returnValue = '';
      dlg.onclose = () => resolve(dlg.returnValue === 'ok' ? Object.fromEntries(new FormData(form)) : null);
      dlg.showModal();
      const first = form.querySelector('#dialog-body input');
      if (first) first.focus();
    });
  }

  // ------------------------------------------------------------ navigation

  const go = (hash) => {
    if (location.hash === hash) route();
    else location.hash = hash;
  };

  window.addEventListener('hashchange', route);

  async function route() {
    const hash = location.hash || '#/';
    const gameMatch = hash.match(/^#\/partie\/(\d+)$/);
    if (!gameMatch || (G.game && G.game.id !== Number(gameMatch[1]))) leaveGame();
    if (!me) return renderLogin();
    if (gameMatch) return renderGame(Number(gameMatch[1]));
    if (hash === '#/historique') return renderHistory();
    if (hash === '#/admin' && me.isAdmin) return renderAdmin();
    if (hash !== '#/') return go('#/');
    return renderHome();
  }

  // ------------------------------------------------------------------ login

  function renderLogin() {
    if (location.hash !== '#/login') history.replaceState(null, '', '#/login');
    $app.innerHTML = `
      <form class="login" id="login-form" autocomplete="on">
        <div class="logo">
          <span>1</span><span>2</span><span></span>
          <span></span><span class="sel">5</span><span>9</span>
          <span>7</span><span></span><span>3</span>
        </div>
        <h1>Sudoku</h1>
        <p class="sub">Connectez-vous pour jouer</p>
        <label class="field">E-mail
          <input type="email" name="email" required autocomplete="username" inputmode="email" />
        </label>
        <label class="field">Mot de passe
          <input type="password" name="password" required autocomplete="current-password" />
        </label>
        <p class="error-msg" id="login-error"></p>
        <button class="btn btn-primary btn-block" type="submit">Se connecter</button>
      </form>`;
    const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button');
      btn.disabled = true;
      try {
        const data = await api('POST', '/api/login', Object.fromEntries(new FormData(form)));
        me = data.user;
        go('#/');
      } catch (err) {
        document.getElementById('login-error').textContent = err.message;
        btn.disabled = false;
      }
    });
  }

  // ------------------------------------------------------------------ accueil

  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    const btn = document.getElementById('m-install');
    if (btn) btn.hidden = false;
  });

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

  async function renderHome() {
    $app.innerHTML = '<div class="splash"><div class="spinner"></div></div>';
    let games = [];
    try {
      games = await api('GET', '/api/games');
    } catch (err) {
      toast(err.message);
    }
    if (location.hash !== '#/' && location.hash !== '') return;
    const current = games.find((g) => g.status === 'en_cours');
    const showInstall = !isStandalone() && (installPrompt || isIos());

    $app.innerHTML = `
      <div class="topbar"><span class="spacer"></span><h1>Sudoku</h1><span class="spacer"></span></div>
      <div class="hello">
        <div class="muted">Bonjour</div>
        <h2>${esc(me.name)} 👋</h2>
      </div>

      ${
        current
          ? `<div class="section-title">Partie en cours</div>
             <div class="card resume-card">
               <div class="grow">
                 <div class="title">${esc(current.levelLabel)}</div>
                 <div class="meta">Commencée le ${fmtDate(current.startedAt)} · ${fmtTime(current.elapsedSeconds)}</div>
               </div>
               <button class="btn btn-small" id="resume">Continuer</button>
             </div>`
          : ''
      }

      <div class="section-title">Nouvelle partie</div>
      <div class="levels">
        ${LEVELS.map(
          (l) => `
          <button class="level-btn" data-level="${l.id}" style="--lvl:${l.color}">
            <span class="name">${l.label}</span>
            <span class="dots">${[1, 2, 3, 4].map((n) => `<i class="${n <= l.dots ? 'on' : ''}"></i>`).join('')}</span>
          </button>`,
        ).join('')}
      </div>

      <div class="section-title">Menu</div>
      <div class="card menu-list" style="padding:0">
        <button id="m-history">${ICONS.history}Mes parties<span class="chev">${ICONS.chev}</span></button>
        ${me.isAdmin ? `<button id="m-admin">${ICONS.admin}Administration<span class="chev">${ICONS.chev}</span></button>` : ''}
        <button id="m-install" ${showInstall ? '' : 'hidden'}>${ICONS.install}Installer l’application<span class="chev">${ICONS.chev}</span></button>
        <button id="m-password">${ICONS.key}Changer mon mot de passe<span class="chev">${ICONS.chev}</span></button>
        <button id="m-logout">${ICONS.logout}Se déconnecter</button>
      </div>`;

    if (current) document.getElementById('resume').onclick = () => go(`#/partie/${current.id}`);
    $app.querySelectorAll('.level-btn').forEach((btn) => {
      btn.onclick = () => newGame(btn.dataset.level, btn);
    });
    document.getElementById('m-history').onclick = () => go('#/historique');
    if (me.isAdmin) document.getElementById('m-admin').onclick = () => go('#/admin');
    document.getElementById('m-install').onclick = installApp;
    document.getElementById('m-password').onclick = changePassword;
    document.getElementById('m-logout').onclick = async () => {
      await api('POST', '/api/logout').catch(() => {});
      me = null;
      go('#/login');
    };
  }

  async function installApp() {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice.catch(() => {});
      installPrompt = null;
      document.getElementById('m-install').hidden = true;
    } else {
      openDialog({
        title: 'Installer sur l’iPhone',
        body: '<p>Dans Safari, touchez le bouton <b>Partager</b> puis <b>« Sur l’écran d’accueil »</b>.</p>',
        cancel: null,
      });
    }
  }

  async function changePassword() {
    const data = await openDialog({
      title: 'Changer mon mot de passe',
      body: `
        <label class="field">Mot de passe actuel
          <input type="password" name="currentPassword" required autocomplete="current-password" /></label>
        <label class="field">Nouveau mot de passe
          <input type="password" name="newPassword" required minlength="6" autocomplete="new-password" /></label>`,
      ok: 'Enregistrer',
    });
    if (!data) return;
    try {
      await api('POST', '/api/me/password', data);
      toast('Mot de passe modifié ✔');
    } catch (err) {
      toast(err.message);
    }
  }

  async function newGame(level, btn) {
    document.querySelectorAll('.level-btn').forEach((b) => (b.disabled = true));
    if (btn) btn.querySelector('.name').textContent = 'Génération…';
    try {
      const game = await api('POST', '/api/games', { level });
      G.preloaded = game;
      go(`#/partie/${game.id}`);
    } catch (err) {
      toast(err.message);
      document.querySelectorAll('.level-btn').forEach((b) => (b.disabled = false));
      if (btn) btn.querySelector('.name').textContent = levelInfo(level).label;
    }
  }

  // --------------------------------------------------------------------- jeu

  const ROW = (i) => Math.floor(i / 9);
  const COL = (i) => i % 9;
  const BOX = (i) => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);
  const isPeer = (a, b) => ROW(a) === ROW(b) || COL(a) === COL(b) || BOX(a) === BOX(b);

  const G = {
    game: null,
    preloaded: null,
    sel: -1,
    notesMode: false,
    undo: [],
    paused: false,
    won: false,
    ticker: null,
    saveTimer: null,
    dirty: false,
    queue: Promise.resolve(),
    cells: [],
    cellKeys: [],
    busy: false,
  };

  function enqueue(fn) {
    G.queue = G.queue.then(fn, fn);
    return G.queue;
  }

  async function renderGame(id) {
    if (G.game && G.game.id === id) return;
    let game = G.preloaded && G.preloaded.id === id ? G.preloaded : null;
    G.preloaded = null;
    if (!game) {
      $app.innerHTML = '<div class="splash"><div class="spinner"></div></div>';
      try {
        game = await api('GET', `/api/games/${id}`);
      } catch (err) {
        toast(err.message);
        return go('#/');
      }
    }
    if (game.status !== 'en_cours') {
      toast(`Cette partie est ${STATUS_LABEL[game.status].toLowerCase()}.`);
      return go('#/historique');
    }

    Object.assign(G, { game, sel: -1, notesMode: false, undo: [], paused: false, won: false, dirty: false });
    const lvl = levelInfo(game.level);

    $app.innerHTML = `
      <div class="game">
        <div class="topbar">
          <button class="icon-btn" id="g-back" aria-label="Retour">${ICONS.back}</button>
          <h1>Sudoku</h1>
          <button class="icon-btn" id="g-abandon" aria-label="Abandonner" title="Abandonner">${ICONS.flag}</button>
        </div>
        <div class="stats">
          <div class="stat"><span class="label">Difficulté</span><span class="value" style="color:${lvl.color}">${lvl.label}</span></div>
          <div class="stat"><span class="label">Erreurs</span><span class="value" id="g-errors">0</span></div>
          <div class="stat"><span class="label">Bonus</span><span class="value" id="g-hints-stat">0/10</span></div>
          <div class="stat"><span class="label">Temps</span><span class="value" id="g-time">00:00</span></div>
          <button class="pause-btn" id="g-pause" aria-label="Pause">${ICONS.pause}</button>
        </div>
        <div class="board-wrap" id="g-wrap">
          <div class="board" id="g-board"></div>
          <div class="pause-overlay" id="g-paused" hidden>
            <button class="btn btn-primary" id="g-resume">${ICONS.play.replace('<svg', '<svg width="20" height="20"')} Reprendre</button>
          </div>
        </div>
        <div class="tools">
          <button class="tool" id="t-undo"><span class="ico">${ICONS.undo}</span>Annuler</button>
          <button class="tool" id="t-erase"><span class="ico">${ICONS.eraser}</span>Effacer</button>
          <button class="tool" id="t-notes"><span class="ico">${ICONS.pencil}<span class="badge off" id="t-notes-badge">OFF</span></span>Notes</button>
          <button class="tool" id="t-hint"><span class="ico">${ICONS.bulb}<span class="badge count" id="t-hint-badge">10</span></span>Bonus</button>
        </div>
        <div class="game-saved" id="g-saved"></div>
        <div class="pad" id="g-pad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button data-d="${d}">${d}</button>`).join('')}
        </div>
      </div>`;

    const board = document.getElementById('g-board');
    G.cells = [];
    G.cellKeys = [];
    for (let i = 0; i < 81; i++) {
      const c = document.createElement('div');
      const r = ROW(i);
      const col = COL(i);
      c.className = 'cell';
      c.dataset.base = [
        'cell',
        col === 8 ? 'c8' : col % 3 === 2 ? 'br' : '',
        r === 8 ? 'r8' : r % 3 === 2 ? 'bb' : '',
      ]
        .filter(Boolean)
        .join(' ');
      c.style.setProperty('--d', `${((r + col) * 0.07).toFixed(2)}s`);
      c.addEventListener('pointerdown', () => select(i));
      board.appendChild(c);
      G.cells.push(c);
      G.cellKeys.push('');
    }

    document.getElementById('g-back').onclick = () => go('#/');
    document.getElementById('g-abandon').onclick = abandon;
    document.getElementById('g-pause').onclick = () => setPaused(!G.paused);
    document.getElementById('g-resume').onclick = () => setPaused(false);
    document.getElementById('t-undo').onclick = undo;
    document.getElementById('t-erase').onclick = erase;
    document.getElementById('t-notes').onclick = toggleNotes;
    document.getElementById('t-hint').onclick = useHint;
    document.querySelectorAll('#g-pad button').forEach((b) => {
      b.onclick = () => input(Number(b.dataset.d));
    });
    document.addEventListener('keydown', onKey);

    clearInterval(G.ticker);
    G.ticker = setInterval(tick, 1000);
    render();
  }

  function leaveGame(save = true) {
    if (!G.game) return;
    clearInterval(G.ticker);
    clearTimeout(G.saveTimer);
    document.removeEventListener('keydown', onKey);
    if (save && G.game.status === 'en_cours') saveNow();
    hideWin();
    G.game = null;
  }

  function tick() {
    if (!G.game || G.paused || G.won || document.hidden) return;
    G.game.elapsedSeconds++;
    document.getElementById('g-time').textContent = fmtTime(G.game.elapsedSeconds);
    if (G.game.elapsedSeconds % 20 === 0 || G.dirty) saveNow();
  }

  function render() {
    const { board, puzzle, solution, notes } = G.game;
    const sel = G.sel;
    const selVal = sel >= 0 ? board[sel] : 0;
    const selWrong = sel >= 0 && selVal && selVal !== solution[sel];

    for (let i = 0; i < 81; i++) {
      const v = board[i];
      const cls = [G.cells[i].dataset.base];
      if (v && !puzzle[i]) cls.push('user');
      if (v && v !== solution[i]) cls.push('wrong');
      if (sel >= 0) {
        if (i === sel) cls.push('sel');
        else if (selWrong && v === selVal && isPeer(i, sel)) cls.push('conflict');
        else if (selVal && v === selVal) cls.push('same');
        else if (isPeer(i, sel)) cls.push('hl');
      }
      const el = G.cells[i];
      const keep = [...el.classList].filter((c) => c === 'pop' || c === 'hinted');
      el.className = cls.concat(keep).join(' ');

      const key = v ? `v${v}` : notes[i] ? `n${notes[i]}:${selVal}` : '';
      if (key !== G.cellKeys[i]) {
        G.cellKeys[i] = key;
        if (v) el.innerHTML = `<span class="v">${v}</span>`;
        else if (notes[i]) {
          let html = '<div class="notes">';
          for (let d = 1; d <= 9; d++) {
            const on = notes[i] & (1 << d);
            html += `<span class="${on && d === selVal ? 'match' : ''}">${on ? d : ''}</span>`;
          }
          el.innerHTML = html + '</div>';
        } else el.innerHTML = '';
      }
    }

    // Chiffres déjà tous placés : on les retire du pavé.
    const counts = new Array(10).fill(0);
    for (let i = 0; i < 81; i++) if (board[i] && board[i] === solution[i]) counts[board[i]]++;
    document.querySelectorAll('#g-pad button').forEach((b) => {
      b.classList.toggle('done', counts[Number(b.dataset.d)] >= 9);
    });

    document.getElementById('g-errors').textContent = G.game.errors;
    document.getElementById('g-time').textContent = fmtTime(G.game.elapsedSeconds);
    document.getElementById('g-hints-stat').textContent = `${10 - G.game.hintsLeft}/10`;
    const hb = document.getElementById('t-hint-badge');
    hb.textContent = G.game.hintsLeft;
    hb.classList.toggle('zero', G.game.hintsLeft <= 0);
    const nb = document.getElementById('t-notes-badge');
    nb.textContent = G.notesMode ? 'ON' : 'OFF';
    nb.className = `badge ${G.notesMode ? 'on' : 'off'}`;
    document.getElementById('g-pad').classList.toggle('notes-mode', G.notesMode);
    document.getElementById('t-undo').disabled = !G.undo.length;
  }

  function flash(i, cls) {
    const el = G.cells[i];
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 1300);
  }

  const canPlay = () => G.game && !G.paused && !G.won && !G.busy;
  const isLocked = (i) => G.game.puzzle[i] !== 0 || G.game.board[i] === G.game.solution[i];

  function select(i) {
    if (!G.game || G.paused || G.won) return;
    G.sel = i;
    render();
  }

  function pushUndo(i) {
    G.undo.push({ i, value: G.game.board[i], notes: G.game.notes.slice() });
    if (G.undo.length > 300) G.undo.shift();
  }

  function input(d) {
    if (!canPlay() || G.sel < 0) return;
    const i = G.sel;
    const g = G.game;
    if (isLocked(i)) return;

    if (G.notesMode) {
      if (g.board[i]) return;
      pushUndo(i);
      g.notes[i] ^= 1 << d;
    } else {
      if (g.board[i] === d) return;
      pushUndo(i);
      g.board[i] = d;
      g.notes[i] = 0;
      if (d !== g.solution[i]) {
        g.errors++;
        vibrate(120);
      } else {
        for (let j = 0; j < 81; j++) if (isPeer(i, j)) g.notes[j] &= ~(1 << d);
      }
      flash(i, 'pop');
    }
    render();
    scheduleSave();
    checkWin();
  }

  function erase() {
    if (!canPlay() || G.sel < 0) return;
    const i = G.sel;
    if (isLocked(i) || (!G.game.board[i] && !G.game.notes[i])) return;
    pushUndo(i);
    G.game.board[i] = 0;
    G.game.notes[i] = 0;
    render();
    scheduleSave();
  }

  function undo() {
    if (!canPlay()) return;
    const last = G.undo.pop();
    if (!last) return;
    G.game.board[last.i] = last.value;
    G.game.notes = last.notes;
    G.sel = last.i;
    render();
    scheduleSave();
  }

  function toggleNotes() {
    if (!G.game) return;
    G.notesMode = !G.notesMode;
    render();
  }

  async function useHint() {
    if (!canPlay()) return;
    if (G.game.hintsLeft <= 0) return toast('Vous avez utilisé vos 10 bonus.');
    G.busy = true;
    clearTimeout(G.saveTimer);
    const id = G.game.id;
    try {
      const res = await enqueue(() => api('POST', `/api/games/${id}/hint`, statePayload()));
      if (!G.game || G.game.id !== id) return;
      const g = G.game;
      g.board[res.index] = res.value;
      g.notes[res.index] = 0;
      for (let j = 0; j < 81; j++) if (isPeer(res.index, j)) g.notes[j] &= ~(1 << res.value);
      g.hintsLeft = res.game.hintsLeft;
      g.status = res.game.status;
      G.undo = G.undo.filter((u) => u.i !== res.index);
      G.sel = res.index;
      G.dirty = true;
      flash(res.index, 'hinted');
      vibrate(30);
      render();
      checkWin();
    } catch (err) {
      toast(err.message);
    } finally {
      G.busy = false;
    }
  }

  function setPaused(p) {
    if (!G.game || G.won) return;
    G.paused = p;
    document.getElementById('g-wrap').classList.toggle('paused', p);
    document.getElementById('g-paused').hidden = !p;
    document.getElementById('g-pause').innerHTML = p ? ICONS.play : ICONS.pause;
    if (p) saveNow();
  }

  function onKey(e) {
    if (!G.game || document.getElementById('dialog').open) return;
    if (e.key >= '1' && e.key <= '9') return input(Number(e.key));
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') return erase();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') return undo();
    if (e.key.toLowerCase() === 'n') return toggleNotes();
    if (e.key === ' ') {
      e.preventDefault();
      return setPaused(!G.paused);
    }
    const moves = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
    if (moves[e.key] !== undefined) {
      e.preventDefault();
      const next = G.sel < 0 ? 40 : G.sel + moves[e.key];
      if (next >= 0 && next < 81 && (Math.abs(moves[e.key]) === 9 || ROW(next) === ROW(G.sel))) select(next);
    }
  }

  // ---------------------------------------------------------- sauvegarde

  function statePayload() {
    const g = G.game;
    return { board: g.board, notes: g.notes, elapsedSeconds: g.elapsedSeconds, errors: g.errors };
  }

  function setSaved(text) {
    const el = document.getElementById('g-saved');
    if (el) el.textContent = text;
  }

  function scheduleSave() {
    G.dirty = true;
    clearTimeout(G.saveTimer);
    G.saveTimer = setTimeout(saveNow, 700);
  }

  function saveNow({ keepalive = false } = {}) {
    const g = G.game;
    if (!g || (g.status !== 'en_cours' && !G.won) || G.busy) return Promise.resolve();
    clearTimeout(G.saveTimer);
    G.dirty = false;
    const payload = statePayload();
    if (keepalive) return api('PUT', `/api/games/${g.id}`, payload, { keepalive: true }).catch(() => {});
    return enqueue(() =>
      api('PUT', `/api/games/${g.id}`, payload)
        .then((res) => {
          if (G.game === g) {
            g.status = res.status;
            setSaved('Partie sauvegardée');
          }
        })
        .catch((err) => {
          if (err.status === 409) return;
          if (G.game === g) {
            G.dirty = true;
            setSaved(err.offline ? 'Hors ligne — sauvegarde en attente…' : err.message);
          }
        }),
    );
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.game && G.game.status === 'en_cours') saveNow({ keepalive: true });
  });
  window.addEventListener('pagehide', () => {
    if (G.game && G.game.status === 'en_cours') saveNow({ keepalive: true });
  });
  window.addEventListener('online', () => {
    if (G.game && G.dirty) saveNow();
  });

  async function abandon() {
    if (!G.game) return;
    const ok = await openDialog({
      title: 'Abandonner la partie ?',
      body: '<p>La partie sera enregistrée comme abandonnée et ne pourra plus être reprise.</p>',
      ok: 'Abandonner',
      danger: true,
    });
    if (!ok || !G.game) return;
    const g = G.game;
    try {
      await enqueue(() => api('POST', `/api/games/${g.id}/abandon`, { elapsedSeconds: g.elapsedSeconds }));
      g.status = 'abandonnee';
      toast('Partie abandonnée');
      go('#/');
    } catch (err) {
      toast(err.message);
    }
  }

  // ------------------------------------------------------------ victoire

  function checkWin() {
    const g = G.game;
    if (G.won || !g.board.every((v, i) => v === g.solution[i])) return;
    G.won = true;
    G.sel = -1;
    render();
    saveNow();
    celebrate();
  }

  function celebrate() {
    const g = G.game;
    const lvl = levelInfo(g.level);
    vibrate([60, 40, 60, 40, 200]);
    document.getElementById('g-board').classList.add('celebrate');

    const msg = `🎉 BRAVO ${me.name.toUpperCase()} ! 🎉 Grille ${lvl.label} résolue en ${fmtTime(g.elapsedSeconds)} ✨ Félicitations ! 🎆`;
    document.getElementById('win-marquee-text').textContent = `${msg}    ${msg}`;
    document.getElementById('win-stats').innerHTML = `
      <div><b>${fmtTime(g.elapsedSeconds)}</b>Temps</div>
      <div><b>${g.errors}</b>Erreurs</div>
      <div><b>${10 - g.hintsLeft}</b>Bonus</div>`;
    const newBtn = document.getElementById('win-new');
    newBtn.textContent = `Rejouer (${lvl.label})`;
    newBtn.onclick = () => {
      hideWin();
      leaveGame(false);
      newGame(g.level);
    };
    document.getElementById('win-home').onclick = () => {
      hideWin();
      go('#/');
    };

    setTimeout(() => {
      if (!G.won || G.game !== g) return;
      const win = document.getElementById('win');
      win.hidden = false;
      window.Fireworks.start(document.getElementById('fireworks'));
    }, 900);
  }

  function hideWin() {
    const win = document.getElementById('win');
    if (win.hidden) return;
    win.hidden = true;
    window.Fireworks.stop();
  }

  // ---------------------------------------------------------- historique

  async function renderHistory() {
    $app.innerHTML = '<div class="splash"><div class="spinner"></div></div>';
    let games = [];
    try {
      games = await api('GET', '/api/games');
    } catch (err) {
      toast(err.message);
    }
    if (location.hash !== '#/historique') return;

    const won = games.filter((g) => g.status === 'terminee');
    const records = LEVELS.map((l) => {
      const times = won.filter((g) => g.level === l.id).map((g) => g.elapsedSeconds);
      return { ...l, best: times.length ? Math.min(...times) : null };
    });

    $app.innerHTML = `
      <div class="topbar">
        <button class="icon-btn" id="h-back" aria-label="Retour">${ICONS.back}</button>
        <h1>Mes parties</h1><span class="spacer"></span>
      </div>
      <div class="summary">
        <div class="card"><div class="big">${games.length}</div><div class="small">Parties</div></div>
        <div class="card"><div class="big" style="color:var(--success)">${won.length}</div><div class="small">Gagnées</div></div>
        <div class="card"><div class="big" style="color:#6b778a">${games.filter((g) => g.status === 'abandonnee').length}</div><div class="small">Abandonnées</div></div>
      </div>
      <div class="section-title">Meilleurs temps</div>
      <div class="card records">
        ${records.map((r) => `<div><span class="lvl-tag" style="--lvl:${r.color}">${r.label}</span><b>${r.best === null ? '—' : fmtTime(r.best)}</b></div>`).join('')}
      </div>
      <div class="section-title">Historique</div>
      <div class="game-list">
        ${
          games.length
            ? games.map((g) => gameItem(g)).join('')
            : '<div class="empty">Aucune partie pour le moment.</div>'
        }
      </div>`;

    document.getElementById('h-back').onclick = () => go('#/');
    $app.querySelectorAll('[data-resume]').forEach((b) => {
      b.onclick = () => go(`#/partie/${b.dataset.resume}`);
    });
  }

  function gameItem(g, withPlayer = false) {
    const lvl = levelInfo(g.level);
    return `
      <div class="card game-item">
        <div class="grow">
          <div class="line1">
            ${withPlayer ? `<span>${esc(g.playerName)}</span>` : ''}
            <span class="lvl-tag" style="--lvl:${lvl.color}">${lvl.label}</span>
            <span class="status ${g.status}">${statusText(g)}</span>
          </div>
          <div class="line2">Début : ${fmtDate(g.startedAt)} · ${g.errors} erreur${g.errors > 1 ? 's' : ''} · ${g.hintsUsed} bonus</div>
        </div>
        ${g.status === 'en_cours' && !withPlayer ? `<button class="btn btn-primary btn-small" data-resume="${g.id}">Reprendre</button>` : ''}
      </div>`;
  }

  // --------------------------------------------------------------- admin

  let adminTab = 'joueurs';
  const adminFilters = { status: '', userId: '' };

  async function renderAdmin() {
    $app.innerHTML = `
      <div class="topbar">
        <button class="icon-btn" id="a-back" aria-label="Retour">${ICONS.back}</button>
        <h1>Administration</h1><span class="spacer"></span>
      </div>
      <div class="tabs">
        <button data-tab="joueurs" class="${adminTab === 'joueurs' ? 'active' : ''}">Joueurs</button>
        <button data-tab="parties" class="${adminTab === 'parties' ? 'active' : ''}">Parties</button>
      </div>
      <div id="a-content"><div class="splash"><div class="spinner"></div></div></div>`;
    document.getElementById('a-back').onclick = () => go('#/');
    $app.querySelectorAll('[data-tab]').forEach((b) => {
      b.onclick = () => {
        adminTab = b.dataset.tab;
        renderAdmin();
      };
    });
    try {
      if (adminTab === 'joueurs') await renderAdminUsers();
      else await renderAdminGames();
    } catch (err) {
      toast(err.message);
    }
  }

  async function renderAdminUsers() {
    const users = await api('GET', '/api/admin/users');
    const box = document.getElementById('a-content');
    if (!box) return;
    box.innerHTML = `
      <form class="card" id="u-create">
        <h3 style="margin:0 0 12px">Créer un joueur</h3>
        <label class="field">Nom du joueur<input name="name" required maxlength="60" autocomplete="off" /></label>
        <label class="field">E-mail<input type="email" name="email" required autocomplete="off" inputmode="email" /></label>
        <label class="field">Mot de passe<input type="text" name="password" required minlength="6" autocomplete="off" /></label>
        <label class="check"><input type="checkbox" name="isAdmin" /> Administrateur</label>
        <button class="btn btn-primary btn-block" type="submit">Créer le compte</button>
      </form>
      <div class="section-title">${users.length} joueur${users.length > 1 ? 's' : ''}</div>
      <div class="game-list">
        ${users
          .map(
            (u) => `
          <div class="card user-item">
            <div class="line1" style="font-weight:600;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              ${esc(u.name)}
              ${u.isAdmin ? '<span class="pill">Admin</span>' : ''}
              ${u.active ? '' : '<span class="pill off">Désactivé</span>'}
            </div>
            <div class="line2 muted" style="font-size:13px;margin-top:3px">${esc(u.email)} · ${u.gamesPlayed} partie${u.gamesPlayed > 1 ? 's' : ''} · ${u.gamesWon} gagnée${u.gamesWon > 1 ? 's' : ''}</div>
            <div class="actions">
              <button class="btn btn-ghost btn-small" data-act="edit" data-id="${u.id}">Modifier</button>
              <button class="btn btn-ghost btn-small" data-act="password" data-id="${u.id}">Mot de passe</button>
              <button class="btn btn-ghost btn-small" data-act="games" data-id="${u.id}">Parties</button>
              ${
                u.id !== me.id
                  ? `<button class="btn btn-ghost btn-small" data-act="toggle" data-id="${u.id}">${u.active ? 'Désactiver' : 'Activer'}</button>
                     <button class="btn btn-danger btn-small" data-act="delete" data-id="${u.id}">Supprimer</button>`
                  : ''
              }
            </div>
          </div>`,
          )
          .join('')}
      </div>`;

    const form = document.getElementById('u-create');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      data.isAdmin = !!data.isAdmin;
      try {
        const u = await api('POST', '/api/admin/users', data);
        toast(`Compte créé pour ${u.name}`);
        renderAdmin();
      } catch (err) {
        toast(err.message);
      }
    });

    box.querySelectorAll('[data-act]').forEach((b) => {
      const user = users.find((u) => u.id === Number(b.dataset.id));
      b.onclick = () => userAction(b.dataset.act, user);
    });
  }

  async function userAction(act, u) {
    try {
      if (act === 'edit') {
        const data = await openDialog({
          title: `Modifier ${u.name}`,
          body: `
            <label class="field">Nom du joueur<input name="name" required maxlength="60" value="${esc(u.name)}" /></label>
            <label class="field">E-mail<input type="email" name="email" required value="${esc(u.email)}" /></label>
            ${u.id !== me.id ? `<label class="check"><input type="checkbox" name="isAdmin" ${u.isAdmin ? 'checked' : ''}/> Administrateur</label>` : ''}`,
          ok: 'Enregistrer',
        });
        if (!data) return;
        const body = { name: data.name, email: data.email };
        if (u.id !== me.id) body.isAdmin = !!data.isAdmin;
        await api('PATCH', `/api/admin/users/${u.id}`, body);
        if (u.id === me.id) me = (await api('GET', '/api/me')).user;
        toast('Joueur modifié ✔');
      } else if (act === 'password') {
        const data = await openDialog({
          title: `Nouveau mot de passe pour ${u.name}`,
          body: '<label class="field">Mot de passe<input type="text" name="password" required minlength="6" autocomplete="off" /></label>',
          ok: 'Enregistrer',
        });
        if (!data) return;
        await api('PATCH', `/api/admin/users/${u.id}`, { password: data.password });
        toast('Mot de passe modifié ✔');
      } else if (act === 'toggle') {
        await api('PATCH', `/api/admin/users/${u.id}`, { active: !u.active });
        toast(u.active ? 'Compte désactivé' : 'Compte activé');
      } else if (act === 'delete') {
        const ok = await openDialog({
          title: `Supprimer ${u.name} ?`,
          body: '<p>Le compte et toutes ses parties seront définitivement supprimés.</p>',
          ok: 'Supprimer',
          danger: true,
        });
        if (!ok) return;
        await api('DELETE', `/api/admin/users/${u.id}`);
        toast('Joueur supprimé');
      } else if (act === 'games') {
        adminFilters.userId = String(u.id);
        adminTab = 'parties';
      }
      renderAdmin();
    } catch (err) {
      toast(err.message);
    }
  }

  async function renderAdminGames() {
    const qs = new URLSearchParams(Object.entries(adminFilters).filter(([, v]) => v)).toString();
    const [games, users] = await Promise.all([
      api('GET', `/api/admin/games${qs ? `?${qs}` : ''}`),
      api('GET', '/api/admin/users'),
    ]);
    const box = document.getElementById('a-content');
    if (!box) return;
    box.innerHTML = `
      <div class="filters">
        <label class="field">Statut
          <select id="f-status">
            <option value="">Tous</option>
            ${Object.entries(STATUS_LABEL)
              .map(
                ([k, v]) =>
                  `<option value="${k}" ${adminFilters.status === k ? 'selected' : ''}>${v}</option>`,
              )
              .join('')}
          </select>
        </label>
        <label class="field">Joueur
          <select id="f-user">
            <option value="">Tous</option>
            ${users.map((u) => `<option value="${u.id}" ${adminFilters.userId === String(u.id) ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="section-title">${games.length} partie${games.length > 1 ? 's' : ''}</div>
      ${
        games.length
          ? `<div class="table-wrap"><table class="games">
              <thead><tr><th>Début</th><th>Joueur</th><th>Niveau</th><th>Statut</th><th>Temps</th><th>Erreurs</th><th>Bonus</th></tr></thead>
              <tbody>
                ${games
                  .map((g) => {
                    const lvl = levelInfo(g.level);
                    return `<tr>
                      <td>${fmtDate(g.startedAt)}</td>
                      <td>${esc(g.playerName)}</td>
                      <td><span class="lvl-tag" style="--lvl:${lvl.color}">${lvl.label}</span></td>
                      <td><span class="status ${g.status}">${STATUS_LABEL[g.status]}</span></td>
                      <td>${fmtTime(g.elapsedSeconds)}</td>
                      <td>${g.errors}</td>
                      <td>${g.hintsUsed}</td>
                    </tr>`;
                  })
                  .join('')}
              </tbody>
            </table></div>`
          : '<div class="empty">Aucune partie.</div>'
      }`;
    document.getElementById('f-status').onchange = (e) => {
      adminFilters.status = e.target.value;
      renderAdmin();
    };
    document.getElementById('f-user').onchange = (e) => {
      adminFilters.userId = e.target.value;
      renderAdmin();
    };
  }

  // ---------------------------------------------------------- démarrage

  async function boot() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    try {
      me = (await api('GET', '/api/me')).user;
    } catch (err) {
      $app.innerHTML = `<div class="splash"><div style="text-align:center"><p>${esc(err.message)}</p>
        <button class="btn btn-primary" id="retry">Réessayer</button></div></div>`;
      document.getElementById('retry').onclick = boot;
      return;
    }
    if (me && (location.hash === '#/login' || !location.hash)) history.replaceState(null, '', '#/');
    route();
  }

  boot();
})();
