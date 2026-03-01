// api/notifs-read.js — POST /api/notifs-read
const { db, cors, verifyToken, jp } = require('../lib/db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Non authentifié' });

  try {
    const { data: notifs } = await db.from('notifications').select('id,read_by')
      .or('to_type.eq.all,to_ids.cs.{' + payload.id + '}');

    if (!notifs || !notifs.length) return res.status(200).json({ ok: true });

    await Promise.all(notifs.map(async function(n) {
      var readBy = jp(n.read_by, []);
      if (!readBy.includes(payload.id)) {
        readBy.push(payload.id);
        await db.from('notifications').update({ read_by: JSON.stringify(readBy) }).eq('id', n.id);
      }
    }));

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
