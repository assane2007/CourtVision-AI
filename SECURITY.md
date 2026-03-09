# Security Policy

## Supported Versions

| Version          | Supported          |
| ---------------- | ------------------ |
| 5.3.x            | ✅ Active Support  |
| 5.0.x – 5.2.x    | ⚠️ Critical fixes only |
| 2.0.x            | ❌ End of life     |
| 1.0.x            | ❌ End of life     |

## Security Features

CourtVision AI intègre plusieurs couches de sécurité :

- **Authentication** : JWT via Supabase Auth avec refresh tokens
- **Authorization** : Row Level Security (RLS) sur toutes les tables PostgreSQL
- **API Protection** : Rate limiting (100 req/min), Helmet (headers sécurisés), CORS strict
- **Validation** : Zod validation sur 100% des endpoints (body, params, query)
- **Error Sanitization** : Les erreurs internes (SQL, Supabase) ne sont jamais exposées en production
- **Monitoring** : Sentry pour le tracking d'erreurs et le profiling
- **Encryption** : HTTPS obligatoire en production, données sensibles chiffrées

## Reporting a Vulnerability

We take the security of CourtVision AI seriously. If you believe you have found a security vulnerability, please do NOT open a public issue.

Please report vulnerabilities by emailing **security@courtvision.ai**.

You should receive a response within 48 hours. If the vulnerability is verified, we will work with you to ensure a coordinated disclosure.

### What to include in your report:

- A description of the vulnerability.
- Steps to reproduce the issue.
- Potential impact (if known).
- Your preferred name for attribution (if applicable).

Thank you for helping keep CourtVision AI safe! 🏀
