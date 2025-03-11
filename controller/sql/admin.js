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
      let [data] = await pool.execute(`SELECT * FROM Admins WHERE Email = ?`, [
        email,
      ]);
      if (!data.length) {
        return res.status(401).json({
          success: 0,
          message: "Invalid credentials",
        });
      }
      data = data[0];

      if (!bcrypt?.compare(password, data.Password)) {
        return res.status(401).json({
          success: 0,
          message: "Invalid credentials",
        });
      }

      delete data.password;

      const token = generateToken({
        id: data.id,
        email: data.Email,
        role_id: data.RoleId,
      });
      res.json({
        success: 1,
        data,
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

      let [data] = await pool.execute(
        `SELECT ad.* , AdminRoles.Name AS RoleName, AdminRoles.Permission AS RolePermissions
      FROM Admins as ad
      JOIN AdminRoles ON ad.RoleId = AdminRoles.Id
      WHERE ad.Id=?;`,
        [id]
      );

      if (!data?.length) {
        return res.status(404).json({
          success: 0,
          message: "Admin not found",
        });
      }
      data = data[0];
      delete data.password;

      res.json({
        success: 1,
        data,
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
      const sortBy = payload?.sortBy || "ad.CreatedAt";

      if (payload?.id) {
        filters.push(`ad.Id = ${payload.id}`);
      }

      if (payload?.search) {
        filters.push(`ad.Name LIKE "${payload.search}%"`);
      }

      let [data] = await pool.execute(
        `SELECT ad.* , AdminRoles.Name AS RoleName
          FROM Admins as ad
          JOIN AdminRoles ON ad.RoleId = AdminRoles.Id
          ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
          ORDER BY ${sortBy} ${sort} 
          LIMIT ${limit} OFFSET ${offset};`
      );
      let [count] = await pool.execute(
        `SELECT COUNT(*) as total FROM Admins as ad
       JOIN AdminRoles ON ad.RoleId = AdminRoles.Id
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
      let [data] = await pool.execute(`SELECT * FROM AdminRoles;`);
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

      const [exist] = await pool.execute(
        `SELECT * FROM Admins WHERE Email = ?`,
        [payload.email]
      );

      if (exist.length) {
        return res.status(400).json({
          success: 0,
          message: "Admin already exists",
        });
      }

      payload.password = bcrypt.hashSync(payload.password, 10);

      const [data] = await pool.execute(
        `INSERT INTO Admins (Name, Email, Password, RoleId) VALUES (?, ?, ?, ?)`,
        [payload.name, payload.email, payload.password, payload.role_id]
      );
      return res.json({
        success: 1,
        data,
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
        updateDetails.Password = bcrypt.hashSync(payload.password, 10);
      }

      const [data] = await pool.execute(
        `
        UPDATE Admins SET 
        ${Object.keys(updateDetails)
          ?.map((key) => `${key} = ?`)
          .join(", ")}
        WHERE Id = ?`,
        [...Object.values(updateDetails), id]
      );

      return res.json({
        success: 1,
        data,
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
      const [data] = await pool.execute(`DELETE FROM Admins WHERE id = ?`, [
        id,
      ]);
      return res.json({
        success: 1,
        data,
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

      const [course] = await pool.execute(
        `INSERT INTO Products 
        (
        Name, 
        Slug, 
        ProductDescription, 
        ShortDescription, 
        ProductUrl, 
        Buy_Text, 
        Regular_Price, 
        Sale_Price, 
        Focus_keyphrase,
        Meta_Title, 
        Meta_SiteName, 
        Meta_Desc,
        IsTop,
        PublishedOn, 
        Status
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          payload.title,
          payload.slug,
          payload.description,
          payload.shortDescription,
          payload.productUrl,
          "Buy Now",
          payload.regularPrice,
          payload.salePrice || null,
          payload.focusKeyphrase || null,
          payload.metaTitle || payload.title,
          payload.metaSiteName ||
            "Acharya Ganesh: Solutions for Life, Love, and Career Woes",
          payload.metaDescription || "",
          payload.isTOP || 0,
          new Date(payload.publishedOn) > new Date()
            ? new Data(payload.publishedOn)
            : new Date(),
          payload.Status || 1,
        ]
      );

      if (!course)
        return res.status(500).json({
          success: 0,
          message: "Unable to create course",
        });

      const courseId = course.insertId;

      if (payload?.image)
        await pool.execute(
          `INSERT INTO ProductMappingImage (ProductId, ImageUrl, ImageAlt) VALUES (?, ?, ?)`,
          [courseId, payload?.image, payload?.imageAlt || ""]
        );

      if (payload?.categories?.length) {
        await Promise.all(
          payload?.categories?.map(async (category) => {
            if (category?.id)
              await pool.execute(
                `INSERT INTO ProductMappingCategory (ProductId, ProductCategoryId) VALUES (?, ?)`,
                [courseId, category?.id]
              );
          })
        );
      }

      if (payload?.tags?.length) {
        await Promise.all(
          payload?.tags.map(async (tag) => {
            const [oldTag] = await pool.execute(
              `SELECT Id FROM ProductTags WHERE Name = ?`,
              [tag?.name]
            );
            if (oldTag[0]?.Id)
              await pool.execute(
                `INSERT INTO ProductMappingTag (ProductId, ProductTagId) VALUES (?, ?)`,
                [courseId, oldTag[0]?.Id]
              );
            else {
              const [newTag] = await pool.execute(
                `INSERT INTO ProductTags (Name, Slug) VALUES (?, ?)`,
                [tag?.name, await generatedSlug(tag?.name, "ProductTags")]
              );
              await pool.execute(
                `INSERT INTO ProductMappingTag (ProductId, ProductTagId) VALUES (?, ?)`,
                [courseId, newTag.insertId]
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
        message: error,
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

      let [product] = await pool.execute(
        `SELECT * FROM Products WHERE Id = ?`,
        [payload.id]
      );

      product = product[0];

      if (payload?.slug && product?.Slug != payload?.slug) {
        const [existSlug] = await pool.execute(
          `SELECT Id FROM Products WHERE Slug = ?`,
          [payload.slug]
        );
        if (existSlug.length) {
          return res.status(400).json({
            success: 0,
            message: "Slug already exists",
          });
        }
      }

      const updateDetails = {};

      if (payload.title) updateDetails.Name = payload.title;
      if (payload.slug) updateDetails.Slug = payload.slug;
      if (payload.description)
        updateDetails.ProductDescription = payload.description;
      if (payload.shortDescription)
        updateDetails.ShortDescription = payload.shortDescription;
      if (payload.productUrl) updateDetails.ProductUrl = payload.productUrl;
      if (payload.buyText) updateDetails.Buy_Text = payload.buyText;
      if (payload.regularPrice)
        updateDetails.Regular_Price = payload.regularPrice;
      if (payload.salePrice !== undefined)
        updateDetails.Sale_Price = payload.salePrice;
      if (payload.focusKeyphrase !== undefined)
        updateDetails.Focus_keyphrase = payload.focusKeyphrase;
      if (payload.metaTitle !== undefined)
        updateDetails.Meta_Title = payload.metaTitle;
      if (payload.metaSiteName !== undefined)
        updateDetails.Meta_SiteName = payload.metaSiteName;
      if (payload.metaDescription !== undefined)
        updateDetails.Meta_Desc = payload.metaDescription;
      if (payload.isTOP !== undefined) updateDetails.IsTop = payload.isTOP;
      if (
        payload.publishedOn &&
        new Date(payload.publishedOn) != new Date(product?.PublishedOn)
      )
        updateDetails.PublishedOn = new Date(payload.publishedOn);
      if (payload.status) updateDetails.Status = payload.status;
      if (payload.deletedOn)
        updateDetails.DeletedOn = new Date(payload.deletedOn);

      const course = await pool.execute(
        `UPDATE Products SET ${Object.keys(updateDetails)
          ?.map((key) => `${key} = ?`)
          .join(", ")} WHERE Id = ?`,
        [...Object.values(updateDetails), payload?.id]
      );

      if (!course)
        return res.json({
          success: 0,
          message: "Unable to update course",
        });

      if (payload?.image) {
        await pool.execute(
          `DELETE FROM ProductMappingImage WHERE ProductId = ?`,
          [payload?.id]
        );
        await pool.execute(
          `INSERT INTO ProductMappingImage (ProductId, ImageUrl, ImageAlt) VALUES (?, ?, ?)`,
          [payload?.id, payload?.image, payload?.imageAlt || ""]
        );
      }

      if (payload?.categories?.length) {
        await pool.execute(
          `DELETE FROM ProductMappingCategory WHERE ProductId = ? AND ProductCategoryId NOT IN (${payload?.categories
            ?.map((category) => category?.id)
            ?.join(", ")})`,
          [payload?.id]
        );

        await Promise.all(
          payload?.categories?.map(async (category) => {
            if (category?.id) {
              const [existCategory] = await pool.execute(
                `SELECT Id FROM ProductMappingCategory WHERE ProductId = ? AND ProductCategoryId = ?`,
                [payload?.id, category?.id]
              );
              if (!existCategory?.length)
                await pool.execute(
                  `INSERT INTO ProductMappingCategory (ProductId, ProductCategoryId) VALUES (?, ?)`,
                  [payload?.id, category?.id]
                );
            }
          })
        );
      }

      if (payload?.tags?.length) {
        await pool.execute(
          `DELETE FROM ProductMappingTag WHERE ProductId = ? ${
            payload?.tags?.filter((tag) => tag?.id)?.length
              ? `AND ProductTagId NOT IN (${payload?.tags
                  ?.filter((tag) => tag?.id)
                  ?.map((tag) => tag?.id)
                  ?.join(", ")})`
              : ""
          } `,
          [payload?.id]
        );
        await Promise.all(
          payload?.tags.map(async (tag) => {
            if (!tag?.id) {
              const [oldTag] = await pool.execute(
                `SELECT Id FROM ProductTags WHERE Name = ?`,
                [tag?.name]
              );
              if (oldTag[0]?.Id)
                await pool.execute(
                  `INSERT INTO ProductMappingTag (ProductId, ProductTagId) VALUES (?, ?)`,
                  [payload?.id, oldTag[0]?.Id]
                );
              else {
                const [newTag] = await pool.execute(
                  `INSERT INTO ProductTags (Name, Slug) VALUES (?, ?)`,
                  [tag?.name, await generatedSlug(tag?.name, "ProductTags")]
                );
                await pool.execute(
                  `INSERT INTO ProductMappingTag (ProductId, ProductTagId) VALUES (?, ?)`,
                  [payload?.id, newTag.insertId]
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
          slug: payload.slug,
          id: payload?.id,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error,
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

      const [blog] = await pool.execute(
        `INSERT INTO Blogs 
        (
        Title, 
        Slug, 
        Description, 
        ShortDescription,
        Image,
        ImageAlt,
        Focus_keyphrase,
        Meta_Title, 
        Meta_SiteName, 
        Meta_Desc,
        IsTop,
        PublishedOn, 
        Status
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          payload.title,
          payload.slug,
          payload.description,
          payload.shortDescription || null,
          payload.image || null,
          payload.imageAlt || null,
          payload.focusKeyphrase || null,
          payload.metaTitle || payload.title,
          payload.metaSiteName ||
            "Acharya Ganesh: Solutions for Life, Love, and Career Woes",
          payload.metaDescription || "",
          payload.isTOP || 1,
          new Date(payload.publishedOn) > new Date()
            ? new Data(payload.publishedOn)
            : new Date(),
          payload.Status || 1,
        ]
      );

      if (!blog)
        return res.status(500).json({
          success: 0,
          message: "Unable to create blog",
        });

      const blogId = blog.insertId;

      if (payload?.categories?.length) {
        await Promise.all(
          payload?.categories?.map(async (category) => {
            if (category?.id)
              await pool.execute(
                `INSERT INTO BlogMappingCategory (BlogId, BlogCategoryId) VALUES (?, ?)`,
                [blogId, category?.id]
              );
          })
        );
      }

      if (payload?.tags?.length) {
        await Promise.all(
          payload?.tags.map(async (tag) => {
            if (tag?.name) {
              const [oldTag] = await pool.execute(
                `SELECT Id FROM BlogTags WHERE Name = ?`,
                [tag?.name]
              );
              if (oldTag[0]?.Id)
                await pool.execute(
                  `INSERT INTO BlogMappingTag (BlogId, BlogTagId) VALUES (?, ?)`,
                  [blogId, oldTag[0]?.Id]
                );
              else {
                const [newTag] = await pool.execute(
                  `INSERT INTO BlogTags (Name, Slug) VALUES (?, ?)`,
                  [tag?.name, await generatedSlug(tag?.name, "BlogTags")]
                );
                await pool.execute(
                  `INSERT INTO BlogMappingTag (BlogId, BlogTagId) VALUES (?, ?)`,
                  [blogId, newTag.insertId]
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
        message: error,
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

      let [blog] = await pool.execute(`SELECT * FROM Blogs WHERE Id = ?`, [
        payload.id,
      ]);

      blog = blog[0];

      if (payload?.slug && blog?.Slug != payload?.slug) {
        const [existSlug] = await pool.execute(
          `SELECT Id FROM Blogs WHERE Slug = ?`,
          [payload.slug]
        );
        if (existSlug.length) {
          return res.status(400).json({
            success: 0,
            message: "Slug already exists",
          });
        }
      }

      const updateDetails = {};

      if (payload.title) updateDetails.Title = payload.title;
      if (payload.slug) updateDetails.Slug = payload.slug;
      if (payload.description) updateDetails.Description = payload.description;
      if (payload.shortDescription !== undefined)
        updateDetails.ShortDescription = payload.shortDescription;
      if (payload.image !== undefined) updateDetails.Image = payload.image;
      if (payload.imageAlt !== undefined)
        updateDetails.ImageAlt = payload.imageAlt;
      if (payload.focusKeyphrase !== undefined)
        updateDetails.Focus_keyphrase = payload.focusKeyphrase;
      if (payload.metaTitle !== undefined)
        updateDetails.Meta_Title = payload.metaTitle;
      if (payload.metaSiteName !== undefined)
        updateDetails.Meta_SiteName = payload.metaSiteName;
      if (payload.metaDescription !== undefined)
        updateDetails.Meta_Desc = payload.metaDescription;
      if (payload.isTOP !== undefined) updateDetails.IsTop = payload.isTOP;
      if (
        payload.publishedOn &&
        new Date(payload.publishedOn) != new Date(blog?.PublishedOn)
      )
        updateDetails.PublishedOn = new Date(payload.publishedOn);
      if (payload.status) updateDetails.Status = payload.status;
      if (payload.deletedOn)
        updateDetails.DeletedOn = new Date(payload.deletedOn);

      const updatedBlog = await pool.execute(
        `UPDATE Blogs SET ${Object.keys(updateDetails)
          ?.map((key) => `${key} = ?`)
          .join(", ")} WHERE Id = ?`,
        [...Object.values(updateDetails), payload?.id]
      );

      if (!updatedBlog)
        return res.json({
          success: 0,
          message: "Unable to update blog",
        });

      if (payload?.categories?.length) {
        await pool.execute(
          `DELETE FROM BlogMappingCategory WHERE BlogId = ? AND BlogCategoryId NOT IN (${payload?.categories
            ?.map((category) => category?.id)
            ?.join(", ")})`,
          [payload?.id]
        );

        await Promise.all(
          payload?.categories?.map(async (category) => {
            if (category?.id) {
              const [existCategory] = await pool.execute(
                `SELECT Id FROM BlogMappingCategory WHERE BlogId = ? AND BlogCategoryId = ?`,
                [payload?.id, category?.id]
              );
              if (!existCategory?.length)
                await pool.execute(
                  `INSERT INTO BlogMappingCategory (BlogId, BlogCategoryId) VALUES (?, ?)`,
                  [payload?.id, category?.id]
                );
            }
          })
        );
      }

      if (payload?.tags?.length) {
        await pool.execute(
          `DELETE FROM BlogMappingTag WHERE BlogId = ? ${
            payload?.tags?.filter((tag) => tag?.id)?.length
              ? `AND BlogTagId NOT IN (${payload?.tags
                  ?.filter((tag) => tag?.id)
                  ?.map((tag) => tag?.id)
                  ?.join(", ")})`
              : ""
          } `,
          [payload?.id]
        );
        await Promise.all(
          payload?.tags.map(async (tag) => {
            if (!tag?.id && tag?.name) {
              const [oldTag] = await pool.execute(
                `SELECT Id FROM BlogTags WHERE Name = ?`,
                [tag?.name]
              );
              if (oldTag[0]?.Id)
                await pool.execute(
                  `INSERT INTO BlogMappingTag (BlogId, BlogTagId) VALUES (?, ?)`,
                  [payload?.id, oldTag[0]?.Id]
                );
              else {
                const [newTag] = await pool.execute(
                  `INSERT INTO BlogTags (Name, Slug) VALUES (?, ?)`,
                  [tag?.name, await generatedSlug(tag?.name, "BlogTags")]
                );
                await pool.execute(
                  `INSERT INTO BlogMappingTag (BlogId, BlogTagId) VALUES (?, ?)`,
                  [payload?.id, newTag.insertId]
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
          slug: payload.slug,
          id: payload?.id,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error,
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

      const [spirituality] = await pool.execute(
        `INSERT INTO Spiritualities 
        (
        Title, 
        Slug, 
        Description, 
        Image,
        ImageAlt,
        Focus_keyphrase,
        Meta_Title, 
        Meta_SiteName, 
        Meta_Desc,
        IsTop,
        PublishedOn, 
        Status
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          payload.title,
          payload.slug,
          payload.description,
          payload.image || null,
          payload.imageAlt || null,
          payload.focusKeyphrase || null,
          payload.metaTitle || payload.title,
          payload.metaSiteName ||
            "Acharya Ganesh: Solutions for Life, Love, and Career Woes",
          payload.metaDescription || "",
          payload.isTOP || 1,
          new Date(payload.publishedOn) > new Date()
            ? new Data(payload.publishedOn)
            : new Date(),
          payload.Status || 1,
        ]
      );

      if (!spirituality)
        return res.status(500).json({
          success: 0,
          message: "Unable to create spirituality",
        });

      const spiritualityId = spirituality.insertId;

      if (payload?.categories?.length) {
        await Promise.all(
          payload?.categories?.map(async (category) => {
            if (category?.id)
              await pool.execute(
                `INSERT INTO SpiritualityMappingCategory (SpiritualityId, SpiritualityCategoryId) VALUES (?, ?)`,
                [spiritualityId, category?.id]
              );
          })
        );
      }

      if (payload?.tags?.length) {
        await Promise.all(
          payload?.tags.map(async (tag) => {
            if (tag?.name) {
              const [oldTag] = await pool.execute(
                `SELECT Id FROM SpiritualityTags WHERE Name = ?`,
                [tag?.name]
              );
              if (oldTag[0]?.Id)
                await pool.execute(
                  `INSERT INTO SpiritualityMappingTag (SpiritualityId, SpiritualityTagId) VALUES (?, ?)`,
                  [spiritualityId, oldTag[0]?.Id]
                );
              else {
                const [newTag] = await pool.execute(
                  `INSERT INTO SpiritualityTags (Name, Slug) VALUES (?, ?)`,
                  [
                    tag?.name,
                    await generatedSlug(tag?.name, "SpiritualityTags"),
                  ]
                );
                await pool.execute(
                  `INSERT INTO SpiritualityMappingTag (SpiritualityId, SpiritualityTagId) VALUES (?, ?)`,
                  [spiritualityId, newTag.insertId]
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
        message: error,
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

      let [spirituality] = await pool.execute(
        `SELECT * FROM Spiritualities WHERE Id = ?`,
        [payload.id]
      );

      spirituality = spirituality[0];

      if (payload?.slug && spirituality?.Slug != payload?.slug) {
        const [existSlug] = await pool.execute(
          `SELECT Id FROM Spiritualities WHERE Slug = ?`,
          [payload.slug]
        );
        if (existSlug.length) {
          return res.status(400).json({
            success: 0,
            message: "Slug already exists",
          });
        }
      }

      const updateDetails = {};

      if (payload.title) updateDetails.Title = payload.title;
      if (payload.slug) updateDetails.Slug = payload.slug;
      if (payload.description) updateDetails.Description = payload.description;
      if (payload.image !== undefined) updateDetails.Image = payload.image;
      if (payload.imageAlt !== undefined)
        updateDetails.ImageAlt = payload.imageAlt;
      if (payload.focusKeyphrase !== undefined)
        updateDetails.Focus_keyphrase = payload.focusKeyphrase;
      if (payload.metaTitle !== undefined)
        updateDetails.Meta_Title = payload.metaTitle;
      if (payload.metaSiteName !== undefined)
        updateDetails.Meta_SiteName = payload.metaSiteName;
      if (payload.metaDescription !== undefined)
        updateDetails.Meta_Desc = payload.metaDescription;
      if (payload.isTOP !== undefined) updateDetails.IsTop = payload.isTOP;
      if (
        payload.publishedOn &&
        new Date(payload.publishedOn) != new Date(spirituality?.PublishedOn)
      )
        updateDetails.PublishedOn = new Date(payload.publishedOn);
      if (payload.status) updateDetails.Status = payload.status;
      if (payload.deletedOn)
        updateDetails.DeletedOn = new Date(payload.deletedOn);

      const updatedSpirituality = await pool.execute(
        `UPDATE Spiritualities SET ${Object.keys(updateDetails)
          ?.map((key) => `${key} = ?`)
          .join(", ")} WHERE Id = ?`,
        [...Object.values(updateDetails), payload?.id]
      );

      if (!updatedSpirituality)
        return res.json({
          success: 0,
          message: "Unable to update spirituality",
        });

      if (payload?.categories?.length) {
        await pool.execute(
          `DELETE FROM SpiritualityMappingCategory WHERE SpiritualityId = ? AND SpiritualityCategoryId NOT IN (${payload?.categories
            ?.map((category) => category?.id)
            ?.join(", ")})`,
          [payload?.id]
        );

        await Promise.all(
          payload?.categories?.map(async (category) => {
            if (category?.id) {
              const [existCategory] = await pool.execute(
                `SELECT Id FROM SpiritualityMappingCategory WHERE SpiritualityId = ? AND SpiritualityCategoryId = ?`,
                [payload?.id, category?.id]
              );
              if (!existCategory?.length)
                await pool.execute(
                  `INSERT INTO SpiritualityMappingCategory (SpiritualityId, SpiritualityCategoryId) VALUES (?, ?)`,
                  [payload?.id, category?.id]
                );
            }
          })
        );
      }

      if (payload?.tags?.length) {
        await pool.execute(
          `DELETE FROM SpiritualityMappingTag WHERE SpiritualityId = ? ${
            payload?.tags?.filter((tag) => tag?.id)?.length
              ? `AND SpiritualityTagId NOT IN (${payload?.tags
                  ?.filter((tag) => tag?.id)
                  ?.map((tag) => tag?.id)
                  ?.join(", ")})`
              : ""
          } `,
          [payload?.id]
        );
        await Promise.all(
          payload?.tags.map(async (tag) => {
            if (!tag?.id && tag?.name) {
              const [oldTag] = await pool.execute(
                `SELECT Id FROM SpiritualityTags WHERE Name = ?`,
                [tag?.name]
              );
              if (oldTag[0]?.Id)
                await pool.execute(
                  `INSERT INTO SpiritualityMappingTag (SpiritualityId, SpiritualityTagId) VALUES (?, ?)`,
                  [payload?.id, oldTag[0]?.Id]
                );
              else {
                const [newTag] = await pool.execute(
                  `INSERT INTO SpiritualityTags (Name, Slug) VALUES (?, ?)`,
                  [
                    tag?.name,
                    await generatedSlug(tag?.name, "SpiritualityTags"),
                  ]
                );
                await pool.execute(
                  `INSERT INTO SpiritualityMappingTag (SpiritualityId, SpiritualityTagId) VALUES (?, ?)`,
                  [payload?.id, newTag.insertId]
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
          slug: payload.slug,
          id: payload?.id,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error,
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

      const [citation] = await pool.execute(
        `INSERT INTO Citations 
        (
        Title, 
        Slug, 
        Description,
        PublishedOn, 
        Focus_keyphrase,
        Meta_Title, 
        Meta_SiteName, 
        Meta_Desc,
        Status
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          payload.title,
          payload.slug,
          payload.description,
          new Date(payload.publishedOn) > new Date()
            ? new Data(payload.publishedOn)
            : new Date(),
          payload.focusKeyphrase || null,
          payload.metaTitle || payload.title,
          payload.metaSiteName ||
            "Acharya Ganesh: Solutions for Life, Love, and Career Woes",
          payload.metaDescription || "",
          payload.Status || 1,
        ]
      );

      if (!citation)
        return res.status(500).json({
          success: 0,
          message: "Unable to create citation",
        });

      const citationId = citation.insertId;

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
        message: error,
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

      let [citation] = await pool.execute(
        `SELECT * FROM Citations WHERE Id = ?`,
        [payload.id]
      );

      citation = citation[0];

      if (payload?.slug && citation?.Slug != payload?.slug) {
        const [existSlug] = await pool.execute(
          `SELECT Id FROM Citations WHERE Slug = ?`,
          [payload.slug]
        );
        if (existSlug.length) {
          return res.status(400).json({
            success: 0,
            message: "Slug already exists",
          });
        }
      }

      const updateDetails = {};

      if (payload.title) updateDetails.Title = payload.title;
      if (payload.slug) updateDetails.Slug = payload.slug;
      if (payload.description) updateDetails.Description = payload.description;
      if (
        payload.publishedOn &&
        new Date(payload.publishedOn) != new Date(citation?.PublishedOn)
      )
        updateDetails.PublishedOn = new Date(payload.publishedOn);
      if (payload.focusKeyphrase !== undefined)
        updateDetails.Focus_keyphrase = payload.focusKeyphrase;
      if (payload.metaTitle !== undefined)
        updateDetails.Meta_Title = payload.metaTitle;
      if (payload.metaSiteName !== undefined)
        updateDetails.Meta_SiteName = payload.metaSiteName;
      if (payload.metaDescription !== undefined)
        updateDetails.Meta_Desc = payload.metaDescription;
      if (payload.status) updateDetails.Status = payload.status;
      if (payload.deletedOn)
        updateDetails.DeletedOn = new Date(payload.deletedOn);

      const updatedCitation = await pool.execute(
        `UPDATE Citations SET ${Object.keys(updateDetails)
          ?.map((key) => `${key} = ?`)
          .join(", ")} WHERE Id = ?`,
        [...Object.values(updateDetails), payload?.id]
      );

      if (!updatedCitation)
        return res.json({
          success: 0,
          message: "Unable to update citation",
        });

      return res.json({
        success: 1,
        message: "Citation updated successfully",
        data: {
          slug: payload.slug,
          id: payload?.id,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error,
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
      const [testimonial] = await pool.execute(
        `INSERT INTO Testimonials 
        (
        UserName, 
        Description, 
        Rating,
        PublishedOn, 
        Status
        ) 
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          payload.title,
          payload.description,
          payload?.rating ? Number(payload.rating)?.toFixed(1) : 5,
          new Date(payload.publishedOn) > new Date()
            ? new Data(payload.publishedOn)
            : new Date(),
          payload.Status || 1,
        ]
      );

      if (!testimonial)
        return res.status(500).json({
          success: 0,
          message: "Unable to create testimonial",
        });

      const testimonialId = testimonial.insertId;

      return res.json({
        success: 1,
        message: "Testimonial created successfully",
        data: {
          slug: payload.slug,
          id: testimonialId,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error,
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

      let [testimonial] = await pool.execute(
        `SELECT * FROM Testimonials WHERE Id = ?`,
        [payload.id]
      );

      testimonial = testimonial[0];

      const updateDetails = {};

      if (payload.title) updateDetails.UserName = payload.title;
      if (payload.description) updateDetails.Description = payload.description;
      if (payload.rating || payload.rating == "")
        updateDetails.Rating = payload.rating
          ? Number(payload.rating)?.toFixed(1)
          : 5;
      if (
        payload.publishedOn &&
        new Date(payload.publishedOn) != new Date(testimonial?.PublishedOn)
      )
        updateDetails.PublishedOn = new Date(payload.publishedOn);
      if (payload.status) updateDetails.Status = payload.status;
      if (payload.deletedOn)
        updateDetails.DeletedOn = new Date(payload.deletedOn);

      const updatedTestimonial = await pool.execute(
        `UPDATE Testimonials SET ${Object.keys(updateDetails)
          ?.map((key) => `${key} = ?`)
          .join(", ")} WHERE Id = ?`,
        [...Object.values(updateDetails), payload?.id]
      );

      if (!updatedTestimonial)
        return res.json({
          success: 0,
          message: "Unable to update testimonial",
        });

      return res.json({
        success: 1,
        message: "Testimonial updated successfully",
        data: {
          id: payload?.id,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error,
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
      const [webStory] = await pool.execute(
        `INSERT INTO WebStories 
        (
        Title, 
        ShortDescription,
        CoverImageUrl,
        CoverImageAlt,
        TimeDuration,
        PublishedOn, 
        Status
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          payload.title,
          payload.shortDescription,
          payload.image,
          payload.imageAlt,
          payload.timeDuration || 500,
          new Date(payload.publishedOn) > new Date()
            ? new Data(payload.publishedOn)
            : new Date(),
          payload.Status || 1,
        ]
      );

      if (!webStory)
        return res.status(500).json({
          success: 0,
          message: "Unable to create webStory",
        });

      const webStoryId = webStory.insertId;

      if (payload?.storyImages)
        await Promise.all(
          payload?.storyImages?.map(async (image, index) => {
            await pool.execute(
              `INSERT INTO WebStoryImage 
              (WebStoryId, 
              WebStoryImageUrl, 
              WebStoryImageText, 
              WebStoryImageOrder, 
              WebStoryImageLink, 
              WebStoryImageLinkText, 
              WebStoryImageLinkIcon) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                webStoryId,
                image?.imageUrl || "",
                image?.imageText || "",
                index + 1,
                image?.imageLink || "",
                image?.imageLinkText || "",
                image?.imageLinkIcon || "",
              ]
            );
          })
        );

      if (payload?.categories?.length) {
        await Promise.all(
          payload?.categories?.map(async (category) => {
            if (category?.id)
              await pool.execute(
                `INSERT INTO WebStoryMappingCategory (WebStoryId, WebStoryCategoryId) VALUES (?, ?)`,
                [webStoryId, category?.id]
              );
          })
        );
      }

      if (payload?.tags?.length) {
        await Promise.all(
          payload?.tags.map(async (tag) => {
            const [oldTag] = await pool.execute(
              `SELECT Id FROM WebStoryTags WHERE Name = ?`,
              [tag?.name]
            );
            if (oldTag[0]?.Id)
              await pool.execute(
                `INSERT INTO WebStoryMappingTag (WebStoryId, WebStoryTagId) VALUES (?, ?)`,
                [webStoryId, oldTag[0]?.Id]
              );
            else {
              const [newTag] = await pool.execute(
                `INSERT INTO WebStoryTags (Name, Slug) VALUES (?, ?)`,
                [tag?.name, await generatedSlug(tag?.name, "WebStoryTags")]
              );
              await pool.execute(
                `INSERT INTO WebStoryMappingTag (WebStoryId, WebStoryTagId) VALUES (?, ?)`,
                [webStoryId, newTag.insertId]
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
        message: error,
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

      let [webStory] = await pool.execute(
        `SELECT * FROM WebStories WHERE Id = ?`,
        [payload.id]
      );

      webStory = webStory[0];

      const updateDetails = {};

      if (payload.title) updateDetails.Title = payload.title;
      if (payload.shortDescription)
        updateDetails.ShortDescription = payload.shortDescription;
      if (payload.image) updateDetails.CoverImageUrl = payload.image;
      if (payload.imageAlt) updateDetails.CoverImageAlt = payload.imageAlt;
      if (payload.timeDuration)
        updateDetails.TimeDuration = payload.timeDuration;
      if (
        payload.publishedOn &&
        new Date(payload.publishedOn) != new Date(webStory?.PublishedOn)
      )
        updateDetails.PublishedOn = new Date(payload.publishedOn);
      if (payload.status) updateDetails.Status = payload.status;
      if (payload.deletedOn)
        updateDetails.DeletedOn = new Date(payload.deletedOn);

      const updatedWebStory = await pool.execute(
        `UPDATE WebStories SET ${Object.keys(updateDetails)
          ?.map((key) => `${key} = ?`)
          .join(", ")} WHERE Id = ?`,
        [...Object.values(updateDetails), payload?.id]
      );

      if (!updatedWebStory)
        return res.json({
          success: 0,
          message: "Unable to update web story",
        });

      if (payload?.storyImages) {
        await pool.execute(`DELETE FROM WebStoryImage WHERE WebStoryId = ?`, [
          payload?.id,
        ]);
        await Promise.all(
          payload?.storyImages?.map(async (image, index) => {
            await pool.execute(
              `INSERT INTO WebStoryImage 
              (WebStoryId, 
              WebStoryImageUrl, 
              WebStoryImageText, 
              WebStoryImageOrder, 
              WebStoryImageLink, 
              WebStoryImageLinkText, 
              WebStoryImageLinkIcon) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                payload?.id,
                image?.imageUrl || "",
                image?.imageText || "",
                index + 1,
                image?.imageLink || "",
                image?.imageLinkText || "",
                image?.imageLinkIcon || "",
              ]
            );
          })
        );
      }

      if (payload?.categories?.length) {
        await pool.execute(
          `DELETE FROM WebStoryMappingCategory WHERE WebStoryId = ? AND WebStoryCategoryId NOT IN (${payload?.categories
            ?.map((category) => category?.id)
            ?.join(", ")})`,
          [payload?.id]
        );

        await Promise.all(
          payload?.categories?.map(async (category) => {
            if (category?.id) {
              const [existCategory] = await pool.execute(
                `SELECT Id FROM WebStoryMappingCategory WHERE WebStoryId = ? AND WebStoryCategoryId = ?`,
                [payload?.id, category?.id]
              );
              if (!existCategory?.length)
                await pool.execute(
                  `INSERT INTO WebStoryMappingCategory (WebStoryId, WebStoryCategoryId) VALUES (?, ?)`,
                  [payload?.id, category?.id]
                );
            }
          })
        );
      }

      if (payload?.tags?.length) {
        await pool.execute(
          `DELETE FROM WebStoryMappingTag WHERE WebStoryId = ? ${
            payload?.tags?.filter((tag) => tag?.id)?.length
              ? `AND WebStoryTagId NOT IN (${payload?.tags
                  ?.filter((tag) => tag?.id)
                  ?.map((tag) => tag?.id)
                  ?.join(", ")})`
              : ""
          } `,
          [payload?.id]
        );
        await Promise.all(
          payload?.tags.map(async (tag) => {
            if (!tag?.id) {
              const [oldTag] = await pool.execute(
                `SELECT Id FROM WebStoryTags WHERE Name = ?`,
                [tag?.name]
              );
              if (oldTag[0]?.Id)
                await pool.execute(
                  `INSERT INTO WebStoryMappingTag (WebStoryId, WebStoryTagId) VALUES (?, ?)`,
                  [payload?.id, oldTag[0]?.Id]
                );
              else {
                const [newTag] = await pool.execute(
                  `INSERT INTO WebStoryTags (Name, Slug) VALUES (?, ?)`,
                  [tag?.name, await generatedSlug(tag?.name, "WebStoryTags")]
                );
                await pool.execute(
                  `INSERT INTO WebStoryMappingTag (WebStoryId, WebStoryTagId) VALUES (?, ?)`,
                  [payload?.id, newTag.insertId]
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
          id: payload?.id,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error,
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
          const [category] = await pool.execute(
            `SELECT Id FROM ProductCategories WHERE Name = ?`,
            [name]
          );
          if (category?.length)
            return res.status(400).json({
              success: 0,
              message: "Category already exists",
            });
          else {
            const slug = await generatedSlug(name, "ProductCategories");
            const [newCategory] = await pool.execute(
              `INSERT INTO ProductCategories (Name, Slug) VALUES (?, ?)`,
              [name, slug]
            );
            return res.json({
              success: 1,
              message: "Category created successfully",
              data: {
                Id: newCategory.insertId,
                Name: name,
                Slug: slug,
              },
            });
          }
          break;

        case "blog":
          const [blogCategory] = await pool.execute(
            `SELECT Id FROM BlogCategories WHERE Name = ?`,
            [name]
          );
          if (blogCategory?.length)
            return res.status(400).json({
              success: 0,
              message: "Category already exists",
            });
          else {
            const slug = await generatedSlug(name, "BlogCategories");
            const [newCategory] = await pool.execute(
              `INSERT INTO BlogCategories (Name, Slug) VALUES (?, ?)`,
              [name, slug]
            );
            return res.json({
              success: 1,
              message: "Category created successfully",
              data: {
                Id: newCategory.insertId,
                Name: name,
                Slug: slug,
              },
            });
          }
          break;

        case "spirituality":
          const [spiritualityCategory] = await pool.execute(
            `SELECT Id FROM SpiritualityCategories WHERE Name = ?`,
            [name]
          );

          if (spiritualityCategory?.length)
            return res.status(400).json({
              success: 0,
              message: "Category already exists",
            });
          else {
            const slug = await generatedSlug(name, "SpiritualityCategories");
            const [newCategory] = await pool.execute(
              `INSERT INTO SpiritualityCategories (Name, Slug) VALUES (?, ?)`,
              [name, slug]
            );
            return res.json({
              success: 1,
              message: "Category created successfully",
              data: {
                Id: newCategory.insertId,
                Name: name,
                Slug: slug,
              },
            });
          }
          break;

        case "story":
          const [webstoryCategory] = await pool.execute(
            `SELECT Id FROM WebStoryCategories WHERE Name = ?`,
            [name]
          );
          if (webstoryCategory?.length)
            return res.status(400).json({
              success: 0,
              message: "Category already exists",
            });
          else {
            const slug = await generatedSlug(name, "WebStoryCategories");
            const [newCategory] = await pool.execute(
              `INSERT INTO WebStoryCategories (Name, Slug) VALUES (?, ?)`,
              [name, slug]
            );
            return res.json({
              success: 1,
              message: "Category created successfully",
              data: {
                Id: newCategory.insertId,
                Name: name,
                Slug: slug,
              },
            });
          }
          break;

        default:
          return res.status(400).json({
            success: 0,
            message: "Invalid category type",
          });
          break;
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error,
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

      const [service] = await pool.execute(
        `INSERT INTO Services 
        (
        Name,
        Slug, 
        Description, 
        Title, 
        SubTitle,
        Image,
        ImageAlt,
        Link,
        LinkText,
        Focus_keyphrase,
        Meta_Title, 
        Meta_SiteName, 
        Meta_Desc,
        PublishedOn, 
        Status,
        ParentId
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          payload.title,
          payload.slug,
          payload.description,
          payload.header,
          payload.subHeader,
          payload.image || null,
          payload.imageAlt || null,
          payload.link || null,
          payload.linkText || null,
          payload.focusKeyphrase || null,
          payload.metaTitle || payload.title,
          payload.metaSiteName ||
            "Acharya Ganesh: Solutions for Life, Love, and Career Woes",
          payload.metaDescription || "",
          new Date(payload.publishedOn) > new Date()
            ? new Data(payload.publishedOn)
            : new Date(),
          payload.Status || 1,
          payload.parentId || null,
        ]
      );

      if (!service)
        return res.status(500).json({
          success: 0,
          message: "Unable to create service",
        });

      const serviceId = service.insertId;

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
        message: error,
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

      let [service] = await pool.execute(
        `SELECT * FROM Services WHERE Id = ?`,
        [payload.id]
      );

      service = service[0];

      if (payload?.slug && service?.Slug != payload?.slug) {
        const [existSlug] = await pool.execute(
          `SELECT Id FROM Services WHERE Slug = ?`,
          [payload.slug]
        );
        if (existSlug.length) {
          return res.status(400).json({
            success: 0,
            message: "Slug already exists",
          });
        }
      }

      const updateDetails = {};

      if (payload.title) updateDetails.Name = payload.title;
      if (payload.slug) updateDetails.Slug = payload.slug;
      if (payload.description) updateDetails.Description = payload.description;
      if (payload.header) updateDetails.Title = payload.header;
      if (payload.subHeader !== undefined)
        updateDetails.SubTitle = payload.subHeader;
      if (payload.image !== undefined) updateDetails.Image = payload.image;
      if (payload.imageAlt !== undefined)
        updateDetails.ImageAlt = payload.imageAlt;
      if (payload.link !== undefined) updateDetails.Link = payload.link;
      if (payload.linkText !== undefined)
        updateDetails.LinkText = payload.linkText;
      if (payload.focusKeyphrase !== undefined)
        updateDetails.Focus_keyphrase = payload.focusKeyphrase;
      if (payload.metaTitle !== undefined)
        updateDetails.Meta_Title = payload.metaTitle;
      if (payload.metaSiteName !== undefined)
        updateDetails.Meta_SiteName = payload.metaSiteName;
      if (payload.metaDescription !== undefined)
        updateDetails.Meta_Desc = payload.metaDescription;
      if (
        payload.publishedOn &&
        new Date(payload.publishedOn) != new Date(service?.PublishedOn)
      )
        updateDetails.PublishedOn = new Date(payload.publishedOn);
      if (payload.status) updateDetails.Status = payload.status;
      if (payload.deletedOn)
        updateDetails.DeletedOn = new Date(payload.deletedOn);
      if (payload.parentId !== undefined)
        updateDetails.ParentId = payload.parentId;

      const updatedService = await pool.execute(
        `UPDATE Services SET ${Object.keys(updateDetails)
          ?.map((key) => `${key} = ?`)
          .join(", ")} WHERE Id = ?`,
        [...Object.values(updateDetails), payload?.id]
      );

      if (!updatedService)
        return res.json({
          success: 0,
          message: "Unable to update service",
        });

      return res.json({
        success: 1,
        message: "Service updated successfully",
        data: {
          slug: payload.slug,
          id: payload?.id,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: 0,
        message: error,
      });
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
    var [data] = await pool.execute(`SELECT * FROM ${Table} WHERE Slug = ?`, [
      slug,
    ]);
    if (data?.length) {
      title = Title + " " + index;
      index++;
    }
  } while (data?.length);

  return slug;
};
