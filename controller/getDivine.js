import { pool } from "../db.js";

class GetDivineController {
  async getBlogCategories(req, res) {
    try {
      let [data] = await pool.execute(
        `SELECT ct.* FROM BlogCategories as ct
          JOIN BlogMappingCategory as bgct ON ct.id = bgct.BlogCategoryId
          JOIN Blogs as bg ON bgct.BlogId = bg.id
          GROUP BY ct.id
          ORDER BY ct.Name ASC;`
      );
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }
  async getBlogTags(req, res) {
    try {
      const payload = req.query;
      let filters = [];

      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "DESC";
      const sortBy = payload?.sortBy || "BlogTags.id";

      if (payload?.search) {
        filters.push(`BlogTags.Name LIKE "%${payload.search}%"`);
      }

      let [data] = await pool.execute(`
        SELECT * FROM BlogTags
        ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
        ORDER BY ${sortBy} ${sort} 
        LIMIT ${limit} OFFSET ${offset};`);
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }
  async getBlogs(req, res) {
    try {
      const payload = req.query;
      let filters = ["bg.DeletedOn IS NULL"];

      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "DESC";
      const sortBy = payload?.sortBy || "bg.PublishedOn";

      if (payload?.status) {
        filters.push(
          `bg.Status IN (${payload.status
            ?.split(",")
            ?.map((item) => `"${item}"`)
            ?.join(",")})`
        );
      }
      if (payload?.active) {
        filters.push(`bg.PublishedOn <= NOW()`);
      }

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
        `SELECT bg.* ,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('CategoryName', ct.Name, 'CategoryId', ct.id, 'CategorySlug', ct.slug))
            FROM BlogMappingCategory bgct 
            JOIN BlogCategories ct ON bgct.BlogCategoryId = ct.id 
            WHERE bgct.BlogId = bg.id) AS Categories,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('TagId', tag.id, 'TagName', tag.Name))
            FROM BlogMappingTag bgtag 
            JOIN BlogTags tag ON bgtag.BlogTagId = tag.id 
            WHERE bgtag.BlogId = bg.id)  AS Tags
          FROM Blogs as bg
          JOIN BlogMappingCategory as bgct ON bg.id = bgct.BlogId
          JOIN BlogCategories as ct ON bgct.BlogCategoryId = ct.id
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          GROUP BY bg.id
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
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }
  async getCitations(req, res) {
    try {
      const payload = req.query;
      let filters = ["ci.DeletedOn IS NULL"];

      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "ASC";
      const sortBy = payload?.sortBy || "ci.Title";

      if (payload?.status) {
        filters.push(
          `ci.Status IN (${payload.status
            ?.split(",")
            ?.map((item) => `"${item}"`)
            ?.join(",")})`
        );
      }

      if (payload?.search) {
        filters.push(`ci.Title LIKE "%${payload.search}%"`);
      }
      if (payload.slug) {
        filters.push(`ci.Slug = "${payload.slug}"`);
      }

      let [data] = await pool.execute(
        `SELECT ci.* 
          FROM Citations as ci
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          ORDER BY ${sortBy} ${sort} 
          LIMIT ${limit} OFFSET ${offset};`
      );
      let [count] = await pool.execute(
        `SELECT COUNT(*) as total FROM Citations as ci
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""};`
      );

      const total = count[0].total;
      return res.json({
        success: 1,
        data,
        total,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }
  async getCourseCategories(req, res) {
    try {
      let [data] = await pool.execute(
        `SELECT ct.* FROM ProductCategories as ct
            JOIN ProductMappingCategory as prct ON ct.id = prct.ProductCategoryId
            JOIN Products as pr ON prct.ProductId = pr.id
            GROUP BY ct.id
            ORDER BY ct.Name ASC;`
      );
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }
  async getCourseTags(req, res) {
    try {
      const payload = req.query;
      let filters = [];

      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "DESC";
      const sortBy = payload?.sortBy || "ProductTags.id";

      if (payload?.search) {
        filters.push(`ProductTags.Name LIKE "%${payload.search}%"`);
      }

      let [data] = await pool.execute(`
        SELECT * FROM ProductTags
        ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
        ORDER BY ${sortBy} ${sort} 
        LIMIT ${limit} OFFSET ${offset};
        `);
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }
  async getCourses(req, res) {
    try {
      const payload = req.query;
      let filters = ["pr.DeletedOn IS NULL"];

      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "DESC";
      const sortBy = payload?.sortBy || "pr.PublishedOn";

      if (payload?.status) {
        filters.push(
          `pr.Status IN (${payload.status
            ?.split(",")
            ?.map((item) => `"${item}"`)
            ?.join(",")})`
        );
      }
      if (payload?.active) {
        filters.push(`pr.PublishedOn <= NOW()`);
      }

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
      }

      if (payload.slug) {
        filters.push(`pr.slug = "${payload.slug}"`);
      }

      let [data] = await pool.execute(
        `SELECT pr.* ,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('CategoryName', ct.Name, 'CategoryId', ct.id, 'CategorySlug', ct.slug))
            FROM ProductMappingCategory prct 
            JOIN ProductCategories ct ON prct.ProductCategoryId = ct.id 
            WHERE prct.ProductId = pr.id) AS Categories,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('TagId', tag.id, 'TagName', tag.Name))
            FROM ProductMappingTag prtag 
            JOIN ProductTags tag ON prtag.ProductTagId = tag.id 
            WHERE prtag.ProductId = pr.id)  AS Tags,
          (SELECT JSON_ARRAYAGG(prim.ImageUrl) 
            FROM ProductMappingImage prim 
            WHERE prim.ProductId = pr.id) AS Images
          FROM Products as pr
          JOIN ProductMappingCategory as prct ON pr.id = prct.ProductId
          JOIN ProductCategories as ct ON prct.ProductCategoryId = ct.id
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          GROUP BY pr.Id
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
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }
  async getSpiritualities(req, res) {
    try {
      const payload = req.query;
      let filters = ["sp.DeletedOn IS NULL"];

      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "DESC";
      const sortBy = payload?.sortBy || "sp.PublishedOn";

      if (payload?.status) {
        filters.push(
          `sp.Status IN (${payload.status
            ?.split(",")
            ?.map((item) => `"${item}"`)
            ?.join(",")})`
        );
      }

      if (payload?.active) {
        filters.push(`sp.PublishedOn <= CURRENT_TIMESTAMP()`);
      }

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
        `SELECT sp.* ,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('CategoryName', ct.Name, 'CategoryId', ct.id, 'CategorySlug', ct.slug))
            FROM SpiritualityMappingCategory spct 
            JOIN SpiritualityCategories ct ON spct.SpiritualityCategoryId = ct.id 
            WHERE spct.SpiritualityId = sp.id) AS Categories,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('TagId', tag.id, 'TagName', tag.Name))
            FROM SpiritualityMappingTag sptag 
            JOIN SpiritualityTags tag ON sptag.SpiritualityTagId = tag.id 
            WHERE sptag.SpiritualityId = sp.id)  AS Tags
          FROM Spiritualities as sp
          JOIN SpiritualityMappingCategory as spct ON sp.id = spct.SpiritualityId
          JOIN SpiritualityCategories as ct ON spct.SpiritualityCategoryId = ct.id
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          GROUP BY sp.id
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
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }
  async getSpiritualityTags(req, res) {
    try {
      const payload = req.query;
      let filters = [];

      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "DESC";
      const sortBy = payload?.sortBy || "SpiritualityTags.id";

      if (payload?.search) {
        filters.push(`SpiritualityTags.Name LIKE "%${payload.search}%"`);
      }

      let [data] = await pool.execute(`
        SELECT * FROM SpiritualityTags
        ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
        ORDER BY ${sortBy} ${sort} 
        LIMIT ${limit} OFFSET ${offset};
        `);
      // let [data] = await pool.execute(`SELECT * FROM SpiritualityTags;`);
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }
  async getSpiritualityCategories(req, res) {
    try {
      let [data] = await pool.execute(
        `SELECT ct.* FROM SpiritualityCategories as ct
            JOIN SpiritualityMappingCategory as spct ON ct.id = spct.SpiritualityCategoryId
            JOIN Spiritualities as sp ON spct.SpiritualityId = sp.id
            GROUP BY ct.id
            ORDER BY ct.Name ASC;`
      );
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }
  async getWebStories(req, res) {
    try {
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
        `SELECT ws.* ,
           (SELECT JSON_ARRAYAGG(JSON_OBJECT('CategoryName', ct.Name, 'CategoryId', ct.id, 'CategorySlug', ct.slug))
            FROM WebStoryMappingCategory wsct 
            JOIN WebStoryCategories ct ON wsct.WebStoryCategoryId = ct.id 
            WHERE wsct.WebStoryId = ws.id) AS Categories,
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('TagId', tag.id, 'TagName', tag.Name))
            FROM WebStoryMappingTag wstag 
            JOIN WebStoryTags tag ON wstag.WebStoryTagId = tag.id 
            WHERE wstag.WebStoryId = ws.id)  AS Tags
          FROM WebStories as ws
          JOIN WebStoryMappingCategory as wsct ON ws.id = wsct.WebStoryId
          JOIN WebStoryCategories as ct ON wsct.WebStoryCategoryId = ct.id
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          GROUP BY ws.id, ct.id
          ORDER BY ${sortBy} ${sort} 
          LIMIT ${limit} OFFSET ${offset};`
      );
      let [total] = await pool.execute(
        `SELECT COUNT(*) as total FROM WebStories as ws
          JOIN WebStoryMappingCategory as wsct ON ws.id = wsct.WebStoryId
          JOIN WebStoryCategories as ct ON wsct.WebStoryCategoryId = ct.id
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""};`
      );

      total = total[0].total;

      if (payload.id || payload?.slug) {
        data = await Promise.all(
          data.map(async (item) => {
            const { Id } = item;
            // (SELECT JSON_ARRAYAGG(JSON_OBJECT(
            //   'id', wsim.id,
            //   'ImageUrl', wsim.WebStoryImageUrl,
            //   'ImageText', wsim.WebStoryImageText,
            //   'ImageOrder', wsim.WebStoryImageOrder,
            //   'ImageLink', wsim.WebStoryImageLink,
            //   'ImageLinkText', wsim.WebStoryImageLinkText,
            //   'ImageLinkIcon', wsim.WebStoryImageLinkIcon))
            //     FROM WebStoryImage wsim
            //     WHERE wsim.WebStoryId = ws.id
            //     ORDER BY wsim.WebStoryImageOrder ASC) AS Images
            const [images] = await pool.execute(
              `
            SELECT wsim.id as id, 
            wsim.WebStoryImageUrl as ImageUrl, 
            wsim.WebStoryImageText as ImageText, 
            wsim.WebStoryImageOrder as ImageOrder, 
            wsim.WebStoryImageLink as ImageLink, 
            wsim.WebStoryImageLinkText as ImageLinkText, 
            wsim.WebStoryImageLinkIcon as ImageLinkIcon
            FROM WebStoryImage wsim 
            WHERE wsim.WebStoryId = ?
            ORDER BY wsim.WebStoryImageOrder ASC`,
              [Id]
            );

            item.Images = images;
            return item;
          })
        );
      }

      res.json({
        success: 1,
        data,
        total,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }
  async getWebStoryCategories(req, res) {
    try {
      let [data] = await pool.execute(`SELECT * FROM WebStoryCategories;`);
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }
  async getWebStoryTags(req, res) {
    try {
      let [data] = await pool.execute(`SELECT * FROM WebStoryTags;`);
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }
  async getTestimonials(req, res) {
    try {
      const payload = req.query;
      let filters = ["test.DeletedOn IS NULL"];

      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "DESC";
      const sortBy = payload?.sortBy || "test.id";

      if (payload?.id) {
        filters.push(`test.Id = "${payload.id}"`);
      }

      if (payload?.status) {
        filters.push(
          `test.Status IN (${payload.status
            ?.split(",")
            ?.map((item) => `"${item}"`)
            ?.join(",")})`
        );
      }

      if (payload?.search) {
        filters.push(`test.UserName LIKE "${payload.search}%"`);
      }
      let [data] = await pool.execute(
        `SELECT test.* 
          FROM Testimonials as test
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          ORDER BY ${sortBy} ${sort} 
          LIMIT ${limit} OFFSET ${offset};`
      );
      let [count] = await pool.execute(
        `SELECT COUNT(*) as total FROM Testimonials as test
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""};`
      );

      const total = count[0].total;
      return res.json({
        success: 1,
        data,
        total,
      });
      // let [data] = await pool.execute(`SELECT * FROM Testimonials;`);
      // res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }
  async createLead(req, res) {
    try {
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
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }
  async getLeads(req, res) {
    try {
      const payload = req.query;
      let filters = [];

      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "DESC";
      const sortBy = payload?.sortBy || "ld.CreatedAt";

      if (payload?.search) {
        filters.push(`ld.Name LIKE "${payload.search}%"`);
      }
      let [data] = await pool.execute(
        `SELECT ld.* 
          FROM Leads as ld
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          ORDER BY ${sortBy} ${sort} 
          LIMIT ${limit} OFFSET ${offset};`
      );
      let [count] = await pool.execute(
        `SELECT COUNT(*) as total FROM Leads as ld
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""};`
      );

      const total = count[0].total;
      return res.json({
        success: 1,
        data,
        total,
      });
      // let [data] = await pool.execute(`SELECT * FROM Testimonials;`);
      // res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }
}

export default new GetDivineController();
