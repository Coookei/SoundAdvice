import { expect } from 'chai';
import { createComment, deleteComment, getComments } from '../../../app/server/controllers/comments.js';
import pool from '../../../app/server/db.js';

describe('Testing getComments', () => {
  it('should return comments for an approved post', async () => {
    // 2 db calls: first is post findById, second is findByPostId for the comments
    let call = 0;
    pool.query = async () => {
      call++;
      if (call === 1) {
        return { rows: [{ id: 1, title: 'Title', status: 'approved', user_id: 1 }] };
      } else {
        return {
          rows: [
            { id: 1, post_id: 1, user_id: 2, content: 'cool', username: 'tom', created_at: new Date() },
            { id: 2, post_id: 1, user_id: 3, content: 'nice', username: 'alice', created_at: new Date() },
          ],
        };
      }
    };

    // mock express req and res objects
    const req = { params: { id: '1' } };
    const res = {
      json: (data) => {
        res.body = data;
      },
    };

    await getComments(req, res);
    

    expect(res.body.comments).to.be.an('array');
    expect(res.body.comments.length).to.equal(2);
  });

  it('should return 404 when post doesnt exist', async () => {
    // empty rows means no post found
    pool.query = async () => ({ rows: [] });

    const req = { params: { id: '999' } };
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await getComments(req, res);

    expect(res.statusCode).to.equal(404);
    expect(res.body.error).to.equal('Post not found');
  });

  it('should return 404 for pending post when user is a guest', async () => {
    // post is pending and no user id means is a guest. its 404 to hide the fact that the post even exists
    pool.query = async () => ({
      rows: [{ id: 1, title: 'Title', status: 'pending', user_id: 5 }],
    });

    const req = { params: { id: '1' } }; // no user id so is guest
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await getComments(req, res);

    expect(res.statusCode).to.equal(404);
  });

  it('should return comments for pending post when user is the author', async () => {
    // author should be able to see comments on their own pending post
    let call = 0;
    pool.query = async () => {
      call++;
      if (call === 1) {
        return { rows: [{ id: 1, title: 'Title', status: 'pending', user_id: 7 }] };
      } else if (call === 2) {
        return { rows: [{ is_admin: false }] }; // not an admin but is the author
      } else {
        return {
          rows: [{ id: 1, post_id: 1, user_id: 8, content: 'nice', username: 'tom', created_at: new Date() }], // comments for the pending post
        };
      }
    };

    // userid 7 matches the post author id
    const req = { params: { id: '1' }, userId: 7 };
    const res = {
      json: (data) => {
        res.body = data;
      },
    };

    await getComments(req, res);

    expect(res.body.comments).to.be.an('array');
    expect(res.body.comments.length).to.equal(1);
  });
});

describe('Testing createComment', () => {
  it('should return 400 if content is missing', async () => {
    // empty body so should fail the val check
    const req = { params: { id: '1' }, body: {}, userId: 1 };
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await createComment(req, res);

    expect(res.statusCode).to.equal(400);
    expect(res.body.error).to.equal('Comment is required');
  });

  it('should return 400 if content is over 2000 chars', async () => {
    const longContent = 'a'.repeat(2001); // string thats over our limit
    const req = { params: { id: '1' }, body: { content: longContent }, userId: 1 };
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await createComment(req, res);

    expect(res.statusCode).to.equal(400);
    expect(res.body.error).to.equal('Comment must be under 2000 characters');
  });

  it('should return 404 if post doesnt exist', async () => {
    pool.query = async () => ({ rows: [] }); // no post found

    const req = { params: { id: '999' }, body: { content: 'nice' }, userId: 1 };
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await createComment(req, res);

    expect(res.statusCode).to.equal(404);
  });

  it('should return 404 when not author user tries to comment on a pending post', async () => {
    let call = 0;
    pool.query = async () => {
      call++;
      if (call === 1) {
        return { rows: [{ id: 1, title: 'Title', status: 'pending', user_id: 2 }] };
      } else {
        return { rows: [{ is_admin: false }] };
      }
    };

    // user id 5 is not the post author and not an admin
    const req = { params: { id: '1' }, body: { content: 'nice post' }, userId: 5 };
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await createComment(req, res);

    expect(res.statusCode).to.equal(404);
    expect(res.body.error).to.equal('Post not found');
  });

  it('should return 403 when author tries to comment on their own pending post', async () => {
    let call = 0;
    pool.query = async () => {
      call++;
      if (call === 1) {
        return { rows: [{ id: 1, title: 'Title', status: 'pending', user_id: 1 }] };
      } else {
        return { rows: [{ is_admin: false }] };
      }
    };

    // user id 1 matches post author so is author
    const req = { params: { id: '1' }, body: { content: 'nice' }, userId: 1 };
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await createComment(req, res);

    expect(res.statusCode).to.equal(403);
    expect(res.body.error).to.equal('Comments are only allowed on approved posts');
  });

  it('should create a comment and return 201', async () => {
    let call = 0;
    pool.query = async () => {
      call++;
      if (call === 1) {
        return { rows: [{ id: 1, title: 'Title', status: 'approved', user_id: 2 }] }; // comments post
      } else {
        return { rows: [{ id: 5, post_id: 1, user_id: 1, content: 'nice', created_at: new Date() }] }; // newly created comment
      }
    };

    const req = { params: { id: '1' }, body: { content: 'nice' }, userId: 1 }; // authd user with id 1
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await createComment(req, res);

    expect(res.statusCode).to.equal(201);
    expect(res.body.comment.content).to.equal('nice');
  });
});

describe('Testing deleteComment', () => {
  it('should return 404 when comment doesnt exist', async () => {
    pool.query = async () => ({ rows: [] }); // no comment found

    const req = { params: { id: '1', commentId: '999' }, userId: 1 };
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await deleteComment(req, res);

    expect(res.statusCode).to.equal(404);
    expect(res.body.error).to.equal('Comment not found');
  });

  it('should return 404 when comment post_id doesnt match the url post id param', async () => {
    pool.query = async () => ({
      rows: [{ id: 10, post_id: 5, user_id: 1, content: 'nice' }],
    });

    // id 3 doesnt match post id 5!
    const req = { params: { id: '3', commentId: '10' }, userId: 1 };
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await deleteComment(req, res);

    expect(res.statusCode).to.equal(404);
  });

  it('should return 404 when user is not author and not admin', async () => {
    let call = 0;
    pool.query = async () => {
      call++;
      if (call === 1) {
        return { rows: [{ id: 10, post_id: 1, user_id: 99, content: 'nice' }] };
      } else {
        return { rows: [{ is_admin: false }] };
      }
    };

    // user id 5 is not the comment author and is not an admin
    const req = { params: { id: '1', commentId: '10' }, userId: 5 };
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await deleteComment(req, res);

    expect(res.statusCode).to.equal(404);
  });

  it('should delete comment when user is the author', async () => {
    let call = 0;
    pool.query = async () => {
      call++;
      if (call === 1) {
        return { rows: [{ id: 10, post_id: 1, user_id: 1, content: 'nice' }] };
      } else if (call === 2) {
        return { rows: [{ is_admin: false }] }; // not admin but is the author
      } else {
        return { rows: [] }; // delte has no return
      }
    };

    const req = { params: { id: '1', commentId: '10' }, userId: 1 };
    const res = {
      json: (data) => {
        res.body = data;
      },
    };

    await deleteComment(req, res);

    expect(res.body.message).to.equal('Comment deleted');
  });

  it('should delete comment when user is admin even if not author', async () => {
    let call = 0;
    pool.query = async () => {
      call++;
      if (call === 1) {
        return { rows: [{ id: 10, post_id: 1, user_id: 99, content: 'nice' }] };
      } else if (call === 2) {
        return { rows: [{ is_admin: true }] }; // is admin
      } else {
        return { rows: [] };
      }
    };

    const req = { params: { id: '1', commentId: '10' }, userId: 1 }; // authd admin user
    const res = {
      json: (data) => {
        res.body = data;
      },
    };

    await deleteComment(req, res);

    expect(res.body.message).to.equal('Comment deleted');
  });
});
