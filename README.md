# SOC 2 Audit Checklist Generator

A production-ready, AI-powered web application that generates audit-ready SOC 2 checklists in seconds.

🔗 **Live URL:** https://soc2-checklist-app.vercel.app

---

## What It Does

Select a Trust Services Criteria and control type, click Generate, and Claude AI produces a structured audit checklist tailored to your selection. Completed items, auditor notes, and progress are saved automatically and can be exported to CSV.

---

## Features

- Generates checklists for all 5 SOC 2 Trust Services Criteria — Security, Availability, Processing Integrity, Confidentiality, and Privacy
- Filters by control type — Preventive, Detective, and Corrective
- Per-item auditor notes that auto-save as you type
- Progress tracking with a visual progress bar
- Checklist state persists across browser sessions
- CSV export for reporting and documentation
- Password protected access with clean session management

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| AI Engine | Anthropic Claude API |
| Backend | Vercel Serverless Functions (Node.js) |
| Rate Limiting | Upstash Redis |
| Hosting | Vercel |
| Version Control | GitHub |
| Error Monitoring | Sentry |
| Uptime Monitoring | BetterStack |

---

## Security Measures

- API key secured in Vercel environment variables
- HTTPS encryption
- Anthropic monthly spend limit
- Endpoint whitelist validation — blocks invalid and malicious input
- Password protection with session management
- IP-based rate limiting — 10 requests per hour
- HTTP security headers — CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- CORS policy restricted to trusted origin only
- Sentry error monitoring
- BetterStack uptime monitoring

---

## Security Scan Results

Tested using the Nemesis AI Red Team Scanner — passive surface scan.

| Metric | Result |
|---|---|
| Risk Score | 0/100 |
| Checks Passed | 11 of 11 |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| OWASP API Top 10 | All passing |
| MITRE D3FEND | All passing |

---

## How It Was Built

Built from zero coding experience using Claude as an AI instructor over 5 days.

1. Designed and built the app using Claude
2. Created a repository on GitHub and uploaded the code
3. Deployed live on Vercel with a public URL
4. Secured the API key using Vercel environment variables
5. Added endpoint whitelist validation using Vercel Serverless Functions
6. Added password protection using JavaScript
7. Set up rate limiting using Upstash Redis
8. Connected Sentry for error monitoring
9. Set up uptime monitoring using BetterStack
10. Ran AI Red Team security scan and remediated all findings — achieved 0/100 risk score

---

## Built By

Tabatha — compliance and risk professional demonstrating applied AI development skills.
