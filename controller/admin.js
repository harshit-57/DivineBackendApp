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
        return res.json({
          success: 0,
          message: "Missing required fields",
        });
      }
      console.log(
        generatedSlug,
        await generatedSlug(payload.title, "Products")
      );

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
        PublishedOn, 
        Status
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          new Date(payload.publishedOn) > new Date()
            ? new Data(payload.publishedOn)
            : new Date(),
          payload.Status || 1,
        ]
      );

      if (!course)
        return res.json({
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
                `INSERT INTO ProductTags (Name) VALUES (?, ?)`,
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
