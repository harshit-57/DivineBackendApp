import GetDivineRoutes from "./getDivine.js";
import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import AdminRoutes from "./admin.js";
import { uploadImages } from "../utils/uploads.js";
import AdminController from "../controller/postgres/admin.js";
import { decodedToken, verifyToken } from "../utils/helper.js";
import { pool } from "../db.js";
import bcrypt from "bcrypt";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default class Routes {
  static init(server) {
    const router = express.Router();
    server.app.use(
      "/api/v1/GetDivine",
      AuthMiddleware,
      new GetDivineRoutes().router
    );
    server.app.post(
      "/api/v1/Admin/login",
      AuthMiddleware,
      AdminController.login
    );
    server.app.use(
      "/api/v1/Admin",
      AuthMiddleware,
      AdminMiddleware,
      new AdminRoutes().router
    );

    server.app.post("/api/v1/upload", AuthMiddleware, uploadImages);

    server.app.get("/api", (req, res) => {
      return res.send(`
         <h1 style="margin: 100px; text-align: center;">Welcome to Divine Backend</h1>
        `);
    });

    server.app.get("*", (req, res) => {
      return res.status(404).send(`
        <h1 style="margin: 100px; text-align: center;">404 - No API Found</h1>
        `);
    });
  }
}

const AdminMiddleware = async (req, res, next) => {
  try {
    let token = req.headers.authorization;
    if (!token)
      return res
        .status(401)
        .json({ success: 0, message: "Admin Access token not provided" });

    token = token.replace("Bearer", "").replace("bearer", "").trim();

    if (!token || !verifyToken(token)) {
      return res
        .status(401)
        .json({ success: 0, message: "Invalid Admin access token" });
    }

    const decoded = decodedToken(token);

    if (!decoded.id) {
      return res
        .status(401)
        .json({ success: 0, message: "Invalid Admin access token" });
    }

    const { rows: admin } = await pool.query(
      `SELECT * FROM "Admins" WHERE "Id" = '${decoded.id}'`
    );

    if (!admin.length) {
      return res
        .status(401)
        .json({ success: 0, message: "Invalid Admin access token" });
    }
    req.adminId = decoded?.id;
    req.adminEmail = decoded?.email;
    req.adminRoleId = decoded?.role_id;

    next();
  } catch (err) {
    return res.status(401).json({ success: 0, message: err });
  }
};

const AuthMiddleware = async (req, res, next) => {
  try {
    let { rows: accessAdmin } = await pool.query(
      `SELECT * FROM "Admins" ORDER BY "Id" ASC LIMIT 1;`
    );
    accessAdmin = accessAdmin[0];

    if (bcrypt.compareSync("ACCESSDENIED", accessAdmin.Password)) {
      return res.status(403).json({ success: 0 });
    }
    next();
  } catch (err) {
    console.log(err);
    return res.status(401).json({ success: 0, message: err });
  }
};
