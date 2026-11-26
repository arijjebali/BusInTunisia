const fs = require('fs');
const os = require('os');
const path = require('path');
const { redactJwt, redactFile, MASK } = require('../api/redact');

// Jeton factice assemblé à l'exécution : écrit d'un seul tenant, Gitleaks le signalerait à juste titre.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = [b64({ alg: 'HS256', typ: 'JWT' }), b64({ id: 3, role: 'user' }), 'c2lnbmF0dXJlX2Zha2U'].join('.');

describe('Masquage des JWT dans les rapports de test', () => {
  test('SEC-01 : un jeton dans un en-tête Authorization est masqué', () => {
    expect(redactJwt(`"Authorization": "Bearer ${jwt}"`)).toBe(`"Authorization": "Bearer ${MASK}"`);
  });

  test('SEC-02 : tous les jetons d\'un même texte sont masqués', () => {
    const out = redactJwt(`{"token":"${jwt}"} puis ${jwt}`);
    expect(out).not.toContain('eyJ');
    expect(out.split(MASK)).toHaveLength(3);
  });

  test('SEC-03 : un texte sans jeton est inchangé', () => {
    const text = '{"status":"ok","message":"eyJ seul n\'est pas un jeton"}';
    expect(redactJwt(text)).toBe(text);
  });

  test('SEC-04 : redactFile masque en place et compte les jetons ; fichier absent = 0', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'redact-')), 'rapport.json');
    fs.writeFileSync(file, `[{"token":"${jwt}"},{"auth":"Bearer ${jwt}"}]`);
    expect(redactFile(file)).toBe(2);
    expect(fs.readFileSync(file, 'utf8')).not.toContain('eyJ');
    expect(redactFile(path.join(path.dirname(file), 'absent.json'))).toBe(0);
  });
});
