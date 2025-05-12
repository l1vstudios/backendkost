const express = require("express");
const app = express();
const pool = require("./db");
const verifyToken = require("./auth");

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("API Backend Kost is Running 🚆");
});

app.get("/ambilkost", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM kost ORDER BY id DESC");
    res.status(200).json({ data: rows });
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({
      message: "Gagal mengambil data kost",
      error: error.message,
    });
  }
});

app.post("/login", async (req, res) => {
  const { username, passwords } = req.body;

  try {
    if (!username || !passwords) {
      return res
        .status(400)
        .json({ message: "Username dan password wajib diisi" });
    }

    const [users] = await pool.query(
      "SELECT * FROM iniusers WHERE username = ? AND passwords = ?",
      [username, passwords]
    );

    const user = users[0];

    if (!user) {
      return res.status(401).json({ message: "Username atau password salah" });
    }

    res.status(200).json({
      message: "Login berhasil",
      user: {
        id: user.id,
        username: user.username,
        type: user.type || null,
      },
    });
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ message: "Login gagal", error: error.message });
  }
});

app.post("/addkost", verifyToken, async (req, res) => {
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
    console.error("ERROR:", error);
    res
      .status(500)
      .json({ message: "Gagal menambahkan kost", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
