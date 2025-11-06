import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export function createToken(fn, ln, id) {
  return _createToken(fn, ln, id);
}

function _createToken(fn, ln, id) {
  try {
    const user = { id, firstName: fn, lastName: ln };
    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' });
    return { accessToken };
  } catch (e) {
    return { error: e.message };
  }
}

export function isExpired(token) {
  try {
    let expired = false;
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err) => {
      if (err) expired = true;
    });
    return expired;
  } catch (e) {
    return true;
  }
}

export function refresh(token) {
  try {
    const ud = jwt.decode(token, { complete: true });
    const userId = ud?.payload?.id;
    const firstName = ud?.payload?.firstName;
    const lastName = ud?.payload?.lastName;
    return _createToken(firstName, lastName, userId);
  } catch (e) {
    return null;
  }
}

export default { createToken, isExpired, refresh };