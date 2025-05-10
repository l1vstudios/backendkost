const express = require("express");
const pool = require("./db"); // Pastikan `pool` diimpor dari db.js
const app = express();
const verifyToken = require("./auth"); // Import middleware

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("API Backend Kost is Running 🚆");
});

app.post("/kost", verifyToken, async (req, res) => {
  try {
    const {
      nama_ruangan,
      deskripsi,
      fasilitas,
      harga,
      ukuran_kamar,
      tipe,
      gambar,
    } = req.body;

    if (!nama_ruangan || !harga || !tipe) {
      return res.status(400).json({ message: "Field wajib belum lengkap" });
    }

    // Menggunakan query melalui pool
    const [result] = await pool.query(
      `INSERT INTO kost (nama_ruangan, deskripsi, fasilitas, harga, ukuran_kamar, tipe, gambar)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nama_ruangan,
        deskripsi || "",
        JSON.stringify(fasilitas || []),
        harga,
        ukuran_kamar || "",
        tipe,
        JSON.stringify(gambar || []),
      ]
    );

    res.status(201).json({
      message: "Kost berhasil ditambahkan",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({
      message: "Gagal menambahkan kost",
      error: error.message || error,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
