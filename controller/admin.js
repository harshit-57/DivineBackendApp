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
}

export default new AdminController();
