import jwt from "jsonwebtoken";
import "dotenv/config"

const SECRET = process.env.ACCESS_TOKEN_SECRET;
const TTL    = process.env.ACCESS_TOKEN_TTL || "24h";

if (!SECRET) throw new Error("ACCESS_TOKEN_SECRET is not set");

// Create access token (returns { accessToken })
export function createToken({ userId, username, firstName, lastName }) {
  const accessToken = jwt.sign({ userId, username, firstName, lastName }, SECRET, { expiresIn: TTL });
  return { accessToken };
}

// Handout-style expiry check (boolean)
export function isExpired(token) {
  try { jwt.verify(token, SECRET); return false; } catch { return true; }
}

// Handout-style refresh (decode)
export function refresh(token) {
  const payload = jwt.decode(token); 
  const { userId, username, firstName, lastName } = payload || {};
  if (!userId) throw new Error("Invalid token payload");
  return createToken({ userId, username, firstName, lastName }); // returns { accessToken }
}