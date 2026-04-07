import * as postQueries from '../queries/posts.js';
import * as userQueries from '../queries/users.js';
import { logPostEvent } from '../log.js';

export const getPosts = async (req, res) => {
  const posts = await postQueries.findAllApproved();
  res.json({ posts });
};

export const getPostById = async (req, res) => {
  const { id } = req.params;
  const post = await postQueries.findById(id);

  if (!post) return res.status(404).json({ error: 'Post not found' });

  if (post.status === 'approved') {
    // approved posts are visible to all including guests
    return res.json({ post });
  }

  // pending/rejected posts only visible to the author or admin
  const isAuthor = req.userId === post.user_id;
  const isAdmin = req.userId ? await userQueries.isAdmin(req.userId) : false;

  if (!isAuthor && !isAdmin) return res.status(404).json({ error: 'Post not found' }); // 404 to avoid reveling the existence of post

  res.json({ post });
};

export const createPost = async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  // create new post with authd users id, default status is pending
  const post = await postQueries.create(req.userId, title, content);
  logPostEvent('post_created', { userId: req.userId, postId: post.id });
  res.status(201).json({ post });
};

export const updatePost = async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  const post = await postQueries.findById(id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  // only post author or an admin can update posts
  const isAuthor = req.userId === post.user_id;
  const isAdmin = await userQueries.isAdmin(req.userId);

  if (!isAuthor && !isAdmin) return res.status(404).json({ error: 'Post not found' }); // hide post existence so instead of 403 forbidden, return 404

  if (post.status === 'rejected' && !isAdmin) {
    return res.status(403).json({ error: 'Rejected posts cannot be edited' });
  }

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  // if an admin updates post, LEAVE state as it, i.e. if approved STAYS approved
  // whereas if user updates post goes back to pending status
  const updated = await postQueries.update(id, title, content, isAdmin ? post.status : 'pending');
  logPostEvent('post_updated', {
    userId: req.userId,
    postId: post.id,
    detail: isAdmin && !isAuthor ? 'admin edit' : 'author edit, status reset to pending',
  });
  res.json({ post: updated });
};

export const deletePost = async (req, res) => {
  const { id } = req.params;

  const post = await postQueries.findById(id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  // post author or admin can delete posts
  const isAuthor = req.userId === post.user_id;
  const isAdmin = await userQueries.isAdmin(req.userId);

  if (!isAuthor && !isAdmin) return res.status(404).json({ error: 'Post not found' }); // hide post existence so instead of 403 forbidden, return 404

  await postQueries.remove(id);
  logPostEvent('post_deleted', {
    userId: req.userId,
    postId: post.id,
    detail: isAdmin && !isAuthor ? 'admin delete' : 'author delete',
  });
  res.json({ message: 'Post deleted' });
};

export const getMyPosts = async (req, res) => {
  const posts = await postQueries.findByUserId(req.userId);
  res.json({ posts });
};

export const getAdminPosts = async (req, res) => {
  const posts = await postQueries.findAll();
  res.json({ posts });
};

export const updatePostStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: 'Status must be approved or rejected' });
  }

  const post = await postQueries.findById(id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  // admins can update post status to approved or rejected only
  const updated = await postQueries.updateStatus(id, status);
  logPostEvent('post_status_changed', { userId: req.userId, postId: post.id, detail: status });
  res.json({ post: updated });
};
