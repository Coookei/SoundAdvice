// some static source checks that read source files and search for
// expected strings rather than testing behaviour.
// behaviour tests are in the unit test files

import { expect } from 'chai';
import fs from 'fs';

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

    // "Registration successful" should appear twice - once for real, once for duplicate
    const matches = (src.match(/Registration successful/g) || []).length;
    expect(matches).to.equal(2);
  });
});

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

  it('should set Secure flag on cookies in production', function () {
    const src = fs.readFileSync('app/server/middleware/session.js', 'utf-8');

    expect(src).to.include('Secure');
  });
});

describe('XSS Prevention', function () {
  it('should sanitise post title and content on write', function () {
    const src = fs.readFileSync('app/server/controllers/posts.js', 'utf-8');

    expect(src).to.include("from '../sanitize.js'");
    expect(src).to.include('sanitiseHtml(title)');
    expect(src).to.include('sanitiseHtml(content)');
  });

  it('should sanitise comment content on write', function () {
    const src = fs.readFileSync('app/server/controllers/comments.js', 'utf-8');

    expect(src).to.include("from '../sanitize.js'");
    expect(src).to.include('sanitiseHtml(content');
  });

  it('should not interpolate user data into innerHTML in frontend', function () {
    // innerHTML with ${...} template literals is a stored/reflected XSS vector.
    // empty assignments and static strings don't interpolate so they're fine.
    const jsDir = 'app/public/js';
    const files = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'));

    for (const file of files) {
      const content = fs.readFileSync(`${jsDir}/${file}`, 'utf-8');
      const unsafe = content.match(/innerHTML\s*=\s*`[^`]*\$\{/g);
      expect(unsafe, `${file} interpolates user data into innerHTML`).to.be.null;
    }
  });
});
