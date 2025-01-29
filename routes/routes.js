import GetDivineRoutes from "./getDivine.js";
import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import AdminRoutes from "./admin.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default class Routes {
  static init(server) {
    const router = express.Router();
    server.app.use("/v1/GetDivine", new GetDivineRoutes().router);
    server.app.use("/v1/Admin", new AdminRoutes().router);
  }
}
