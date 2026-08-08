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

function percentComplete(checks) {
  const keys = Object.keys(checks || {});
  if (keys.length === 0) return 0;
  const done = keys.filter(k => checks[k]).length;
  return Math.round((done / keys.length) * 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://soc2-checklist-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const idsRes = await redisCommand(['SMEMBERS', `user:${normalizedEmail}:audits`]);
    const auditIds = idsRes.result || [];

    const audits = await Promise.all(
      auditIds.map(async (auditId) => {
        const r = await redisCommand(['GET', `audit:${normalizedEmail}:${auditId}`]);
        if (!r.result) return null;
        const audit = JSON.parse(r.result);
       return {
          auditId: audit.auditId,
          label: audit.label,
          tsc: audit.tsc,
          lastUpdated: audit.lastUpdated,
          percentComplete: percentComplete(audit.checks)
        };
      })
    );

    const validAudits = audits.filter(a => a !== null)
      .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

    res.status(200).json({ audits: validAudits });
  } catch (err) {
    console.error('List audits error:', err);
    await captureException(err, { step: 'audit_list', email: normalizedEmail });
    res.status(500).json({ error: 'Failed to list audits' });
  }
}
