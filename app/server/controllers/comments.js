import * as commentQueries from '../queries/comments.js';
import * as postQueries from '../queries/posts.js';
import * as userQueries from '../queries/users.js';
import { logPostEvent } from '../lib/log.js';
import { sanitiseHtml } from '../lib/sanitize.js';

export const getComments = async (req, res) => {
  const { id } = req.params;
  const post = await postQueries.findById(id);

  if (!post) return res.status(404).json({ error: 'Post not found' });

  if (post.status === 'approved') {
    // publicly, for posts we only show posts that are approved,
    // so for comment we can only return comments if the post itself is approved
    const comments = await commentQueries.findByPostId(id);
    return res.json({ comments });
  }

  // for pending/rejected posts, the comments are only visible to the author or admin
  const isAuthor = req.userId === post.user_id;
  const isAdmin = req.userId ? await userQueries.isAdmin(req.userId) : false;

  if (!isAuthor && !isAdmin) return res.status(404).json({ error: 'Post not found' }); // 404 to avoid reveling the existence of post

  const comments = await commentQueries.findByPostId(id);
  res.json({ comments });
};

export const createComment = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  // starting server side validation but will improve across all routes in v short future
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment is required' });
  }

  if (content.trim().length > 2000) {
    return res.status(400).json({ error: 'Comment must be under 2000 characters' });
  }

  const post = await postQueries.findById(id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  // only allow creating new comments on approved posts
  if (post.status !== 'approved') {
    const isAuthor = req.userId === post.user_id;
    const isAdmin = await userQueries.isAdmin(req.userId);
    if (!isAuthor && !isAdmin) {
      return res.status(404).json({ error: 'Post not found' }); // 404 to avoid reveling the existence of post
    }
    return res.status(403).json({ error: 'Comments are only allowed on approved posts' }); // informative for author/admin
  }

  const comment = await commentQueries.create(id, req.userId, sanitiseHtml(content.trim()));
  logPostEvent('comment_created', { userId: req.userId, postId: post.id, commentId: comment.id });
  res.status(201).json({ comment });
};

export const deleteComment = async (req, res) => {
  const { id, commentId } = req.params;

  const comment = await commentQueries.findById(commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  if (comment.post_id !== parseInt(id)) {
    // make sure the comment actually belongs to this post
    return res.status(404).json({ error: 'Comment not found' });
  }

  const isAuthor = req.userId === comment.user_id;
  const isAdmin = await userQueries.isAdmin(req.userId);

  // only comment author or admin can delete comments
  if (!isAuthor && !isAdmin) return res.status(404).json({ error: 'Comment not found' }); // 404 to hide existence

  await commentQueries.remove(commentId);
  logPostEvent('comment_deleted', {
    userId: req.userId,
    postId: comment.post_id,
    commentId: comment.id,
    detail: isAdmin && !isAuthor ? 'admin delete' : 'author delete',
  });
  res.json({ message: 'Comment deleted' });
};
