import GetDivineRoutes from "./getDivine.js";
import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import AdminRoutes from "./admin.js";
import { uploadImages } from "../utils/uploads.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default class Routes {
  static init(server) {
    const router = express.Router();
    server.app.use("/v1/GetDivine", new GetDivineRoutes().router);
    server.app.use("/v1/Admin", new AdminRoutes().router);

    server.app.post("/v1/upload", uploadImages);

    server.app.get("/", (req, res) => {
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
