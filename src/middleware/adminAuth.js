export function adminAuth(req, res, next) {
  const token = process.env.ADMIN_TOKEN;
  const auth = req.headers.authorization || "";
  const [scheme, value] = auth.split(" ");

  if (!token) {
    return res.status(500).json({
      error: {
        code: "SERVER_NOT_CONFIGURED",
        message: "ADMIN_TOKEN is not set",
      },
    });
  }
  if (scheme !== "Bearer" || value !== token) {
    return res
      .status(401)
      .json({
        error: { code: "UNAUTHORIZED", message: "Invalid or missing token" },
      });
  }
  next();
}
