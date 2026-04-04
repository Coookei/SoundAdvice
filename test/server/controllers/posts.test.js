import { expect } from 'chai';
import { getPosts } from '../../../app/server/controllers/posts.js';
import pool from '../../../app/server/db.js';

describe('Testing getPosts', function () {
  it('should return a list of posts', async function () {
    // mock database response
    pool.query = async () => ({
      rows: [
        { id: 1, title: 'First Post', status: 'approved' },
        { id: 2, title: 'Second Post', status: 'approved' },
      ],
    });

    var req = {};
    var res = {
      json: function (data) {
        res.body = data;
      },
    };

    // call function we testing with mocked req and res
    await getPosts(req, res);

    // assertions!
    expect(res.body.posts).to.be.an('array');
    expect(res.body.posts.length).to.equal(2);
  });
});

describe('Testing getPostById', function () {});
