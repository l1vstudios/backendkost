const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST, // Gunakan host yang benar
  user: process.env.MYSQL_USER, // User: root
  password: process.env.MYSQL_PASSWORD, // Password sesuai dengan Railway
  database: process.env.MYSQL_DATABASE, // Database: manajemenkost
  port: process.env.MYSQL_PORT || 30166, // Port: 30166 sesuai dengan Railway
});

module.exports = pool;
