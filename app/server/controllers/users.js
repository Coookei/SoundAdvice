import * as userQueries from '../queries/users.js';

export const getUsers = async (req, res) => {
  const users = await userQueries.findAll();
  res.json({ users });
};

export const getUserById = async (req, res) => {
  const { id } = req.params;

  const user = await userQueries.findById(id);

  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({ user });
};
