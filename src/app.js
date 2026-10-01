import * as fb from './firebase.js';
import { generate } from './sudoku.js';
import { Fireworks } from './fireworks.js';
import { sound } from './sounds.js';
import { MAX_HINTS } from './config.js';

const $app = document.getElementById('app');

const LEVELS = [
  { id: 'facile', label: 'Facile', dots: 1, color: 'var(--lvl-facile)' },
  { id: 'moyen', label: 'Moyen', dots: 2, color: 'var(--lvl-moyen)' },
  { id: 'difficile', label: 'Difficile', dots: 3, color: 'var(--lvl-difficile)' },
  { id: 'extreme', label: 'Extrême', dots: 4, color: 'var(--lvl-extreme)' },
];
const levelInfo = (id) => LEVELS.find((l) => l.id === id) || LEVELS[1];

const STATUS_LABEL = { en_cours: 'En cours', terminee: 'Terminée', abandonnee: 'Abandonnée' };

const svg = (body, { stroke = 1.8, fill = false } = {}) =>
  fill
    ? `<svg viewBox="0 0 24 24" fill="currentColor">${body}</svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const ICONS = {
  back: svg('<path d="M15 18l-6-6 6-6"/>', { stroke: 2 }),
  undo: svg('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 3.5v4.2h4.2"/>', { stroke: 1.6 }),
  eraser: svg(
    '<path d="M15.2 4.6l4.2 4.2a1.5 1.5 0 0 1 0 2.1L11.3 19H7.1l-3-3a1.5 1.5 0 0 1 0-2.1l9-9.3a1.5 1.5 0 0 1 2.1 0z"/><path d="M9 9.9l5.1 5.1"/><path d="M14 20.5h6.5"/>',
    { stroke: 1.6 },
  ),
  pencil: svg('<path d="M16.5 3.5l4 4L8 20l-5 1 1-5z"/><path d="M14 6l4 4"/><path d="M13 21h8"/>', {
    stroke: 1.6,
  }),
  bulb: svg(
    '<path d="M9 18h6"/><path d="M10 21.5h4"/><path d="M12 2.5a6.5 6.5 0 0 0-3.9 11.7c.6.5.9 1.2.9 2V17h6v-.8c0-.8.3-1.5.9-2A6.5 6.5 0 0 0 12 2.5z"/>',
    { stroke: 1.6 },
  ),
  pause: svg(
    '<rect x="6.5" y="5" width="3.2" height="14" rx="1.2"/><rect x="14.3" y="5" width="3.2" height="14" rx="1.2"/>',
    {
      fill: true,
    },
  ),
  play: svg('<path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.2-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z"/>', {
    fill: true,
  }),
  flag: svg('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>'),
  soundOn: svg(
    '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  ),
  soundOff: svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
  history: svg('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/><path d="M12 7v5l3 2"/>'),
  trophy: svg(
    '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5"/><path d="M12 14v4M8.5 21h7M9.5 18h5"/>',
  ),
  admin: svg(
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17 11h5M19.5 8.5v5"/>',
  ),
  theme: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  key: svg('<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8L20 3"/><path d="M17 6l3 3"/>'),
  logout: svg(
    '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/>',
  ),
  install: svg('<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 20h16"/>'),
  chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
};

let me = null; // { uid, email, name, isAdmin }
let authUser = null;

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

function fmtDate(date, withTime = true) {
  if (!date) return '';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime && { hour: '2-digit', minute: '2-digit' }),
  });
}

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

function statusText(g) {
  if (g.status === 'terminee') return `Terminée en ${fmtTime(g.elapsedSeconds)}`;
  if (g.status === 'abandonnee') return `Abandonnée (${fmtTime(g.elapsedSeconds)})`;
  return `En cours · ${fmtTime(g.elapsedSeconds)}`;
}

let toastTimer;
function toast(msg, ms = 2800) {
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

const splash = () => {
  $app.innerHTML = '<div class="splash"><div class="spinner"></div></div>';
};

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

// ------------------------------------------------------------------ thème

const THEME_KEY = 'sudoku-theme';
const THEMES = { auto: 'Automatique', light: 'Clair', dark: 'Sombre' };

function getTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'auto';
  } catch {
    return 'auto';
  }
}

function applyTheme(theme = getTheme()) {
  const root = document.documentElement;
  if (theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = theme;
  const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]').content = dark ? '#121821' : '#ffffff';
}

function setTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignoré */
  }
  applyTheme(theme);
}

applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme());

// ------------------------------------------------------------ navigation

const go = (hash) => {
  if (location.hash === hash) route();
  else location.hash = hash;
};

window.addEventListener('hashchange', route);

function route() {
  if (!me) return;
  const hash = location.hash || '#/';
  const gameMatch = hash.match(/^#\/partie\/([\w-]+)$/);
  if (!gameMatch || (G.game && G.game.id !== gameMatch[1])) leaveGame();
  if (gameMatch) return renderGame(gameMatch[1]);
  if (hash === '#/historique') return renderHistory();
  if (hash === '#/classement') return renderLeaderboard();
  if (hash === '#/admin' && me.isAdmin) return renderAdmin();
  if (hash !== '#/') return go('#/');
  return renderHome();
}

// ------------------------------------------------------- connexion

fb.onUserChanged(async (user) => {
  authUser = user;
  if (!user) {
    me = null;
    leaveGame(false);
    renderLogin();
    return;
  }
  splash();
  try {
    let player = await fb.getMyPlayer(user);
    if (!player && fb.isSuperAdmin(user)) {
      const data = await openDialog({
        title: 'Bienvenue !',
        body: `<p>Vous êtes l’administrateur. Choisissez votre nom de joueur.</p>
          <label class="field">Nom du joueur<input name="name" required maxlength="40" autocomplete="nickname" /></label>`,
        ok: 'Commencer',
        cancel: null,
      });
      await fb.createSuperAdminPlayer(user, data?.name || user.email.split('@')[0]);
      player = await fb.getMyPlayer(user);
    }
    if (!player) {
      return renderBlocked(
        'Accès non autorisé',
        'Ce compte n’a pas été activé. Demandez à l’administrateur de vous ajouter comme joueur.',
      );
    }
    if (!player.active) {
      return renderBlocked('Compte désactivé', 'Votre compte a été désactivé par l’administrateur.');
    }
    me = {
      uid: user.uid,
      email: user.email.toLowerCase(),
      name: player.name,
      isAdmin: player.isAdmin || fb.isSuperAdmin(user),
    };
    fb.touchPlayer(user).catch(() => {});
    if (!location.hash || location.hash === '#/login') history.replaceState(null, '', '#/');
    route();
  } catch (err) {
    renderBlocked('Connexion impossible', fb.errorMessage(err), true);
  }
});

function renderLogin() {
  history.replaceState(null, '', '#/login');
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
      <button class="link-btn" type="button" id="forgot">Mot de passe oublié ?</button>
    </form>`;
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    const { email, password } = Object.fromEntries(new FormData(form));
    try {
      await fb.login(email, password);
    } catch (err) {
      document.getElementById('login-error').textContent = fb.errorMessage(err);
      btn.disabled = false;
    }
  });
  document.getElementById('forgot').onclick = async () => {
    const email = form.email.value.trim();
    if (!email) {
      document.getElementById('login-error').textContent = 'Saisissez d’abord votre adresse e-mail.';
      return form.email.focus();
    }
    try {
      await fb.sendReset(email);
      toast('Si ce compte existe, un e-mail de réinitialisation a été envoyé.', 4000);
    } catch (err) {
      document.getElementById('login-error').textContent = fb.errorMessage(err);
    }
  };
}

function renderBlocked(title, message, retry = false) {
  $app.innerHTML = `
    <div class="login">
      <div class="blocked-icon">🔒</div>
      <h1 style="font-size:24px">${esc(title)}</h1>
      <p class="sub">${esc(message)}</p>
      ${retry ? '<button class="btn btn-primary btn-block" id="b-retry">Réessayer</button>' : ''}
      <button class="btn btn-ghost btn-block" id="b-logout" style="margin-top:10px">Se déconnecter</button>
    </div>`;
  if (retry) document.getElementById('b-retry').onclick = () => location.reload();
  document.getElementById('b-logout').onclick = () => fb.logout();
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
  splash();
  let games = [];
  try {
    games = await fb.listMyGames(me.uid);
  } catch (err) {
    toast(fb.errorMessage(err));
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
               <div class="title">${levelInfo(current.level).label}</div>
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
    <div class="card menu-list">
      <button id="m-history">${ICONS.history}Mes parties<span class="chev">${ICONS.chev}</span></button>
      <button id="m-ranking">${ICONS.trophy}Classement<span class="chev">${ICONS.chev}</span></button>
      ${me.isAdmin ? `<button id="m-admin">${ICONS.admin}Administration<span class="chev">${ICONS.chev}</span></button>` : ''}
      <button id="m-theme">${ICONS.theme}Thème<span class="value" id="m-theme-value">${THEMES[getTheme()]}</span></button>
      <button id="m-sound"><span id="m-sound-icon">${sound.isMuted() ? ICONS.soundOff : ICONS.soundOn}</span>Sons<span class="value" id="m-sound-value">${sound.isMuted() ? 'Coupés' : 'Activés'}</span></button>
      <button id="m-install" ${showInstall ? '' : 'hidden'}>${ICONS.install}Installer l’application<span class="chev">${ICONS.chev}</span></button>
      <button id="m-password">${ICONS.key}Changer mon mot de passe<span class="chev">${ICONS.chev}</span></button>
      <button id="m-logout">${ICONS.logout}Se déconnecter</button>
    </div>`;

  if (current) document.getElementById('resume').onclick = () => go(`#/partie/${current.id}`);
  $app.querySelectorAll('.level-btn').forEach((btn) => {
    btn.onclick = () => newGame(btn.dataset.level, btn);
  });
  document.getElementById('m-history').onclick = () => go('#/historique');
  document.getElementById('m-ranking').onclick = () => go('#/classement');
  if (me.isAdmin) document.getElementById('m-admin').onclick = () => go('#/admin');
  document.getElementById('m-theme').onclick = () => {
    const order = Object.keys(THEMES);
    const next = order[(order.indexOf(getTheme()) + 1) % order.length];
    setTheme(next);
    document.getElementById('m-theme-value').textContent = THEMES[next];
  };
  document.getElementById('m-sound').onclick = () => {
    sound.setMuted(!sound.isMuted());
    document.getElementById('m-sound-icon').innerHTML = sound.isMuted() ? ICONS.soundOff : ICONS.soundOn;
    document.getElementById('m-sound-value').textContent = sound.isMuted() ? 'Coupés' : 'Activés';
    sound.place();
  };
  document.getElementById('m-install').onclick = installApp;
  document.getElementById('m-password').onclick = changePassword;
  document.getElementById('m-logout').onclick = () => fb.logout();
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
    await fb.changeMyPassword(data.currentPassword, data.newPassword);
    toast('Mot de passe modifié ✔');
  } catch (err) {
    toast(err.code === 'auth/invalid-credential' ? 'Mot de passe actuel incorrect.' : fb.errorMessage(err));
  }
}

async function newGame(level, btn) {
  document.querySelectorAll('.level-btn').forEach((b) => (b.disabled = true));
  if (btn) btn.querySelector('.name').textContent = 'Génération…';
  // Laisse le navigateur afficher « Génération… » avant le calcul.
  await new Promise((r) => setTimeout(r, 30));
  try {
    const { puzzle, solution } = generate(level);
    const game = await fb.createGame(authUser, me.name, level, puzzle, solution);
    G.preloaded = game;
    go(`#/partie/${game.id}`);
  } catch (err) {
    toast(fb.errorMessage(err));
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
  errorCells: new Set(),
  paused: false,
  won: false,
  finished: false,
  ticker: null,
  saveTimer: null,
  cells: [],
  cellKeys: [],
};

async function renderGame(id) {
  if (G.game && G.game.id === id) return;
  let game = G.preloaded && G.preloaded.id === id ? G.preloaded : null;
  G.preloaded = null;
  if (!game) {
    splash();
    try {
      game = await fb.getGame(id);
    } catch (err) {
      toast(fb.errorMessage(err));
      return go('#/');
    }
    if (!game || game.uid !== me.uid) {
      toast('Partie introuvable.');
      return go('#/');
    }
  }
  if (location.hash !== `#/partie/${id}`) return;
  if (game.status !== 'en_cours') {
    toast(`Cette partie est ${STATUS_LABEL[game.status].toLowerCase()}.`);
    return go('#/historique');
  }

  Object.assign(G, {
    game,
    sel: -1,
    notesMode: false,
    undo: [],
    errorCells: new Set(),
    paused: false,
    won: false,
    finished: false,
  });
  const lvl = levelInfo(game.level);

  $app.innerHTML = `
    <div class="game">
      <div class="topbar">
        <button class="icon-btn" id="g-back" aria-label="Retour">${ICONS.back}</button>
        <span class="spacer"></span>
        <h1>Sudoku</h1>
        <button class="icon-btn" id="g-sound" aria-label="Sons">${sound.isMuted() ? ICONS.soundOff : ICONS.soundOn}</button>
        <button class="icon-btn" id="g-abandon" aria-label="Abandonner" title="Abandonner">${ICONS.flag}</button>
      </div>
      <div class="stats">
        <div class="stat"><span class="label">Difficulté</span><span class="value" style="color:${lvl.color}">${lvl.label}</span></div>
        <div class="stat"><span class="label">Bonus</span><span class="value" id="g-hints-stat"></span></div>
        <div class="stat"><span class="label">Temps</span><span class="value" id="g-time">00:00</span></div>
        <button class="pause-btn" id="g-pause" aria-label="Pause">${ICONS.pause}</button>
      </div>
      <div class="board-wrap" id="g-wrap">
        <div class="board" id="g-board"></div>
        <div class="pause-overlay" id="g-paused" hidden>
          <button class="btn btn-primary" id="g-resume"><span class="btn-ico">${ICONS.play}</span> Reprendre</button>
        </div>
      </div>
      <div class="tools">
        <button class="tool" id="t-undo"><span class="ico">${ICONS.undo}</span>Annuler</button>
        <button class="tool" id="t-erase"><span class="ico">${ICONS.eraser}</span>Effacer</button>
        <button class="tool" id="t-notes"><span class="ico">${ICONS.pencil}<span class="badge off" id="t-notes-badge">OFF</span></span>Notes</button>
        <button class="tool" id="t-hint"><span class="ico">${ICONS.bulb}<span class="badge count" id="t-hint-badge"></span></span>Bonus</button>
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
    c.dataset.base = [
      'cell',
      col === 8 ? 'c8' : col % 3 === 2 ? 'br' : '',
      r === 8 ? 'r8' : r % 3 === 2 ? 'bb' : '',
    ]
      .filter(Boolean)
      .join(' ');
    c.className = c.dataset.base;
    c.style.setProperty('--d', `${((r + col) * 0.07).toFixed(2)}s`);
    c.addEventListener('pointerdown', () => select(i));
    board.appendChild(c);
    G.cells.push(c);
    G.cellKeys.push('');
  }

  document.getElementById('g-back').onclick = () => go('#/');
  document.getElementById('g-sound').onclick = (e) => {
    sound.setMuted(!sound.isMuted());
    e.currentTarget.innerHTML = sound.isMuted() ? ICONS.soundOff : ICONS.soundOn;
    toast(sound.isMuted() ? 'Sons coupés' : 'Sons activés', 1200);
  };
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
  if (save && !G.finished) saveNow();
  hideWin();
  G.game = null;
}

function tick() {
  if (!G.game || G.paused || G.won || document.hidden) return;
  G.game.elapsedSeconds++;
  document.getElementById('g-time').textContent = fmtTime(G.game.elapsedSeconds);
  if (G.game.elapsedSeconds % 30 === 0) saveNow();
}

const isLocked = (i) => G.game.puzzle[i] !== 0 || G.game.hints.includes(i);

function render() {
  const { board, puzzle, notes, hints } = G.game;
  const sel = G.sel;
  const selVal = sel >= 0 ? board[sel] : 0;

  for (let i = 0; i < 81; i++) {
    const v = board[i];
    const el = G.cells[i];
    const cls = [el.dataset.base];
    if (v && !puzzle[i]) cls.push(hints.includes(i) ? 'hint-cell' : 'user');
    if (G.errorCells.has(i)) cls.push('wrong');
    if (sel >= 0) {
      if (i === sel) cls.push('sel');
      else if (selVal && v === selVal) cls.push('same');
      else if (isPeer(i, sel)) cls.push('hl');
    }
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

  // Chiffres posés 9 fois : grisés dans le pavé (mais toujours utilisables).
  const counts = new Array(10).fill(0);
  for (let i = 0; i < 81; i++) counts[board[i]]++;
  document.querySelectorAll('#g-pad button').forEach((b) => {
    b.classList.toggle('done', counts[Number(b.dataset.d)] >= 9);
  });

  document.getElementById('g-time').textContent = fmtTime(G.game.elapsedSeconds);
  document.getElementById('g-hints-stat').textContent = `${MAX_HINTS - G.game.hintsLeft}/${MAX_HINTS}`;
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

const canPlay = () => G.game && !G.paused && !G.won;

function select(i) {
  if (!canPlay()) return;
  G.sel = i;
  render();
}

function pushUndo(i) {
  G.undo.push({ i, value: G.game.board[i], notes: G.game.notes.slice() });
  if (G.undo.length > 300) G.undo.shift();
}

function clearPeerNotes(i, d) {
  for (let j = 0; j < 81; j++) if (j !== i && isPeer(i, j)) G.game.notes[j] &= ~(1 << d);
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
    sound.note();
  } else {
    if (g.board[i] === d) return;
    pushUndo(i);
    g.board[i] = d;
    g.notes[i] = 0;
    clearPeerNotes(i, d);
    G.errorCells.delete(i);
    flash(i, 'pop');
    sound.place();
  }
  render();
  scheduleSave();
  checkFull();
}

function erase() {
  if (!canPlay() || G.sel < 0) return;
  const i = G.sel;
  if (isLocked(i) || (!G.game.board[i] && !G.game.notes[i])) return;
  pushUndo(i);
  G.game.board[i] = 0;
  G.game.notes[i] = 0;
  G.errorCells.delete(i);
  sound.erase();
  render();
  scheduleSave();
}

function undo() {
  if (!canPlay()) return;
  const last = G.undo.pop();
  if (!last) return;
  G.game.board[last.i] = last.value;
  G.game.notes = last.notes;
  G.errorCells.delete(last.i);
  G.sel = last.i;
  sound.erase();
  render();
  scheduleSave();
}

function toggleNotes() {
  if (!G.game) return;
  G.notesMode = !G.notesMode;
  render();
}

// Bonus : remplit une case vide au hasard (ou, si la grille est pleine, une case fausse).
function useHint() {
  if (!canPlay()) return;
  const g = G.game;
  if (g.hintsLeft <= 0) return toast(`Vous avez utilisé vos ${MAX_HINTS} bonus.`);
  let candidates = [];
  for (let i = 0; i < 81; i++) if (!g.board[i]) candidates.push(i);
  if (!candidates.length) {
    for (let i = 0; i < 81; i++) if (g.board[i] !== g.solution[i]) candidates.push(i);
  }
  if (!candidates.length) return;
  const i = candidates[Math.floor(Math.random() * candidates.length)];
  const d = g.solution[i];
  g.board[i] = d;
  g.notes[i] = 0;
  clearPeerNotes(i, d);
  g.hints.push(i);
  g.hintsLeft--;
  G.errorCells.delete(i);
  G.undo = G.undo.filter((u) => u.i !== i);
  G.sel = i;
  flash(i, 'hinted');
  sound.hint();
  vibrate(30);
  render();
  saveNow();
  checkFull();
}

// Vérification quand la grille est pleine.
function checkFull() {
  const g = G.game;
  if (G.won || g.board.includes(0)) return;
  const wrong = [];
  for (let i = 0; i < 81; i++) if (g.board[i] !== g.solution[i]) wrong.push(i);
  if (!wrong.length) return win();
  G.errorCells = new Set(wrong);
  g.errors += wrong.length;
  sound.error();
  vibrate([80, 60, 80]);
  toast(`${wrong.length === 1 ? 'Il reste 1 erreur' : `Il reste ${wrong.length} erreurs`} à corriger`);
  render();
  saveNow();
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

function setSaved(text) {
  const el = document.getElementById('g-saved');
  if (el) el.textContent = text;
}

function scheduleSave() {
  clearTimeout(G.saveTimer);
  G.saveTimer = setTimeout(saveNow, 1500);
}

// Les écritures sont d'abord enregistrées dans le cache local de Firestore,
// puis envoyées au serveur (immédiatement, ou au retour du réseau).
function saveNow(extra) {
  const g = G.game;
  if (!g || G.finished) return Promise.resolve();
  clearTimeout(G.saveTimer);
  if (!navigator.onLine) setSaved('Hors ligne — la partie sera synchronisée au retour du réseau');
  const p = extra ? fb.finishGame(g, extra) : fb.saveGame(g);
  if (extra) G.finished = true;
  return p
    .then(() => {
      if (G.game === g) setSaved('Partie sauvegardée');
    })
    .catch((err) => {
      if (G.game === g) setSaved(`Sauvegarde impossible : ${fb.errorMessage(err)}`);
    });
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.game && !G.finished) saveNow();
});
window.addEventListener('online', () => {
  if (G.game && !G.finished) saveNow();
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
  G.game.status = 'abandonnee';
  saveNow('abandonnee');
  toast('Partie abandonnée');
  go('#/');
}

// ------------------------------------------------------------ victoire

function win() {
  const g = G.game;
  G.won = true;
  G.sel = -1;
  G.errorCells.clear();
  g.status = 'terminee';
  render();
  saveNow('terminee');

  const lvl = levelInfo(g.level);
  vibrate([60, 40, 60, 40, 200]);
  sound.win();
  document.getElementById('g-board').classList.add('celebrate');

  const msg = `🎉 BRAVO ${me.name.toUpperCase()} ! 🎉 Grille ${lvl.label} résolue en ${fmtTime(g.elapsedSeconds)} ✨ Félicitations ! 🎆`;
  document.getElementById('win-marquee-text').textContent = `${msg}    ${msg}`;
  document.getElementById('win-stats').innerHTML = `
    <div><b>${fmtTime(g.elapsedSeconds)}</b>Temps</div>
    <div><b>${g.errors}</b>Erreurs</div>
    <div><b>${MAX_HINTS - g.hintsLeft}</b>Bonus</div>`;
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
    document.getElementById('win').hidden = false;
    Fireworks.start(document.getElementById('fireworks'), { onExplode: sound.pop });
  }, 900);
}

function hideWin() {
  const el = document.getElementById('win');
  if (el.hidden) return;
  el.hidden = true;
  Fireworks.stop();
}

// ---------------------------------------------------------- historique

async function renderHistory() {
  splash();
  let games = [];
  try {
    games = await fb.listMyGames(me.uid);
  } catch (err) {
    toast(fb.errorMessage(err));
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
      <div class="card"><div class="big" style="color:var(--neutral)">${games.filter((g) => g.status === 'abandonnee').length}</div><div class="small">Abandonnées</div></div>
    </div>
    <div class="section-title">Mes meilleurs temps</div>
    <div class="card records">
      ${records.map((r) => `<div><span class="lvl-tag" style="--lvl:${r.color}">${r.label}</span><b>${r.best === null ? '—' : fmtTime(r.best)}</b></div>`).join('')}
    </div>
    <div class="section-title">Historique</div>
    <div class="game-list">
      ${games.length ? games.map((g) => gameItem(g)).join('') : '<div class="empty">Aucune partie pour le moment.</div>'}
    </div>`;

  document.getElementById('h-back').onclick = () => go('#/');
  $app.querySelectorAll('[data-resume]').forEach((b) => {
    b.onclick = () => go(`#/partie/${b.dataset.resume}`);
  });
}

function gameItem(g) {
  const lvl = levelInfo(g.level);
  return `
    <div class="card game-item">
      <div class="grow">
        <div class="line1">
          <span class="lvl-tag" style="--lvl:${lvl.color}">${lvl.label}</span>
          <span class="status ${g.status}">${statusText(g)}</span>
        </div>
        <div class="line2">Début : ${fmtDate(g.startedAt)} · ${plural(g.errors, 'erreur')} · ${MAX_HINTS - g.hintsLeft} bonus</div>
      </div>
      ${g.status === 'en_cours' ? `<button class="btn btn-primary btn-small" data-resume="${g.id}">Reprendre</button>` : ''}
    </div>`;
}

// ---------------------------------------------------------- classement

let rankingLevel = 'facile';

async function renderLeaderboard() {
  $app.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="r-back" aria-label="Retour">${ICONS.back}</button>
      <h1>Classement</h1><span class="spacer"></span>
    </div>
    <div class="tabs tabs-4">
      ${LEVELS.map((l) => `<button data-level="${l.id}" class="${l.id === rankingLevel ? 'active' : ''}">${l.label}</button>`).join('')}
    </div>
    <div id="r-list"><div class="splash"><div class="spinner"></div></div></div>`;
  document.getElementById('r-back').onclick = () => go('#/');
  $app.querySelectorAll('[data-level]').forEach((b) => {
    b.onclick = () => {
      rankingLevel = b.dataset.level;
      renderLeaderboard();
    };
  });

  let rows = [];
  try {
    rows = await fb.leaderboard(rankingLevel);
  } catch (err) {
    toast(fb.errorMessage(err));
  }
  const box = document.getElementById('r-list');
  if (!box || location.hash !== '#/classement') return;
  const medals = ['🥇', '🥈', '🥉'];
  box.innerHTML = rows.length
    ? `<div class="card rank-list">
        ${rows
          .map(
            (g, i) => `
          <div class="rank-row ${g.uid === me.uid ? 'me' : ''}">
            <span class="rank">${medals[i] || i + 1}</span>
            <span class="who">${esc(g.playerName)}<small>${fmtDate(g.finishedAt || g.startedAt, false)}</small></span>
            <span class="time">${fmtTime(g.elapsedSeconds)}</span>
          </div>`,
          )
          .join('')}
      </div>
      <p class="muted center small-note">Meilleur temps de chaque joueur au niveau ${levelInfo(rankingLevel).label}.</p>`
    : `<div class="empty">Aucune grille ${levelInfo(rankingLevel).label} terminée pour le moment.<br>À vous de jouer !</div>`;
}

// --------------------------------------------------------------- admin

let adminTab = 'joueurs';
const adminFilters = { status: '', uid: '' };

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
    const [players, games] = await Promise.all([fb.listPlayers(), fb.listAllGames()]);
    if (location.hash !== '#/admin' || !document.getElementById('a-content')) return;
    if (adminTab === 'joueurs') renderAdminPlayers(players, games);
    else renderAdminGames(players, games);
  } catch (err) {
    toast(fb.errorMessage(err));
  }
}

function renderAdminPlayers(players, games) {
  const box = document.getElementById('a-content');
  box.innerHTML = `
    <form class="card" id="u-create">
      <h3 class="card-title">Ajouter un joueur</h3>
      <label class="field">Nom du joueur<input name="name" required maxlength="40" autocomplete="off" /></label>
      <label class="field">E-mail<input type="email" name="email" required autocomplete="off" inputmode="email" /></label>
      <label class="field">Mot de passe<input type="text" name="password" required minlength="6" autocomplete="off" /></label>
      <p class="hint-text">Si ce compte existe déjà dans la console Firebase, son mot de passe actuel est conservé.</p>
      <label class="check"><input type="checkbox" name="isAdmin" /> Administrateur</label>
      <button class="btn btn-primary btn-block" type="submit">Ajouter le joueur</button>
    </form>
    <div class="section-title">${plural(players.length, 'joueur')}</div>
    <div class="game-list">
      ${players
        .map((p) => {
          const mine = games.filter((g) => p.uid && g.uid === p.uid);
          const won = mine.filter((g) => g.status === 'terminee').length;
          const isMe = p.email === me.email;
          return `
          <div class="card user-item">
            <div class="line1">
              ${esc(p.name)}
              ${p.isAdmin ? '<span class="pill">Admin</span>' : ''}
              ${p.active ? '' : '<span class="pill off">Désactivé</span>'}
              ${p.uid ? '' : '<span class="pill neutral">Jamais connecté</span>'}
            </div>
            <div class="line2">${esc(p.email)} · ${plural(mine.length, 'partie')} · ${plural(won, 'gagnée')}</div>
            <div class="actions">
              <button class="btn btn-ghost btn-small" data-act="edit" data-email="${esc(p.email)}">Modifier</button>
              <button class="btn btn-ghost btn-small" data-act="reset" data-email="${esc(p.email)}">Mot de passe</button>
              ${p.uid ? `<button class="btn btn-ghost btn-small" data-act="games" data-email="${esc(p.email)}">Parties</button>` : ''}
              ${
                isMe
                  ? ''
                  : `<button class="btn btn-ghost btn-small" data-act="toggle" data-email="${esc(p.email)}">${p.active ? 'Désactiver' : 'Activer'}</button>
                     <button class="btn btn-danger btn-small" data-act="delete" data-email="${esc(p.email)}">Retirer</button>`
              }
            </div>
          </div>`;
        })
        .join('')}
    </div>`;

  const form = document.getElementById('u-create');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    const data = Object.fromEntries(new FormData(form));
    try {
      const { existed } = await fb.createPlayer({ ...data, isAdmin: !!data.isAdmin });
      toast(
        existed
          ? `${data.name} ajouté (compte existant : mot de passe inchangé)`
          : `Compte créé pour ${data.name} ✔`,
        4000,
      );
      renderAdmin();
    } catch (err) {
      toast(fb.errorMessage(err));
      btn.disabled = false;
    }
  });

  box.querySelectorAll('[data-act]').forEach((b) => {
    const player = players.find((p) => p.email === b.dataset.email);
    b.onclick = () => playerAction(b.dataset.act, player);
  });
}

async function playerAction(act, p) {
  const isMe = p.email === me.email;
  try {
    if (act === 'edit') {
      const data = await openDialog({
        title: `Modifier ${p.name}`,
        body: `
          <label class="field">Nom du joueur<input name="name" required maxlength="40" value="${esc(p.name)}" /></label>
          ${isMe ? '' : `<label class="check"><input type="checkbox" name="isAdmin" ${p.isAdmin ? 'checked' : ''}/> Administrateur</label>`}
          <p class="hint-text">Le nouveau nom s’applique aux prochaines parties.</p>`,
        ok: 'Enregistrer',
      });
      if (!data) return;
      const fields = { name: data.name.trim() };
      if (!isMe) fields.isAdmin = !!data.isAdmin;
      await fb.updatePlayer(p.email, fields);
      if (isMe) me.name = fields.name;
      toast('Joueur modifié ✔');
    } else if (act === 'reset') {
      const ok = await openDialog({
        title: 'Réinitialiser le mot de passe',
        body: `<p>Un e-mail va être envoyé à <b>${esc(p.email)}</b> avec un lien pour choisir un nouveau mot de passe.</p>`,
        ok: 'Envoyer l’e-mail',
      });
      if (!ok) return;
      await fb.sendReset(p.email);
      toast('E-mail de réinitialisation envoyé ✔');
      return;
    } else if (act === 'toggle') {
      await fb.updatePlayer(p.email, { active: !p.active });
      toast(p.active ? 'Joueur désactivé' : 'Joueur réactivé');
    } else if (act === 'delete') {
      const ok = await openDialog({
        title: `Retirer ${p.name} ?`,
        body: `<p>${esc(p.name)} ne pourra plus jouer. Ses parties restent dans l’historique.</p>
          <p class="hint-text">Le compte de connexion reste dans la console Firebase (Authentication), d’où vous pouvez le supprimer définitivement.</p>`,
        ok: 'Retirer',
        danger: true,
      });
      if (!ok) return;
      await fb.deletePlayer(p.email);
      toast('Joueur retiré');
    } else if (act === 'games') {
      adminFilters.uid = p.uid;
      adminTab = 'parties';
    }
    renderAdmin();
  } catch (err) {
    toast(fb.errorMessage(err));
  }
}

function renderAdminGames(players, allGames) {
  const games = allGames.filter(
    (g) =>
      (!adminFilters.status || g.status === adminFilters.status) &&
      (!adminFilters.uid || g.uid === adminFilters.uid),
  );
  const box = document.getElementById('a-content');
  box.innerHTML = `
    <div class="filters">
      <label class="field">Statut
        <select id="f-status">
          <option value="">Tous</option>
          ${Object.entries(STATUS_LABEL)
            .map(
              ([k, v]) => `<option value="${k}" ${adminFilters.status === k ? 'selected' : ''}>${v}</option>`,
            )
            .join('')}
        </select>
      </label>
      <label class="field">Joueur
        <select id="f-user">
          <option value="">Tous</option>
          ${players
            .filter((p) => p.uid)
            .map(
              (p) =>
                `<option value="${p.uid}" ${adminFilters.uid === p.uid ? 'selected' : ''}>${esc(p.name)}</option>`,
            )
            .join('')}
        </select>
      </label>
    </div>
    <div class="section-title">${plural(games.length, 'partie')}</div>
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
                    <td>${MAX_HINTS - g.hintsLeft}</td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table></div>`
        : '<div class="empty">Aucune partie.</div>'
    }`;
  document.getElementById('f-status').onchange = (e) => {
    adminFilters.status = e.target.value;
    renderAdminGames(players, allGames);
  };
  document.getElementById('f-user').onchange = (e) => {
    adminFilters.uid = e.target.value;
    renderAdminGames(players, allGames);
  };
}

// ---------------------------------------------------------- démarrage

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
