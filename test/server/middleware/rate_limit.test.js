import { expect } from 'chai';
import { rateLimit } from '../../../app/server/middleware/rate_limit.js';

describe('Rate Limiting', function () {
  it('should block requests after exceeding the limit', async function () {
    const limiter = rateLimit({ max: 3, windowMs: 60000, blockMs: 60000 });
    const req = { ip: '10.0.0.50' };
    let lastStatus = 200;

    for (let i = 0; i < 5; i++) {
      const res = {
        statusCode: 200,
        status(c) {
          this.statusCode = c;
          return this;
        },
        json() {},
        setHeader() {},
      };
      await new Promise((resolve) => {
        limiter(req, res, () => resolve());

        if (res.statusCode === 429) {
          lastStatus = 429;
          resolve();
        }
      });
    }

    expect(lastStatus).to.equal(429);
  });
});
