/**
 * Sauvegarde MySQL de la base 100plusshop.
 * Usage:
 *   node scripts/backup-db.js
 *   node scripts/backup-db.js C:\backups
 *
 * Prérequis: mysqldump dans le PATH (XAMPP: C:\xampp\mysql\bin)
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const outDir = process.argv[2] || path.join(process.cwd(), 'backups');
const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || '3306';
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || '';
const db = process.env.DB_NAME || '100plusshop_db';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outFile = path.join(outDir, `100plusshop_${stamp}.sql`);

const args = [
  `-h${host}`,
  `-P${port}`,
  `-u${user}`,
];
if (password) args.push(`-p${password}`);
args.push(db);

console.log('Sauvegarde vers:', outFile);

const result = spawnSync('mysqldump', args, {
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024,
});

if (result.error) {
  console.error('Erreur: mysqldump introuvable dans le PATH.');
  console.error('XAMPP: ajoute C:\\xampp\\mysql\\bin au PATH, ou lance:');
  console.error('  C:\\xampp\\mysql\\bin\\mysqldump.exe -u root 100plusshop_db > backup.sql');
  process.exit(1);
}

if (result.status !== 0) {
  console.error('mysqldump a échoué:', result.stderr || result.stdout);
  process.exit(1);
}

fs.writeFileSync(outFile, result.stdout, 'utf8');
const sizeKo = Math.round(fs.statSync(outFile).size / 1024);
console.log('OK —', sizeKo, 'Ko');
console.log('Fichier:', outFile);
