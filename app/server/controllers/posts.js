import * as postQueries from '../queries/posts.js';
import * as userQueries from '../queries/users.js';
import { recordEvent, AuditEvent } from '../lib/audit.js';
import { sanitiseHtml } from '../lib/sanitize.js';
import { parseFileUpload, saveUpload, deleteUpload } from '../lib/upload.js';
import { validate, requireString, requirePositiveInt, requireOneOf } from '../lib/validate.js';

// get all approved posts, used for the homepage
export const getPosts = async (req, res) => {
  const posts = await postQueries.findAllApproved();
  res.json({ posts });
};

// get single approved post by its id
export const getPostById = async (req, res) => {
  const check = validate(() => requirePositiveInt(req.params.id, 'post id'));
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }

  const id = check.value;
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

// get all APPROVED public posts by user Id (for public profile page)
export const getPostByUser = async (req, res) => {
  const check = validate(() => requirePositiveInt(req.params.userId, 'user id'));
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }

  const userId = check.value;
  const posts = await postQueries.findByUser(userId);
  res.json({ posts });
};

// get ALL posts of all statuses for the current logged in user
export const getMyPosts = async (req, res) => {
  const posts = await postQueries.findByUserId(req.userId);
  res.json({ posts });
};

// get all posts no matter the status, used for the admin panel
export const getAdminPosts = async (req, res) => {
  const posts = await postQueries.findAll();
  res.json({ posts });
};

// a create or edit request comes in as plain json, or as multipart form data when theres an image attached
// so this pulls out the body fields and the file (if is one) from whichever one it is
async function readPostInput(req) {
  const contentType = req.headers?.['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    const upload = await parseFileUpload(req);
    return { body: upload.fields, fileBuffer: upload.fileBuffer, fileExt: upload.fileExt };
  }
  return { body: req.body, fileBuffer: null, fileExt: null }; // its just normal json
}

export const createPost = async (req, res) => {
  let body, fileBuffer, fileExt;
  try {
    ({ body, fileBuffer, fileExt } = await readPostInput(req));
  } catch (err) {
    // bad image, eg too big or not a png/jpeg
    return res.status(400).json({ error: err.message });
  }

  const check = validate(() => ({
    title: requireString(body?.title, 'Title', { min: 1, max: 200, trim: true }),
    content: requireString(body?.content, 'Content', { min: 1, max: 20000, trim: true }),
  }));
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }

  const { title, content } = check.value;

  // sanitise on write so stored content can only contain whitelisted tags
  const safeTitle = sanitiseHtml(title);
  const safeContent = sanitiseHtml(content);

  // if they uploaded an image save it and keep the path to store on the post
  let imagePath = null;
  if (fileBuffer) {
    imagePath = await saveUpload(fileBuffer, `post_${req.userId}_${Date.now()}.${fileExt}`);
  }

  // create new post with authd users id, default status is pending
  const post = await postQueries.create(req.userId, safeTitle, safeContent, imagePath);
  await recordEvent(req, AuditEvent.POST_CREATED, { actorId: req.userId, postId: post.id });
  res.status(201).json({ post });
};

export const updatePost = async (req, res) => {
  // validate post id first, then run ownership/status checks before validating the body, to prevent probing existence
  const idCheck = validate(() => requirePositiveInt(req.params.id, 'post id'));
  if (!idCheck.ok) {
    return res.status(400).json({ error: idCheck.error });
  }
  const id = idCheck.value;

  const post = await postQueries.findById(id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  // only post author or an admin can update posts
  const isAuthor = req.userId === post.user_id;
  const isAdmin = await userQueries.isAdmin(req.userId);

  if (!isAuthor && !isAdmin) return res.status(404).json({ error: 'Post not found' }); // hide post existence so instead of 403 forbidden, return 404

  if (post.status === 'rejected' && !isAdmin) {
    return res.status(403).json({ error: 'Rejected posts cannot be edited' });
  }

  // same as creating, the edit might have a new image so it could be form data or json
  let body, fileBuffer, fileExt;
  try {
    ({ body, fileBuffer, fileExt } = await readPostInput(req));
  } catch (err) {
    // bad image, eg too big or not a png/jpeg
    return res.status(400).json({ error: err.message });
  }

  const bodyCheck = validate(() => ({
    title: requireString(body?.title, 'Title', { min: 1, max: 200, trim: true }),
    content: requireString(body?.content, 'Content', { min: 1, max: 20000, trim: true }),
  }));
  if (!bodyCheck.ok) {
    return res.status(400).json({ error: bodyCheck.error });
  }

  const { title, content } = bodyCheck.value;

  const safeTitle = sanitiseHtml(title);
  const safeContent = sanitiseHtml(content);

  let imagePath = post.image_path ?? null; // get the current image for this post

  if (fileBuffer) {
    // if user uploaded a new image, save it and delete the old one if there was one
    imagePath = await saveUpload(fileBuffer, `post_${req.userId}_${Date.now()}.${fileExt}`);
    if (post.image_path) {
      await deleteUpload(post.image_path);
    }
  } else if (body?.removeImage === 'true' && post.image_path) {
    // otherwise if user ticked the remove image box, and the post does have an image, delete it
    await deleteUpload(post.image_path);
    imagePath = null;
  }

  // if an admin updates post, LEAVE state as it, i.e. if approved STAYS approved
  // whereas if user updates post goes back to pending status
  const updated = await postQueries.update(id, safeTitle, safeContent, imagePath, isAdmin ? post.status : 'pending');
  await recordEvent(req, AuditEvent.POST_UPDATED, {
    actorId: req.userId,
    postId: post.id,
    detail: isAdmin && !isAuthor ? 'admin edit' : 'author edit',
  });
  res.json({ post: updated });
};

export const deletePost = async (req, res) => {
  const check = validate(() => requirePositiveInt(req.params.id, 'post id'));
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }

  const id = check.value;

  const post = await postQueries.findById(id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  // post author or admin can delete posts
  const isAuthor = req.userId === post.user_id;
  const isAdmin = await userQueries.isAdmin(req.userId);

  if (!isAuthor && !isAdmin) return res.status(404).json({ error: 'Post not found' }); // hide post existence so instead of 403 forbidden, return 404

  await postQueries.remove(id);
  await recordEvent(req, AuditEvent.POST_DELETED, {
    actorId: req.userId,
    postId: post.id,
    detail: isAdmin && !isAuthor ? 'admin delete' : 'author delete',
  });
  res.json({ message: 'Post deleted' });
};

export const updatePostStatus = async (req, res) => {
  const check = validate(() => ({
    id: requirePositiveInt(req.params.id, 'post id'),
    status: requireOneOf(req.body?.status, ['approved', 'rejected'], 'Status'),
  }));
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }

  const { id, status } = check.value;

  const post = await postQueries.findById(id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  // admins can update post status to approved or rejected only
  const updated = await postQueries.updateStatus(id, status);
  await recordEvent(req, AuditEvent.POST_STATUS_CHANGED, {
    actorId: req.userId,
    postId: post.id,
    detail: `${post.status} to ${status}`,
  });
  res.json({ post: updated });
};

export const searchPosts = async (req, res) => {
  // we encoded the query in URL on search page using encodeURIComponent(), but Express decodes params itself, so dont need to manually here
  const check = validate(() => requireString(req.query.q, 'Query', { min: 1, max: 100, trim: true })); // limit q to 100 to prevent huge ILIKE queries that can be slow
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }

  const query = check.value;

  const posts = await postQueries.searchApproved(query);
  res.json({ posts });
};
