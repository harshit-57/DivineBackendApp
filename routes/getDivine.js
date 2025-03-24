import { Router } from "express";
import GetDivineController from "../controller/sql/getDivine.js";

export default class GetDivineRoutes {
  constructor() {
    this.router = Router();
    this.routes();
  }
  routes = () => {
    this.router.get(
      "/getBlogCategories",
      GetDivineController.getBlogCategories
    );
    this.router.get("/getBlogTags", GetDivineController.getBlogTags);
    this.router.get("/getBlogs", GetDivineController.getBlogs);
    this.router.get("/getCitations", GetDivineController.getCitations);
    this.router.get(
      "/getCourseCategories",
      GetDivineController.getCourseCategories
    );
    this.router.get("/getCourseTags", GetDivineController.getCourseTags);
    this.router.get("/getCourses", GetDivineController.getCourses);
    this.router.get(
      "/getSpiritualities",
      GetDivineController.getSpiritualities
    );
    this.router.get(
      "/getSpiritualityTags",
      GetDivineController.getSpiritualityTags
    );
    this.router.get(
      "/getSpiritualityCategories",
      GetDivineController.getSpiritualityCategories
    );
    this.router.get("/getWebStories", GetDivineController.getWebStories);
    this.router.get(
      "/getWebStoryCategories",
      GetDivineController.getWebStoryCategories
    );
    this.router.get("/getWebStoryTags", GetDivineController.getWebStoryTags);
    this.router.get("/getTestimonials", GetDivineController.getTestimonials);
    this.router.post("/createLead", GetDivineController.createLead);
    this.router.get("/getLeads", GetDivineController.getLeads);
    this.router.get("/getServices", GetDivineController.getServices);

    this.router.get("/getBookingSlots", GetDivineController.getBookingSlots);
    this.router.post("/createBooking", GetDivineController.createBooking);
    this.router.post("/completeBooking", GetDivineController.completeBooking);
  };
}
