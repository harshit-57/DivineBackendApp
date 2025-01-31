import { Router } from "express";
import AdminController from "../controller/admin.js";

export default class AdminRoutes {
  constructor() {
    this.router = Router();
    this.routes();
  }
  routes = () => {
    this.router.post("/login", AdminController.login);
  };
}
