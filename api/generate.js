export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  const rateKey = `rate_limit:${ip}`;
  const LIMIT = 10;
  const WINDOW = 60 * 60;

  try {
    const countRes = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${rateKey}`, {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
    });
    const countData = await countRes.json();
    const currentCount = parseInt(countData.result) || 0;

    if (currentCount >= LIMIT) {
      return res.status(429).json({ error: 'Too many requests. You have reached the limit of 10 requests per hour. Please try again later.' });
    }

    await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/incr/${rateKey}`, {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
    });

    if (currentCount === 0) {
      await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/expire/${rateKey}/${WINDOW}`, {
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
      });
    }

  } catch(e) {
    console.error('Rate limit check failed:', e);
  }

  const { tsc, ctrl } = req.body;

  const VALID_TSC = [
    'Security (CC)',
    'Availability (A)',
    'Processing Integrity (PI)',
    'Confidentiality (C)',
    'Privacy (P)'
  ];

  if (!tsc || !VALID_TSC.includes(tsc)) {
    return res.status(400).json({ error: 'Invalid TSC value' });
  }

  const ctrlContext = ctrl
    ? 'Focus specifically on ' + ctrl + ' controls — controls designed to ' + (ctrl === 'Preventive' ? 'prevent issues before they occur.' : ctrl === 'Detective' ? 'detect issues after they occur.' : 'correct and remediate issues after detection.')
    : 'Include a mix of preventive, detective, and corrective controls.';

  const prompt = `You are a SOC 2 Type II audit expert. Generate a structured audit checklist for the "${tsc}" Trust Services Criteria. ${ctrlContext}

Return ONLY a JSON array with NO markdown, NO backticks, NO explanation. The structure must be exactly:
[{"category":"Category Name","items":["Verify that...","Confirm that..."]}]

Requirements:
- 4 to 5 categories relevant to ${tsc}
- 3 to 4 audit check items per category
- Items must be specific, actionable auditor verification tasks
- Base items on actual SOC 2 control requirements
- Do not include any text outside the JSON array`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const raw = data.content?.map(b => b.text || '').join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.status(200).json({ checklist: parsed });

  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Failed to generate checklist' });
  }
}
