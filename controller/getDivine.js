import { pool } from "../db.js";

class GetDivineController {
  async getBlogCategories(req, res) {
    let [data] = await pool.execute(
      `SELECT ct.* FROM BlogCategories as ct
        JOIN BlogMappingCategory as bgct ON ct.id = bgct.BlogCategoryId
        JOIN Blogs as bg ON bgct.BlogId = bg.id
        GROUP BY ct.id
        ORDER BY ct.Name ASC;`
    );
    res.json(data);
  }
  async getBlogTags(req, res) {
    let [data] = await pool.execute(`SELECT * FROM BlogTags;`);
    res.json(data);
  }
  async getBlogs(req, res) {
    const payload = req.query;
    let filters = [];

    const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
    const limit = payload?.pageSize || 10;
    const sort = payload?.sort || "DESC";
    const sortBy = payload?.sortBy || "bg.PublishedOn";

    if (payload?.search) {
      filters.push(`bg.Title LIKE "%${payload.search}%"`);
    }

    if (payload.category) {
      filters.push(`ct.slug = "${payload.category}"`);
    }

    if (payload.slug) {
      filters.push(`bg.slug = "${payload.slug}"`);
    }

    let [data] = await pool.execute(
      `SELECT bg.* , ct.Name AS CategoryName, ct.id AS CategoryId, ct.slug AS CategorySlug
        FROM Blogs as bg
        JOIN BlogMappingCategory as bgct ON bg.id = bgct.BlogId
        JOIN BlogCategories as ct ON bgct.BlogCategoryId = ct.id
        ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
        ORDER BY ${sortBy} ${sort} 
        LIMIT ${limit} OFFSET ${offset} ;`
    );
    let [count] = await pool.execute(
      `SELECT COUNT(*) as total FROM Blogs as bg
        JOIN BlogMappingCategory as bgct ON bg.id = bgct.BlogId
        JOIN BlogCategories as ct ON bgct.BlogCategoryId = ct.id
        ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""};`
    );

    const total = count[0].total;
    res.json({
      success: 1,
      data,
      total,
    });
  }
  async getCitations(req, res) {
    let [data] = await pool.execute(`SELECT * FROM Citations;`);
    res.json(data);
  }
  async getCourseCategories(req, res) {
    let [data] = await pool.execute(`SELECT * FROM CourseCategories;`);
    res.json(data);
  }
  async getCourseTags(req, res) {
    let [data] = await pool.execute(`SELECT * FROM CourseTags;`);
    res.json(data);
  }
  async getSpiritualities(req, res) {
    let [data] = await pool.execute(`SELECT * FROM Spiritualities;`);
    res.json(data);
  }
  async getSpiritualityTags(req, res) {
    let [data] = await pool.execute(`SELECT * FROM SpiritualityTags;`);
    res.json(data);
  }
  async getSpiritualityCategories(req, res) {
    let [data] = await pool.execute(`SELECT * FROM SpiritualityCategories;`);
    res.json(data);
  }
  async getTestimonials(req, res) {
    let [data] = await pool.execute(`SELECT * FROM Testimonials;`);
    res.json(data);
  }
  async getWebStories(req, res) {
    let [data] = await pool.execute(`SELECT * FROM WebStories;`);
    res.json(data);
  }
  async getWebStoryCategories(req, res) {
    let [data] = await pool.execute(`SELECT * FROM WebStoryCategories;`);
    res.json(data);
  }
  async getWebStoryTags(req, res) {
    let [data] = await pool.execute(`SELECT * FROM WebStoryTags;`);
    res.json(data);
  }
  async getCourses(req, res) {
    let [data] = await pool.execute(`SELECT * FROM Products;`);
    res.json(data);
  }
}

export default new GetDivineController();
