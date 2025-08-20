export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const code =
    err.code || (status === 500 ? "INTERNAL_SERVER_ERROR" : "UNKNOWN");
  const message = err.message || "Unexpected error";
  res.status(status).json({ error: { code, message } });
}
