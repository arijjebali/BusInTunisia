/**
 * Masque les jetons JWT dans un texte (rapports Newman JSON/XML).
 * Les rapports enregistrent les requêtes et réponses complètes : sans masquage, les jetons de connexion
 * des comptes de test finissent dans le dépôt (alerte Gitleaks « jwt », voir docs/devops/06-securite.md).
 */
const fs = require('fs');

const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const MASK = '[JWT-MASQUÉ]';

const redactJwt = (text) => text.replace(JWT_PATTERN, MASK);

/** Masque les JWT d'un fichier en place ; renvoie le nombre de jetons masqués. */
function redactFile(file) {
  if (!fs.existsSync(file)) return 0;
  const content = fs.readFileSync(file, 'utf8');
  const count = (content.match(JWT_PATTERN) || []).length;
  if (count) fs.writeFileSync(file, redactJwt(content));
  return count;
}

module.exports = { redactJwt, redactFile, MASK };

// Usage direct : node tests/api/redact.js <fichier>...
if (require.main === module) {
  for (const file of process.argv.slice(2)) {
    console.log(`${file} : ${redactFile(file)} jeton(s) masqué(s)`);
  }
}
