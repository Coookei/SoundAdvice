const isJsonSyntaxError = (err) =>
  err instanceof SyntaxError && "body" in err;

export const errorHandler = (
  err,
  req,
  res,
  next
) => {
  if (isJsonSyntaxError(err)) {
    res.status(400).json({ error: "Invalid JSON payload" });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};

export const notFoundHandler = (
  req,
  res,
  next
) => {
  res.status(404).json({ error: "Not Found" });
};
