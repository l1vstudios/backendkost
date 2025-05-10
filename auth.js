const crypto = require("crypto");

const ORIGINAL_TOKEN = "codepenakost2025";
const SECRET_KEY = "codepenabase";

function generateHash(token, secret) {
  return crypto
    .createHash("sha256")
    .update(token + secret)
    .digest("hex");
}

function verifyToken(req, res, next) {
  const clientHash = req.headers["token"];
  if (!clientHash) {
    return res.status(401).json({ message: "Token tidak ditemukan di header" });
  }

  const expectedHash = generateHash(ORIGINAL_TOKEN, SECRET_KEY);
  if (clientHash !== expectedHash) {
    return res.status(403).json({ message: "Token tidak valid" });
  }

  next();
}

module.exports = verifyToken;

if (require.main === module) {
  const hash = generateHash(ORIGINAL_TOKEN, SECRET_KEY);
  console.log("Hashed token to use in header:");
  console.log(hash);
}
