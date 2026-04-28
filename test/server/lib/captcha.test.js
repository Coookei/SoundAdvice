import { expect } from 'chai';
import { generateCaptcha, verifyCaptcha } from '../../../app/server/lib/captcha.js';

describe('Captcha Verification', function () {
  it('should reject wrong answers and invalid tokens', async function () {
    const { token } = generateCaptcha();
    expect(verifyCaptcha(token, 'wrongword')).to.be.false;
    expect(verifyCaptcha('fake-token', 'music')).to.be.false;
  });

  it('should not allow reuse of captcha tokens', async function () {
    const { token, scrambled } = generateCaptcha();
    const words = ['music', 'sound', 'piano', 'drums', 'notes'];
    const sorted = scrambled.split('').sort().join('');
    const answer = words.find((w) => w.split('').sort().join('') === sorted);

    expect(verifyCaptcha(token, answer)).to.be.true;
    expect(verifyCaptcha(token, answer || 'music')).to.be.false;
  });
});
