require("dotenv").config(); // Memuat variabel environment dari file .env
const mysql = require("mysql2/promise");

// Koneksi ke database menggunakan variabel lingkungan
const connectToDatabase = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST, // Host dari environment
      user: process.env.MYSQL_USER, // User dari environment
      password: process.env.MYSQL_PASSWORD, // Password dari environment
      database: process.env.MYSQL_DATABASE, // Nama database dari environment
      port: process.env.MYSQL_PORT, // Port dari environment
    });

    console.log("Connected to database as id: " + connection.threadId);

    return connection; // Mengembalikan koneksi untuk digunakan lebih lanjut
  } catch (err) {
    console.error("Error connecting to the database: ", err);
    throw err; // Melempar error jika gagal terkoneksi
  }
};

// Panggil fungsi connectToDatabase
connectToDatabase()
  .then((connection) => {
    // Bisa menambahkan logika lebih lanjut di sini menggunakan koneksi
    // connection.query() untuk menjalankan query, dsb.
  })
  .catch((error) => {
    console.error("Connection error:", error);
  });
