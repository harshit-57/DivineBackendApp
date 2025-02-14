import jwt from "jsonwebtoken";

export const generateToken = (data) => {
  return jwt.sign(data, process.env.JWT_SECRET);
};

export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

export const decodedToken = (token) => {
  return jwt.decode(token);
};
