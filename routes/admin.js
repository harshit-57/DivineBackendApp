import { Router } from "express";
import AdminController from "../controller/admin.js";
import { decodedToken, verifyToken } from "../utils/helper.js";

export default class AdminRoutes {
  constructor() {
    this.router = Router();
    this.routes();
  }
  routes = () => {
    this.router.post("/login", AdminController.login);

    this.router.post(
      "/create-course",
      AdminMiddleware,
      AdminController.createCourse
    );

    this.router.post(
      "/update-course",
      AdminMiddleware,
      AdminController.updateCourse
    );

    this.router.post(
      "/create-blog",
      AdminMiddleware,
      AdminController.createBlog
    );

    this.router.post(
      "/update-blog",
      AdminMiddleware,
      AdminController.updateBlog
    );

    this.router.post(
      "/create-spirituality",
      AdminMiddleware,
      AdminController.createSpirituality
    );

    this.router.post(
      "/update-spirituality",
      AdminMiddleware,
      AdminController.updateSpirituality
    );

    this.router.post(
      "/create-citation",
      AdminMiddleware,
      AdminController.createCitation
    );

    this.router.post(
      "/update-citation",
      AdminMiddleware,
      AdminController.updateCitation
    );

    this.router.post(
      "/create-testimonial",
      AdminMiddleware,
      AdminController.createTestimonial
    );

    this.router.post(
      "/update-testimonial",
      AdminMiddleware,
      AdminController.updateTestimonial
    );
  };
}

const AdminMiddleware = (req, res, next) => {
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

    req.adminId = decoded?.id;
    req.adminEmail = decoded?.email;

    next();
  } catch (err) {
    return res.status(401).json({ success: 0, message: err });
  }
};
