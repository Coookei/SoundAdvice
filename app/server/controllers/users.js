export const getUsers = (req, res) => {
  res.json({ users: [] });
};

export const getUserById = (req, res) => {
  const { id } = req.params;
  res.json({ user: { id } });
};
