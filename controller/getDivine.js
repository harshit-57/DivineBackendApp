
import { pool } from "../db.js";

class GetDivineController {
    async getBlogCategories(req, res) {
        let [data] = await pool.execute(
          `SELECT * FROM BlogCategories;`
        );
        res.json(data);
      }
      async getBlogTags(req, res) {
          let [data] = await pool.execute(
          `SELECT * FROM BlogTags;`
          );
          res.json(data);
      }
      async getBlogs(req, res) {
          let [data] = await pool.execute(
          `SELECT * FROM Blogs;`
          );
          res.json(data);
      }
      async getCitations(req, res) {
          let [data] = await pool.execute(
          `SELECT * FROM Citations;`
          );
          res.json(data);
      }
      async getCourseCategories(req, res) {
          let [data] = await pool.execute(
          `SELECT * FROM CourseCategories;`
          );
          res.json(data);
      }
      async getCourseTags(req, res) {
          let [data] = await pool.execute(
          `SELECT * FROM CourseTags;`
          );
          res.json(data);
      }
      async getSpiritualities(req, res) {
          let [data] = await pool.execute(
          `SELECT * FROM Spiritualities;`
          );
          res.json(data);
      }
      async getSpiritualityTags(req, res) {
          let [data] = await pool.execute(
          `SELECT * FROM SpiritualityTags;`
          );
          res.json(data);
      }
      async getSpiritualityCategories(req, res) {
          let [data] = await pool.execute(
          `SELECT * FROM SpiritualityCategories;`
          );
          res.json(data);
      }
      async getTestimonials(req, res) {
          let [data] = await pool.execute(
          `SELECT * FROM Testimonials;`
          );
          res.json(data);
      }
      async getWebStories(req, res) {
          let [data] = await pool.execute(
          `SELECT * FROM WebStories;`
          );
          res.json(data);
      }
      async getWebStoryCategories(req, res) {
          let [data] = await pool.execute(
          `SELECT * FROM WebStoryCategories;`
          );
          res.json(data);
      }
      async getWebStoryTags(req, res) {
          let [data] = await pool.execute(
          `SELECT * FROM WebStoryTags;`
          );
          res.json(data);
      }
      async getCourses(req, res) {
          let [data] = await pool.execute(
          `SELECT * FROM courses;`
          );
          res.json(data);
      }
}

export default new GetDivineController();
