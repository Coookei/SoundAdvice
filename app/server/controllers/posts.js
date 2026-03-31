import * as postQueries from '../queries/posts.js';

export const getPosts = async (req, res) => {
  const posts = await postQueries.findAllApproved();
  res.json({ posts });
};

export const getPostById = async (req, res) => {
  const { id } = req.params;
  const post = await postQueries.findById(id);

  if (!post) return res.status(404).json({ error: 'Post not found' });

  res.json({ post });
};
