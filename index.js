const express = require("express");
const app = express();
const pool = require("./db");
const verifyToken = require("./auth");
const session = require("express-session");
app.use(express.json());
app.use(
  session({
    secret: "KOSTBILLING2026", // sebaiknya dari .env
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 60 * 60 * 1000, // 1 jam
    },
  })
);
const PORT = process.env.PORT || 3000;
const midtransClient = require("midtrans-client");

// Inisialisasi Snap Midtrans
const snap = new midtransClient.Snap({
  isProduction: false, // true untuk production
  serverKey: "SB-Mid-server-rhTh_R3AjJgPLTYvpqHu5fCA",
  clientKey: "SB-Mid-client-2bdQyiviek_b6r89",
});
app.use(express.json());

app.post("/create-payment", async (req, res) => {
  const { order_id, gross_amount, nama_pelanggan, email, phone, users_id } =
    req.body;

  if (
    !order_id ||
    !gross_amount ||
    !nama_pelanggan ||
    !email ||
    !phone ||
    !users_id
  ) {
    return res.status(400).json({ message: "Data pembayaran belum lengkap" });
  }

  const parameter = {
    transaction_details: {
      order_id: order_id,
      gross_amount: parseInt(gross_amount),
    },
    customer_details: {
      first_name: nama_pelanggan,
      email: email,
      phone: phone,
    },
    credit_card: {
      secure: true,
    },
  };

  try {
    const transaction = await snap.createTransaction(parameter);

    // Simpan transaksi ke database
    await pool.query(
      "INSERT INTO trx_kost (order_id, users_id, gross_amount, status, nama_pelanggan, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        order_id,
        users_id,
        parseInt(gross_amount),
        "pending",
        nama_pelanggan,
        email,
        phone,
      ]
    );

    res.status(200).json({
      message: "Token Snap berhasil dibuat",
      order_id: order_id,
      snapToken: transaction.token,
      redirectUrl: transaction.redirect_url,
    });
  } catch (error) {
    console.error("MIDTRANS ERROR:", error);
    res.status(500).json({
      message: "Gagal membuat transaksi",
      error: error.message,
    });
  }
});

app.post("/midtrans-callback", async (req, res) => {
  const { transaction_status, order_id } = req.body;
  console.log("Midtrans callback payload:", req.body);

  let status = "pending";
  if (transaction_status === "settlement" || transaction_status === "capture") {
    status = "success";
  } else if (
    transaction_status === "cancel" ||
    transaction_status === "deny" ||
    transaction_status === "expire"
  ) {
    status = "failed";
  }

  try {
    await pool.query("UPDATE trx_kost SET status = ? WHERE order_id = ?", [
      status,
      order_id,
    ]);
    res.status(200).json({ message: "Status transaksi diperbarui" });
  } catch (err) {
    console.error("Callback error:", err);
    res.status(500).json({ message: "Gagal memperbarui status" });
  }
});

app.get("/get-payment/:users_id", async (req, res) => {
  const { users_id } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM trx_kost WHERE users_id = ?",
      [users_id]
    );

    res.status(200).json({
      message: "Data pembayaran berhasil diambil",
      data: rows,
    });
  } catch (error) {
    console.error("GET PAYMENT ERROR:", error);
    res.status(500).json({
      message: "Gagal mengambil data pembayaran",
      error: error.message,
    });
  }
});

app.get("/check-payment-status/:order_id", async (req, res) => {
  const { order_id } = req.params;

  if (!order_id) {
    return res.status(400).json({ message: "Order ID diperlukan" });
  }

  try {
    const statusResponse = await snap.transaction.status(order_id);

    res.status(200).json({
      message: "Status pembayaran berhasil didapatkan",
      status: statusResponse.transaction_status,
      fraudStatus: statusResponse.fraud_status,
      rawResponse: statusResponse, // Optional, for debugging
    });
  } catch (error) {
    console.error("MIDTRANS STATUS ERROR:", error);
    res.status(500).json({
      message: "Gagal mengambil status pembayaran",
      error: error.message,
    });
  }
});

// app.post("/create-payment", verifyToken, async (req, res) => {
//   const { order_id, gross_amount, nama_pelanggan, email, phone } = req.body;

//   if (!order_id || !gross_amount || !nama_pelanggan || !email || !phone) {
//     return res.status(400).json({ message: "Data pembayaran belum lengkap" });
//   }

//   const parameter = {
//     transaction_details: {
//       order_id: order_id,
//       gross_amount: parseInt(gross_amount),
//     },
//     customer_details: {
//       first_name: nama_pelanggan,
//       email: email,
//       phone: phone,
//     },
//     credit_card: {
//       secure: true,
//     },
//   };

//   try {
//     const transaction = await snap.createTransaction(parameter);
//     res.status(200).json({
//       message: "Token Snap berhasil dibuat",
//       snapToken: transaction.token,
//       redirectUrl: transaction.redirect_url,
//     });
//   } catch (error) {
//     console.error("MIDTRANS ERROR:", error);
//     res
//       .status(500)
//       .json({ message: "Gagal membuat transaksi", error: error.message });
//   }
// });

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

app.post("/trx-bulanankost", async (req, res) => {
  const {
    parent_id_kost,
    parent_id_users,
    harga,
    tanggal_masuk,
    tanggal_bayaran,
    parent_status_payment,
    nama_kamar,
  } = req.body;

  if (
    !parent_id_kost ||
    !parent_id_users ||
    !harga ||
    !tanggal_masuk ||
    !tanggal_bayaran ||
    !parent_status_payment ||
    !nama_kamar
  ) {
    return res.status(400).json({ message: "Semua field harus diisi." });
  }

  try {
    // Cek apakah data dengan parent_id_kost dan parent_id_users sudah ada
    const [existing] = await pool.execute(
      "SELECT * FROM trx_bulanankost WHERE parent_id_kost = ? AND parent_id_users = ?",
      [parent_id_kost, parent_id_users]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "Maaf Kos Sudah Terbooking User Lain.",
      });
    }

    // Jika tidak ada, lanjutkan insert
    const query = `
      INSERT INTO trx_bulanankost 
      (parent_id_kost, parent_id_users, harga, tanggal_masuk, tanggal_bayaran, parent_status_payment, nama_kamar)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      parent_id_kost,
      parent_id_users,
      harga,
      tanggal_masuk,
      tanggal_bayaran,
      parent_status_payment,
      nama_kamar,
    ];

    await pool.execute(query, values);

    res.status(201).json({ message: "Data berhasil ditambahkan." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menyimpan data." });
  }
});

app.get("/my-ip", async (req, res) => {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    res.json({ ip: data.ip });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/game-feature", async (req, res) => {
  const payload = {
    key: "Q2xMSjNiz4fx59vyYR7DBWaC2xAsWAqCRHPIPpjw0prKf7RclOLXcvMZ4Nav2SwR",
    sign: "550f32ea4f8d5b0eeaa387a182342d35",
    type: "services",
    filter_type: "game",
  };

  try {
    const params = new URLSearchParams(payload);

    const response = await fetch(
      "https://vip-reseller.co.id/api/game-feature",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        },
        body: params.toString(),
      }
    );

    const text = await response.text();

    try {
      const data = JSON.parse(text);
      res.json(data);
    } catch (err) {
      // Kalau gagal parse JSON, kirim text-nya untuk debugging
      res
        .status(500)
        .json({ message: "Response bukan JSON", rawResponse: text });
    }
  } catch (error) {
    res.status(500).json({ message: error.message, error });
  }
});

app.get("/pembayaran", async (req, res) => {
  const { parent_id_users } = req.query;

  if (!parent_id_users) {
    return res
      .status(400)
      .json({ message: "Parameter 'parent_id_users' wajib diisi." });
  }

  try {
    const query = `
      SELECT 
        parent_id_kost,
        parent_id_users,
        harga,
        tanggal_masuk,
        tanggal_bayaran,
        parent_status_payment,
        nama_kamar
    
      FROM trx_bulanankost
      WHERE parent_id_users = ?
    `;

    const [rows] = await pool.execute(query, [parent_id_users]);

    res.status(200).json({
      message: "Data berhasil diambil.",
      data: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data." });
  }
});

// app.post("/login", async (req, res) => {
//   const { username, passwords } = req.body;

//   try {
//     if (!username || !passwords) {
//       return res
//         .status(400)
//         .json({ message: "Username dan password wajib diisi" });
//     }

//     const [users] = await pool.query(
//       "SELECT * FROM iniusers WHERE username = ? AND passwords = ?",
//       [username, passwords]
//     );

//     const user = users[0];

//     if (!user) {
//       return res.status(401).json({ message: "Username atau password salah" });
//     }

//     res.status(200).json({
//       message: "Login berhasil",
//       user: {
//         id: user.id,
//         username: user.username,
//         type: user.tipe_akun || null,
//       },
//     });
//   } catch (error) {
//     console.error("ERROR:", error);
//     res.status(500).json({ message: "Login gagal", error: error.message });
//   }
// });

app.post("/register", (req, res) => {
  const { username, passwords, email, phone } = req.body;
  let { tipe_akun } = req.body;

  if (!username || !passwords || !email || !phone) {
    return res.status(400).json({ message: "Semua field wajib diisi" });
  }

  // Jika tipe_akun dikirim dan isinya 'admin', tolak request
  if (tipe_akun && tipe_akun.toLowerCase() === "admin") {
    return res
      .status(403)
      .json({ message: "Registrasi sebagai admin tidak diperbolehkan" });
  }

  // Default tipe_akun ke 'user' kalau tidak ada
  tipe_akun = tipe_akun || "user";
  res.status(202).json({ message: "Register Berhasil." });
  const sql = `INSERT INTO iniusers (username, passwords, tipe_akun, email, phone) VALUES (?, ?, ?, ?, ?)`;
  const values = [username, passwords, tipe_akun, email, phone];

  pool.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error inserting user:", err);
      return res.status(500).json({ message: "Gagal mendaftar" });
    }
  });
});

app.post("/login", async (req, res) => {
  const { username, passwords } = req.body;

  try {
    if (!username || !passwords) {
      return res
        .status(400)
        .json({ message: "Username dan password wajib diisi" });
    }

    const [iniusers] = await pool.query(
      "SELECT * FROM iniusers WHERE username = ? AND passwords = ?",
      [username, passwords]
    );

    const user = iniusers[0];

    if (!user) {
      return res.status(401).json({ message: "Username atau password salah" });
    }

    // Simpan user ke session
    req.session.user = {
      id: user.id,
      username: user.username,
      type: user.tipe_akun || null,
    };

    res.status(200).json({
      message: "Login berhasil",
      user: req.session.user,
    });
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ message: "Login gagal", error: error.message });
  }
});

app.post("/logout", (req, res) => {
  try {
    // Hapus session pengguna
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({
          success: false,
          message: "Gagal menghancurkan session",
        });
      }

      // Hapus cookie session
      res.clearCookie("connect.sid"); // Sesuaikan dengan nama cookie session Anda

      // Jika menggunakan JWT, Anda mungkin perlu menambahkan token ke blacklist
      // atau mengurangi waktu expired token di sisi client

      return res.status(200).json({
        success: true,
        message: "Logout berhasil",
      });
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat logout",
    });
  }
});

app.get("/profile", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Belum login" });
  }

  try {
    const [iniusers] = await pool.query(
      "SELECT id, username, tipe_akun, email, phone FROM iniusers WHERE id = ?",
      [req.session.user.id]
    );

    const user = iniusers[0];

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    res.status(200).json({
      message: "Profil pengguna",
      user: user,
    });
  } catch (error) {
    console.error("ERROR:", error);
    res
      .status(500)
      .json({ message: "Gagal mengambil profil", error: error.message });
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

app.put("/editkost/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nama_ruangan,
      deskripsi,
      fasilitas,
      harga,
      ukuran_kamar,
      tipe,
      gambar,
    } = req.body;

    if (!id || !nama_ruangan || !harga || !tipe) {
      return res.status(400).json({ message: "Data wajib tidak lengkap" });
    }

    const [result] = await pool.query(
      `UPDATE kost SET 
        nama_ruangan = ?, 
        deskripsi = ?, 
        fasilitas = ?, 
        harga = ?, 
        ukuran_kamar = ?, 
        tipe = ?, 
        gambar = ? 
      WHERE id = ?`,
      [
        nama_ruangan,
        deskripsi || "",
        JSON.stringify(fasilitas || []),
        harga,
        ukuran_kamar || "",
        tipe,
        JSON.stringify(gambar || []),
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Kost tidak ditemukan" });
    }

    res.status(200).json({ message: "Kost berhasil diperbarui" });
  } catch (error) {
    console.error("ERROR:", error);
    res
      .status(500)
      .json({ message: "Gagal memperbarui kost", error: error.message });
  }
});

app.delete("/hapuskost/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "ID kost tidak ditemukan" });
    }

    const [result] = await pool.query(`DELETE FROM kost WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Kost tidak ditemukan atau sudah dihapus" });
    }

    res.status(200).json({ message: "Kost berhasil dihapus" });
  } catch (error) {
    console.error("ERROR:", error);
    res
      .status(500)
      .json({ message: "Gagal menghapus kost", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
