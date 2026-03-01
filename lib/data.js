// api/data.js — GET /api/data — données publiques du catalogue
const { db, cors, jp } = require('../lib/db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const [p, c, pr, s, n] = await Promise.all([
      db.from('products').select('*').order('id'),
      db.from('categories').select('*').order('created_at'),
      db.from('promos').select('*').order('created_at'),
      db.from('settings').select('value').eq('key', 'cc').maybeSingle(),
      db.from('notifications').select('*').order('created_at', { ascending: false }).limit(200),
    ]);

    return res.status(200).json({
      products: (p.data || []).map(r => ({
        id: r.id, emoji: r.emoji, name: r.name, catId: r.cat_id,
        taux: r.taux, thc: r.thc || '< 0,3%', origine: r.origine || '',
        mode: r.mode || '', desc: r.desc, stock: r.stock, badge: r.badge || '',
        tiers: jp(r.tiers, []), images: jp(r.images, []), labPdf: r.lab_pdf_url || null,
      })),
      categories: (c.data || []).map(r => ({
        id: r.id, name: r.name, emoji: r.emoji, color: r.color,
      })),
      promos: (pr.data || []).map(r => ({
        code: r.code, discount: r.discount, uses: r.uses, maxUses: r.max_uses, active: r.active,
      })),
      cc: (s.data && s.data.value) ? s.data.value : {},
      notifs: (n.data || []).map(r => ({
        id: r.id, from: 'CbX0 St0r3',
        to: r.to_type === 'all' ? 'all' : jp(r.to_ids, []),
        subject: r.subject, message: r.message,
        date: r.created_date, readBy: jp(r.read_by, []),
      })),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
