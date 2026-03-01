// api/admin-settings.js — GET/POST /api/admin-settings
const { db, cors, isAdmin } = require('../lib/db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const admin = await isAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Non autorisé' });

  if (req.method === 'GET') {
    const { data: rows } = await db.from('settings').select('key,value').in('key', ['admin_email', 'cc']);
    var out = {};
    (rows || []).forEach(function(r) { out[r.key] = r.value; });
    return res.status(200).json(out);
  }

  if (req.method === 'POST') {
    var body = req.body || {};
    var key = body.key || (body.adminEmail ? 'admin_email' : null);
    var value = body.value !== undefined ? body.value : body.adminEmail;
    if (!key) return res.status(400).json({ error: 'key manquant' });
    try {
      await db.from('settings').upsert({ key: key, value: value }, { onConflict: 'key' });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).end();
};
