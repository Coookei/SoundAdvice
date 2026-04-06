// import database query functions for posts 
import * as postQueries from '../queries/posts.js';

// get all approved posts 
export const getPosts = async (req, res) => {
  const posts = await postQueries.findAllApproved();
  res.json({ posts });
};

// get single approved post by its ID 
export const getPostById = async (req, res) => {
  const { id } = req.params;
  const post = await postQueries.findApprovedById(id);

  if (!post) return res.status(404).json({ error: 'Post not found' });

  res.json({ post });
};

// get all posts by user ID 
export const getPostByUser = async (req, res) => {
  const {userId} = req.params;

  const posts = await postQueries.findByUser(userId);

  res.json({posts});
}; 
