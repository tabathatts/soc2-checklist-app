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
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json'
    },
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

  const { email, auditId } = req.body;

  if (!email || !auditId) {
    return res.status(400).json({ error: 'Email and auditId are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    await redisCommand(['DEL', `audit:${normalizedEmail}:${auditId}`]);
    await redisCommand(['SREM', `user:${normalizedEmail}:audits`, auditId]);

    res.status(200).json({ success: true, auditId });
  } catch (err) {
    console.error('Delete audit error:', err);
    await captureException(err, { step: 'audit_delete', email: normalizedEmail, auditId });
    res.status(500).json({ error: 'Failed to delete audit' });
  }
}
