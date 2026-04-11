import { expect } from 'chai';
import {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getMyPosts,
  getAdminPosts,
  updatePostStatus,
  searchPosts,
} from '../../../app/server/controllers/posts.js';
import pool from '../../../app/server/db.js';

describe('Testing getPosts', () => {
  it('should return a list of posts', async () => {
    // mock database response for couple posts
    pool.query = async () => ({
      rows: [
        { id: 1, title: 'First Post', status: 'approved' },
        { id: 2, title: 'Second Post', status: 'approved' },
      ],
    });

    // mock the express req and res objects
    const req = {}; // dont need any params or body of request
    const res = {
      // controller calls res.json which sends the data
      // so to imitate we take data and set to res.body
      json: (data) => {
        res.body = data;
      },
    };

    // call the controller function we testing with mocked db, req and res
    await getPosts(req, res);

    // assertions!
    expect(res.body.posts).to.be.an('array');
    expect(res.body.posts.length).to.equal(2);
  });
});

describe('Testing getPostById', () => {
  it('should return the post when it is approved', async () => {
    // mock database response for approved post
    pool.query = async () => ({
      rows: [{ id: 1, title: 'First Post', status: 'approved' }],
    });

    // mock the express req and res objects
    const req = { params: { id: '1' } };
    const res = {
      json: (data) => {
        res.body = data;
      },
    };

    // call the controller function we testing with mocked db, req and res
    await getPostById(req, res);

    // assert, do deep comparison to compare actual contents!, not just memory ref
    expect(res.body.post).to.deep.equal({ id: 1, title: 'First Post', status: 'approved' });
  });

  it('should return 404 when post doesnt exist', async () => {
    // empty rows so no post found
    pool.query = async () => ({ rows: [] });

    const req = { params: { id: '999' } };
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res; // have to return as is chained in controller like res.status(404).json
      },
      json: (data) => {
        res.body = data;
      },
    };

    await getPostById(req, res);

    expect(res.statusCode).to.equal(404);
    expect(res.body.error).to.equal('Post not found');
  });

  it('should return 404 when post is pending and user is guest', async () => {
    // post exists but is pending, and no userId means is guest
    pool.query = async () => ({
      rows: [{ id: 1, title: 'Draft Post', status: 'pending', user_id: 999 }],
    });

    const req = { params: { id: '1' } };
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await getPostById(req, res);

    expect(res.statusCode).to.equal(404);
  });
});

describe('Testing createPost', () => {
  it('should return 400 if title is missing', async () => {
    const req = { body: { content: 'some content' }, userId: 1 };
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await createPost(req, res);

    expect(res.statusCode).to.equal(400);
    expect(res.body.error).to.equal('Title and content are required');
  });

  it('should return 400 if content is missing', async () => {
    const req = { body: { title: 'A title' }, userId: 1 };
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await createPost(req, res);

    expect(res.statusCode).to.equal(400);
  });

  it('should create a post and return 201', async () => {
    // mock the db returning the newly created post
    pool.query = async () => ({
      rows: [{ id: 5, title: 'New Post', content: 'hello world', status: 'pending' }],
    });

    const req = { body: { title: 'New Post', content: 'hello world' }, userId: 1 }; // authd user with id 1
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await createPost(req, res);

    expect(res.statusCode).to.equal(201);
    expect(res.body.post.title).to.equal('New Post');
  });
});

describe('Testing updatePost', () => {
  it('should return 404 when post doesnt exist', async () => {
    pool.query = async () => ({ rows: [] });

    const req = { params: { id: '1' }, body: { title: 'Updated', content: 'Updated content' }, userId: 1 };
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await updatePost(req, res);

    expect(res.statusCode).to.equal(404);
  });

  it('should return 404 when user is not author', async () => {
    // have 2 DB calls
    // first call is findById, second is isAdmin check
    let call = 0;
    pool.query = async () => {
      call++;
      if (call === 1) {
        return { rows: [{ id: 1, user_id: 99, status: 'approved', title: 'Post', content: 'Content' }] };
      } else {
        return { rows: [{ is_admin: false }] };
      }
    };

    // userId 5 is not post author, and not an admin
    const req = { params: { id: '1' }, body: { title: 'Updated', content: 'Updated content' }, userId: 5 };
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await updatePost(req, res);

    expect(res.statusCode).to.equal(404);
  });

  it('should update the post when user is author', async () => {
    // need to mock 3 db calls: findById, isAdmin, update
    let call = 0;
    pool.query = async () => {
      call++;
      if (call === 1) {
        return { rows: [{ id: 1, user_id: 1, status: 'approved', title: 'Old Title', content: 'Old content' }] };
      } else if (call === 2) {
        return { rows: [{ is_admin: false }] }; // isAdmin check
      } else {
        // update post has new title and content, and status reset to pending
        return { rows: [{ id: 1, title: 'Updated Title', content: 'New content', status: 'pending' }] }; // update result
      }
    };

    // user id now matches the post author id
    const req = { params: { id: '1' }, body: { title: 'Updated Title', content: 'New content' }, userId: 1 };
    const res = {
      json: (data) => {
        res.body = data;
      },
    };

    await updatePost(req, res);

    expect(res.body.post.title).to.equal('Updated Title');
    expect(res.body.post.status).to.equal('pending'); // user edits should reset status to pending
  });
});

describe('Testing deletePost', () => {
  it('should return 404 when post doesnt exist', async () => {
    pool.query = async () => ({ rows: [] });

    const req = { params: { id: '999' }, userId: 1 };
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await deletePost(req, res);

    expect(res.statusCode).to.equal(404);
  });

  it('should delete the post and return a success message', async () => {
    // 3 db calls to mock again
    let call = 0;
    pool.query = async () => {
      call++;
      if (call === 1) {
        return { rows: [{ id: 1, user_id: 1, title: 'Post to delete' }] }; // findById
      } else if (call === 2) {
        return { rows: [{ is_admin: false }] }; // isAdmin check
      } else {
        return { rows: [] }; // remove has no return
      }
    };

    const req = { params: { id: '1' }, userId: 1 };
    const res = {
      json: (data) => {
        res.body = data;
      },
    };

    await deletePost(req, res);

    expect(res.body.message).to.equal('Post deleted');
  });
});

describe('Testing getMyPosts', () => {
  it('should return posts for the logged in user', async () => {
    pool.query = async () => ({
      rows: [
        { id: 1, title: 'My Post', status: 'approved', user_id: 3 },
        { id: 2, title: 'My Draft', status: 'pending', user_id: 3 },
      ],
    });

    const req = { userId: 3 };
    const res = {
      json: (data) => {
        res.body = data;
      },
    };

    await getMyPosts(req, res);

    expect(res.body.posts).to.be.an('array');
    expect(res.body.posts.length).to.equal(2);
  });
});

describe('Testing getAdminPosts', () => {
  it('should return all posts no matter what status', async () => {
    pool.query = async () => ({
      rows: [
        { id: 1, title: 'Approved Post', status: 'approved' },
        { id: 2, title: 'Pending Post', status: 'pending' },
        { id: 3, title: 'Rejected Post', status: 'rejected' },
      ],
    });

    const req = {};
    const res = {
      json: (data) => {
        res.body = data;
      },
    };

    await getAdminPosts(req, res);

    expect(res.body.posts).to.be.an('array');
    expect(res.body.posts.length).to.equal(3);
  });
});

describe('Testing updatePostStatus', () => {
  it('should return 400 for an invalid status', async () => {
    const req = { params: { id: '1' }, body: { status: 'banana' } };
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await updatePostStatus(req, res);

    expect(res.statusCode).to.equal(400);
    expect(res.body.error).to.equal('Status must be approved or rejected');
  });

  it('should update the post status', async () => {
    // 2 db calls to mock: findById and updateStatus
    let call = 0;
    pool.query = async () => {
      call++;
      if (call === 1) {
        return { rows: [{ id: 1, title: 'A Post', status: 'pending' }] }; // findById
      } else {
        return { rows: [{ id: 1, title: 'A Post', status: 'approved' }] }; // updateStatus
      }
    };

    const req = { params: { id: '1' }, body: { status: 'approved' } };
    const res = {
      json: (data) => {
        res.body = data;
      },
    };

    await updatePostStatus(req, res);

    expect(res.body.post.status).to.equal('approved');
  });
});

describe('Testing searchPosts', () => {
  it('should return matching posts for a query', async () => {
    pool.query = async () => ({
      rows: [{ id: 1, title: 'Music tips', content: 'some music content', status: 'approved' }],
    });

    const req = { query: { q: 'music' } }; // pass in searh query like url as ?q=music
    const res = {
      json: (data) => {
        res.body = data;
      },
    };

    await searchPosts(req, res);

    expect(res.body.posts).to.be.an('array');
    expect(res.body.posts.length).to.equal(1);
  });

  it('should return 400 if query is missing', async () => {
    const req = { query: {} }; // no query so the function should trigger first if statement, and return 400
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.body = data;
      },
    };

    await searchPosts(req, res);

    expect(res.statusCode).to.equal(400);
    expect(res.body.error).to.equal('Query is required');
  });
});
