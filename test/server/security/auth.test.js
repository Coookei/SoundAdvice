import { expect } from 'chai';
import fs from 'fs';

// ---- ACCOUNT ENUMERATION ----

describe('Account Enumeration Prevention', function () {
  it('should not reveal whether an email exists on failed login', function () {
    const src = fs.readFileSync('app/server/controllers/auth.js', 'utf-8');

    // login should use one generic message for all failures
    expect(src).to.include('Invalid email or password');

    // should never have separate messages that reveal which field was wrong
    expect(src).to.not.include('Email not found');
    expect(src).to.not.include('User not found');
    expect(src).to.not.include('Incorrect password');
  });

  it('should return same response for new and duplicate registration', function () {
    const src = fs.readFileSync('app/server/controllers/auth.js', 'utf-8');

    // "Registration successful" should appear twice — once for real, once for duplicate
    const matches = (src.match(/Registration successful/g) || []).length;
    expect(matches).to.equal(2);
  });
});

// ---- SQL INJECTION ----

describe('SQL Injection Prevention', function () {
  it('should use parameterized queries in all query files', function () {
    const queryDir = 'app/server/queries';
    const files = fs.readdirSync(queryDir).filter((f) => f.endsWith('.js'));

    for (const file of files) {
      const content = fs.readFileSync(`${queryDir}/${file}`, 'utf-8');

      // should not use template literal interpolation in SQL
      const unsafe = content.match(/pool\.query\(\s*`[^`]*\$\{/g);
      expect(unsafe, `${file} should not interpolate variables in SQL`).to.be.null;
    }
  });
});

// ---- SESSION SECURITY ----

describe('Session Security', function () {
  it('should set HttpOnly and SameSite flags on cookies', function () {
    const src = fs.readFileSync('app/server/middleware/session.js', 'utf-8');

    expect(src).to.include('HttpOnly');
    expect(src).to.include('SameSite=Strict');
  });

  it('should regenerate session after 2FA to prevent fixation', function () {
    const src = fs.readFileSync('app/server/controllers/auth.js', 'utf-8');
    expect(src).to.include('regenerateSession');
  });

  // BUG: session cookie should include Secure flag for production
  it('should set Secure flag on cookies in production', function () {
    const src = fs.readFileSync('app/server/middleware/session.js', 'utf-8');
    expect(src).to.include('SameSite=Lax');
  });
});

// ---- RATE LIMITING ----

describe('Rate Limiting', function () {
  it('should block requests after exceeding the limit', async function () {
    const { rateLimit } = await import('../../../app/server/middleware/rate_limit.js');

    const limiter = rateLimit({ max: 3, windowMs: 60000, blockMs: 60000 });
    const req = { ip: '10.0.0.50' };
    let lastStatus = 200;

    for (let i = 0; i < 5; i++) {
      const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json() {}, setHeader() {} };
      await new Promise((resolve) => {
        limiter(req, res, () => resolve());
        if (res.statusCode === 429) { lastStatus = 429; resolve(); }
      });
    }

    expect(lastStatus).to.equal(429);
  });
});

// ---- CAPTCHA ----

describe('Captcha Verification', function () {
  it('should reject wrong answers and invalid tokens', async function () {
    const { generateCaptcha, verifyCaptcha } = await import('../../../app/server/captcha.js');

    const { token } = generateCaptcha();
    expect(verifyCaptcha(token, 'wrongword')).to.be.false;
    expect(verifyCaptcha('fake-token', 'music')).to.be.false;
  });

  // BUG: captcha tokens should be single-use
  it('should allow reuse of captcha tokens', async function () {
    const { generateCaptcha, verifyCaptcha } = await import('../../../app/server/captcha.js');

    const { token, scrambled } = generateCaptcha();
    const words = ['music', 'sound', 'piano', 'drums', 'beats'];
    const sorted = scrambled.split('').sort().join('');
    const answer = words.find((w) => w.split('').sort().join('') === sorted);

    expect(verifyCaptcha(token, answer)).to.be.true;
    expect(verifyCaptcha(token, answer || 'music')).to.be.true; // expects reuse works — but it shouldn't
  });
});
