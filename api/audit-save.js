async function captureException(error, context) {
  try {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) return;
    const dsnMatch = dsn.match(/https:\/\/(.+)@(.+)\/(.+)/);
    if (!dsnMatch) return;
    const [, key, host, projectId] = dsnMatch;
    const sentryUrl = `https://${host}/api/${projectId}/store/`;
    await fetch(sentryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${key}` },
      body: JSON.stringify({ platform: 'node', level: 'error', message: error.message || String(error), extra: context || {}, timestamp: new Date().toISOString() })
    });
  } catch(e) { console.error('Sentry reporting failed:', e); }
}

async function redisCommand(args) {
  const res = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://soc2-checklist-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, auditId, label, tsc, ctrl, data, checks, notes } = req.body;

  if (!email || !auditId) {
    return res.status(400).json({ error: 'Email and auditId are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const auditKey = `audit:${normalizedEmail}:${auditId}`;

  try {
    const existingRes = await redisCommand(['GET', auditKey]);
    if (!existingRes.result) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    const existing = JSON.parse(existingRes.result);
    const updated = {
      ...existing,
      label: label || existing.label,
      tsc: tsc !== undefined ? tsc : existing.tsc,
      ctrl: ctrl !== undefined ? ctrl : existing.ctrl,
      data: data !== undefined ? data : existing.data,
      checks: checks !== undefined ? checks : existing.checks,
      notes: notes !== undefined ? notes : existing.notes,
      lastUpdated: new Date().toISOString()
    };

    await redisCommand(['SET', auditKey, JSON.stringify(updated)]);
    res.status(200).json({ audit: updated });
  } catch (err) {
    console.error('Save audit error:', err);
    await captureException(err, { step: 'audit_save', email: normalizedEmail, auditId });
    res.status(500).json({ error: 'Failed to save audit' });
  }
}
