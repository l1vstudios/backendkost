const express = require("express");
const app = express();
const pool = require("./db");
const verifyToken = require("./auth"); // import middleware

// Gunakan PORT dari environment Railway, fallback ke 3000 untuk lokal
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Tambahkan route GET / untuk tes jika dibuka dari browser
app.get("/", (req, res) => {
  res.send("API Backend Kost is Running 🚆");
});

// Semua route di bawah ini pakai verifikasi token
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
    console.error(error);
    res.status(500).json({ message: "Gagal menambahkan kost" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
