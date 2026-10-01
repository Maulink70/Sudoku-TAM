// Configuration publique du projet Firebase « sudoku-tam » (ces valeurs ne sont pas secrètes).
export const firebaseConfig = {
  apiKey: 'AIzaSyBObn08cvO94s-ToZWp_4FAm6L0ECmaGTI',
  authDomain: 'sudoku-tam.firebaseapp.com',
  projectId: 'sudoku-tam',
  storageBucket: 'sudoku-tam.firebasestorage.app',
  messagingSenderId: '927578477754',
  appId: '1:927578477754:web:0a3795823e31e6d9dd9e83',
};

// Compte administrateur principal (doit correspondre à firestore.rules).
export const SUPER_ADMIN_UID = '7ywYHqyVTNSvMPU3zAJ2ktMpjyi2';

export const MAX_HINTS = 10;

// En local (localhost), l'appli utilise les émulateurs Firebase au lieu du vrai projet.
export const USE_EMULATORS = ['localhost', '127.0.0.1'].includes(location.hostname);
