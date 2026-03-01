// api/user-data.js — GET /api/user-data
const { db, cors, verifyToken, jp } = require('../lib/db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Non authentifié' });

  try {
    const [ordersRes, notifsRes] = await Promise.all([
      db.from('orders').select('*').eq('user_email', payload.email)
        .order('created_at', { ascending: false }),
      db.from('notifications').select('*')
        .or('to_type.eq.all,to_ids.cs.{' + payload.id + '}')
        .order('created_at', { ascending: false }).limit(100),
    ]);

    return res.status(200).json({
      orders: (ordersRes.data || []).map(function(o) {
        return {
          id: o.id, date: o.date || new Date(o.created_at).toLocaleDateString('fr-FR'),
          items: jp(o.items, []), total: o.total, promo: o.promo,
          userId: o.user_email, method: o.method || 'livraison',
        };
      }),
      notifs: (notifsRes.data || []).map(function(n) {
        return {
          id: n.id, from: 'CbX0 St0r3',
          to: n.to_type === 'all' ? 'all' : jp(n.to_ids, []),
          subject: n.subject, message: n.message,
          date: n.created_date, readBy: jp(n.read_by, []),
        };
      }),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
