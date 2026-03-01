// lib/db.js
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Admin-Token');
}

function verifyToken(req) {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return null;
    return jwt.verify(auth.slice(7), process.env.JWT_SECRET);
  } catch { return null; }
}

async function isAdmin(req) {
  const tok = req.headers['x-admin-token'];
  if (tok) {
    try {
      const p = jwt.verify(tok, process.env.JWT_SECRET);
      if (p && p.adminAuth === true) return true;
    } catch {}
  }
  const payload = verifyToken(req);
  if (!payload) return false;
  const { data } = await db.from('users').select('role').eq('id', payload.id).maybeSingle();
  return data && data.role === 'admin';
}

function jp(v, fb) {
  if (fb === undefined) fb = null;
  if (v == null) return fb;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fb; }
}

module.exports = { db, cors, verifyToken, isAdmin, jp };
