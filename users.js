// Manajemen user (khusus admin). Memakai SERVICE ROLE KEY yang hanya ada di server Vercel.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const svcHeaders = (extra = {}) => ({
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  ...extra
});

async function getCaller(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;

  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` }
  });
  if (!r.ok) return null;
  const user = await r.json();

  const p = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
    headers: svcHeaders()
  });
  const rows = p.ok ? await p.json() : [];
  return { id: user.id, role: rows[0] ? rows[0].role : 'user' };
}

module.exports = async (req, res) => {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({ error: 'Environment variable Supabase belum diatur di Vercel.' });
    }

    const caller = await getCaller(req);
    if (!caller) return res.status(401).json({ error: 'Sesi tidak valid, silakan login ulang.' });
    if (caller.role !== 'admin') return res.status(403).json({ error: 'Hanya admin yang dapat mengelola user.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    // LIST
    if (req.method === 'GET') {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&order=created_at.desc`, { headers: svcHeaders() });
      return res.status(r.status).json(await r.json());
    }

    // CREATE
    if (req.method === 'POST') {
      const { email, password, full_name, role } = body;
      if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi.' });
      if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter.' });

      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: svcHeaders(),
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: full_name || '' }
        })
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.msg || data.message || data.error_description || 'Gagal membuat user.' });

      const finalRole = role === 'admin' ? 'admin' : 'user';
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.id}`, {
        method: 'PATCH',
        headers: svcHeaders({ Prefer: 'return=minimal' }),
        body: JSON.stringify({ role: finalRole, full_name: full_name || '' })
      });
      return res.status(200).json({ ok: true, id: data.id });
    }

    // UPDATE ROLE
    if (req.method === 'PATCH') {
      const { id, role } = body;
      if (!id || !['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Data tidak valid.' });
      if (id === caller.id) return res.status(400).json({ error: 'Tidak dapat mengubah role akun sendiri.' });
      const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
        method: 'PATCH',
        headers: svcHeaders({ Prefer: 'return=minimal' }),
        body: JSON.stringify({ role })
      });
      return res.status(r.ok ? 200 : r.status).json({ ok: r.ok });
    }

    // DELETE
    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || body.id;
      if (!id) return res.status(400).json({ error: 'ID user wajib.' });
      if (id === caller.id) return res.status(400).json({ error: 'Tidak dapat menghapus akun sendiri.' });
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: svcHeaders() });
      return res.status(r.ok ? 200 : r.status).json({ ok: r.ok });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Server error' });
  }
};
