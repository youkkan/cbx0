// api/admin-save.js — POST /api/admin-save
const { db, cors, isAdmin } = require('../lib/db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const admin = await isAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Non autorisé' });

  const { categories, products, promos, cc } = req.body || {};

  try {
    const ops = [];

    if (products && products.length) {
      ops.push(
        db.from('products').upsert(
          products.map(p => ({
            id: p.id,
            emoji: p.emoji || '🌿',
            name: p.name,
            cat_id: p.catId,
            taux: p.taux || '',
            thc: p.thc || '< 0,3%',
            origine: p.origine || '',
            mode: p.mode || '',
            desc: p.desc || '',
            stock: typeof p.stock === 'number' ? p.stock : 0,
            badge: p.badge || '',
            tiers: JSON.stringify(p.tiers || []),
            images: JSON.stringify((p.images || []).filter(function(i){ return i && !i.startsWith('data:'); })),
            lab_pdf_url: (p.labPdf && !p.labPdf.startsWith('data:')) ? p.labPdf : null,
          })),
          { onConflict: 'id' }
        )
      );
    }

    if (categories && categories.length) {
      ops.push(
        db.from('categories').upsert(
          categories.map(c => ({ id: c.id, name: c.name, emoji: c.emoji, color: c.color })),
          { onConflict: 'id' }
        )
      );
    }

    if (promos && promos.length) {
      ops.push(
        db.from('promos').upsert(
          promos.map(p => ({
            code: p.code,
            discount: p.discount,
            uses: p.uses || 0,
            max_uses: p.maxUses || 0,
            active: p.active !== false,
          })),
          { onConflict: 'code' }
        )
      );
    }

    if (cc) {
      ops.push(
        db.from('settings').upsert({ key: 'cc', value: cc }, { onConflict: 'key' })
      );
    }

    const results = await Promise.all(ops);
    const errors = results.filter(function(r){ return r.error; }).map(function(r){ return r.error.message; });
    if (errors.length) return res.status(500).json({ error: errors.join(' | ') });

    return res.status(200).json({ ok: true, saved: ops.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
