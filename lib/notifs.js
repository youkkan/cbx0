// api/notifs.js — POST /api/notifs
const { db, cors, isAdmin } = require('../lib/db');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const admin = await isAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Non autorisé' });

  var { notif, targets } = req.body || {};
  if (!notif) return res.status(400).json({ error: 'Données manquantes' });

  try {
    await db.from('notifications').insert({
      id: notif.id,
      to_type: Array.isArray(notif.to) ? 'selected' : 'all',
      to_ids: Array.isArray(notif.to) ? JSON.stringify(notif.to) : null,
      subject: notif.subject,
      message: notif.message,
      read_by: '[]',
      created_date: notif.date,
    });

    var emailsSent = 0;
    if (targets && targets.length && process.env.RESEND_API_KEY) {
      var html = '<div style="font-family:sans-serif;background:#06060F;padding:32px"><div style="max-width:520px;margin:0 auto;background:#0E0C1E;border:1px solid rgba(124,58,237,.25);padding:32px"><p style="font-size:11px;letter-spacing:5px;text-transform:uppercase;color:#A78BFA;margin:0 0 16px">CbX0 St0r3</p><h2 style="font-size:18px;color:#F8F7FF;margin:0 0 14px">' + notif.subject + '</h2><p style="font-size:13px;color:#9ca3af;line-height:1.8">' + notif.message.replace(/\n/g, '<br>') + '</p></div></div>';
      for (var i = 0; i < targets.length; i++) {
        try {
          var r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: 'CbX0 St0r3 <' + (process.env.FROM_EMAIL || 'onboarding@resend.dev') + '>', to: [targets[i].email], subject: 'CbX0 St0r3 — ' + notif.subject, html: html }),
          });
          if (r.ok) emailsSent++;
        } catch(e) {}
      }
    }

    return res.status(200).json({ ok: true, emailsSent: emailsSent });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
