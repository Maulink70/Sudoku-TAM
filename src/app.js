import * as fb from './firebase.js';
import { generate } from './sudoku.js';
import { Fireworks } from './fireworks.js';
import { sound } from './sounds.js';
import { MAX_HINTS } from './config.js';

const $app = document.getElementById('app');

const LEVELS = [
  { id: 'debutant', label: 'Débutant', dots: 1, color: 'var(--lvl-debutant)' },
  { id: 'tres_facile', label: 'Très facile', dots: 2, color: 'var(--lvl-tres-facile)' },
  { id: 'facile', label: 'Facile', dots: 3, color: 'var(--lvl-facile)' },
  { id: 'moyen', label: 'Moyen', dots: 4, color: 'var(--lvl-moyen)' },
  { id: 'difficile', label: 'Difficile', dots: 5, color: 'var(--lvl-difficile)' },
  { id: 'extreme', label: 'Extrême', dots: 6, color: 'var(--lvl-extreme)' },
  // Ancien niveau, conservé seulement pour afficher les parties déjà jouées.
  {
    id: 'pour_mauro',
    label: 'Niveau Mauro',
    dots: 0,
    color: 'var(--lvl-debutant)',
    ranked: false,
    hidden: true,
  },
];
const PLAYABLE_LEVELS = LEVELS.filter((l) => !l.hidden);
const RANKED_LEVELS = LEVELS.filter((l) => l.ranked !== false && !l.hidden);
const levelDots = (l) =>
  `<span class="dots">${[1, 2, 3, 4, 5, 6].map((n) => `<i class="${n <= l.dots ? 'on' : ''}"></i>`).join('')}</span>`;
const levelInfo = (id) => LEVELS.find((l) => l.id === id) || LEVELS.find((l) => l.id === 'moyen');

const STATUS_LABEL = { en_cours: 'En cours', terminee: 'Terminée', abandonnee: 'Abandonnée' };

const svg = (body, { stroke = 1.8, fill = false } = {}) =>
  fill
    ? `<svg viewBox="0 0 24 24" fill="currentColor">${body}</svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const ICONS = {
  back: svg('<path d="M15 18l-6-6 6-6"/>', { stroke: 2 }),
  power: svg('<path d="M12 3v8"/><path d="M6.6 6.6a7.5 7.5 0 1 0 10.8 0"/>', { stroke: 2 }),
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
  textSize: svg(
    '<path d="M2.5 19L8 5l5.5 14"/><path d="M4.6 14h6.8"/><path d="M14.5 19l3.5-8.5 3.5 8.5"/><path d="M15.7 16.2h4.6"/>',
  ),
  gear: svg(
    '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    { stroke: 1.6 },
  ),
  grid4: svg(
    '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
  ),
  printer: svg(
    '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/><path d="M17 12h.01"/>',
  ),
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
  theme: svg(
    '<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  ),
  moon: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  sun: svg(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  ),
  key: svg('<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8L20 3"/><path d="M17 6l3 3"/>'),
  trash: svg(
    '<path d="M4 7h16"/><path d="M9.5 7V4.5h5V7"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v5.5M14 11v5.5"/>',
  ),
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
const THEMES = {
  auto: { label: 'Automatique' },
  clair: { label: 'Clair', dark: false, color: '#ffffff' },
  nuit: { label: 'Bleu nuit', dark: true, color: '#121821' },
  noir: { label: 'Noir', dark: true, color: '#000000' },
  papier: { label: 'Papier', dark: false, color: '#f6efe1' },
};
const LEGACY_THEMES = { light: 'clair', dark: 'nuit' };

function readStore(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible */
  }
}

function getTheme() {
  const t = readStore(THEME_KEY, 'auto');
  return THEMES[t] ? t : LEGACY_THEMES[t] || 'auto';
}

const systemIsDark = () => matchMedia('(prefers-color-scheme: dark)').matches;

// Thème réellement affiché (« auto » est résolu selon le téléphone).
const effectiveTheme = (theme = getTheme()) =>
  theme === 'auto' ? (systemIsDark() ? 'nuit' : 'clair') : theme;

function applyTheme(theme = getTheme()) {
  const root = document.documentElement;
  if (theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = THEMES[effectiveTheme(theme)].color;
  const btn = document.getElementById('g-theme');
  if (btn) btn.innerHTML = THEMES[effectiveTheme(theme)].dark ? ICONS.sun : ICONS.moon;
}

// Change le thème, le mémorise sur l'appareil et sur le compte du joueur.
function setTheme(theme, { sync = true } = {}) {
  if (!THEMES[theme]) return;
  writeStore(THEME_KEY, theme);
  const eff = effectiveTheme(theme);
  writeStore(THEMES[eff].dark ? 'sudoku-last-dark' : 'sudoku-last-light', eff);
  applyTheme(theme);
  if (sync && authUser) fb.saveMyTheme(authUser, theme).catch(() => {});
}

// Icône 🌙/☀️ du jeu : bascule entre le dernier thème clair et le dernier thème sombre utilisés.
function toggleDarkLight() {
  const goingDark = !THEMES[effectiveTheme()].dark;
  const next = goingDark ? readStore('sudoku-last-dark', 'nuit') : readStore('sudoku-last-light', 'clair');
  setTheme(THEMES[next] ? next : goingDark ? 'nuit' : 'clair');
}

// --------------------------------------------------- taille des chiffres

// Mémorisée sur l'appareil (la taille idéale dépend de l'écran).
const DIGIT_KEY = 'sudoku-digit-size';
const DIGIT_SIZES = { normale: 'Normale', grande: 'Grande', tres_grande: 'Très grande' };

function getDigitSize() {
  const v = readStore(DIGIT_KEY, 'normale');
  return DIGIT_SIZES[v] ? v : 'normale';
}

function applyDigitSize(size = getDigitSize()) {
  document.documentElement.dataset.digits = size;
}

function setDigitSize(size) {
  if (!DIGIT_SIZES[size]) return;
  writeStore(DIGIT_KEY, size);
  applyDigitSize(size);
}

// Icône du jeu : Normale → Grande → Très grande → Normale…
function cycleDigitSize() {
  const order = Object.keys(DIGIT_SIZES);
  const next = order[(order.indexOf(getDigitSize()) + 1) % order.length];
  setDigitSize(next);
  toast(`Taille des chiffres : ${DIGIT_SIZES[next]}`, 1400);
}

applyDigitSize();
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme());

// ------------------------------------------------------------ navigation

// Appli installée sur Android : la navigation ne crée pas d'historique, sinon le navigateur refuse
// que « Quitter » ferme la fenêtre. Le bouton retour du téléphone passe alors par un CloseWatcher.
const SINGLE_HISTORY = typeof CloseWatcher === 'function' && matchMedia('(display-mode: standalone)').matches;
let backWatcher = null;

const go = (hash) => {
  if (location.hash === hash) route();
  else if (SINGLE_HISTORY) {
    history.replaceState(null, '', hash);
    route();
  } else location.hash = hash;
};

/** Hors de l'accueil, le retour du téléphone agit comme le bouton retour de l'écran. */
function syncBackWatcher(onHome) {
  if (!SINGLE_HISTORY) return;
  if (onHome) {
    backWatcher?.destroy();
    backWatcher = null;
  } else if (!backWatcher) {
    backWatcher = new CloseWatcher();
    backWatcher.onclose = () => {
      backWatcher = null;
      const back = $app.querySelector('[id$="-back"]');
      if (back) back.click();
      else go('#/');
    };
  }
}

async function quitApp() {
  const ok = await openDialog({
    title: 'Quitter SudoTam ?',
    body: '<p>Vos parties sont déjà enregistrées.</p>',
    ok: 'Quitter',
  });
  if (!ok) return;
  window.close();
  // Toujours là : le navigateur a refusé de fermer la fenêtre.
  setTimeout(() => {
    const ios =
      /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    openDialog({
      title: 'Fermeture impossible',
      body: ios
        ? '<p>Sur iPhone, l’appli ne peut pas se fermer elle-même : glissez vers le haut depuis le bas de l’écran pour la fermer.</p>'
        : '<p>Le navigateur ne permet pas à l’appli de se fermer elle-même. Fermez-la avec le bouton ou le geste habituel du téléphone.</p>',
      cancel: null,
    });
  }, 400);
}

window.addEventListener('hashchange', route);

function route() {
  if (!me) return;
  const hash = location.hash || '#/';
  syncBackWatcher(hash === '#/');
  const gameMatch = hash.match(/^#\/partie\/([\w-]+)$/);
  if (!gameMatch || (G.game && G.game.id !== gameMatch[1])) leaveGame();
  if (gameMatch) return renderGame(gameMatch[1]);
  const lotMatch = hash.match(/^#\/grilles\/([\w-]+)$/);
  if (lotMatch) return renderLot(lotMatch[1]);
  const solMatch = hash.match(/^#\/solution\/([\w-]+)$/);
  if (solMatch) return renderSolution(solMatch[1]);
  if (hash === '#/grilles') return renderLots();
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
    syncBackWatcher(true);
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
    if (player.theme && THEMES[player.theme] && player.theme !== getTheme())
      setTheme(player.theme, { sync: false });
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
      <h1>SudoTam</h1>
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
    <div class="topbar">
      <span class="spacer"></span><h1>SudoTam</h1>
      <button class="icon-btn" id="h-gear" aria-label="Réglages" aria-expanded="false">${ICONS.gear}</button>
    </div>
    <div class="gear-menu card menu-list" id="gear-menu" hidden>
      <label class="menu-row" for="m-theme">${ICONS.theme}Thème
        <select id="m-theme" class="menu-select">
          ${Object.entries(THEMES)
            .map(
              ([id, t]) => `<option value="${id}" ${id === getTheme() ? 'selected' : ''}>${t.label}</option>`,
            )
            .join('')}
        </select>
      </label>
      <label class="menu-row" for="m-digits">${ICONS.textSize}Taille des chiffres
        <select id="m-digits" class="menu-select">
          ${Object.entries(DIGIT_SIZES)
            .map(
              ([id, label]) =>
                `<option value="${id}" ${id === getDigitSize() ? 'selected' : ''}>${label}</option>`,
            )
            .join('')}
        </select>
      </label>
      <button id="m-sound"><span id="m-sound-icon">${sound.isMuted() ? ICONS.soundOff : ICONS.soundOn}</span>Sons<span class="value" id="m-sound-value">${sound.isMuted() ? 'Coupés' : 'Activés'}</span></button>
      ${me.isAdmin ? `<button id="m-admin">${ICONS.admin}Administration<span class="chev">${ICONS.chev}</span></button>` : ''}
      <button id="m-install" ${showInstall ? '' : 'hidden'}>${ICONS.install}Installer l’application<span class="chev">${ICONS.chev}</span></button>
      <button id="m-password">${ICONS.key}Changer mon mot de passe<span class="chev">${ICONS.chev}</span></button>
      <button id="m-logout">${ICONS.logout}Se déconnecter</button>
    </div>

    <div class="hello">
      <div class="muted">Bonjour</div>
      <h2>${esc(me.name)} 👋</h2>
    </div>

    ${
      current
        ? `<div class="card resume-card">
             <div class="grow">
               <div class="title">▶ Partie en cours · ${levelInfo(current.level).label}</div>
               <div class="meta">Commencée le ${fmtDate(current.startedAt)} · ${fmtTime(current.elapsedSeconds)}</div>
             </div>
             <button class="btn btn-small" id="resume">Continuer</button>
           </div>`
        : ''
    }

    <div class="home-actions">
      <button class="home-tile primary" id="m-history">${ICONS.history}<span>Mes parties</span></button>
      <button class="home-tile" id="m-ranking">${ICONS.trophy}<span>Classement</span></button>
      <button class="home-tile" id="m-lots">${ICONS.grid4}<span>Mes grilles</span></button>
    </div>

    <div class="section-title">Nouvelle partie</div>
    <div class="levels levels-compact">
      ${PLAYABLE_LEVELS.map(
        (l) => `
        <button class="level-btn" data-level="${l.id}" style="--lvl:${l.color}">
          <span class="name">${l.label}</span>${levelDots(l)}
        </button>`,
      ).join('')}
    </div>

    <button class="quit-btn" id="h-quit">${ICONS.power}Quitter</button>`;

  document.getElementById('h-quit').onclick = quitApp;
  if (current) document.getElementById('resume').onclick = () => go(`#/partie/${current.id}`);
  $app.querySelectorAll('.level-btn').forEach((btn) => {
    btn.onclick = () => newGame(btn.dataset.level, btn);
  });
  document.getElementById('m-history').onclick = () => go('#/historique');
  document.getElementById('m-ranking').onclick = () => go('#/classement');
  document.getElementById('m-lots').onclick = () => go('#/grilles');

  // Roue crantée : menu des réglages.
  const gear = document.getElementById('h-gear');
  const menu = document.getElementById('gear-menu');
  const closeMenu = (e) => {
    if (e && (menu.contains(e.target) || gear.contains(e.target))) return;
    menu.hidden = true;
    gear.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', closeMenu, true);
  };
  gear.onclick = () => {
    if (!menu.hidden) return closeMenu();
    menu.hidden = false;
    gear.setAttribute('aria-expanded', 'true');
    setTimeout(() => document.addEventListener('pointerdown', closeMenu, true));
  };
  if (me.isAdmin) document.getElementById('m-admin').onclick = () => go('#/admin');
  document.getElementById('m-theme').onchange = (e) => setTheme(e.target.value);
  document.getElementById('m-digits').onchange = (e) => setDigitSize(e.target.value);
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
      <div class="topbar game-topbar">
        <div class="tb-left">
          <button class="back-pill" id="g-back">${ICONS.back}<span>Accueil</span></button>
        </div>
        <h1>SudoTam</h1>
        <div class="tb-right">
          <button class="icon-btn" id="g-digits" aria-label="Taille des chiffres" title="Taille des chiffres">${ICONS.textSize}</button>
          <button class="icon-btn" id="g-print" aria-label="Imprimer la grille" title="Imprimer">${ICONS.printer}</button>
          <button class="icon-btn" id="g-theme" aria-label="Mode clair ou sombre">${THEMES[effectiveTheme()].dark ? ICONS.sun : ICONS.moon}</button>
          <button class="icon-btn" id="g-sound" aria-label="Sons">${sound.isMuted() ? ICONS.soundOff : ICONS.soundOn}</button>
        </div>
      </div>
      <div class="game-body">
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
      <div class="side">
      <div class="tools">
        <button class="tool" id="t-undo"><span class="ico">${ICONS.undo}</span>Annuler</button>
        <button class="tool" id="t-erase"><span class="ico">${ICONS.eraser}</span>Effacer</button>
        <button class="tool" id="t-notes"><span class="ico">${ICONS.pencil}<span class="badge off" id="t-notes-badge">OFF</span></span>Notes</button>
        <button class="tool" id="t-hint"><span class="ico">${ICONS.bulb}<span class="badge count" id="t-hint-badge"></span></span>Bonus</button>
        <button class="tool tool-danger" id="g-abandon"><span class="ico">${ICONS.flag}</span>Abandonner</button>
      </div>
      <div class="game-saved" id="g-saved"></div>
      <div class="pad" id="g-pad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button data-d="${d}">${d}</button>`).join('')}
      </div>
      </div>
      </div>
    </div>`;
  // L'écran de jeu peut utiliser toute la largeur (tablettes, paysage).
  $app.classList.add('wide');

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
  document.getElementById('g-theme').onclick = toggleDarkLight;
  document.getElementById('g-print').onclick = printGrid;
  document.getElementById('g-digits').onclick = cycleDigitSize;
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
  $app.classList.remove('wide');
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

// Cases dont le chiffre apparaît deux fois dans une même ligne, colonne ou bloc.
function findConflicts(board) {
  const out = new Set();
  for (let i = 0; i < 81; i++) {
    if (!board[i]) continue;
    for (let j = i + 1; j < 81; j++) {
      if (board[j] === board[i] && isPeer(i, j)) {
        out.add(i);
        out.add(j);
      }
    }
  }
  return out;
}

function render() {
  const { board, puzzle, notes, hints } = G.game;
  const conflicts = findConflicts(board);

  for (let i = 0; i < 81; i++) {
    const v = board[i];
    const el = G.cells[i];
    const cls = [el.dataset.base];
    if (v && !puzzle[i]) cls.push(hints.includes(i) ? 'hint-cell' : 'user');
    if (G.errorCells.has(i) || conflicts.has(i)) cls.push('wrong');
    if (i === G.sel) cls.push('sel');
    const keep = [...el.classList].filter((c) => c === 'pop' || c === 'hinted');
    el.className = cls.concat(keep).join(' ');

    const key = v ? `v${v}` : notes[i] ? `n${notes[i]}` : '';
    if (key !== G.cellKeys[i]) {
      G.cellKeys[i] = key;
      if (v) el.innerHTML = `<span class="v">${v}</span>`;
      else if (notes[i]) {
        let html = '<div class="notes">';
        for (let d = 1; d <= 9; d++) html += `<span>${notes[i] & (1 << d) ? d : ''}</span>`;
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
    title: 'Abandonner et voir la solution ?',
    body: '<p>La partie sera enregistrée comme abandonnée et ne pourra plus être reprise. La solution s’affichera ensuite.</p>',
    ok: 'Abandonner',
    danger: true,
  });
  if (!ok || !G.game) return;
  const id = G.game.id;
  G.game.status = 'abandonnee';
  saveNow('abandonnee');
  go(`#/solution/${id}`);
}

// ------------------------------------------------------------ impression

/** Grille en SVG : chiffres de départ (« given ») et chiffres du joueur (« mine »). */
function gridSvg(puzzle, board, cls) {
  const S = 100;
  let lines = '';
  for (let k = 0; k <= 9; k++) {
    const c = k % 3 === 0 ? 'gl-thick' : 'gl-thin';
    lines += `<line class="${c}" x1="${k * S}" y1="0" x2="${k * S}" y2="${9 * S}"/>`;
    lines += `<line class="${c}" x1="0" y1="${k * S}" x2="${9 * S}" y2="${k * S}"/>`;
  }
  let digits = '';
  for (let i = 0; i < 81; i++) {
    const v = board[i];
    if (!v) continue;
    digits += `<text x="${COL(i) * S + S / 2}" y="${ROW(i) * S + S / 2}" class="${puzzle[i] ? 'given' : 'mine'}">${v}</text>`;
  }
  return `<svg class="${cls}" viewBox="-3 -3 906 906" xmlns="http://www.w3.org/2000/svg">
      <rect class="gbg" x="0" y="0" width="900" height="900"/>
      <g stroke-linecap="square">${lines}</g>
      <g font-family="Helvetica, Arial, sans-serif" font-size="62" text-anchor="middle" dominant-baseline="central">${digits}</g>
    </svg>`;
}

// Remplit la feuille d'impression puis ouvre la fenêtre d'impression du téléphone
// (imprimante ou « Enregistrer en PDF »).
function openPrint(html) {
  document.getElementById('print-sheet').innerHTML = html;
  window.print();
}

/** Les 4 grilles d'un lot sur une feuille A4 ; `boards` donne l'avancement de chaque grille. */
function printLot(lot, boards, { solutions = false } = {}) {
  const lvl = levelInfo(lot.level).label;
  openPrint(`
    <div class="print-head">
      <div class="print-level">${solutions ? 'Solutions · ' : ''}Niveau : ${lvl}</div>
      <div class="print-dates">4 grilles créées le ${fmtDate(lot.createdAt)} · Imprimée le ${fmtDate(new Date())}</div>
    </div>
    <div class="print-lot">
      ${lot.puzzles
        .map(
          (p, k) => `<div class="print-cell"><div class="print-label">Grille ${k + 1}</div>
            ${gridSvg(p, solutions ? lot.solutions[k] : boards[k] || p, 'print-grid small')}</div>`,
        )
        .join('')}
    </div>`);
}

async function printGrid() {
  const g = G.game;
  if (!g) return;
  if (g.lotId) {
    // Partie issue d'un lot : on imprime les 4 grilles, avec l'avancement à jour.
    try {
      const lot = await fb.getLot(g.lotId);
      if (lot) {
        const boards = await lotBoards(lot);
        boards[g.lotIndex] = g.board;
        return printLot(lot, boards);
      }
    } catch (err) {
      return toast(fb.errorMessage(err));
    }
  }
  openPrint(`
    <div class="print-head">
      <div class="print-level">Niveau : ${levelInfo(g.level).label}</div>
      <div class="print-dates">Partie commencée le ${fmtDate(g.startedAt)} · Imprimée le ${fmtDate(new Date())}</div>
    </div>
    ${gridSvg(g.puzzle, g.board, 'print-grid')}`);
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
  newBtn.textContent = g.lotId ? 'Mes grilles' : `Rejouer (${lvl.label})`;
  newBtn.onclick = () => {
    hideWin();
    if (g.lotId) return go(`#/grilles/${g.lotId}`);
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
  const records = RANKED_LEVELS.map((l) => {
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
      <div class="card"><div class="big" style="color:var(--blue)">${games.filter((g) => g.status === 'en_cours').length}</div><div class="small">En cours</div></div>
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
  $app.querySelectorAll('[data-solution]').forEach((b) => {
    b.onclick = () => go(`#/solution/${b.dataset.solution}`);
  });
  $app.querySelectorAll('[data-delete]').forEach((b) => {
    b.onclick = async () => {
      if (await confirmDeleteGame(games.find((g) => g.id === b.dataset.delete))) renderHistory();
    };
  });
}

// Demande confirmation puis supprime la partie. Renvoie true si elle a été supprimée.
async function confirmDeleteGame(g) {
  const ok = await openDialog({
    title: 'Supprimer cette partie ?',
    body: `<p>Partie ${levelInfo(g.level).label} du ${fmtDate(g.startedAt)}${g.playerName ? ` (${esc(g.playerName)})` : ''} — ${statusText(g).toLowerCase()}.</p>
      <p class="hint-text">Elle disparaîtra de l’historique, des statistiques et du classement. Cette action est définitive.</p>
      ${g.lotId ? `<p class="hint-text">La grille ${g.lotIndex + 1}/4 redeviendra « à jouer » dans Mes grilles.</p>` : ''}`,
    ok: 'Supprimer',
    danger: true,
  });
  if (!ok) return false;
  try {
    await fb.deleteGame(g);
    toast('Partie supprimée');
    return true;
  } catch (err) {
    toast(fb.errorMessage(err));
    return false;
  }
}

function gameItem(g) {
  const lvl = levelInfo(g.level);
  return `
    <div class="card game-item">
      <div class="grow">
        <div class="line1">
          <span class="lvl-tag" style="--lvl:${lvl.color}">${lvl.label}</span>
          <span class="status ${g.status}">${statusText(g)}</span>
          ${g.lotId ? `<span class="muted small-tag">Grille ${g.lotIndex + 1}/4</span>` : ''}
        </div>
        <div class="line2">Début : ${fmtDate(g.startedAt)} · ${plural(g.errors, 'erreur')} · ${MAX_HINTS - g.hintsLeft} bonus</div>
      </div>
      <div class="item-actions">
        ${g.status === 'en_cours' ? `<button class="btn btn-primary btn-small" data-resume="${g.id}">Reprendre</button>` : ''}
        ${g.status === 'abandonnee' ? `<button class="btn btn-ghost btn-small" data-solution="${g.id}">Solution</button>` : ''}
        <button class="icon-btn small danger" data-delete="${g.id}" aria-label="Supprimer la partie">${ICONS.trash}</button>
      </div>
    </div>`;
}

// ---------------------------------------------------- 4 grilles imprimables

/** Avancement de chaque grille d'un lot (grille de départ si elle n'a pas encore été jouée). */
async function lotBoards(lot, gamesById = null) {
  return Promise.all(
    lot.gameIds.map(async (id, k) => {
      if (!id) return lot.puzzles[k];
      const g = gamesById ? gamesById.get(id) : await fb.getGame(id).catch(() => null);
      return g ? g.board : lot.puzzles[k];
    }),
  );
}

function lotSummary(lot, gamesById) {
  const count = { terminee: 0, en_cours: 0, abandonnee: 0, todo: 0 };
  lot.gameIds.forEach((id) => {
    const g = id && gamesById.get(id);
    count[g ? g.status : 'todo']++;
  });
  return [
    count.terminee && plural(count.terminee, 'terminée'),
    count.en_cours && `${count.en_cours} en cours`,
    count.abandonnee && plural(count.abandonnee, 'abandonnée'),
    count.todo && `${count.todo} à jouer`,
  ]
    .filter(Boolean)
    .join(' · ');
}

async function renderLots() {
  splash();
  let lots = [];
  let games = [];
  try {
    [lots, games] = await Promise.all([fb.listMyLots(me.uid), fb.listMyGames(me.uid)]);
  } catch (err) {
    toast(fb.errorMessage(err));
  }
  if (location.hash !== '#/grilles') return;
  const byId = new Map(games.map((g) => [g.id, g]));
  $app.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="l-back" aria-label="Retour">${ICONS.back}</button>
      <h1>Mes grilles</h1><span class="spacer"></span>
    </div>
    <p class="muted intro-text">Générez 4 grilles d’un même niveau, imprimez-les sur une seule feuille A4 et jouez celles que vous voulez sur le téléphone.</p>
    <button class="btn btn-primary btn-block" id="l-new">${ICONS.grid4.replace('<svg', '<svg width="22" height="22"')} Générer 4 grilles</button>
    <div class="section-title">${lots.length ? plural(lots.length, 'lot') : 'Aucun lot pour le moment'}</div>
    <div class="game-list">
      ${lots
        .map((lot) => {
          const lvl = levelInfo(lot.level);
          return `
          <div class="card game-item lot-item" data-open="${lot.id}">
            <div class="grow">
              <div class="line1"><span class="lvl-tag" style="--lvl:${lvl.color}">${lvl.label}</span>
                <span class="muted">${fmtDate(lot.createdAt)}</span></div>
              <div class="line2">${lotSummary(lot, byId)}</div>
            </div>
            <div class="item-actions">
              <span class="chev">${ICONS.chev}</span>
              <button class="icon-btn small danger" data-delete-lot="${lot.id}" aria-label="Supprimer ces 4 grilles">${ICONS.trash}</button>
            </div>
          </div>`;
        })
        .join('')}
    </div>`;
  document.getElementById('l-back').onclick = () => go('#/');
  document.getElementById('l-new').onclick = newLot;
  $app.querySelectorAll('[data-open]').forEach((el) => {
    el.onclick = (e) => {
      if (e.target.closest('[data-delete-lot]')) return;
      go(`#/grilles/${el.dataset.open}`);
    };
  });
  $app.querySelectorAll('[data-delete-lot]').forEach((b) => {
    b.onclick = async () => {
      if (await confirmDeleteLot(b.dataset.deleteLot)) renderLots();
    };
  });
}

async function confirmDeleteLot(id) {
  const ok = await openDialog({
    title: 'Supprimer ces 4 grilles ?',
    body: '<p>Les grilles pas encore jouées disparaissent. Les parties déjà jouées restent dans « Mes parties ».</p>',
    ok: 'Supprimer',
    danger: true,
  });
  if (!ok) return false;
  try {
    await fb.deleteLot(id);
    toast('Grilles supprimées');
    return true;
  } catch (err) {
    toast(fb.errorMessage(err));
    return false;
  }
}

async function newLot() {
  const data = await openDialog({
    title: 'Générer 4 grilles',
    body: `<p>Choisissez le niveau des 4 grilles :</p>
      <div class="level-choice">
        ${PLAYABLE_LEVELS.map(
          (
            l,
          ) => `<label style="--lvl:${l.color}"><input type="radio" name="level" value="${l.id}" ${l.id === 'moyen' ? 'checked' : ''}/>
            <span>${l.label}</span></label>`,
        ).join('')}
      </div>`,
    ok: 'Générer',
  });
  if (!data) return;
  const btn = document.getElementById('l-new');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Génération…';
  }
  await new Promise((r) => setTimeout(r, 30));
  try {
    const grids = [0, 1, 2, 3].map(() => generate(data.level));
    const lot = await fb.createLot(authUser, data.level, grids);
    go(`#/grilles/${lot.id}`);
  } catch (err) {
    toast(fb.errorMessage(err));
    if (btn) btn.disabled = false;
  }
}

async function renderLot(id) {
  splash();
  let lot = null;
  let games = [];
  try {
    [lot, games] = await Promise.all([fb.getLot(id), fb.listMyGames(me.uid)]);
  } catch (err) {
    toast(fb.errorMessage(err));
  }
  if (location.hash !== `#/grilles/${id}`) return;
  if (!lot) {
    toast('Ces grilles n’existent plus.');
    return go('#/grilles');
  }
  const byId = new Map(games.map((g) => [g.id, g]));
  const boards = await lotBoards(lot, byId);
  const lvl = levelInfo(lot.level);
  const cell = (k) => {
    const g = lot.gameIds[k] && byId.get(lot.gameIds[k]);
    const status = !g
      ? { cls: 'todo', text: 'À jouer', btn: 'Jouer' }
      : g.status === 'en_cours'
        ? { cls: 'en_cours', text: `En cours · ${fmtTime(g.elapsedSeconds)}`, btn: 'Reprendre' }
        : g.status === 'terminee'
          ? { cls: 'terminee', text: `✅ Terminée en ${fmtTime(g.elapsedSeconds)}`, btn: 'Voir' }
          : { cls: 'abandonnee', text: 'Abandonnée', btn: 'Solution' };
    return `
      <button class="lot-cell" data-grid="${k}">
        <span class="lot-cell-title">Grille ${k + 1}</span>
        ${gridSvg(lot.puzzles[k], boards[k], 'mini-grid')}
        <span class="status ${status.cls}">${status.text}</span>
        <span class="btn btn-small ${status.cls === 'todo' || status.cls === 'en_cours' ? 'btn-primary' : 'btn-ghost'}">${status.btn}</span>
      </button>`;
  };
  $app.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="lt-back" aria-label="Retour">${ICONS.back}</button>
      <h1>4 grilles</h1><span class="spacer"></span>
    </div>
    <div class="lot-head"><span class="lvl-tag" style="--lvl:${lvl.color}">${lvl.label}</span>
      <span class="muted">Créées le ${fmtDate(lot.createdAt)}</span></div>
    <div class="lot-grid">${[0, 1, 2, 3].map(cell).join('')}</div>
    <div class="lot-actions">
      <button class="btn btn-primary" id="lt-print">${ICONS.printer.replace('<svg', '<svg width="20" height="20"')} Imprimer les 4</button>
      <button class="btn btn-ghost" id="lt-sol">${ICONS.key.replace('<svg', '<svg width="20" height="20"')} Imprimer les solutions</button>
      <button class="btn btn-danger" id="lt-del">${ICONS.trash.replace('<svg', '<svg width="20" height="20"')} Supprimer ces 4 grilles</button>
    </div>`;
  document.getElementById('lt-back').onclick = () => go('#/grilles');
  document.getElementById('lt-print').onclick = () => printLot(lot, boards);
  document.getElementById('lt-sol').onclick = () => printLot(lot, boards, { solutions: true });
  document.getElementById('lt-del').onclick = async () => {
    if (await confirmDeleteLot(lot.id)) go('#/grilles');
  };
  $app.querySelectorAll('[data-grid]').forEach((b) => {
    b.onclick = async () => {
      const k = Number(b.dataset.grid);
      const g = lot.gameIds[k] && byId.get(lot.gameIds[k]);
      if (g && g.status !== 'en_cours') return go(`#/solution/${g.id}`);
      if (g) return go(`#/partie/${g.id}`);
      b.disabled = true;
      try {
        const game = await fb.playLotGrid(authUser, me.name, lot, k);
        G.preloaded = game;
        go(`#/partie/${game.id}`);
      } catch (err) {
        toast(fb.errorMessage(err));
        b.disabled = false;
      }
    };
  });
}

// ------------------------------------------------------------- solution

async function renderSolution(id) {
  splash();
  let g = null;
  try {
    g = await fb.getGame(id);
  } catch (err) {
    toast(fb.errorMessage(err));
  }
  if (location.hash !== `#/solution/${id}`) return;
  if (!g || g.uid !== me.uid) {
    toast('Partie introuvable.');
    return go('#/');
  }
  if (g.status === 'en_cours') {
    toast('Abandonnez la partie pour voir la solution.');
    return go(`#/partie/${id}`);
  }
  const lvl = levelInfo(g.level);
  let cells = '';
  const count = { ok: 0, wrong: 0, missing: 0 };
  for (let i = 0; i < 81; i++) {
    const r = ROW(i);
    const c = COL(i);
    const base = ['cell', c === 8 ? 'c8' : c % 3 === 2 ? 'br' : '', r === 8 ? 'r8' : r % 3 === 2 ? 'bb' : ''];
    const v = g.board[i];
    let kind = 'given';
    if (!g.puzzle[i]) kind = !v ? 'missing' : v === g.solution[i] ? 'ok' : 'wrong';
    if (kind !== 'given') count[kind]++;
    const was = kind === 'wrong' ? `<span class="was">${v}</span>` : '';
    cells += `<div class="${base.filter(Boolean).join(' ')} sol-${kind}"><span class="v">${g.solution[i]}</span>${was}</div>`;
  }
  const back = g.lotId ? `#/grilles/${g.lotId}` : '#/historique';
  $app.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="s-back" aria-label="Retour">${ICONS.back}</button>
      <h1>Solution</h1><span class="spacer"></span>
    </div>
    <div class="lot-head"><span class="lvl-tag" style="--lvl:${lvl.color}">${lvl.label}</span>
      <span class="status ${g.status}">${statusText(g)}</span></div>
    <div class="board-wrap solution-wrap"><div class="board">${cells}</div></div>
    <div class="sol-legend">
      <span><i class="lg-ok"></i>Vos bons chiffres (${count.ok})</span>
      <span><i class="lg-wrong"></i>Vos erreurs, corrigées (${count.wrong})</span>
      <span><i class="lg-missing"></i>Cases à trouver (${count.missing})</span>
    </div>
    <button class="btn btn-ghost btn-block" id="s-home">Retour</button>`;
  document.getElementById('s-back').onclick = () => go(back);
  document.getElementById('s-home').onclick = () => go(back);
}

// ---------------------------------------------------------- classement

let rankingLevel = 'facile';

async function renderLeaderboard() {
  $app.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="r-back" aria-label="Retour">${ICONS.back}</button>
      <h1>Classement</h1><span class="spacer"></span>
    </div>
    <div class="tabs tabs-levels" style="grid-template-columns: repeat(${RANKED_LEVELS.length}, 1fr)">
      ${RANKED_LEVELS.map((l) => `<button data-level="${l.id}" class="${l.id === rankingLevel ? 'active' : ''}">${l.label}</button>`).join('')}
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
      <label class="field">Mot de passe (ignoré si le compte existe déjà dans Firebase)<input type="text" name="password" required minlength="6" autocomplete="off" /></label>
      <p class="hint-text">Le compte de connexion est créé automatiquement dans Firebase.</p>
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
                     <button class="btn btn-danger btn-small" data-act="delete" data-email="${esc(p.email)}">Retirer l’accès</button>`
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
        title: `Retirer l’accès de ${p.name} ?`,
        body: `<p>${esc(p.name)} ne pourra plus jouer. Ses parties restent dans l’historique.
          Vous pourrez lui rendre l’accès en l’ajoutant de nouveau avec le même e-mail.</p>
          <p class="hint-text">Pour supprimer aussi son compte de connexion : console Firebase → Authentication →
          Utilisateurs → ⋮ sur sa ligne → Supprimer le compte.</p>`,
        ok: 'Retirer l’accès',
        danger: true,
      });
      if (!ok) return;
      await fb.deletePlayer(p.email);
      toast('Accès retiré');
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
            <thead><tr><th>Début</th><th>Joueur</th><th>Niveau</th><th>Statut</th><th>Temps</th><th>Erreurs</th><th>Bonus</th><th></th></tr></thead>
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
                    <td><button class="icon-btn small danger" data-delete="${g.id}" aria-label="Supprimer la partie">${ICONS.trash}</button></td>
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
  box.querySelectorAll('[data-delete]').forEach((b) => {
    b.onclick = async () => {
      const g = allGames.find((x) => x.id === b.dataset.delete);
      if (await confirmDeleteGame(g))
        renderAdminGames(
          players,
          allGames.filter((x) => x !== g),
        );
    };
  });
}

// ---------------------------------------------------------- démarrage

// Active l'état :active des boutons sur iOS (effet d'appui des touches du pavé).
document.addEventListener('touchstart', () => {}, { passive: true });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
