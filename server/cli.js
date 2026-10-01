'use strict';

// Création d'un compte en ligne de commande :
//   npm run create-user -- <email> <motdepasse> "<Nom du joueur>"
//   npm run create-user -- --admin <email> <motdepasse> "<Nom>"

const { db } = require('./db');
const { createUser } = require('./auth');

const args = process.argv.slice(2);
const isAdmin = args.includes('--admin');
const [email, password, ...nameParts] = args.filter((a) => a !== '--admin');
const name = nameParts.join(' ') || (email ? email.split('@')[0] : '');

if (!email || !password) {
  console.error('Usage : npm run create-user -- [--admin] <email> <motdepasse> "<Nom>"');
  process.exit(1);
}
if (password.length < 6) {
  console.error('Le mot de passe doit faire au moins 6 caractères.');
  process.exit(1);
}
if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
  console.error(`Un compte existe déjà pour ${email}.`);
  process.exit(1);
}
createUser({ email, password, name, isAdmin });
console.log(`Compte ${isAdmin ? 'administrateur ' : ''}créé : ${name} <${email}>`);
