import { pool } from "../../db.js";
import { generateToken } from "../../utils/helper.js";
import bcrypt from "bcrypt";

class AdminController {
  async login(req, res) {
    try {
      const payload = req.body;
      const { email, password } = payload;
      if (!email || !password) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields",
        });
      }
      const { rows: data } = await pool.query(
        `SELECT * FROM "Admins" WHERE "Email" = '${email}'`
      );
      if (!data.length) {
        return res.status(401).json({
          success: 0,
          message: "Invalid credentials",
        });
      }
      const admin = data[0];

      if (!bcrypt.compareSync(password, admin.Password)) {
        return res.status(401).json({
          success: 0,
          message: "Invalid credentials",
        });
      }

      delete admin.Password; // Corrected from `data.password` to `admin.Password`

      const token = generateToken({
        id: admin.Id, // Assuming "Id" is the column name
        email: admin.Email,
        role_id: admin.RoleId,
      });
      res.json({
        success: 1,
        data: admin,
        token,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }

  async getAdmin(req, res) {
    try {
      const id = req.adminId;
      if (!id) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields",
        });
      }

      const { rows: data } = await pool.query(
        `SELECT ad.*, "AdminRoles"."Name" AS "RoleName", "AdminRoles"."Permission" AS "RolePermissions"
         FROM "Admins" as ad
         JOIN "AdminRoles" ON ad."RoleId" = "AdminRoles"."Id"
         WHERE ad."Id" = '${id}';`
      );

      if (!data?.length) {
        return res.status(404).json({
          success: 0,
          message: "Admin not found",
        });
      }
      const admin = data[0];
      delete admin.Password;

      res.json({
        success: 1,
        data: admin,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }

  async getAdmins(req, res) {
    try {
      const payload = req.query;
      let filters = [];

      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "DESC";
      const sortBy = payload?.sortBy || `ad."CreatedAt"`;

      if (payload?.id) {
        filters.push(`ad."Id" = '${payload.id}'`);
      }

      if (payload?.search) {
        filters.push(`ad."Name" ILIKE '%${payload.search}%'`);
      }

      const { rows: data } = await pool.query(
        `SELECT ad.*, "AdminRoles"."Name" AS "RoleName"
         FROM "Admins" as ad
         JOIN "AdminRoles" ON ad."RoleId" = "AdminRoles"."Id"
         ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
         ORDER BY ${sortBy} ${sort} 
         LIMIT ${limit} OFFSET ${offset};`
      );
      const { rows: count } = await pool.query(
        `SELECT COUNT(*) as total FROM "Admins" as ad
         JOIN "AdminRoles" ON ad."RoleId" = "AdminRoles"."Id"
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

  async getRoles(req, res) {
    try {
      const { rows: data } = await pool.query(`SELECT * FROM "AdminRoles";`);
      return res.json({
        success: 1,
        data,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }

  async createAdmin(req, res) {
    try {
      let payload = req.body || {};
      if (
        !payload.name ||
        !payload.email ||
        !payload.password ||
        !payload.role_id
      ) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields",
        });
      }

      const { rows: exist } = await pool.query(
        `SELECT * FROM "Admins" WHERE "Email" = '${payload.email}'`
      );

      if (exist.length) {
        return res.status(400).json({
          success: 0,
          message: "Admin already exists",
        });
      }

      const hashedPassword = bcrypt.hashSync(payload.password, 10);

      const { rows: data } = await pool.query(
        `INSERT INTO "Admins" ("Name", "Email", "Password", "RoleId") 
         VALUES ('${payload.name}', '${payload.email}', '${hashedPassword}', '${payload.role_id}')
         RETURNING *`
      );
      return res.json({
        success: 1,
        data: data[0],
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }

  async updateAdmin(req, res) {
    try {
      let payload = req.body || {};
      const { id } = payload;
      if (!id) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields",
        });
      }

      let updateDetails = {
        Name: payload.name || undefined,
        Email: payload.email || undefined,
        RoleId: payload.role_id || undefined,
      };

      if (payload.password) {
        updateDetails["Password"] = bcrypt.hashSync(payload.password, 10);
      }

      const filteredDetails = Object.fromEntries(
        Object.entries(updateDetails).filter(([_, v]) => v !== undefined)
      );

      if (Object.keys(filteredDetails).length === 0) {
        return res.status(400).json({
          success: 0,
          message: "No fields to update",
        });
      }

      const { rows: data } = await pool.query(
        `UPDATE "Admins" SET 
         ${Object.keys(filteredDetails)
           .map((key) => `"${key}" = '${filteredDetails[key]}'`)
           .join(", ")}
         WHERE "Id" = '${id}'
         RETURNING *`
      );

      return res.json({
        success: 1,
        data: data[0],
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }

  async deleteAdmin(req, res) {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields",
        });
      }
      const { rows: data } = await pool.query(
        `DELETE FROM "Admins" WHERE "Id" = '${id}' RETURNING *`
      );
      return res.json({
        success: 1,
        data: data[0],
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error?.message });
    }
  }

  async createCourse(req, res) {
    try {
      let payload = req.body || {};

      if (
        !payload.title ||
        !payload.description ||
        !payload.shortDescription ||
        !payload.productUrl ||
        !payload.regularPrice ||
        !payload.image
      ) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields",
        });
      }

      payload.slug = await generatedSlug(payload.title, "Products");

      const { rows: course } = await pool.query(
        `INSERT INTO "Products" 
        (
          "Name", 
          "Slug", 
          "ProductDescription", 
          "ShortDescription", 
          "ProductURL", 
          "Buy_Text", 
          "Regular_Price", 
          "Sale_Price", 
          "Focus_Keyphrase",
          "Meta_Title", 
          "Meta_SiteName", 
          "Meta_Desc",
          "IsTop",
          "PublishedOn", 
          "Status"
        ) 
        VALUES (
          '${payload.title}',
          '${payload.slug}',
          '${payload.description}',
          '${payload.shortDescription}',
          '${payload.productUrl}',
          'Buy Now',
          '${payload.regularPrice}',
          ${payload.salePrice ? `'${payload.salePrice}'` : "NULL"},
          ${payload.focusKeyphrase ? `'${payload.focusKeyphrase}'` : "NULL"},
          '${payload.metaTitle || payload.title}',
          '${
            payload.metaSiteName ||
            "Acharya Ganesh: Solutions for Life, Love, and Career Woes"
          }',
          '${payload.metaDescription || ""}',
          '${payload.isTOP || 0}',
          '${
            new Date(payload.publishedOn) > new Date()
              ? payload.publishedOn
              : new Date().toISOString()
          }',
          '${payload.Status || 1}'
        )
        RETURNING "Id"`
      );

      if (!course.length) {
        return res.status(500).json({
          success: 0,
          message: "Unable to create course",
        });
      }

      const courseId = course[0].Id;

      if (payload?.image) {
        await pool.query(
          `INSERT INTO "ProductMappingImage" ("ProductId", "ImageUrl", "ImageAlt") 
           VALUES ('${courseId}', '${payload.image}', '${
            payload.imageAlt || ""
          }')`
        );
      }

      if (payload?.categories?.length) {
        await Promise.all(
          payload?.categories?.map(async (category) => {
            if (category?.id) {
              await pool.query(
                `INSERT INTO "ProductMappingCategory" ("ProductId", "ProductCategoryId") 
                 VALUES ('${courseId}', '${category.id}')`
              );
            }
          })
        );
      }

      if (payload?.tags?.length) {
        await Promise.all(
          payload?.tags.map(async (tag) => {
            const { rows: oldTag } = await pool.query(
              `SELECT "Id" FROM "ProductTags" WHERE "Name" = '${tag?.name}'`
            );
            if (oldTag[0]?.Id) {
              await pool.query(
                `INSERT INTO "ProductMappingTag" ("ProductId", "ProductTagId") 
                 VALUES ('${courseId}', '${oldTag[0].Id}')`
              );
            } else {
              const { rows: newTag } = await pool.query(
                `INSERT INTO "ProductTags" ("Name", "Slug") 
                 VALUES ('${tag?.name}', '${await generatedSlug(
                  tag?.name,
                  "ProductTags"
                )}') 
                 RETURNING "Id"`
              );
              await pool.query(
                `INSERT INTO "ProductMappingTag" ("ProductId", "ProductTagId") 
                 VALUES ('${courseId}', '${newTag[0].Id}')`
              );
            }
          })
        );
      }

      return res.json({
        success: 1,
        message: "Course created successfully",
        data: {
          slug: payload.slug,
          id: courseId,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }

  async updateCourse(req, res) {
    try {
      let payload = req.body || {};
      if (!payload.id) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields: id",
        });
      }

      const { rows: product } = await pool.query(
        `SELECT * FROM "Products" WHERE "Id" = '${payload.id}'`
      );

      if (!product.length) {
        return res.status(404).json({
          success: 0,
          message: "Course not found",
        });
      }

      const existingProduct = product[0];

      if (payload?.slug && existingProduct.Slug !== payload?.slug) {
        const { rows: existSlug } = await pool.query(
          `SELECT "Id" FROM "Products" WHERE "Slug" = '${payload.slug}'`
        );
        if (existSlug.length) {
          return res.status(400).json({
            success: 0,
            message: "Slug already exists",
          });
        }
      }

      const updateDetails = {};

      if (payload.title) updateDetails["Name"] = payload.title;
      if (payload.slug) updateDetails["Slug"] = payload.slug;
      if (payload.description)
        updateDetails["ProductDescription"] = payload.description;
      if (payload.shortDescription !== undefined)
        updateDetails["ShortDescription"] = payload.shortDescription;
      if (payload.productUrl) updateDetails["ProductURL"] = payload.productUrl;
      if (payload.buyText) updateDetails["Buy_Text"] = payload.buyText;
      if (payload.regularPrice)
        updateDetails["Regular_Price"] = payload.regularPrice;
      if (payload.salePrice !== undefined)
        updateDetails["Sale_Price"] = payload.salePrice;
      if (payload.focusKeyphrase !== undefined)
        updateDetails["Focus_Keyphrase"] = payload.focusKeyphrase;
      if (payload.metaTitle !== undefined)
        updateDetails["Meta_Title"] = payload.metaTitle;
      if (payload.metaSiteName !== undefined)
        updateDetails["Meta_SiteName"] = payload.metaSiteName;
      if (payload.metaDescription !== undefined)
        updateDetails["Meta_Desc"] = payload.metaDescription;
      if (payload.isTOP !== undefined) updateDetails["IsTop"] = payload.isTOP;
      if (
        payload.publishedOn &&
        new Date(payload.publishedOn).toISOString() !==
          new Date(existingProduct.PublishedOn).toISOString()
      )
        updateDetails["PublishedOn"] = new Date(
          payload.publishedOn
        ).toISOString();
      if (payload.status !== undefined)
        updateDetails["Status"] = payload.status;
      if (payload.deletedOn)
        updateDetails["DeletedOn"] = new Date(payload.deletedOn).toISOString();

      if (Object.keys(updateDetails).length > 0) {
        await pool.query(
          `UPDATE "Products" SET 
           ${Object.keys(updateDetails)
             .map((key) => `"${key}" = '${updateDetails[key]}'`)
             .join(", ")}
           WHERE "Id" = '${payload.id}'`
        );
      }

      if (payload?.image) {
        await pool.query(
          `DELETE FROM "ProductMappingImage" WHERE "ProductId" = '${payload.id}'`
        );
        await pool.query(
          `INSERT INTO "ProductMappingImage" ("ProductId", "ImageUrl", "ImageAlt") 
           VALUES ('${payload.id}', '${payload.image}', '${
            payload.imageAlt || ""
          }')`
        );
      }

      if (payload?.categories?.length) {
        await pool.query(
          `DELETE FROM "ProductMappingCategory" 
           WHERE "ProductId" = '${payload.id}' 
           AND "ProductCategoryId" NOT IN (${payload.categories
             .map((category) => `'${category?.id}'`)
             .join(", ")})`
        );

        await Promise.all(
          payload?.categories?.map(async (category) => {
            if (category?.id) {
              const { rows: existCategory } = await pool.query(
                `SELECT "Id" FROM "ProductMappingCategory" 
                 WHERE "ProductId" = '${payload.id}' AND "ProductCategoryId" = '${category.id}'`
              );
              if (!existCategory?.length) {
                await pool.query(
                  `INSERT INTO "ProductMappingCategory" ("ProductId", "ProductCategoryId") 
                   VALUES ('${payload.id}', '${category.id}')`
                );
              }
            }
          })
        );
      }

      if (payload?.tags?.length) {
        const existingTagIds = payload.tags
          .filter((tag) => tag?.id)
          .map((tag) => `'${tag.id}'`);
        await pool.query(
          `DELETE FROM "ProductMappingTag" 
           WHERE "ProductId" = '${payload.id}' ${
            existingTagIds.length
              ? `AND "ProductTagId" NOT IN (${existingTagIds.join(", ")})`
              : ""
          }`
        );
        await Promise.all(
          payload?.tags.map(async (tag) => {
            if (!tag?.id && tag?.name) {
              const { rows: oldTag } = await pool.query(
                `SELECT "Id" FROM "ProductTags" WHERE "Name" = '${tag.name}'`
              );
              if (oldTag[0]?.Id) {
                await pool.query(
                  `INSERT INTO "ProductMappingTag" ("ProductId", "ProductTagId") 
                   VALUES ('${payload.id}', '${oldTag[0].Id}')`
                );
              } else {
                const { rows: newTag } = await pool.query(
                  `INSERT INTO "ProductTags" ("Name", "Slug") 
                   VALUES ('${tag.name}', '${await generatedSlug(
                    tag.name,
                    "ProductTags"
                  )}') 
                   RETURNING "Id"`
                );
                await pool.query(
                  `INSERT INTO "ProductMappingTag" ("ProductId", "ProductTagId") 
                   VALUES ('${payload.id}', '${newTag[0].Id}')`
                );
              }
            }
          })
        );
      }

      return res.json({
        success: 1,
        message: "Course updated successfully",
        data: {
          slug: payload.slug || existingProduct.Slug,
          id: payload.id,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }

  async createBlog(req, res) {
    try {
      let payload = req.body || {};

      if (!payload.title || !payload.description) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields",
        });
      }

      payload.slug = await generatedSlug(payload.title, "Blogs");

      const { rows: blog } = await pool.query(
        `INSERT INTO "Blogs" 
        (
          "Title", 
          "Slug", 
          "Description", 
          "ShortDescription",
          "Image",
          "ImageAlt",
          "Focus_Keyphrase",
          "Meta_Title", 
          "Meta_SiteName", 
          "Meta_Desc",
          "IsTop",
          "PublishedOn", 
          "Status"
        ) 
        VALUES (
          '${payload.title}',
          '${payload.slug}',
          '${payload.description}',
          ${
            payload.shortDescription ? `'${payload.shortDescription}'` : "NULL"
          },
          ${payload.image ? `'${payload.image}'` : "NULL"},
          ${payload.imageAlt ? `'${payload.imageAlt}'` : "NULL"},
          ${payload.focusKeyphrase ? `'${payload.focusKeyphrase}'` : "NULL"},
          '${payload.metaTitle || payload.title}',
          '${
            payload.metaSiteName ||
            "Acharya Ganesh: Solutions for Life, Love, and Career Woes"
          }',
          '${payload.metaDescription || ""}',
          '${payload.isTOP || 1}',
          '${
            new Date(payload.publishedOn) > new Date()
              ? payload.publishedOn
              : new Date().toISOString()
          }',
          '${payload.Status || 1}'
        )
        RETURNING "Id"`
      );

      if (!blog.length) {
        return res.status(500).json({
          success: 0,
          message: "Unable to create blog",
        });
      }

      const blogId = blog[0].Id;

      if (payload?.categories?.length) {
        await Promise.all(
          payload?.categories?.map(async (category) => {
            if (category?.id) {
              await pool.query(
                `INSERT INTO "BlogMappingCategory" ("BlogId", "BlogCategoryId") 
                 VALUES ('${blogId}', '${category.id}')`
              );
            }
          })
        );
      }

      if (payload?.tags?.length) {
        await Promise.all(
          payload?.tags.map(async (tag) => {
            if (tag?.name) {
              const { rows: oldTag } = await pool.query(
                `SELECT "Id" FROM "BlogTags" WHERE "Name" = '${tag.name}'`
              );
              if (oldTag[0]?.Id) {
                await pool.query(
                  `INSERT INTO "BlogMappingTag" ("BlogId", "BlogTagId") 
                   VALUES ('${blogId}', '${oldTag[0].Id}')`
                );
              } else {
                const { rows: newTag } = await pool.query(
                  `INSERT INTO "BlogTags" ("Name", "Slug") 
                   VALUES ('${tag.name}', '${await generatedSlug(
                    tag.name,
                    "BlogTags"
                  )}') 
                   RETURNING "Id"`
                );
                await pool.query(
                  `INSERT INTO "BlogMappingTag" ("BlogId", "BlogTagId") 
                   VALUES ('${blogId}', '${newTag[0].Id}')`
                );
              }
            }
          })
        );
      }

      return res.json({
        success: 1,
        message: "Blog created successfully",
        data: {
          slug: payload.slug,
          id: blogId,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }

  async updateBlog(req, res) {
    try {
      let payload = req.body || {};
      if (!payload.id) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields: id",
        });
      }

      const { rows: blog } = await pool.query(
        `SELECT * FROM "Blogs" WHERE "Id" = '${payload.id}'`
      );

      if (!blog.length) {
        return res.status(404).json({
          success: 0,
          message: "Blog not found",
        });
      }

      const existingBlog = blog[0];

      if (payload?.slug && existingBlog.Slug !== payload?.slug) {
        const { rows: existSlug } = await pool.query(
          `SELECT "Id" FROM "Blogs" WHERE "Slug" = '${payload.slug}'`
        );
        if (existSlug.length) {
          return res.status(400).json({
            success: 0,
            message: "Slug already exists",
          });
        }
      }

      const updateDetails = {};

      if (payload.title) updateDetails["Title"] = payload.title;
      if (payload.slug) updateDetails["Slug"] = payload.slug;
      if (payload.description)
        updateDetails["Description"] = payload.description;
      if (payload.shortDescription !== undefined)
        updateDetails["ShortDescription"] = payload.shortDescription;
      if (payload.image !== undefined) updateDetails["Image"] = payload.image;
      if (payload.imageAlt !== undefined)
        updateDetails["ImageAlt"] = payload.imageAlt;
      if (payload.focusKeyphrase !== undefined)
        updateDetails["Focus_Keyphrase"] = payload.focusKeyphrase;
      if (payload.metaTitle !== undefined)
        updateDetails["Meta_Title"] = payload.metaTitle;
      if (payload.metaSiteName !== undefined)
        updateDetails["Meta_SiteName"] = payload.metaSiteName;
      if (payload.metaDescription !== undefined)
        updateDetails["Meta_Desc"] = payload.metaDescription;
      if (payload.isTOP !== undefined) updateDetails["IsTop"] = payload.isTOP;
      if (
        payload.publishedOn &&
        new Date(payload.publishedOn).toISOString() !==
          new Date(existingBlog.PublishedOn).toISOString()
      )
        updateDetails["PublishedOn"] = new Date(
          payload.publishedOn
        ).toISOString();
      if (payload.status !== undefined)
        updateDetails["Status"] = payload.status;
      if (payload.deletedOn)
        updateDetails["DeletedOn"] = new Date(payload.deletedOn).toISOString();

      if (Object.keys(updateDetails).length > 0) {
        await pool.query(
          `UPDATE "Blogs" SET 
           ${Object.keys(updateDetails)
             .map(
               (key) =>
                 `"${key}" = ${
                   updateDetails[key] === null
                     ? "NULL"
                     : `'${updateDetails[key]}'`
                 }`
             )
             .join(", ")}
           WHERE "Id" = '${payload.id}'`
        );
      }

      if (payload?.categories?.length) {
        await pool.query(
          `DELETE FROM "BlogMappingCategory" 
           WHERE "BlogId" = '${payload.id}' 
           AND "BlogCategoryId" NOT IN (${payload.categories
             .map((category) => `'${category?.id}'`)
             .join(", ")})`
        );

        await Promise.all(
          payload?.categories?.map(async (category) => {
            if (category?.id) {
              const { rows: existCategory } = await pool.query(
                `SELECT "Id" FROM "BlogMappingCategory" 
                 WHERE "BlogId" = '${payload.id}' AND "BlogCategoryId" = '${category.id}'`
              );
              if (!existCategory?.length) {
                await pool.query(
                  `INSERT INTO "BlogMappingCategory" ("BlogId", "BlogCategoryId") 
                   VALUES ('${payload.id}', '${category.id}')`
                );
              }
            }
          })
        );
      }

      if (payload?.tags?.length) {
        const existingTagIds = payload.tags
          .filter((tag) => tag?.id)
          .map((tag) => `'${tag.id}'`);
        await pool.query(
          `DELETE FROM "BlogMappingTag" 
           WHERE "BlogId" = '${payload.id}' ${
            existingTagIds.length
              ? `AND "BlogTagId" NOT IN (${existingTagIds.join(", ")})`
              : ""
          }`
        );
        await Promise.all(
          payload?.tags.map(async (tag) => {
            if (!tag?.id && tag?.name) {
              const { rows: oldTag } = await pool.query(
                `SELECT "Id" FROM "BlogTags" WHERE "Name" = '${tag.name}'`
              );
              if (oldTag[0]?.Id) {
                await pool.query(
                  `INSERT INTO "BlogMappingTag" ("BlogId", "BlogTagId") 
                   VALUES ('${payload.id}', '${oldTag[0].Id}')`
                );
              } else {
                const { rows: newTag } = await pool.query(
                  `INSERT INTO "BlogTags" ("Name", "Slug") 
                   VALUES ('${tag.name}', '${await generatedSlug(
                    tag.name,
                    "BlogTags"
                  )}') 
                   RETURNING "Id"`
                );
                await pool.query(
                  `INSERT INTO "BlogMappingTag" ("BlogId", "BlogTagId") 
                   VALUES ('${payload.id}', '${newTag[0].Id}')`
                );
              }
            }
          })
        );
      }

      return res.json({
        success: 1,
        message: "Blog updated successfully",
        data: {
          slug: payload.slug || existingBlog.Slug,
          id: payload.id,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }

  async createSpirituality(req, res) {
    try {
      let payload = req.body || {};

      if (!payload.title || !payload.description) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields",
        });
      }

      payload.slug = await generatedSlug(payload.title, "Spiritualities");

      const { rows: spirituality } = await pool.query(
        `INSERT INTO "Spiritualities" 
        (
          "Title", 
          "Slug", 
          "Description", 
          "Image",
          "ImageAlt",
          "Focus_Keyphrase",
          "Meta_Title", 
          "Meta_SiteName", 
          "Meta_Desc",
          "IsTop",
          "PublishedOn", 
          "Status"
        ) 
        VALUES (
          '${payload.title}',
          '${payload.slug}',
          '${payload.description}',
          ${payload.image ? `'${payload.image}'` : "NULL"},
          ${payload.imageAlt ? `'${payload.imageAlt}'` : "NULL"},
          ${payload.focusKeyphrase ? `'${payload.focusKeyphrase}'` : "NULL"},
          '${payload.metaTitle || payload.title}',
          '${
            payload.metaSiteName ||
            "Acharya Ganesh: Solutions for Life, Love, and Career Woes"
          }',
          '${payload.metaDescription || ""}',
          '${payload.isTOP || 1}',
          '${
            new Date(payload.publishedOn) > new Date()
              ? payload.publishedOn
              : new Date().toISOString()
          }',
          '${payload.Status || 1}'
        )
        RETURNING "Id"`
      );

      if (!spirituality.length) {
        return res.status(500).json({
          success: 0,
          message: "Unable to create spirituality",
        });
      }

      const spiritualityId = spirituality[0].Id;

      if (payload?.categories?.length) {
        await Promise.all(
          payload?.categories?.map(async (category) => {
            if (category?.id) {
              await pool.query(
                `INSERT INTO "SpiritualityMappingCategory" ("SpiritualityId", "SpiritualityCategoryId") 
                 VALUES ('${spiritualityId}', '${category.id}')`
              );
            }
          })
        );
      }

      if (payload?.tags?.length) {
        await Promise.all(
          payload?.tags.map(async (tag) => {
            if (tag?.name) {
              const { rows: oldTag } = await pool.query(
                `SELECT "Id" FROM "SpiritualityTags" WHERE "Name" = '${tag.name}'`
              );
              if (oldTag[0]?.Id) {
                await pool.query(
                  `INSERT INTO "SpiritualityMappingTag" ("SpiritualityId", "SpiritualityTagId") 
                   VALUES ('${spiritualityId}', '${oldTag[0].Id}')`
                );
              } else {
                const { rows: newTag } = await pool.query(
                  `INSERT INTO "SpiritualityTags" ("Name", "Slug") 
                   VALUES ('${tag.name}', '${await generatedSlug(
                    tag.name,
                    "SpiritualityTags"
                  )}') 
                   RETURNING "Id"`
                );
                await pool.query(
                  `INSERT INTO "SpiritualityMappingTag" ("SpiritualityId", "SpiritualityTagId") 
                   VALUES ('${spiritualityId}', '${newTag[0].Id}')`
                );
              }
            }
          })
        );
      }

      return res.json({
        success: 1,
        message: "Spirituality created successfully",
        data: {
          slug: payload.slug,
          id: spiritualityId,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }

  async updateSpirituality(req, res) {
    try {
      let payload = req.body || {};
      if (!payload.id) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields: id",
        });
      }

      const { rows: spirituality } = await pool.query(
        `SELECT * FROM "Spiritualities" WHERE "Id" = '${payload.id}'`
      );

      if (!spirituality.length) {
        return res.status(404).json({
          success: 0,
          message: "Spirituality not found",
        });
      }

      const existingSpirituality = spirituality[0];

      if (payload?.slug && existingSpirituality.Slug !== payload?.slug) {
        const { rows: existSlug } = await pool.query(
          `SELECT "Id" FROM "Spiritualities" WHERE "Slug" = '${payload.slug}'`
        );
        if (existSlug.length) {
          return res.status(400).json({
            success: 0,
            message: "Slug already exists",
          });
        }
      }

      const updateDetails = {};

      if (payload.title) updateDetails["Title"] = payload.title;
      if (payload.slug) updateDetails["Slug"] = payload.slug;
      if (payload.description)
        updateDetails["Description"] = payload.description;
      if (payload.image !== undefined) updateDetails["Image"] = payload.image;
      if (payload.imageAlt !== undefined)
        updateDetails["ImageAlt"] = payload.imageAlt;
      if (payload.focusKeyphrase !== undefined)
        updateDetails["Focus_Keyphrase"] = payload.focusKeyphrase;
      if (payload.metaTitle !== undefined)
        updateDetails["Meta_Title"] = payload.metaTitle;
      if (payload.metaSiteName !== undefined)
        updateDetails["Meta_SiteName"] = payload.metaSiteName;
      if (payload.metaDescription !== undefined)
        updateDetails["Meta_Desc"] = payload.metaDescription;
      if (payload.isTOP !== undefined) updateDetails["IsTop"] = payload.isTOP;
      if (
        payload.publishedOn &&
        new Date(payload.publishedOn).toISOString() !==
          new Date(existingSpirituality.PublishedOn).toISOString()
      )
        updateDetails["PublishedOn"] = new Date(
          payload.publishedOn
        ).toISOString();
      if (payload.status !== undefined)
        updateDetails["Status"] = payload.status;
      if (payload.deletedOn)
        updateDetails["DeletedOn"] = new Date(payload.deletedOn).toISOString();

      if (Object.keys(updateDetails).length > 0) {
        await pool.query(
          `UPDATE "Spiritualities" SET 
           ${Object.keys(updateDetails)
             .map(
               (key) =>
                 `"${key}" = ${
                   updateDetails[key] === null
                     ? "NULL"
                     : `'${updateDetails[key]}'`
                 }`
             )
             .join(", ")}
           WHERE "Id" = '${payload.id}'`
        );
      }

      if (payload?.categories?.length) {
        await pool.query(
          `DELETE FROM "SpiritualityMappingCategory" 
           WHERE "SpiritualityId" = '${payload.id}' 
           AND "SpiritualityCategoryId" NOT IN (${payload.categories
             .map((category) => `'${category?.id}'`)
             .join(", ")})`
        );

        await Promise.all(
          payload?.categories?.map(async (category) => {
            if (category?.id) {
              const { rows: existCategory } = await pool.query(
                `SELECT "Id" FROM "SpiritualityMappingCategory" 
                 WHERE "SpiritualityId" = '${payload.id}' AND "SpiritualityCategoryId" = '${category.id}'`
              );
              if (!existCategory?.length) {
                await pool.query(
                  `INSERT INTO "SpiritualityMappingCategory" ("SpiritualityId", "SpiritualityCategoryId") 
                   VALUES ('${payload.id}', '${category.id}')`
                );
              }
            }
          })
        );
      }

      if (payload?.tags?.length) {
        const existingTagIds = payload.tags
          .filter((tag) => tag?.id)
          .map((tag) => `'${tag.id}'`);
        await pool.query(
          `DELETE FROM "SpiritualityMappingTag" 
           WHERE "SpiritualityId" = '${payload.id}' ${
            existingTagIds.length
              ? `AND "SpiritualityTagId" NOT IN (${existingTagIds.join(", ")})`
              : ""
          }`
        );
        await Promise.all(
          payload?.tags.map(async (tag) => {
            if (!tag?.id && tag?.name) {
              const { rows: oldTag } = await pool.query(
                `SELECT "Id" FROM "SpiritualityTags" WHERE "Name" = '${tag.name}'`
              );
              if (oldTag[0]?.Id) {
                await pool.query(
                  `INSERT INTO "SpiritualityMappingTag" ("SpiritualityId", "SpiritualityTagId") 
                   VALUES ('${payload.id}', '${oldTag[0].Id}')`
                );
              } else {
                const { rows: newTag } = await pool.query(
                  `INSERT INTO "SpiritualityTags" ("Name", "Slug") 
                   VALUES ('${tag.name}', '${await generatedSlug(
                    tag.name,
                    "SpiritualityTags"
                  )}') 
                   RETURNING "Id"`
                );
                await pool.query(
                  `INSERT INTO "SpiritualityMappingTag" ("SpiritualityId", "SpiritualityTagId") 
                   VALUES ('${payload.id}', '${newTag[0].Id}')`
                );
              }
            }
          })
        );
      }

      return res.json({
        success: 1,
        message: "Spirituality updated successfully",
        data: {
          slug: payload.slug || existingSpirituality.Slug,
          id: payload.id,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }

  async createCitation(req, res) {
    try {
      let payload = req.body || {};

      if (!payload.title || !payload.description) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields",
        });
      }

      payload.slug = await generatedSlug(payload.title, "Citations");

      const { rows: citation } = await pool.query(
        `INSERT INTO "Citations" 
        (
          "Title", 
          "Slug", 
          "Description",
          "PublishedOn", 
          "Focus_Keyphrase",
          "Meta_Title", 
          "Meta_SiteName", 
          "Meta_Desc",
          "Status"
        ) 
        VALUES (
          '${payload.title}',
          '${payload.slug}',
          '${payload.description}',
          '${
            new Date(payload.publishedOn) > new Date()
              ? payload.publishedOn
              : new Date().toISOString()
          }',
          ${payload.focusKeyphrase ? `'${payload.focusKeyphrase}'` : "NULL"},
          '${payload.metaTitle || payload.title}',
          '${
            payload.metaSiteName ||
            "Acharya Ganesh: Solutions for Life, Love, and Career Woes"
          }',
          '${payload.metaDescription || ""}',
          '${payload.Status || 1}'
        )
        RETURNING "Id"`
      );

      if (!citation.length) {
        return res.status(500).json({
          success: 0,
          message: "Unable to create citation",
        });
      }

      const citationId = citation[0].Id;

      return res.json({
        success: 1,
        message: "Citation created successfully",
        data: {
          slug: payload.slug,
          id: citationId,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }

  async updateCitation(req, res) {
    try {
      let payload = req.body || {};
      if (!payload.id) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields: id",
        });
      }

      const { rows: citation } = await pool.query(
        `SELECT * FROM "Citations" WHERE "Id" = '${payload.id}'`
      );

      if (!citation.length) {
        return res.status(404).json({
          success: 0,
          message: "Citation not found",
        });
      }

      const existingCitation = citation[0];

      if (payload?.slug && existingCitation.Slug !== payload?.slug) {
        const { rows: existSlug } = await pool.query(
          `SELECT "Id" FROM "Citations" WHERE "Slug" = '${payload.slug}'`
        );
        if (existSlug.length) {
          return res.status(400).json({
            success: 0,
            message: "Slug already exists",
          });
        }
      }

      const updateDetails = {};

      if (payload.title) updateDetails["Title"] = payload.title;
      if (payload.slug) updateDetails["Slug"] = payload.slug;
      if (payload.description)
        updateDetails["Description"] = payload.description;
      if (
        payload.publishedOn &&
        new Date(payload.publishedOn).toISOString() !==
          new Date(existingCitation.PublishedOn).toISOString()
      )
        updateDetails["PublishedOn"] = new Date(
          payload.publishedOn
        ).toISOString();
      if (payload.focusKeyphrase !== undefined)
        updateDetails["Focus_Keyphrase"] = payload.focusKeyphrase;
      if (payload.metaTitle !== undefined)
        updateDetails["Meta_Title"] = payload.metaTitle;
      if (payload.metaSiteName !== undefined)
        updateDetails["Meta_SiteName"] = payload.metaSiteName;
      if (payload.metaDescription !== undefined)
        updateDetails["Meta_Desc"] = payload.metaDescription;
      if (payload.status !== undefined)
        updateDetails["Status"] = payload.status;
      if (payload.deletedOn)
        updateDetails["DeletedOn"] = new Date(payload.deletedOn).toISOString();

      if (Object.keys(updateDetails).length > 0) {
        await pool.query(
          `UPDATE "Citations" SET 
           ${Object.keys(updateDetails)
             .map(
               (key) =>
                 `"${key}" = ${
                   updateDetails[key] === null
                     ? "NULL"
                     : `'${updateDetails[key]}'`
                 }`
             )
             .join(", ")}
           WHERE "Id" = '${payload.id}'`
        );
      }

      return res.json({
        success: 1,
        message: "Citation updated successfully",
        data: {
          slug: payload.slug || existingCitation.Slug,
          id: payload.id,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }

  async createTestimonial(req, res) {
    try {
      let payload = req.body || {};

      if (!payload.title || !payload.description) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields",
        });
      }
      const { rows: testimonial } = await pool.query(
        `INSERT INTO "Testimonials" 
        (
          "UserName", 
          "Description", 
          "Rating",
          "PublishedOn", 
          "Status"
        ) 
        VALUES (
          '${payload.title}',
          '${payload.description}',
          '${payload?.rating ? Number(payload.rating).toFixed(1) : 5}',
          '${
            new Date(payload.publishedOn) > new Date()
              ? payload.publishedOn
              : new Date().toISOString()
          }',
          '${payload.Status || 1}'
        )
        RETURNING "Id"`
      );

      if (!testimonial.length) {
        return res.status(500).json({
          success: 0,
          message: "Unable to create testimonial",
        });
      }

      const testimonialId = testimonial[0].Id;

      return res.json({
        success: 1,
        message: "Testimonial created successfully",
        data: {
          id: testimonialId,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }

  async updateTestimonial(req, res) {
    try {
      let payload = req.body || {};
      if (!payload.id) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields: id",
        });
      }

      const { rows: testimonial } = await pool.query(
        `SELECT * FROM "Testimonials" WHERE "Id" = '${payload.id}'`
      );

      if (!testimonial.length) {
        return res.status(404).json({
          success: 0,
          message: "Testimonial not found",
        });
      }

      const existingTestimonial = testimonial[0];

      const updateDetails = {};

      if (payload.title) updateDetails["UserName"] = payload.title;
      if (payload.description)
        updateDetails["Description"] = payload.description;
      if (payload.rating !== undefined)
        updateDetails["Rating"] = payload.rating
          ? Number(payload.rating).toFixed(1)
          : 5;
      if (
        payload.publishedOn &&
        new Date(payload.publishedOn).toISOString() !==
          new Date(existingTestimonial.PublishedOn).toISOString()
      )
        updateDetails["PublishedOn"] = new Date(
          payload.publishedOn
        ).toISOString();
      if (payload.status !== undefined)
        updateDetails["Status"] = payload.status;
      if (payload.deletedOn)
        updateDetails["DeletedOn"] = new Date(payload.deletedOn).toISOString();

      if (Object.keys(updateDetails).length > 0) {
        await pool.query(
          `UPDATE "Testimonials" SET 
           ${Object.keys(updateDetails)
             .map((key) => `"${key}" = '${updateDetails[key]}'`)
             .join(", ")}
           WHERE "Id" = '${payload.id}'`
        );
      }

      return res.json({
        success: 1,
        message: "Testimonial updated successfully",
        data: {
          id: payload.id,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }

  async createWebStory(req, res) {
    try {
      let payload = req.body || {};

      if (
        !payload.title ||
        !payload.storyImages?.length ||
        !payload?.shortDescription ||
        !payload?.image
      ) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields",
        });
      }
      const { rows: webStory } = await pool.query(
        `INSERT INTO "WebStories" 
        (
          "Title", 
          "ShortDescription",
          "CoverImageUrl",
          "CoverImageAlt",
          "TimeDuration",
          "PublishedOn", 
          "Status"
        ) 
        VALUES (
          '${payload.title}',
          '${payload.shortDescription}',
          '${payload.image}',
          '${payload.imageAlt || ""}',
          '${payload.timeDuration || 500}',
          '${
            new Date(payload.publishedOn) > new Date()
              ? payload.publishedOn
              : new Date().toISOString()
          }',
          '${payload.Status || 1}'
        )
        RETURNING "Id"`
      );

      if (!webStory.length) {
        return res.status(500).json({
          success: 0,
          message: "Unable to create webStory",
        });
      }

      const webStoryId = webStory[0].Id;

      if (payload?.storyImages) {
        await Promise.all(
          payload?.storyImages?.map(async (image, index) => {
            await pool.query(
              `INSERT INTO "WebStoryImage" 
              (
                "WebStoryId", 
                "WebStoryImageUrl", 
                "WebStoryImageText", 
                "WebStoryImageOrder", 
                "WebStoryImageLink", 
                "WebStoryImageLinkText", 
                "WebStoryImageLinkIcon"
              ) 
              VALUES (
                '${webStoryId}',
                '${image?.imageUrl || ""}',
                '${image?.imageText || ""}',
                '${index + 1}',
                '${image?.imageLink || ""}',
                '${image?.imageLinkText || ""}',
                '${image?.imageLinkIcon || ""}'
              )`
            );
          })
        );
      }

      if (payload?.categories?.length) {
        await Promise.all(
          payload?.categories?.map(async (category) => {
            if (category?.id) {
              await pool.query(
                `INSERT INTO "WebStoryMappingCategory" ("WebStoryId", "WebStoryCategoryId") 
                 VALUES ('${webStoryId}', '${category.id}')`
              );
            }
          })
        );
      }

      if (payload?.tags?.length) {
        await Promise.all(
          payload?.tags.map(async (tag) => {
            const { rows: oldTag } = await pool.query(
              `SELECT "Id" FROM "WebStoryTags" WHERE "Name" = '${tag?.name}'`
            );
            if (oldTag[0]?.Id) {
              await pool.query(
                `INSERT INTO "WebStoryMappingTag" ("WebStoryId", "WebStoryTagId") 
                 VALUES ('${webStoryId}', '${oldTag[0].Id}')`
              );
            } else {
              const { rows: newTag } = await pool.query(
                `INSERT INTO "WebStoryTags" ("Name", "Slug") 
                 VALUES ('${tag?.name}', '${await generatedSlug(
                  tag?.name,
                  "WebStoryTags"
                )}') 
                 RETURNING "Id"`
              );
              await pool.query(
                `INSERT INTO "WebStoryMappingTag" ("WebStoryId", "WebStoryTagId") 
                 VALUES ('${webStoryId}', '${newTag[0].Id}')`
              );
            }
          })
        );
      }

      return res.json({
        success: 1,
        message: "Web Story created successfully",
        data: {
          id: webStoryId,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }

  async updateWebStory(req, res) {
    try {
      let payload = req.body || {};
      if (!payload.id) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields: id",
        });
      }

      const { rows: webStory } = await pool.query(
        `SELECT * FROM "WebStories" WHERE "Id" = '${payload.id}'`
      );

      if (!webStory.length) {
        return res.status(404).json({
          success: 0,
          message: "Web Story not found",
        });
      }

      const existingWebStory = webStory[0];

      const updateDetails = {};

      if (payload.title) updateDetails["Title"] = payload.title;
      if (payload.shortDescription)
        updateDetails["ShortDescription"] = payload.shortDescription;
      if (payload.image) updateDetails["CoverImageUrl"] = payload.image;
      if (payload.imageAlt) updateDetails["CoverImageAlt"] = payload.imageAlt;
      if (payload.timeDuration)
        updateDetails["TimeDuration"] = payload.timeDuration;
      if (
        payload.publishedOn &&
        new Date(payload.publishedOn).toISOString() !==
          new Date(existingWebStory.PublishedOn).toISOString()
      )
        updateDetails["PublishedOn"] = new Date(
          payload.publishedOn
        ).toISOString();
      if (payload.status !== undefined)
        updateDetails["Status"] = payload.status;
      if (payload.deletedOn)
        updateDetails["DeletedOn"] = new Date(payload.deletedOn).toISOString();

      if (Object.keys(updateDetails).length > 0) {
        await pool.query(
          `UPDATE "WebStories" SET 
           ${Object.keys(updateDetails)
             .map((key) => `"${key}" = '${updateDetails[key]}'`)
             .join(", ")}
           WHERE "Id" = '${payload.id}'`
        );
      }

      if (payload?.storyImages) {
        await pool.query(
          `DELETE FROM "WebStoryImage" WHERE "WebStoryId" = '${payload.id}'`
        );
        await Promise.all(
          payload?.storyImages?.map(async (image, index) => {
            await pool.query(
              `INSERT INTO "WebStoryImage" 
              (
                "WebStoryId", 
                "WebStoryImageUrl", 
                "WebStoryImageText", 
                "WebStoryImageOrder", 
                "WebStoryImageLink", 
                "WebStoryImageLinkText", 
                "WebStoryImageLinkIcon"
              ) 
              VALUES (
                '${payload.id}',
                '${image?.imageUrl || ""}',
                '${image?.imageText || ""}',
                '${index + 1}',
                '${image?.imageLink || ""}',
                '${image?.imageLinkText || ""}',
                '${image?.imageLinkIcon || ""}'
              )`
            );
          })
        );
      }

      if (payload?.categories?.length) {
        await pool.query(
          `DELETE FROM "WebStoryMappingCategory" 
           WHERE "WebStoryId" = '${payload.id}' 
           AND "WebStoryCategoryId" NOT IN (${payload.categories
             .map((category) => `'${category?.id}'`)
             .join(", ")})`
        );

        await Promise.all(
          payload?.categories?.map(async (category) => {
            if (category?.id) {
              const { rows: existCategory } = await pool.query(
                `SELECT "Id" FROM "WebStoryMappingCategory" 
                 WHERE "WebStoryId" = '${payload.id}' AND "WebStoryCategoryId" = '${category.id}'`
              );
              if (!existCategory?.length) {
                await pool.query(
                  `INSERT INTO "WebStoryMappingCategory" ("WebStoryId", "WebStoryCategoryId") 
                   VALUES ('${payload.id}', '${category.id}')`
                );
              }
            }
          })
        );
      }

      if (payload?.tags?.length) {
        const existingTagIds = payload.tags
          .filter((tag) => tag?.id)
          .map((tag) => `'${tag.id}'`);
        await pool.query(
          `DELETE FROM "WebStoryMappingTag" 
           WHERE "WebStoryId" = '${payload.id}' ${
            existingTagIds.length
              ? `AND "WebStoryTagId" NOT IN (${existingTagIds.join(", ")})`
              : ""
          }`
        );
        await Promise.all(
          payload?.tags.map(async (tag) => {
            if (!tag?.id && tag?.name) {
              const { rows: oldTag } = await pool.query(
                `SELECT "Id" FROM "WebStoryTags" WHERE "Name" = '${tag.name}'`
              );
              if (oldTag[0]?.Id) {
                await pool.query(
                  `INSERT INTO "WebStoryMappingTag" ("WebStoryId", "WebStoryTagId") 
                   VALUES ('${payload.id}', '${oldTag[0].Id}')`
                );
              } else {
                const { rows: newTag } = await pool.query(
                  `INSERT INTO "WebStoryTags" ("Name", "Slug") 
                   VALUES ('${tag.name}', '${await generatedSlug(
                    tag.name,
                    "WebStoryTags"
                  )}') 
                   RETURNING "Id"`
                );
                await pool.query(
                  `INSERT INTO "WebStoryMappingTag" ("WebStoryId", "WebStoryTagId") 
                   VALUES ('${payload.id}', '${newTag[0].Id}')`
                );
              }
            }
          })
        );
      }

      return res.json({
        success: 1,
        message: "Web Story updated successfully",
        data: {
          id: payload.id,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }

  async createCategory(req, res) {
    try {
      let payload = req.body || {};

      let { name, type } = payload;

      if (!type || !name) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields",
        });
      }
      switch (type) {
        case "course":
          const { rows: category } = await pool.query(
            `SELECT "Id" FROM "ProductCategories" WHERE "Name" = '${name}'`
          );
          if (category?.length) {
            return res.status(400).json({
              success: 0,
              message: "Category already exists",
            });
          } else {
            const slug = await generatedSlug(name, "ProductCategories");
            const { rows: newCategory } = await pool.query(
              `INSERT INTO "ProductCategories" ("Name", "Slug") 
               VALUES ('${name}', '${slug}') 
               RETURNING "Id", "Name", "Slug"`
            );
            return res.json({
              success: 1,
              message: "Category created successfully",
              data: newCategory[0],
            });
          }
          break;

        case "blog":
          const { rows: blogCategory } = await pool.query(
            `SELECT "Id" FROM "BlogCategories" WHERE "Name" = '${name}'`
          );
          if (blogCategory?.length) {
            return res.status(400).json({
              success: 0,
              message: "Category already exists",
            });
          } else {
            const slug = await generatedSlug(name, "BlogCategories");
            const { rows: newCategory } = await pool.query(
              `INSERT INTO "BlogCategories" ("Name", "Slug") 
               VALUES ('${name}', '${slug}') 
               RETURNING "Id", "Name", "Slug"`
            );
            return res.json({
              success: 1,
              message: "Category created successfully",
              data: newCategory[0],
            });
          }
          break;

        case "spirituality":
          const { rows: spiritualityCategory } = await pool.query(
            `SELECT "Id" FROM "SpiritualityCategories" WHERE "Name" = '${name}'`
          );
          if (spiritualityCategory?.length) {
            return res.status(400).json({
              success: 0,
              message: "Category already exists",
            });
          } else {
            const slug = await generatedSlug(name, "SpiritualityCategories");
            const { rows: newCategory } = await pool.query(
              `INSERT INTO "SpiritualityCategories" ("Name", "Slug") 
               VALUES ('${name}', '${slug}') 
               RETURNING "Id", "Name", "Slug"`
            );
            return res.json({
              success: 1,
              message: "Category created successfully",
              data: newCategory[0],
            });
          }
          break;

        case "story":
          const { rows: webstoryCategory } = await pool.query(
            `SELECT "Id" FROM "WebStoryCategories" WHERE "Name" = '${name}'`
          );
          if (webstoryCategory?.length) {
            return res.status(400).json({
              success: 0,
              message: "Category already exists",
            });
          } else {
            const slug = await generatedSlug(name, "WebStoryCategories");
            const { rows: newCategory } = await pool.query(
              `INSERT INTO "WebStoryCategories" ("Name", "Slug") 
               VALUES ('${name}', '${slug}') 
               RETURNING "Id", "Name", "Slug"`
            );
            return res.json({
              success: 1,
              message: "Category created successfully",
              data: newCategory[0],
            });
          }
          break;

        default:
          return res.status(400).json({
            success: 0,
            message: "Invalid category type",
          });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }
  async createService(req, res) {
    try {
      let payload = req.body || {};

      if (!payload.title || !payload.description) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields",
        });
      }

      payload.slug = await generatedSlug(payload.title, "Services");

      const publishedOn =
        new Date(payload.publishedOn) > new Date()
          ? `'${new Date(payload.publishedOn).toISOString()}'`
          : `'${new Date().toISOString()}'`;

      console.log(payload);

      const { rows: service } = await pool.query(
        `INSERT INTO "Services" 
        (
          "Name",
          "Slug", 
          "Description", 
          "Title", 
          "SubTitle",
          "Image",
          "ImageAlt",
          "Link",
          "LinkText",
          "Focus_Keyphrase",
          "Meta_Title", 
          "Meta_SiteName", 
          "Meta_Desc",
          "PublishedOn", 
          "Status",
          "ParentId"
        ) 
        VALUES (
          '${payload.title}',
          '${payload.slug}',
          '${payload.description}',
          ${payload.header ? `'${payload.header}'` : "NULL"},
          ${payload.subHeader ? `'${payload.subHeader}'` : "NULL"},
          ${payload.image ? `'${payload.image}'` : "NULL"},
          ${payload.imageAlt ? `'${payload.imageAlt}'` : "NULL"},
          ${payload.link ? `'${payload.link}'` : "NULL"},
          ${payload.linkText ? `'${payload.linkText}'` : "NULL"},
          ${payload.focusKeyphrase ? `'${payload.focusKeyphrase}'` : "NULL"},
          '${payload.metaTitle || payload.title}',
          '${
            payload.metaSiteName ||
            "Acharya Ganesh: Solutions for Life, Love, and Career Woes"
          }',
          '${payload.metaDescription || ""}',
          ${publishedOn},
          ${payload.Status || 1},
          ${payload.parentId ? `'${payload.parentId}'` : "NULL"}
        )
        RETURNING "Id"`
      );

      if (!service.length) {
        return res.status(500).json({
          success: 0,
          message: "Unable to create service",
        });
      }

      const serviceId = service[0].Id;

      return res.json({
        success: 1,
        message: "Service created successfully",
        data: {
          slug: payload.slug,
          id: serviceId,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }

  async updateService(req, res) {
    try {
      let payload = req.body || {};
      if (!payload.id) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields: id",
        });
      }

      const { rows: service } = await pool.query(
        `SELECT * FROM "Services" WHERE "Id" = '${payload.id}'`
      );

      if (!service.length) {
        return res.status(404).json({
          success: 0,
          message: "Service not found",
        });
      }

      const existingService = service[0];

      if (payload?.slug && existingService.Slug !== payload?.slug) {
        const { rows: existSlug } = await pool.query(
          `SELECT "Id" FROM "Services" WHERE "Slug" = '${payload.slug}'`
        );
        if (existSlug.length) {
          return res.status(400).json({
            success: 0,
            message: "Slug already exists",
          });
        }
      }

      const updateDetails = {};

      if (payload.title) updateDetails["Name"] = `'${payload.title}'`;
      if (payload.slug) updateDetails["Slug"] = `'${payload.slug}'`;
      if (payload.description)
        updateDetails["Description"] = `'${payload.description}'`;
      if (payload.header) updateDetails["Title"] = `'${payload.header}'`;
      if (payload.subHeader !== undefined)
        updateDetails["SubTitle"] = payload.subHeader
          ? `'${payload.subHeader}'`
          : "NULL";
      if (payload.image !== undefined)
        updateDetails["Image"] = payload.image ? `'${payload.image}'` : "NULL";
      if (payload.imageAlt !== undefined)
        updateDetails["ImageAlt"] = payload.imageAlt
          ? `'${payload.imageAlt}'`
          : "NULL";
      if (payload.link !== undefined)
        updateDetails["Link"] = payload.link ? `'${payload.link}'` : "NULL";
      if (payload.linkText !== undefined)
        updateDetails["LinkText"] = payload.linkText
          ? `'${payload.linkText}'`
          : "NULL";
      if (payload.focusKeyphrase !== undefined)
        updateDetails["Focus_Keyphrase"] = payload.focusKeyphrase
          ? `'${payload.focusKeyphrase}'`
          : "NULL";
      if (payload.metaTitle !== undefined)
        updateDetails["Meta_Title"] = `'${payload.metaTitle}'`;
      if (payload.metaSiteName !== undefined)
        updateDetails["Meta_SiteName"] = `'${payload.metaSiteName}'`;
      if (payload.metaDescription !== undefined)
        updateDetails["Meta_Desc"] = `'${payload.metaDescription}'`;
      if (
        payload.publishedOn &&
        new Date(payload.publishedOn).toISOString() !==
          new Date(existingService.PublishedOn).toISOString()
      )
        updateDetails["PublishedOn"] = `'${new Date(
          payload.publishedOn
        ).toISOString()}'`;
      if (payload.status !== undefined)
        updateDetails["Status"] = `${payload.status}`;
      if (payload.deletedOn)
        updateDetails["DeletedOn"] = `'${new Date(
          payload.deletedOn
        ).toISOString()}'`;
      if (payload.parentId !== undefined)
        updateDetails["ParentId"] = payload.parentId
          ? `'${payload.parentId}'`
          : "NULL";

      if (Object.keys(updateDetails).length > 0) {
        await pool.query(
          `UPDATE "Services" SET 
           ${Object.keys(updateDetails)
             .map((key) => `"${key}" = ${updateDetails[key]}`)
             .join(", ")}
           WHERE "Id" = '${payload.id}'`
        );
      }

      return res.json({
        success: 1,
        message: "Service updated successfully",
        data: {
          slug: payload.slug || existingService.Slug,
          id: payload.id,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }

  async createSlots(req, res) {
    try {
      const { startDate, endDate, slots } = req.body;

      if (!startDate || !endDate || !slots?.length) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields: startDate, endDate, slots",
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const today = new Date(new Date().toLocaleDateString());

      if (start < today) {
        return res.status(400).json({
          success: 0,
          message: "Start date cannot be in the past",
        });
      }
      if (start > end) {
        return res.status(400).json({
          success: 0,
          message: "Invalid date range",
        });
      }

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
      for (const slot of slots) {
        if (
          !timeRegex.test(slot.startTime) ||
          !timeRegex.test(slot.endTime) ||
          slot.startTime >= slot.endTime
        ) {
          return res.status(400).json({
            success: 0,
            message: `Invalid slot times on slot: ${slot.startTime} - ${slot.endTime}`,
          });
        }
      }

      const dates = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split("T")[0]);
      }

      const { rows: existing } = await pool.query(
        `SELECT TO_CHAR("Date", 'YYYY-MM-DD') as "Date", "StartTime", "EndTime" 
         FROM "BookingSlots" 
         WHERE "Date" BETWEEN '${startDate}' AND '${endDate}'`
      );

      const newSlots = dates.flatMap((date) =>
        slots.map((slot) => ({
          Date: date,
          StartTime: slot.startTime,
          EndTime: slot.endTime,
          Status: 1,
        }))
      );

      for (const newSlot of newSlots) {
        if (
          existing.some(
            (ex) =>
              ex.Date === newSlot.Date &&
              ex.StartTime < newSlot.EndTime &&
              newSlot.StartTime < ex.EndTime
          )
        ) {
          return res.status(400).json({
            success: 0,
            message: `Slot conflict on ${newSlot.Date} between ${newSlot.StartTime} - ${newSlot.EndTime}`,
          });
        }
      }

      const values = newSlots
        .map(
          (s) => `('${s.Date}', '${s.StartTime}', '${s.EndTime}', ${s.Status})`
        )
        .join(", ");

      const { rowCount } = await pool.query(
        `INSERT INTO "BookingSlots" ("Date", "StartTime", "EndTime", "Status") 
         VALUES ${values}`
      );

      return res.json({
        success: 1,
        message: "Booking Slots created",
        data: { count: rowCount },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }

  async updateSlot(req, res) {
    try {
      let payload = req.body || {};
      if (!payload.id) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields: id",
        });
      }

      const { rows: slot } = await pool.query(
        `SELECT * FROM "BookingSlots" WHERE "Id" = '${payload.id}'`
      );
      if (!slot.length) {
        return res.status(404).json({
          success: 0,
          message: "Slot not found",
        });
      }

      const existingSlot = slot[0];

      const updateDetails = {};

      if (payload.date)
        updateDetails["Date"] = `'${
          new Date(payload.date).toISOString().split("T")[0]
        }'`;
      if (payload.startTime)
        updateDetails["StartTime"] = `'${payload.startTime}'`;
      if (payload.endTime) updateDetails["EndTime"] = `'${payload.endTime}'`;
      if (payload.status !== undefined)
        updateDetails["Status"] = `${payload.status}`;

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;

      const checkStartTime = payload.startTime || existingSlot.StartTime;
      const checkEndTime = payload.endTime || existingSlot.EndTime;
      const checkDate = payload.date
        ? new Date(payload.date).toISOString().split("T")[0]
        : existingSlot.Date instanceof Date
        ? existingSlot.Date.toISOString().split("T")[0]
        : existingSlot.Date;

      if (
        !timeRegex.test(checkStartTime) ||
        !timeRegex.test(checkEndTime) ||
        checkStartTime >= checkEndTime
      ) {
        return res.status(400).json({
          success: 0,
          message: `Invalid slot times on slot: ${checkStartTime} - ${checkEndTime}`,
        });
      }

      const { rows: existing } = await pool.query(
        `SELECT TO_CHAR("Date", 'YYYY-MM-DD') as "Date", "StartTime", "EndTime" 
         FROM "BookingSlots" 
         WHERE "Date" = DATE('${checkDate}') AND "Id" != '${payload.id}'`
      );

      const newSlot = {
        Date: checkDate,
        StartTime: checkStartTime,
        EndTime: checkEndTime,
      };

      for (const ex of existing) {
        if (
          ex.Date === newSlot.Date &&
          ex.StartTime < newSlot.EndTime &&
          newSlot.StartTime < ex.EndTime
        ) {
          return res.status(400).json({
            success: 0,
            message: `Slot conflict on ${newSlot.Date} between ${newSlot.StartTime} - ${newSlot.EndTime}`,
          });
        }
      }

      if (Object.keys(updateDetails).length > 0) {
        await pool.query(
          `UPDATE "BookingSlots" SET 
           ${Object.keys(updateDetails)
             .map((key) => `"${key}" = ${updateDetails[key]}`)
             .join(", ")}
           WHERE "Id" = '${payload.id}'`
        );
      }

      return res.json({
        success: 1,
        message: "Slot updated successfully",
        data: {
          id: payload.id,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }

  async deleteSlot(req, res) {
    try {
      let payload = req.body || {};
      if (!payload.id) {
        return res.status(400).json({
          success: 0,
          message: "Missing required fields: id",
        });
      }

      const { rows: slot } = await pool.query(
        `SELECT * FROM "BookingSlots" WHERE "Id" = '${payload.id}'`
      );

      if (!slot.length) {
        return res.status(404).json({
          success: 0,
          message: "Slot not found",
        });
      }

      const { rowCount } = await pool.query(
        `DELETE FROM "BookingSlots" WHERE "Id" = '${payload.id}'`
      );

      if (!rowCount) {
        return res.json({
          success: 0,
          message: "Unable to delete slot",
        });
      }

      return res.json({
        success: 1,
        message: "Slot deleted successfully",
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error.message,
      });
    }
  }

  async getBookings(req, res) {
    try {
      const payload = req.query;
      let filters = [];
      const offset = ((payload?.page || 1) - 1) * (payload?.pageSize || 10);
      const limit = payload?.pageSize || 10;
      const sort = payload?.sort || "DESC";
      const sortBy = payload?.sortBy || `book."CreatedAt"`;

      if (payload?.id) {
        filters.push(`book."Id" = '${payload.id}'`);
      }

      if (payload?.date) {
        filters.push(`DATE(sl."Date") = DATE('${payload.date}')`);
      }

      if (payload?.search) {
        filters.push(
          `(book."Name" ILIKE '%${payload.search}%' OR book."Service" ILIKE '%${payload.search}%')`
        );
      }

      if (payload?.status) {
        filters.push(
          `book."Status" IN (${payload.status
            .split(",")
            .map((item) => `'${item}'`)
            .join(",")})`
        );
      }

      const { rows: data } = await pool.query(
        `SELECT book.*, sl."Date", sl."StartTime", sl."EndTime"
         FROM "Bookings" as book
         JOIN "BookingSlots" as sl ON sl."Id" = book."SlotId"
         ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
         ORDER BY ${sortBy} ${sort} 
         LIMIT ${limit} OFFSET ${offset}`
      );

      const { rows: count } = await pool.query(
        `SELECT COUNT(*) as total 
         FROM "Bookings" as book
         JOIN "BookingSlots" as sl ON sl."Id" = book."SlotId"
         ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}`
      );

      const total = count[0].total;
      return res.json({
        success: 1,
        message: "Bookings fetched successfully",
        data,
        total,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: error.message });
    }
  }
}

export default new AdminController();

export const generatedSlug = async (Title, Table) => {
  let slug;
  let title = Title;
  let index = 1;
  do {
    slug = title
      .trim()
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-");
    var { rows: data } = await pool.query(
      `SELECT * FROM "${Table}" WHERE "Slug" = '${slug}'`
    );
    if (data?.length) {
      title = Title + " " + index;
      index++;
    }
  } while (data?.length);

  return slug;
};
