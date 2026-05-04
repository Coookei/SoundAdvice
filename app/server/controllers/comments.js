import * as commentQueries from '../queries/comments.js';
import * as postQueries from '../queries/posts.js';
import * as userQueries from '../queries/users.js';
import { recordEvent, AuditEvent } from '../lib/audit.js';
import { sanitiseHtml } from '../lib/sanitize.js';
import { validate, requireString, requirePositiveInt } from '../lib/validate.js';

export const getComments = async (req, res) => {
  const check = validate(() => requirePositiveInt(req.params.id, 'post id'));
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }

  const id = check.value;
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
  const check = validate(() => ({
    id: requirePositiveInt(req.params.id, 'post id'),
    content: requireString(req.body.content, 'Comment', { min: 1, max: 2000, trim: true }),
  }));
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }

  const { id, content } = check.value;

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

  const comment = await commentQueries.create(id, req.userId, sanitiseHtml(content));
  await recordEvent(req, AuditEvent.COMMENT_CREATED, { actorId: req.userId, postId: post.id, commentId: comment.id });
  res.status(201).json({ comment });
};

export const deleteComment = async (req, res) => {
  const check = validate(() => ({
    id: requirePositiveInt(req.params.id, 'post id'),
    commentId: requirePositiveInt(req.params.commentId, 'comment id'),
  }));
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }

  const { id, commentId } = check.value;

  const comment = await commentQueries.findById(commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  if (comment.post_id !== id) {
    // make sure the comment actually belongs to this post
    return res.status(404).json({ error: 'Comment not found' });
  }

  const isAuthor = req.userId === comment.user_id;
  const isAdmin = await userQueries.isAdmin(req.userId);

  // only comment author or admin can delete comments
  if (!isAuthor && !isAdmin) return res.status(404).json({ error: 'Comment not found' }); // 404 to hide existence

  await commentQueries.remove(commentId);
  await recordEvent(req, AuditEvent.COMMENT_DELETED, {
    actorId: req.userId,
    postId: comment.post_id,
    commentId: comment.id,
    detail: isAdmin && !isAuthor ? 'admin delete' : 'author delete',
  });
  res.json({ message: 'Comment deleted' });
};
