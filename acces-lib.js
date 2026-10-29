/* Étincelle · BRILLE — accès par code famille.
   Le contenu (pétales, défis) est chiffré (AES-256-GCM). Chaque famille reçoit un code personnel
   qui ouvre la clé du contenu (clé dérivée du code avec PBKDF2, 300 000 tours).
   Rien n'est vérifié sur un serveur : sans le bon code, le contenu reste illisible. */
(function (g) {
  'use strict';
  const enc = new TextEncoder(), dec = new TextDecoder();
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';           // sans 0/O/1/I pour éviter les confusions
  const ITER = 300000;

  const b64 = u8 => { let s = ''; u8.forEach(b => s += String.fromCharCode(b)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const hex = u8 => Array.from(u8).map(b => b.toString(16).padStart(2, '0')).join('');
  const norm = code => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const alea = n => crypto.getRandomValues(new Uint8Array(n));

  async function deriver(code, salt, iter) {
    const base = await crypto.subtle.importKey('raw', enc.encode(norm(code)), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations: iter }, base, 384));
    const wk = await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt']);
    return { wk, id: hex(bits.slice(32, 48)) };
  }
  const cleAES = (raw, usages) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, usages);

  function nouveauCode(long) {                                     // ex. K7M2-9QXH (ou K7M2-9QXH-4TBN pour l'accès ingénieure)
    const n = long ? 12 : 8, r = alea(n); let s = '';
    for (let i = 0; i < n; i++) { s += ALPHABET[r[i] % 32]; if (i % 4 === 3 && i < n - 1) s += '-'; }
    return s;
  }
  function nouveauCarnet(ids) {
    const cles = {}; (ids || []).forEach(id => cles[id] = b64(alea(32)));
    return { v: 2, salt: b64(alea(16)), iter: ITER, cles, familles: [] };
  }
  function ajouterFamille(carnet, nom, petales, admin) {
    let code; do { code = nouveauCode(admin); } while (carnet.familles.some(f => f.code === code));
    const f = { nom: nom || 'Famille', code, actif: true, petales: (petales || []).slice(), ajout: new Date().toISOString().slice(0, 10) };
    if (admin) f.admin = true;
    carnet.familles.push(f); return f;
  }
  /* À faire quand on retire une famille ou un pétale à une famille : les anciennes clés ne servent plus. */
  function renouvelerCles(carnet, ids) {
    (ids || Object.keys(carnet.cles)).forEach(id => carnet.cles[id] = b64(alea(32)));
  }

  /* Fabrique les fichiers à publier :
     acces.json (pour chaque famille, les clés des seuls pétales qui lui sont ouverts, protégées par son code)
     contenu.enc.json (le détail de chaque pétale, chiffré avec sa propre clé).
     contenu = { details: { idPetale: {...} } } */
  async function fabriquer(carnet, contenu) {
    const familles = [];
    for (const f of carnet.familles.filter(x => x.actif && x.petales && x.petales.length)) {
      const { wk, id } = await deriver(f.code, carnet.salt, carnet.iter);
      const cles = {}; f.petales.forEach(p => { if (carnet.cles[p]) cles[p] = carnet.cles[p]; });
      if (f.admin) cles._admin = '1';
      const iv = alea(12);
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wk, enc.encode(JSON.stringify(cles))));
      familles.push({ id, iv: b64(iv), k: b64(ct) });
    }
    familles.sort(() => Math.random() - .5);                       // l'ordre ne révèle rien
    const petales = {};
    for (const id of Object.keys(contenu.details)) {
      if (!carnet.cles[id]) continue;
      const iv = alea(12);
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cleAES(unb64(carnet.cles[id]), ['encrypt']), enc.encode(JSON.stringify(contenu.details[id]))));
      petales[id] = { iv: b64(iv), data: b64(ct) };
    }
    return { acces: { v: 2, salt: carnet.salt, iter: carnet.iter, familles }, contenuEnc: { v: 2, petales } };
  }

  /* Ouvre les pétales autorisés pour ce code. Lève une erreur si le code n'est pas (ou plus) valide. */
  async function ouvrir(code, acces, contenuEnc) {
    const { wk, id } = await deriver(code, acces.salt, acces.iter);
    const e = acces.familles.find(f => f.id === id);
    if (!e) throw new Error('code');
    const cles = JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(e.iv) }, wk, unb64(e.k))));
    const details = {};
    for (const p of Object.keys(cles)) {
      const c = contenuEnc.petales[p]; if (!c) continue;
      try { details[p] = JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(c.iv) }, await cleAES(unb64(cles[p]), ['decrypt']), unb64(c.data)))); } catch { }
    }
    if (!Object.keys(details).length) throw new Error('vide');
    return { details, admin: cles._admin === '1' };
  }

  g.Acces = { nouveauCode, nouveauCarnet, ajouterFamille, renouvelerCles, fabriquer, ouvrir, norm };
})(typeof globalThis !== 'undefined' ? globalThis : window);
