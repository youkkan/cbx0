// api/admin-users.js — GET/POST /api/admin-users
const { db, cors, isAdmin } = require('../lib/db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const admin = await isAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Non autorisé' });

  if (req.method === 'GET') {
    const { data: users } = await db.from('users')
      .select('id,name,email,role,created_at').order('created_at', { ascending: false });
    return res.status(200).json((users || []).map(function(u) {
      return {
        id: u.id, name: u.name, email: u.email, role: u.role || 'user',
        createdAt: new Date(u.created_at).toLocaleDateString('fr-FR'),
      };
    }));
  }

  if (req.method === 'POST') {
    var body = req.body || {};
    if (!body.action || !body.userId) return res.status(400).json({ error: 'action et userId requis' });
    try {
      if (body.action === 'toggle-role') {
        var { data: user } = await db.from('users').select('role').eq('id', body.userId).single();
        var newRole = (user && user.role === 'admin') ? 'user' : 'admin';
        await db.from('users').update({ role: newRole }).eq('id', body.userId);
        return res.status(200).json({ ok: true, newRole: newRole });
      }
      if (body.action === 'delete') {
        await db.from('users').delete().eq('id', body.userId);
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: 'Action inconnue' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).end();
};
