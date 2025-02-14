import { pool } from "../db.js";
import { generateToken } from "../utils/helper.js";

class AdminController {
  async login(req, res) {
    const payload = req.body;
    const { email, password } = payload;
    if (!email || !password) {
      return res.json({
        success: 0,
        message: "Missing required fields",
      });
    }
    let [data] = await pool.execute(
      `SELECT * FROM Admins WHERE Email = ? AND Password = ?`,
      [email, password]
    );
    if (!data.length) {
      return res.json({
        success: 0,
        message: "Invalid credentials",
      });
    }
    data = data[0];

    delete data.password;

    const token = generateToken({
      id: data.id,
      email: data.email,
    });
    res.json({
      success: 1,
      data,
      token,
    });
  }

  async createCourse(req, res) {
    try {
      let payload = req.body || {};

      if (
        !payload.title ||
        !payload.description ||
        !payload.shortDescription ||
        !payload.productUrl ||
        !payload.regularPrice
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
          payload.focusKeyphrase || payload.title,
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
          `INSERT INTO ProductMappingImage (ProductId, ImageUrl) VALUES (?, ?)`,
          [
            courseId,
            "https://i0.wp.com/acharyaganesh.com/wp-content/uploads/2025/01/Advanced-Astrology-Course-Planets-In-Houses-Course.webp?fit=800%2C1130&ssl=1",
          ]
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
      if (payload.salePrice) updateDetails.Sale_Price = payload.salePrice;
      if (payload.focusKeyphrase)
        updateDetails.Focus_keyphrase = payload.focusKeyphrase;
      if (payload.metaTitle) updateDetails.Meta_Title = payload.metaTitle;
      if (payload.metaSiteName)
        updateDetails.Meta_SiteName = payload.metaSiteName;
      if (payload.metaDescription)
        updateDetails.Meta_Desc = payload.metaDescription;
      if (payload.isTOP) updateDetails.IsTop = payload.isTOP;
      if (new Date(payload.publishedOn) > new Date())
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

      // if (payload?.image)
      //   await pool.execute(
      //     `INSERT INTO ProductMappingImage (ProductId, ImageUrl) VALUES (?, ?)`,
      //     [
      //       courseId,
      //       "https://i0.wp.com/acharyaganesh.com/wp-content/uploads/2025/01/Advanced-Astrology-Course-Planets-In-Houses-Course.webp?fit=800%2C1130&ssl=1",
      //     ]
      //   );

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
