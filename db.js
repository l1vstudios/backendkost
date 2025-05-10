require("dotenv").config();
const mysql = require("mysql2/promise");
const { parse } = require("url");

const dbUrl = process.env.DATABASE_URL;
const { hostname, port, auth, pathname } = parse(dbUrl);
const [user, password] = auth.split(":");
const database = pathname.replace("/", "");

const pool = mysql.createPool({
  host: hostname,
  port: port,
  user: user,
  password: password,
  database: database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
