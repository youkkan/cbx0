// api/orders.js — POST /api/orders
const { db, cors, verifyToken } = require('../lib/db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Non authentifié' });

  const { order } = req.body || {};
  if (!order) return res.status(400).json({ error: 'Données manquantes' });

  try {
    const { error } = await db.from('orders').insert({
      id: order.id,
      user_email: payload.email,
      user_id: payload.id,
      items: JSON.stringify(order.items || []),
      total: order.total,
      promo: order.promo || null,
      method: order.method || 'livraison',
      date: order.date,
    });
    if (error) throw error;

    if (order.promo) {
      await db.rpc('increment_promo_uses', { promo_code: order.promo }).catch(function(){});
    }

    if (order.items && order.items.length) {
      for (var i = 0; i < order.items.length; i++) {
        var item = order.items[i];
        await db.rpc('decrement_stock', { product_id: item.id, quantity: item.qty }).catch(function(){});
      }
    }

    return res.status(201).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
