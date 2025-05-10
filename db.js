const mysql = require("mysql2/promise");

// Membuat koneksi pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
});

const connectToDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("Database connected successfully.");
    connection.release(); // Jangan lupa melepaskan koneksi kembali ke pool
  } catch (error) {
    console.error("Database connection failed: ", error);
    throw error;
  }
};

connectToDatabase().catch((err) => {
  console.error("Database connection error:", err);
});
