// Compile l'appli (esbuild) et lui donne un numéro de version : la date de la compilation.
// La même version est écrite dans public/version.json, que l'appli consulte pour savoir
// si une mise à jour est disponible.
import { build, context } from 'esbuild';
import { writeFileSync } from 'node:fs';

const watch = process.argv.includes('--watch');
const version = new Date().toISOString();

const options = {
  entryPoints: ['src/app.js'],
  bundle: true,
  format: 'esm',
  sourcemap: true,
  outfile: 'public/build/app.js',
  define: { __APP_VERSION__: JSON.stringify(version) },
  ...(watch ? {} : { minify: true, target: 'es2020' }),
};

writeFileSync('public/version.json', `${JSON.stringify({ version })}\n`);

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('Compilation en continu…');
} else {
  await build(options);
  console.log(`Version ${version}`);
}
