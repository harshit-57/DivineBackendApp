import dotenv from "dotenv";
dotenv.config({
  path: `${process.env.NODE_ENV ? ".env." + process.env.NODE_ENV : ".env"}`,
});

// import mysql from "mysql2/promise";

// export const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_DATABASE,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   idleTimeout: 30000,
// });

// pool.on("connect", () => console.log("Connected to SQL"));
// pool.on("error", (err) => console.error("Pool error:", err.stack));

import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT || 5432,
  max: 10,
  idleTimeoutMillis: 300000,
  connectionTimeoutMillis: 20000,
  options: "-c search_path=dbo",
});

pool.connect();
// const res = await pool.query("SHOW search_path;");
// console.log(res.rows);

pool.on("connect", () => console.log("Connected to PostgreSQL"));
pool.on("error", (err) => console.error("Pool error:", err.stack));
