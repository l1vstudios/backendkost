const mysql = require("mysql2/promise");

const connectToDatabase = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: process.env.MYSQL_PORT,
    });

    console.log("Database connected successfully.");
    return connection;
  } catch (error) {
    console.error("Database connection failed: ", error);
    throw error;
  }
};

connectToDatabase().catch((err) => {
  console.error("Database connection error:", err);
});
