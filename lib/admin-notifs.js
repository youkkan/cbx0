// api/admin-notifs.js — DELETE /api/admin-notifs
const { db, cors, isAdmin } = require('../lib/db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE' && req.method !== 'POST') return res.status(405).end();

  const admin = await isAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Non autorisé' });

  var id = (req.query && req.query.id) || (req.body && req.body.id);
  if (!id) return res.status(400).json({ error: 'id manquant' });

  try {
    await db.from('notifications').delete().eq('id', id);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
