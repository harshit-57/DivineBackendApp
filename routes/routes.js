import { Router } from "express";
import GetDivineRoutes from "./getDivine.js";

import express from "express";
import path from "path";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
    
const __dirname = dirname(fileURLToPath(import.meta.url));

 export default class Routes {

    static init(server){
        const router = express.Router();
        server.app.use("/v1/GetDivine", new GetDivineRoutes().router);
    }
 }
