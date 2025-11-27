// agent.js - Web UI Agent untuk Smart Locker (Express + Axios)
require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();

// === CONFIG BACKEND ===
// contoh: SMARTLOCKER_API_BASE=http://127.0.0.1:3000
const API_BASE_DEFAULT =
  process.env.SMARTLOCKER_API_BASE || "http://127.0.0.1:3000";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function normalizeBaseUrl(url) {
  if (!url) return "";
  return url.replace(/\/+$/, "");
}

// --- helper layout HTML sederhana ---
function layout(pageTitle, activeTab, bodyHtml) {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Smart Locker – Agent | ${pageTitle}</title>
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f3f4f6;
    }
    .navbar {
      background: #111827;
      color: white;
      padding: 10px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .navbar .title {
      font-weight: 600;
    }
    .navbar a {
      color: #9ca3af;
      margin-left: 16px;
      text-decoration: none;
      font-size: 14px;
    }
    .navbar a.active {
      color: #ffffff;
      font-weight: 600;
    }
    .container {
      max-width: 1100px;
      margin: 30px auto;
      background: #ffffff;
      padding: 24px 28px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
    }
    h1 {
      margin-top: 0;
      font-size: 22px;
    }
    .subtitle {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 18px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-online { background:#dcfce7; color:#166534; }
    .badge-offline { background:#fee2e2; color:#991b1b; }
    .badge-unknown { background:#e5e7eb; color:#374151; }
    .badge-active { background:#dbeafe; color:#1d4ed8; }
    .badge-inactive { background:#fef3c7; color:#92400e; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      border-bottom: 1px solid #e5e7eb;
      padding: 8px 10px;
      text-align: left;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      font-size: 12px;
      color:#374151;
    }
    tr:nth-child(even) td {
      background: #f9fafb;
    }
    .btn {
      display: inline-block;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 12px;
      border: none;
      cursor: pointer;
      text-decoration:none;
    }
    .btn-primary { background:#2563eb; color:white; }
    .btn-secondary { background:#e5e7eb; color:#111827; }
    .btn-danger { background:#ef4444; color:white; }
    .btn-ghost { background:transparent; color:#2563eb; }
    .form-row {
      display:flex;
      gap:12px;
      margin-bottom:8px;
    }
    .form-col { flex:1; }
    label {
      display:block;
      font-size:12px;
      margin-bottom:4px;
      color:#374151;
    }
    input[type="text"],
    input[type="number"],
    textarea,
    select {
      width:100%;
      border-radius:8px;
      border:1px solid #d1d5db;
      padding:7px 9px;
      font-size:13px;
      box-sizing:border-box;
    }
    textarea { resize: vertical; min-height:70px; }
    .muted {
      font-size: 12px;
      color:#6b7280;
    }
    .mt-2 { margin-top:8px; }
    .mt-3 { margin-top:12px; }
    .mt-4 { margin-top:16px; }
    .mb-2 { margin-bottom:8px; }
    .text-right { text-align:right; }
    .text-center { text-align:center; }
    .pill {
      padding: 2px 8px;
      border-radius: 999px;
      background:#f3f4f6;
      font-size:11px;
    }
  </style>
</head>
<body>
  <div class="navbar">
    <div class="title">Smart Locker – Agent</div>
    <div>
      <a href="/shipments/new" class="${activeTab === "new" ? "active" : ""}">Input Pengiriman</a>
      <a href="/shipments" class="${activeTab === "shipments" ? "active" : ""}">Daftar Pengiriman</a>
      <a href="/couriers" class="${activeTab === "couriers" ? "active" : ""}">Daftar Kurir</a>
      <a href="/lockers" class="${activeTab === "lockers" ? "active" : ""}">Daftar Locker</a>
      <a href="/manual-resi" class="${activeTab === "manual" ? "active" : ""}">Resi Manual User</a>
    </div>
  </div>
  <div class="container">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

// ====================== ROUTES UI =======================

// redirect root
app.get("/", (req, res) => res.redirect("/shipments/new"));

// ---------- Input Pengiriman ----------
app.get("/shipments/new", async (req, res) => {
  const apiBase = normalizeBaseUrl(process.env.SMARTLOCKER_API_BASE || API_BASE_DEFAULT);

  let courierOptionsHtml = "";
  try {
    const resp = await axios.get(apiBase + "/api/couriers");
    const list = (resp.data?.data || []).filter((c) => c.state === "active");
    courierOptionsHtml = list
      .map(
        (c) =>
          `<option value="${c.courierId}">${c.company.toUpperCase()} – ${c.name} (${c.plate})</option>`
      )
      .join("");
  } catch (err) {
    courierOptionsHtml = "";
  }

  const body = `
    <h1>Input Pengiriman</h1>
    <div class="subtitle">
      Backend: <code>${apiBase}</code><br/>
      Masukkan beberapa nomor resi sekaligus untuk satu locker & satu kurir.
    </div>

    <form method="POST" action="/shipments/new">
      <div class="form-row">
        <div class="form-col">
          <label>Locker ID</label>
          <input type="text" name="lockerId" placeholder="mis: locker01" required />
        </div>
        <div class="form-col">
          <label>Pilih Kurir dari Pool</label>
          <select name="courierId" required>
            <option value="">-- Pilih Kurir --</option>
            ${courierOptionsHtml}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-col">
          <label>Nama Penerima</label>
          <input type="text" name="receiverName" placeholder="Nama customer" />
        </div>
        <div class="form-col">
          <label>No. HP Penerima</label>
          <input type="text" name="receiverPhone" placeholder="08xxxxxxxxxx" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-col">
          <label>Customer ID (6 digit)</label>
          <input type="text" name="customerId" placeholder="contoh: 384912" maxlength="6" />
        </div>
        <div class="form-col">
          <label>Tipe Barang (opsional)</label>
          <input type="text" name="itemType" placeholder="Dokumen / Paket kecil / dll" />
        </div>
      </div>

      <div class="mt-3">
        <label>Daftar Nomor Resi (satu per baris)</label>
        <textarea name="resiList" placeholder="11002899918893&#10;10008015952761" required></textarea>
        <div class="muted mt-2">Setiap baris akan dibuat sebagai satu shipment dan dimasukkan ke pendingResi locker.</div>
      </div>

      <div class="mt-4 text-right">
        <button class="btn btn-secondary" type="reset">Reset</button>
        <button class="btn btn-primary" type="submit">Simpan & Assign ke Locker</button>
      </div>
    </form>
  `;

  res.send(layout("Input Pengiriman", "new", body));
});

app.post("/shipments/new", async (req, res) => {
  const apiBase = normalizeBaseUrl(process.env.SMARTLOCKER_API_BASE || API_BASE_DEFAULT);
  try {
    const {
      lockerId,
      courierId,
      receiverName,
      receiverPhone,
      customerId,
      itemType,
      resiList,
    } = req.body;

    const lines = (resiList || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    // Get courier details from pool
    const courierResp = await axios.get(apiBase + "/api/couriers");
    const courierList = courierResp.data?.data || [];
    const selectedCourier = courierList.find((c) => c.courierId === courierId);

    if (!selectedCourier) {
      throw new Error("Kurir tidak ditemukan di pool");
    }

    await axios.post(apiBase + "/api/shipments", {
      lockerId,
      courierType: selectedCourier.company,
      courierPlate: selectedCourier.plate,
      courierId: courierId,
      receiverName,
      receiverPhone,
      customerId,
      itemType,
      resiList: lines,
    });

    res.redirect("/shipments");
  } catch (err) {
    console.error("POST /shipments/new error:", err.response?.data || err.message);
    res.status(500).send(
      layout(
        "Input Pengiriman",
        "new",
        `<h1>Gagal menyimpan pengiriman</h1>
         <pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>
         <a class="btn btn-secondary" href="/shipments/new">Kembali</a>`
      )
    );
  }
});

// ---------- Daftar Pengiriman ----------
app.get("/shipments", async (req, res) => {
  const apiBase = normalizeBaseUrl(process.env.SMARTLOCKER_API_BASE || API_BASE_DEFAULT);
  try {
    const resp = await axios.get(apiBase + "/api/shipments?limit=200");
    const list = resp.data?.data || [];

    const rows = list
      .map((s) => {
        const status = s.status || "-";
        const created =
          s.createdAt ? new Date(s.createdAt).toLocaleString("id-ID") : "-";
        const delivered =
          s.deliveredToLockerAt
            ? new Date(s.deliveredToLockerAt).toLocaleString("id-ID")
            : "-";

        return `
          <tr>
            <td>${s.resi}</td>
            <td>${s.courierType}</td>
            <td>${s.lockerId}</td>
            <td>${s.customerId || "-"}</td>
            <td><code style="font-size:11px;">${s.token || "-"}</code></td>
            <td>${status}</td>
            <td>${created}</td>
            <td>${delivered}</td>
            <td class="text-right">
              <a class="btn btn-ghost" href="${apiBase}/api/debug/shipment/${encodeURIComponent(
          s.resi
        )}" target="_blank">Debug</a>
              <a class="btn btn-danger" href="/shipments/delete/${
                s._id
              }" onclick="return confirm('Hapus shipment ini?')">Hapus</a>
            </td>
          </tr>
        `;
      })
      .join("");

    const body = `
      <h1>Daftar Pengiriman</h1>
      <div class="subtitle">
        Backend: <code>${apiBase}</code> — maksimum 200 data terakhir.
      </div>

      <table>
        <thead>
          <tr>
            <th>Resi</th>
            <th>Kurir</th>
            <th>Locker</th>
            <th>Customer ID</th>
            <th>Token</th>
            <th>Status</th>
            <th>Dibuat</th>
            <th>Delivered ke Locker</th>
            <th class="text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="9" class="text-center">Belum ada data.</td></tr>`}
        </tbody>
      </table>
    `;

    res.send(layout("Daftar Pengiriman", "shipments", body));
  } catch (err) {
    console.error("GET /shipments view error:", err.response?.data || err.message);
    res
      .status(500)
      .send(layout("Daftar Pengiriman", "shipments", "<h1>Error load data</h1>"));
  }
});

// tombol hapus shipment
app.get("/shipments/delete/:id", async (req, res) => {
  const apiBase = normalizeBaseUrl(process.env.SMARTLOCKER_API_BASE || API_BASE_DEFAULT);
  try {
    await axios.delete(apiBase + "/api/shipments/" + req.params.id);
  } catch (err) {
    console.error("DELETE shipment error:", err.response?.data || err.message);
  }
  res.redirect("/shipments");
});

// ---------- Daftar Kurir ----------
app.get("/couriers", async (req, res) => {
  const apiBase = normalizeBaseUrl(process.env.SMARTLOCKER_API_BASE || API_BASE_DEFAULT);
  try {
    const resp = await axios.get(apiBase + "/api/couriers");
    const list = resp.data?.data || [];

    const rows = list
      .map((c) => {
        let badgeClass = "badge-unknown";
        let badgeText = c.state || "unknown";

        if (c.state === "active") {
          badgeClass = "badge-active";
          badgeText = "ACTIVE";
        } else if (c.state === "ongoing") {
          badgeClass = "badge-inactive";
          badgeText = "ONGOING";
        } else if (c.state === "inactive") {
          badgeClass = "badge-inactive";
          badgeText = "INACTIVE";
        }

        return `
          <tr>
            <td>${c.courierId}</td>
            <td>${c.company.toUpperCase()}</td>
            <td>${c.name}</td>
            <td>${c.plate}</td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td class="text-right">
              <a class="btn btn-ghost" href="/couriers/set-state/${c.courierId}/active">Set Active</a>
              <a class="btn btn-ghost" href="/couriers/set-state/${c.courierId}/inactive">Set Inactive</a>
              <a class="btn btn-danger" href="/couriers/delete/${
                c.courierId
              }" onclick="return confirm('Hapus kurir ini?')">Hapus</a>
            </td>
          </tr>
        `;
      })
      .join("");

    const body = `
      <h1>Daftar Kurir</h1>
      <div class="subtitle">
        Backend: <code>${apiBase}</code>
      </div>

      <form method="POST" action="/couriers/new" class="mb-2">
        <div class="form-row">
          <div class="form-col">
            <label>Nama Kurir</label>
            <input type="text" name="name" required />
          </div>
          <div class="form-col">
            <label>Perusahaan (company)</label>
            <select id="courierCompany" name="company" class="form-control">
  <option value="">-- Pilih Perusahaan --</option>
  <option value="anteraja">AnterAja</option>
  <option value="jne">JNE</option>
  <option value="jnt">J&T</option>
  <option value="ninja">Ninja</option>
  <option value="sicepat">SiCepat</option>
  <option value="pos">POS Indonesia</option>
</select>

          </div>
          <div class="form-col">
            <label>Plat Kendaraan</label>
            <input type="text" name="plate" placeholder="B 1234 CD" required />
          </div>
        </div>
        <div class="text-right mt-2">
          <button class="btn btn-primary" type="submit">Tambah Kurir</button>
        </div>
      </form>

      <table class="mt-3">
        <thead>
          <tr>
            <th>ID</th>
            <th>Perusahaan</th>
            <th>Nama</th>
            <th>Plat</th>
            <th>Status</th>
            <th class="text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="6" class="text-center">Belum ada kurir.</td></tr>`}
        </tbody>
      </table>
    `;

    res.send(layout("Daftar Kurir", "couriers", body));
  } catch (err) {
    console.error("GET /couriers view error:", err.response?.data || err.message);
    res
      .status(500)
      .send(layout("Daftar Kurir", "couriers", "<h1>Error load kurir</h1>"));
  }
});

app.post("/couriers/new", async (req, res) => {
  const apiBase = normalizeBaseUrl(process.env.SMARTLOCKER_API_BASE || API_BASE_DEFAULT);
  try {
    await axios.post(apiBase + "/api/couriers", {
      name: req.body.name,
      company: req.body.company,
      plate: req.body.plate,
    });
  } catch (err) {
    console.error("POST /couriers/new error:", err.response?.data || err.message);
  }
  res.redirect("/couriers");
});

app.get("/couriers/set-state/:courierId/:state", async (req, res) => {
  const apiBase = normalizeBaseUrl(process.env.SMARTLOCKER_API_BASE || API_BASE_DEFAULT);
  try {
    await axios.put(apiBase + "/api/couriers/" + req.params.courierId + "/status", {
      state: req.params.state,
    });
  } catch (err) {
    console.error("SET courier state error:", err.response?.data || err.message);
  }
  res.redirect("/couriers");
});

app.get("/couriers/delete/:courierId", async (req, res) => {
  const apiBase = normalizeBaseUrl(process.env.SMARTLOCKER_API_BASE || API_BASE_DEFAULT);
  try {
    await axios.delete(apiBase + "/api/couriers/" + req.params.courierId);
  } catch (err) {
    console.error("DELETE courier error:", err.response?.data || err.message);
  }
  res.redirect("/couriers");
});

// ---------- Daftar Locker (Client Pool) ----------
app.get("/lockers", async (req, res) => {
  const apiBase = normalizeBaseUrl(process.env.SMARTLOCKER_API_BASE || API_BASE_DEFAULT);
  try {
    console.log(`Fetching lockers from: ${apiBase}/api/lockers`);
    const resp = await axios.get(apiBase + "/api/lockers");
    console.log(`Response status: ${resp.status}`);
    console.log(`Response data:`, JSON.stringify(resp.data, null, 2));
    
    // Backend returns array directly, not wrapped in { data: [...] }
    const list = Array.isArray(resp.data) ? resp.data : (resp.data?.data || []);
    console.log(`Found ${list.length} lockers`);

    const rows = list
      .map((l) => {
        let statusBadge = `<span class="badge badge-unknown">UNKNOWN</span>`;
        if (l.status === "online")
          statusBadge = `<span class="badge badge-online">ONLINE</span>`;
        if (l.status === "offline")
          statusBadge = `<span class="badge badge-offline">OFFLINE</span>`;

        const hb = l.lastHeartbeat
          ? new Date(l.lastHeartbeat).toLocaleString("id-ID")
          : "-";
        
        const pendingCount = Array.isArray(l.pendingResi) ? l.pendingResi.length : 0;

        return `
          <tr>
            <td>${l.lockerId}</td>
            <td><span class="pill">${l.lockerToken || "-"}</span></td>
            <td>${pendingCount}</td>
            <td>${statusBadge}</td>
            <td>${hb}</td>
            <td class="text-right">
              <a class="btn btn-ghost" href="${apiBase}/api/debug/locker/${encodeURIComponent(
          l.lockerId
        )}" target="_blank">Debug</a>
              <a class="btn btn-danger" href="/lockers/delete/${
                l.lockerId
              }" onclick="return confirm('Hapus locker ini dari DB?')">Hapus</a>
            </td>
          </tr>
        `;
      })
      .join("");

    const body = `
      <h1>Locker Client Pool</h1>
      <div class="subtitle">
        Daftar semua locker (ESP32) yang pernah berinteraksi dengan server.<br/>
        Backend: <code>${apiBase}</code><br/>
        Status <span class="badge badge-online">ONLINE</span> berarti ESP32 masih rutin memanggil <code>/api/locker/:id/token</code> (heartbeat).
      </div>

      ${list.length === 0 ? `
      <div style="background:#fef3c7; border:1px solid #fbbf24; padding:16px; border-radius:8px; margin-bottom:20px;">
        <h3 style="margin:0 0 8px 0; color:#92400e;">⚠️ Debug Info - No Lockers Found</h3>
        <p style="margin:0; color:#78350f; font-size:13px;">
          Backend returned empty data. Check console logs or visit 
          <a href="/debug/lockers" style="color:#92400e; text-decoration:underline;">debug endpoint</a>
          to see raw response.
        </p>
      </div>
      ` : ''}

      <table>
        <thead>
          <tr>
            <th>Locker ID</th>
            <th>Token</th>
            <th>Pending Resi</th>
            <th>Status</th>
            <th>Last Heartbeat</th>
            <th class="text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="6" class="text-center">Belum ada locker.</td></tr>`}
        </tbody>
      </table>
    `;

    res.send(layout("Daftar Locker", "lockers", body));
  } catch (err) {
    console.error("GET /lockers view error:", err.response?.data || err.message);
    const errorMsg = err.response?.data || err.message || "Unknown error";
    const body = `
      <h1>Error Load Locker</h1>
      <div style="background:#fee2e2; border:1px solid #ef4444; padding:16px; border-radius:8px; margin-top:20px;">
        <h3 style="margin:0 0 8px 0; color:#991b1b;">❌ Connection Error</h3>
        <p style="margin:0; color:#7f1d1d; font-size:13px;">
          <strong>Cannot connect to backend:</strong><br/>
          <code style="background:#ffffff; padding:4px 8px; border-radius:4px; display:inline-block; margin-top:8px;">
            ${apiBase}/api/lockers
          </code>
        </p>
        <pre style="background:#ffffff; padding:12px; border-radius:4px; margin-top:12px; overflow:auto; font-size:12px;">
${JSON.stringify(errorMsg, null, 2)}
        </pre>
        <p style="margin:12px 0 0 0; color:#7f1d1d; font-size:13px;">
          Make sure your backend server is running on <code>${apiBase}</code>
        </p>
      </div>
    `;
    res.status(500).send(layout("Daftar Locker", "lockers", body));
  }
});

// Debug endpoint to see raw backend response
app.get("/debug/lockers", async (req, res) => {
  const apiBase = normalizeBaseUrl(process.env.SMARTLOCKER_API_BASE || API_BASE_DEFAULT);
  try {
    const resp = await axios.get(apiBase + "/api/lockers");
    res.json({
      ok: true,
      status: resp.status,
      data: resp.data
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
      response: err.response?.data
    });
  }
});

app.get("/lockers/delete/:lockerId", async (req, res) => {
  const apiBase = normalizeBaseUrl(process.env.SMARTLOCKER_API_BASE || API_BASE_DEFAULT);
  try {
    await axios.delete(apiBase + "/api/lockers/" + req.params.lockerId);
  } catch (err) {
    console.error("DELETE locker error:", err.response?.data || err.message);
  }
  res.redirect("/lockers");
});

// ---------- Resi Manual User ----------
app.get("/manual-resi", async (req, res) => {
  const apiBase = normalizeBaseUrl(process.env.SMARTLOCKER_API_BASE || API_BASE_DEFAULT);
  try {
    const resp = await axios.get(apiBase + "/api/manual-resi");
    const list = resp.data?. data || [];

    const rows = list
      .map((r) => {
        return `
          <tr>
            <td>${r.resi}</td>
            <td>${r.customerId || "-"}</td>
          </tr>
        `;
      })
      .join("");

    const body = `
      <h1>Resi Manual dari User</h1>
      <div class="subtitle">
        Data ini berasal dari customer app (Flutter) yang menginput nomor resi manual.<br/>
        Backend: <code>${apiBase}</code>
      </div>

      <table>
        <thead>
          <tr>
            <th>Resi</th>
            <th>Customer ID</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="2" class="text-center">Belum ada input resi manual.</td></tr>`}
        </tbody>
      </table>
    `;

    res.send(layout("Resi Manual User", "manual", body));
  } catch (err) {
    console.error("GET /manual-resi view error:", err.response?.data || err.message);
    res
      .status(500)
      .send(layout("Resi Manual User", "manual", "<h1>Error load data</h1>"));
  }
});
// ====================== START SERVER =======================
const PORT = process.env.AGENT_PORT || 4000;
app.listen(PORT, () => {
  console.log(`Smart Locker – Agent app running at http://localhost:${PORT}`);
  console.log(`Backend API base: ${normalizeBaseUrl(API_BASE_DEFAULT)}`);
});
