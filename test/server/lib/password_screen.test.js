import { expect } from 'chai';
import { screenPassword } from '../../../app/server/lib/password_screen.js';
import { ValidationError } from '../../../app/server/lib/validate.js';

describe('screenPassword', function () {
  it('should reject a very common password', function () {
    expect(() => screenPassword('password123')).to.throw(ValidationError);
  });

  it('should reject common passwords regardless of case', function () {
    expect(() => screenPassword('PASSWORD123')).to.throw(ValidationError);
    expect(() => screenPassword('Qwerty123')).to.throw(ValidationError);
  });

  it('should let a strong unique password through', function () {
    expect(() => screenPassword('st0ng-p12983823asswrod1as')).to.not.throw();
  });

  it('should reject a password that contains the username', function () {
    expect(() => screenPassword('AliceSecret12345677', { username: 'alice' })).to.throw(ValidationError);
  });

  it('should reject a password that contains the email local part', function () {
    expect(() => screenPassword('bob.smithiscool', { email: 'bob.smith@example.com' })).to.throw(ValidationError);
  });

  it('should match username case insensitively', function () {
    expect(() => screenPassword('ALICEisamazing', { username: 'alice' })).to.throw(ValidationError);
  });

  it('should allow a password unrelated to username or email', function () {
    expect(() => screenPassword('a1b2c3d4e5f6g7h8', { username: 'alice', email: 'alice@example.com' })).to.not.throw();
  });

  it('should not crash if opts is missing', function () {
    expect(() => screenPassword('a1b2c3d4e5f6g7h8')).to.not.throw();
  });
});
