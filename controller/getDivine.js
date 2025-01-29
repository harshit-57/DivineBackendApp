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
        LIMIT ${limit} OFFSET ${offset};`
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
    let [data] = await pool.execute(
      `SELECT ct.* FROM ProductCategories as ct
          JOIN ProductMappingCategory as prct ON ct.id = prct.ProductCategoryId
          JOIN Products as pr ON prct.ProductId = pr.id
          GROUP BY ct.id
          ORDER BY ct.Name ASC;`
    );
    res.json(data);
  }
  async getCourseTags(req, res) {
    let [data] = await pool.execute(`SELECT * FROM ProductTags;`);
    res.json(data);
  }
  async getCourses(req, res) {
    const payload = req.query;
    let filters = [];

    const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
    const limit = payload?.pageSize || 10;
    const sort = payload?.sort || "DESC";
    const sortBy = payload?.sortBy || "pr.PublishedOn";

    if (payload?.search) {
      filters.push(`pr.Name LIKE "%${payload.search}%"`);
    }

    if (payload.category?.split(",").length > 0) {
      filters.push(
        `ct.slug IN (${payload.category
          ?.split(",")
          ?.map((item) => `"${item}"`)
          ?.join(",")})`
      );
      //   filters.push(`ct.slug = "${payload.category}"`);
    }

    if (payload.slug) {
      filters.push(`pr.slug = "${payload.slug}"`);
    }

    let [data] = await pool.execute(
      `SELECT pr.* ,
        JSON_ARRAYAGG(JSON_OBJECT('CategoryName', ct.Name, 'CategoryId', ct.id, 'CategorySlug', ct.slug)) AS Categories,
        JSON_ARRAYAGG(JSON_OBJECT('id', tag.id, 'name', tag.Name)) AS Tags,
        JSON_ARRAY(prim.ImageUrl) AS Images
        FROM Products as pr
        JOIN ProductMappingCategory as prct ON pr.id = prct.ProductId
        JOIN ProductCategories as ct ON prct.ProductCategoryId = ct.id
        LEFT JOIN ProductMappingTag as prtag ON pr.id = prtag.ProductId
        LEFT JOIN ProductTags as tag ON prtag.ProductTagId = tag.id
        LEFT JOIN ProductMappingImage as prim ON pr.id = prim.ProductId
        ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
        GROUP BY pr.id, prim.ImageUrl
        ORDER BY ${sortBy} ${sort} 
        LIMIT ${limit} OFFSET ${offset};`
    );
    let [count] = await pool.execute(
      `SELECT COUNT(DISTINCT(pr.id)) as total FROM Products as pr
        JOIN ProductMappingCategory as prct ON pr.id = prct.ProductId
        JOIN ProductCategories as ct ON prct.ProductCategoryId = ct.id
        ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""};`
    );

    const total = count[0].total;
    res.json({
      success: 1,
      data,
      total,
    });
  }
  async getSpiritualities(req, res) {
    const payload = req.query;
    let filters = [];

    const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
    const limit = payload?.pageSize || 10;
    const sort = payload?.sort || "DESC";
    const sortBy = payload?.sortBy || "sp.PublishedOn";

    if (payload?.search) {
      filters.push(`sp.Title LIKE "%${payload.search}%"`);
    }

    if (payload.category) {
      filters.push(`ct.slug = "${payload.category}"`);
    }

    if (payload.slug) {
      filters.push(`sp.slug = "${payload.slug}"`);
    }

    let [data] = await pool.execute(
      `SELECT sp.* , ct.Name AS CategoryName, ct.id AS CategoryId, ct.slug AS CategorySlug
        FROM Spiritualities as sp
        JOIN SpiritualityMappingCategory as spct ON sp.id = spct.SpiritualityId
        JOIN SpiritualityCategories as ct ON spct.SpiritualityCategoryId = ct.id
        ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
        ORDER BY ${sortBy} ${sort} 
        LIMIT ${limit} OFFSET ${offset};`
    );
    let [count] = await pool.execute(
      `SELECT COUNT(*) as total FROM Spiritualities as sp
        JOIN SpiritualityMappingCategory as spct ON sp.id = spct.SpiritualityId
        JOIN SpiritualityCategories as ct ON spct.SpiritualityCategoryId = ct.id
        ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""};`
    );

    const total = count[0].total;
    res.json({
      success: 1,
      data,
      total,
    });
  }
  async getSpiritualityTags(req, res) {
    let [data] = await pool.execute(`SELECT * FROM SpiritualityTags;`);
    res.json(data);
  }
  async getSpiritualityCategories(req, res) {
    let [data] = await pool.execute(
      `SELECT ct.* FROM SpiritualityCategories as ct
          JOIN SpiritualityMappingCategory as spct ON ct.id = spct.SpiritualityCategoryId
          JOIN Spiritualities as sp ON spct.SpiritualityId = sp.id
          GROUP BY ct.id
          ORDER BY ct.Name ASC;`
    );
    res.json(data);
  }
  async getTestimonials(req, res) {
    let [data] = await pool.execute(`SELECT * FROM Testimonials;`);
    res.json(data);
  }
  async getWebStories(req, res) {
    const payload = req.query;
    let filters = [];

    const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
    const limit = payload?.pageSize || 10;
    const sort = payload?.sort || "DESC";
    const sortBy = payload?.sortBy || "ws.PublishedOn";

    if (payload?.search) {
      filters.push(`ws.Title LIKE "%${payload.search}%"`);
    }

    if (payload.category) {
      filters.push(`ct.slug = "${payload.category}"`);
    }

    if (payload.slug) {
      filters.push(`ws.slug = "${payload.slug}"`);
    }

    if (payload.id) {
      filters.push(`ws.Id = "${payload.id}"`);
    }

    let [data] = await pool.execute(
      `SELECT ws.* , ct.Name AS CategoryName, ct.id AS CategoryId, ct.slug AS CategorySlug,
        JSON_ARRAYAGG(JSON_OBJECT('id', wsim.id, 'ImageUrl', wsim.WebStoryImageUrl, 'ImageText', wsim.WebStoryImageText, 'ImageOrder', wsim.WebStoryImageOrder )) AS Images
        FROM WebStories as ws
        JOIN WebStoryMappingCategory as wsct ON ws.id = wsct.WebStoryId
        JOIN WebStoryCategories as ct ON wsct.WebStoryCategoryId = ct.id
        LEFT JOIN WebStoryImage as wsim ON ws.id = wsim.WebStoryId
        ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
        GROUP BY ws.id, ct.id
        ORDER BY ${sortBy} ${sort} 
        LIMIT ${limit} OFFSET ${offset};`
    );
    let [count] = await pool.execute(
      `SELECT COUNT(*) as total FROM WebStories as ws
        JOIN WebStoryMappingCategory as wsct ON ws.id = wsct.WebStoryId
        JOIN WebStoryCategories as ct ON wsct.WebStoryCategoryId = ct.id
        ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""};`
    );

    const total = count[0].total;
    res.json({
      success: 1,
      data,
      total,
    });

    // let [data] = await pool.execute(`SELECT * FROM WebStories;`);
    // res.json(data);
  }
  async getWebStoryCategories(req, res) {
    let [data] = await pool.execute(`SELECT * FROM WebStoryCategories;`);
    res.json(data);
  }
  async getWebStoryTags(req, res) {
    let [data] = await pool.execute(`SELECT * FROM WebStoryTags;`);
    res.json(data);
  }

  async createLead(req, res) {
    const payload = req.body;
    const { name, email, phone, service, message } = payload;
    if (!name || !email || !phone || !message) {
      return res.json({
        success: 0,
        message: "Missing required fields",
      });
    }
    let [data] = await pool.execute(
      `INSERT INTO Leads (Name, Email, Phone, Service, Message) VALUES (?, ?, ?, ?, ?);`,
      [name, email, phone, service || null, message]
    );
    res.json({
      success: 1,
      data,
    });
  }
}

export default new GetDivineController();
