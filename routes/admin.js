import { Router } from "express";
import AdminController from "../controller/postgres/admin.js";

export default class AdminRoutes {
  constructor() {
    this.router = Router();
    this.routes();
  }
  routes = () => {
    this.router.get("/get-admin", AdminController.getAdmin);
    this.router.get("/get-admins", AdminController.getAdmins);
    this.router.get("/get-roles", AdminController.getRoles);
    this.router.post("/create-admin", AdminController.createAdmin);
    this.router.post("/update-admin", AdminController.updateAdmin);

    this.router.post("/delete-admin", AdminController.deleteAdmin);

    this.router.post("/create-course", AdminController.createCourse);

    this.router.post("/update-course", AdminController.updateCourse);

    this.router.post("/create-blog", AdminController.createBlog);

    this.router.post("/update-blog", AdminController.updateBlog);

    this.router.post(
      "/create-spirituality",
      AdminController.createSpirituality
    );

    this.router.post(
      "/update-spirituality",
      AdminController.updateSpirituality
    );

    this.router.post("/create-citation", AdminController.createCitation);

    this.router.post("/update-citation", AdminController.updateCitation);

    this.router.post("/create-testimonial", AdminController.createTestimonial);

    this.router.post("/update-testimonial", AdminController.updateTestimonial);

    this.router.post("/create-web-story", AdminController.createWebStory);

    this.router.post("/update-web-story", AdminController.updateWebStory);

    this.router.post("/create-category", AdminController.createCategory);

    this.router.post("/create-service", AdminController.createService);

    this.router.post("/update-service", AdminController.updateService);

    this.router.post("/create-slots", AdminController.createSlots);
    this.router.post("/update-slot", AdminController.updateSlot);
    this.router.post("/delete-slot", AdminController.deleteSlot);

    this.router.get("/get-bookings", AdminController.getBookings);

    this.router.post("/create-slugs", AdminController.createSlugs);
  };
}
