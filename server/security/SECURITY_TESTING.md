# Security Testing Guide

This document outlines how to test the security features implemented in this application.

## Implemented Security Features

### 1. Input Validation & Sanitization
- ✅ String sanitization (HTML escaping, null byte removal)
- ✅ Email validation and normalization
- ✅ URL validation
- ✅ Integer/Boolean sanitization
- ✅ SQL injection pattern detection
- ✅ Code injection pattern detection

### 2. SQL Injection Prevention
- ✅ Drizzle ORM with parameterized queries
- ✅ No raw SQL string concatenation
- ✅ Input validation before database operations

### 3. XSS Protection
- ✅ Content Security Policy (CSP) headers
- ✅ X-XSS-Protection header
- ✅ HTML sanitization utilities
- ✅ Helmet security middleware

### 4. Rate Limiting
- ✅ General API rate limit: 100 requests / 15 minutes
- ✅ Auth endpoints: 5 attempts / 15 minutes
- ✅ Password reset: 3 requests / hour
- ✅ Email sending: 10 emails / minute
- ✅ File uploads: 20 uploads / hour

### 5. Additional Security Headers
- ✅ X-Frame-Options (clickjacking protection)
- ✅ X-Content-Type-Options (MIME sniffing protection)
- ✅ Referrer-Policy
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ Hide X-Powered-By header

## Manual Testing

### Test SQL Injection Protection

Try these inputs in forms (they should be safely handled):

```
Email field:
- admin'--
- ' OR '1'='1
- '; DROP TABLE users; --
- 1' UNION SELECT * FROM users--

Search field:
- test' OR 1=1--
- '; DELETE FROM leads WHERE '1'='1
```

**Expected Result:** Input is either rejected by validation or safely parameterized by Drizzle ORM.

### Test XSS Protection

Try these inputs in text fields:

```
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<svg onload=alert('XSS')>
javascript:alert('XSS')
<iframe src="javascript:alert('XSS')"></iframe>
```

**Expected Result:** HTML is escaped and rendered as plain text, not executed.

### Test Rate Limiting

1. **API Rate Limit Test:**
   - Make 101 requests to any `/api/` endpoint within 15 minutes
   - Expected: 101st request returns 429 (Too Many Requests)

2. **Auth Rate Limit Test:**
   - Attempt 6 failed logins within 15 minutes
   - Expected: 6th attempt returns 429 with message about login attempts

3. **Password Reset Rate Limit Test:**
   - Request password reset 4 times within 1 hour
   - Expected: 4th request returns 429

### Test Security Headers

Use browser DevTools Network tab or curl:

```bash
curl -I https://www.leadagent.sbs/
```

**Expected Headers:**
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; ...
```

## Automated Testing

### Run Security Tests

```bash
cd /home/ubuntu/lead-discovery-agent
pnpm test server/security/
```

### Test Input Validation

```typescript
import { validateInput, detectSQLInjection, detectCodeInjection } from "./inputValidation";

// Should throw error
try {
  validateInput("'; DROP TABLE users; --", "Test Input");
} catch (error) {
  console.log("✅ SQL injection detected and blocked");
}

// Should throw error
try {
  validateInput("<script>alert('XSS')</script>", "Test Input");
} catch (error) {
  console.log("✅ Code injection detected and blocked");
}
```

## Security Checklist

- [x] Input validation on all user inputs
- [x] SQL injection prevention (Drizzle ORM)
- [x] XSS protection (CSP headers + sanitization)
- [x] Rate limiting on API endpoints
- [x] Security headers (Helmet)
- [x] HTTPS enforcement (HSTS)
- [x] Clickjacking protection (X-Frame-Options)
- [x] MIME sniffing protection
- [ ] Regular security audits
- [ ] Penetration testing
- [ ] Dependency vulnerability scanning (npm audit)

## Recommended Tools

1. **OWASP ZAP** - Automated security testing
2. **Burp Suite** - Manual penetration testing
3. **npm audit** - Check for vulnerable dependencies
4. **Snyk** - Continuous security monitoring

## Security Incident Response

If a security vulnerability is discovered:

1. **Assess Impact:** Determine severity and affected users
2. **Patch Immediately:** Fix the vulnerability ASAP
3. **Notify Users:** If data was compromised, inform affected users
4. **Document:** Record the incident and response for future reference
5. **Review:** Conduct post-mortem to prevent similar issues

## Contact

For security concerns, contact: [Your Security Contact]
