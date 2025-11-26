// agent.js - Web UI Agent dengan navbar + ringkasan + daftar shipments

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const app = express();

const API_BASE_DEFAULT =
  process.env.SMARTLOCKER_API_BASE || "http://127.0.0.1:3000";
const PORT = process.env.AGENT_PORT || 4000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function normalizeBaseUrl(url) {
  if (!url) return "";
  return url.replace(/\/+$/, "");
}

async function fetchCouriers(apiBase) {
  try {
    const resp = await axios.get(apiBase + "/api/couriers");
    return resp.data?.data || [];
  } catch (err) {
    console.error("fetchCouriers error:", err.response?.data || err.message);
    return [];
  }
}

function layout(pageTitle, activeTab, bodyHtml) {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${pageTitle}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f5f7fb;
      margin: 0;
      padding: 0;
    }
    .nav {
      background: #111827;
      color: #e5e7eb;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .nav-title {
      font-weight: 600;
      font-size: 16px;
    }
    .nav-links a {
      color: #9ca3af;
      text-decoration: none;
      margin-left: 16px;
      font-size: 14px;
    }
    .nav-links a.active {
      color: #f9fafb;
      font-weight: 600;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 2px;
    }
    .container {
      max-width: 900px;
      margin: 24px auto 40px auto;
      background: white;
      border-radius: 12px;
      padding: 24px 28px 32px 28px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
    }
    h1 {
      margin-top: 0;
      font-size: 22px;
      text-align: left;
    }
    p.desc {
      margin-top: 4px;
      margin-bottom: 16px;
      font-size: 13px;
      color: #6b7280;
    }
    label {
      display: block;
      margin-top: 12px;
      font-weight: 600;
      font-size: 14px;
    }
    input[type="text"],
    select,
    textarea {
      width: 100%;
      margin-top: 4px;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid #d1d5db;
      font-size: 14px;
      box-sizing: border-box;
    }
    textarea {
      min-height: 80px;
      resize: vertical;
    }
    .row {
      display: flex;
      gap: 12px;
    }
    .row > div {
      flex: 1;
    }
    button {
      margin-top: 20px;
      padding: 10px 16px;
      border-radius: 999px;
      border: none;
      background: #2563eb;
      color: white;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
    }
    .status {
      margin-top: 12px;
      font-size: 14px;
    }
    .status.ok { color: #16a34a; }
    .status.err { color: #dc2626; }
    pre {
      background: #0f172a;
      color: #e5e7eb;
      padding: 12px;
      border-radius: 8px;
      font-size: 12px;
      overflow-x: auto;
      margin-top: 12px;
      max-height: 260px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      background: #e5e7eb;
      color: #374151;
      margin-left: 6px;
    }
    h3 {
      margin-top: 24px;
      margin-bottom: 8px;
      font-size: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 13px;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f3f4f6;
    }
    .tag-ok {
      color: #065f46;
      background: #d1fae5;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 11px;
      white-space: nowrap;
    }
    .tag-bad {
      color: #991b1b;
      background: #fee2e2;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 11px;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="nav">
    <div class="nav-title">Smart Locker – Agent</div>
    <div class="nav-links">
      <a href="/" class="${activeTab === "form" ? "active" : ""}">Input Pengiriman</a>
      <a href="/list" class="${activeTab === "list" ? "active" : ""}">Daftar Pengiriman</a>
      <a href="/couriers" class="${activeTab === "couriers" ? "active" : ""}">Daftar Kurir</a>
      <a href="/lockers" class="${activeTab === "lockers" ? "active" : ""}">Daftar Locker</a>
    </div>
  </div>
  ${bodyHtml}
</body>
</html>
`;
}

function renderFormPage({
  baseUrl,
  formData = {},
  status = "",
  statusClass = "",
  responseJson = "",
  validation = [],
  summary = null,
  couriers = [],
}) {
  baseUrl = baseUrl || API_BASE_DEFAULT;

  const body = `
  <div class="container">
    <h1>Input Pengiriman</h1>
    <label>Pilih Kurir</label>
    <select id="courierSelect" name="courierId">
      <option value="">-- Pilih kurir --</option>
      ${
        couriers
          .map(
            (c) => `
        <option value="${c.courierId}"
                data-company="${c.company}"
                data-plate="${c.plate}">
          ${c.company} – ${c.name} – ${c.plate}
        </option>`
          )
          .join("")
      }
    </select>
    <p class="desc">
      Input data paket untuk dikirim ke locker dan diproses oleh server Smart Locker.<br/>
      Backend: <code>${baseUrl}</code>
    </p>

    <form method="POST" action="/">
      <div class="row">
        <div>
          <label>Locker ID</label>
          <input type="text" name="lockerId" placeholder="mis: locker01" value="${
            formData.lockerId || ""
          }" />
        </div>
        <div>
          <label>Jenis Kurir</label>
          <input id="courierTypeInput" type="text" name="courierType" placeholder="mis: AnterAja"
                 value="${formData.courierType || ""}" readonly />
        </div>
      </div>

      <label>Plat Nomor Kendaraan Kurir (opsional)</label>
      <input id="courierPlateInput" type="text" name="courierPlate" placeholder="mis: B 1234 CD" value="${
        formData.courierPlate || ""
      }" readonly />

      <label>Nama Penerima (opsional)</label>
      <input type="text" name="receiverName" placeholder="mis: Muhammad Muflih Fasya" value="${
        formData.receiverName || ""
      }" />

      <label>No. HP Penerima (opsional)</label>
      <input type="text" name="receiverPhone" placeholder="mis: 08xxxxxxxxxx" value="${
        formData.receiverPhone || ""
      }" />

      <label>Customer ID / Info (opsional)</label>
      <input type="text" name="customerId" placeholder="mis: nomor HP / email" value="${
        formData.customerId || ""
      }" />

      <label>Jenis Barang (opsional)</label>
      <input type="text" name="itemType" placeholder="mis: Elektronik, Dokumen, dll" value="${
        formData.itemType || ""
      }" />

      <label>Daftar Nomor Resi
        <span class="badge">satu resi per baris</span>
      </label>
      <textarea name="resiList" placeholder="11002899918893&#10;10008015952761">${
        formData.resiList || ""
      }</textarea>

      <button type="submit">Kirim ke Server</button>
    </form>

    <div class="status ${statusClass}">${status}</div>

    ${
      summary
        ? `
      <h3>Ringkasan Data Paket</h3>
      <table>
        <tbody>
          <tr><th>Locker ID</th><td>${summary.lockerId || "-"}</td></tr>
          <tr><th>Courier ID</th><td>${summary.courierId || "-"}</td></tr>
          <tr><th>Plat Kurir</th><td>${summary.courierPlate || "-"}</td></tr>
          <tr><th>Nama Penerima</th><td>${summary.receiverName || "-"}</td></tr>
          <tr><th>No. HP Penerima</th><td>${summary.receiverPhone || "-"}</td></tr>
          <tr><th>Customer ID / Info</th><td>${summary.customerId || "-"}</td></tr>
          <tr><th>Jenis Barang</th><td>${summary.itemType || "-"}</td></tr>
          <tr><th>Daftar Nomor Resi</th><td>${
            summary.resiArray && summary.resiArray.length
              ? summary.resiArray.join("<br/>")
              : "-"
          }</td></tr>
        </tbody>
      </table>
      `
        : ""
    }

    ${
      validation && validation.length
        ? `
      <h3>Hasil Validasi Resi</h3>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Nomor Resi</th>
            <th>Status</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${validation
            .map(
              (v, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${v.resi}</td>
            <td>${
              v.valid
                ? '<span class="tag-ok">✅ Valid</span>'
                : '<span class="tag-bad">❌ Tidak Valid</span>'
            }</td>
            <td>${v.message || ""}</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
      `
        : ""
    }

    ${responseJson ? `<pre>${responseJson}</pre>` : ""}
    <script>
      (function() {
        const sel = document.getElementById('courierSelect');
        const typeInput = document.getElementById('courierTypeInput');
        const plateInput = document.getElementById('courierPlateInput');
        if (!sel || !typeInput || !plateInput) return;
        sel.addEventListener('change', function () {
          const opt = this.options[this.selectedIndex];
          typeInput.value = opt ? (opt.getAttribute('data-company') || '') : '';
          plateInput.value = opt ? (opt.getAttribute('data-plate') || '') : '';
        });
      })();
    </script>
  </div>
  `;

  return layout("Smart Locker – Agent Panel", "form", body);
}

function renderListPage(shipments, baseUrl) {
  const body = `
  <div class="container">
    <h1>Daftar Pengiriman</h1>
    <p class="desc">
      Data ini diambil dari database (koleksi <b>shipments</b>) melalui backend Smart Locker.<br/>
      Backend: <code>${baseUrl}</code>
    </p>

    <table>
      <thead>
        <tr>
          <th>No</th>
          <th>Locker</th>
          <th>Kurir</th>
          <th>Plat</th>
          <th>Resi</th>
          <th>Nama Penerima</th>
          <th>No HP</th>
          <th>Jenis Barang</th>
          <th>Waktu Input</th>
        </tr>
      </thead>
      <tbody>
        ${
          shipments.length === 0
            ? `<tr><td colspan="9">Belum ada data shipments.</td></tr>`
            : shipments
                .map(
                  (s, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${s.lockerId || "-"}</td>
          <td>${s.courierType || "-"}</td>
          <td>${s.courierPlate || "-"}</td>
          <td>${s.resi || "-"}</td>
          <td>${s.receiverName || "-"}</td>
          <td>${s.receiverPhone || "-"}</td>
          <td>${s.itemType || "-"}</td>
          <td>${
            s.createdAt ? new Date(s.createdAt).toLocaleString("id-ID") : "-"
          }</td>
        </tr>`
                )
                .join("")
        }
      </tbody>
    </table>
  </div>
  `;

  return layout("Daftar Pengiriman – Smart Locker", "list", body);
}

function renderCouriersPage({ couriers = [], baseUrl = API_BASE_DEFAULT, status = "", statusClass = "", formData = {} } = {}) {

  const body = `
  <div class="container">
    <h1>Daftar Kurir</h1>
    <p class="desc">Kelola pool kurir yang akan muncul pada pilihan "Pilih Kurir" saat input pengiriman.<br/>Backend: <code>${baseUrl}</code></p>

    <form method="POST" action="/couriers">
      <label>Perusahaan / Jenis Kurir</label>
      <select name="company">
        <option value="anteraja" ${formData.company === 'anteraja' ? 'selected' : ''}>AnterAja</option>
        <option value="jne" ${formData.company === 'jne' ? 'selected' : ''}>JNE</option>
        <option value="jnt" ${formData.company === 'jnt' ? 'selected' : ''}>J&amp;T Express</option>
        <option value="sicepat" ${formData.company === 'sicepat' ? 'selected' : ''}>SiCepat</option>
        <option value="tiki" ${formData.company === 'tiki' ? 'selected' : ''}>TIKI</option>
        <option value="ninja" ${formData.company === 'ninja' ? 'selected' : ''}>Ninja Xpress</option>
        <option value="lionparcel" ${formData.company === 'lionparcel' ? 'selected' : ''}>Lion Parcel</option>
        <option value="wahana" ${formData.company === 'wahana' ? 'selected' : ''}>Wahana</option>
        <option value="pos" ${formData.company === 'pos' ? 'selected' : ''}>POS Indonesia</option>
      </select>

      <label>Nama Kurir</label>
      <input type="text" name="name" placeholder="mis: Mas Budi" value="${formData.name || ""}" />

      <label>Plat Nomor</label>
      <input type="text" name="plate" placeholder="mis: B 1234 CD" value="${formData.plate || ""}" />

      <button type="submit">Simpan Kurir</button>
    </form>

    <div class="status ${statusClass}">${status}</div>

    <h3>Pool Kurir</h3>
    <table>
      <thead>
        <tr>
          <th>No</th>
          <th>Courier ID</th>
          <th>Perusahaan</th>
          <th>Nama</th>
          <th>Plat</th>
        </tr>
      </thead>
      <tbody>
        ${
          couriers.length === 0
            ? `<tr><td colspan="5">Belum ada data kurir.</td></tr>`
            : couriers
                .map(
                  (c, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${c.courierId || "-"}</td>
          <td>${c.company || "-"}</td>
          <td>${c.name || "-"}</td>
          <td>${c.plate || "-"}</td>
        </tr>`
                )
                .join("")
        }
      </tbody>
    </table>
  </div>
  `;

  return layout("Daftar Kurir – Smart Locker", "couriers", body);
}

function renderLockersPage({ lockers = [], baseUrl = API_BASE_DEFAULT, status = "", statusClass = "", debug = null } = {}) {
  const body = `
  <div class="container">
    <h1>Locker Client Pool</h1>
    <p class="desc">Daftar semua locker (ESP32) yang pernah berinteraksi dengan server.<br/>Backend: <code>${baseUrl}</code></p>

    <table>
      <thead>
        <tr>
          <th>Locker ID</th>
          <th>Token</th>
          <th>Pending Resi</th>
          <th>Aktif</th>
          <th>Last Heartbeat</th>
        </tr>
      </thead>
      <tbody>
        ${
          lockers.length === 0
            ? `<tr><td colspan="5" style="text-align:center;">Belum ada locker yang terdaftar.</td></tr>`
            : lockers
                .map(
                  (l) => `
        <tr>
          <td>${l.lockerId}</td>
          <td><code>${l.lockerToken || "-"}</code></td>
          <td style="text-align:center">${(l.pendingResi && l.pendingResi.length) || (l.pendingCount || 0)}</td>
          <td>${l.isActive === false ? 'OFF' : 'ON'}</td>
          <td>${l.lastHeartbeat ? new Date(l.lastHeartbeat).toLocaleString() : "-"}</td>
        </tr>`
                )
                .join("")
        }
      </tbody>
    </table>

    ${debug ? `<h3 style="margin-top:18px">Debug - backend response</h3>
    <pre style="background:#0b1220;color:#e6eef6;padding:10px;border-radius:6px;overflow:auto;max-height:240px">${debug}</pre>` : ""}
    </table>
  </div>
  `;

  return layout("Locker Client Pool – Smart Locker", "lockers", body);
}

/* ROUTES */

// GET: form
app.get("/", async (req, res) => {
  const apiBase = API_BASE_DEFAULT;
  const couriers = await fetchCouriers(apiBase);

  res.send(
    renderFormPage({
      baseUrl: apiBase,
      formData: {},
      status: "",
      statusClass: "",
      responseJson: "",
      validation: [],
      summary: null,
      couriers,
    })
  );
});

// GET: daftar kurir (manage couriers)
app.get("/couriers", async (req, res) => {
  const apiBase = normalizeBaseUrl(API_BASE_DEFAULT);
  try {
    const couriers = await fetchCouriers(apiBase);
    res.send(renderCouriersPage({ couriers, baseUrl: apiBase }));
  } catch (err) {
    console.error("fetch couriers error:", err.message);
    res.send(renderCouriersPage({ couriers: [], baseUrl: apiBase, status: "Gagal mengambil daftar kurir.", statusClass: "err" }));
  }
});

// GET: daftar locker (show Locker Client Pool)
app.get("/lockers", async (req, res) => {
  const apiBase = normalizeBaseUrl(API_BASE_DEFAULT);
  try {
    const resp = await axios.get(apiBase + "/api/lockers");
    const lockers = resp.data?.data || [];
    // include raw response for debugging if result empty
    const debug = lockers.length === 0 ? JSON.stringify({ status: resp.status, data: resp.data }, null, 2) : null;
    console.log(`/lockers -> fetched ${lockers.length} lockers (status ${resp.status})`);
    res.send(renderLockersPage({ lockers, baseUrl: apiBase, debug }));
  } catch (err) {
    console.error("fetch lockers error:", err.response?.data || err.message);
    const debug = err.response?.data ? JSON.stringify(err.response.data, null, 2) : (err.message || String(err));
    res.send(renderLockersPage({ lockers: [], baseUrl: apiBase, status: "Gagal mengambil daftar locker.", statusClass: "err", debug }));
  }
});

// DEBUG: proxy raw response from backend /api/lockers
app.get("/debug/lockers", async (req, res) => {
  const apiBase = normalizeBaseUrl(API_BASE_DEFAULT);
  try {
    const resp = await axios.get(apiBase + "/api/lockers");
    res.json({ ok: true, status: resp.status, data: resp.data });
  } catch (err) {
    console.error("/debug/lockers error:", err.response?.data || err.message);
    const code = err.response?.status || 500;
    return res.status(code).json({ ok: false, error: err.response?.data || err.message || 'unknown' });
  }
});

// POST: tambah kurir ke backend
app.post("/couriers", async (req, res) => {
  const { company, name, plate } = req.body;
  const apiBase = normalizeBaseUrl(API_BASE_DEFAULT);

  const formData = { company, name, plate };

  if (!company || !name || !plate) {
    try {
      const couriers = await fetchCouriers(apiBase);
      return res.send(renderCouriersPage({ couriers, baseUrl: apiBase, status: "Perusahaan, nama kurir dan plat wajib diisi.", statusClass: "err", formData }));
    } catch (e) {
      return res.send(renderCouriersPage({ couriers: [], baseUrl: apiBase, status: "Perusahaan, nama kurir dan plat wajib diisi.", statusClass: "err", formData }));
    }
  }

  try {
    await axios.post(apiBase + "/api/couriers", { company, name, plate }, { headers: { "Content-Type": "application/json" } });

    const couriers = await fetchCouriers(apiBase);
    return res.send(renderCouriersPage({ couriers, baseUrl: apiBase, status: "Kurir berhasil ditambahkan.", statusClass: "ok" }));
  } catch (err) {
    console.error("add courier error:", err.response?.data || err.message);
    let msg = err.response?.data?.error || err.response?.data?.message || err.message || "Unknown error";
    try {
      const couriers = await fetchCouriers(apiBase);
      return res.send(renderCouriersPage({ couriers, baseUrl: apiBase, status: "Gagal menambah kurir: " + msg, statusClass: "err", formData }));
    } catch (e) {
      return res.send(renderCouriersPage({ couriers: [], baseUrl: apiBase, status: "Gagal menambah kurir: " + msg, statusClass: "err", formData }));
    }
  }
});

// POST: validasi resi + kirim ke /api/shipments
app.post("/", async (req, res) => {
  const {
    lockerId,
    courierId,
    courierType,
    courierPlate,
    receiverName,
    receiverPhone,
    customerId,
    itemType,
    resiList,
  } = req.body;

  const apiBase = normalizeBaseUrl(API_BASE_DEFAULT);

  const formData = {
    lockerId,
    courierId,
    courierType,
    courierPlate,
    receiverName,
    receiverPhone,
    customerId,
    itemType,
    resiList,
  };

  const summary = {
    lockerId,
    courierId,
    courierType,
    courierPlate,
    receiverName,
    receiverPhone,
    customerId,
    itemType,
    resiArray: [],
  };

  // Load couriers for re-rendering the form
  let couriers = [];
  try {
    couriers = await fetchCouriers(apiBase);
  } catch (e) {
    console.error("fetch couriers error:", e.message);
  }

  // VALIDASI BARU: hanya lockerId + courierType + resiList wajib
  if (!lockerId || !courierType || !resiList) {
    return res.send(
      renderFormPage({
        baseUrl: apiBase,
        formData,
        status: "Locker ID, jenis kurir, dan daftar resi wajib diisi.",
        statusClass: "err",
        responseJson: "",
        validation: [],
        summary: null,
        couriers,
      })
    );
  }

  const resiArray = resiList
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  summary.resiArray = resiArray;

  if (resiArray.length === 0) {
    return res.send(
      renderFormPage({
        baseUrl: apiBase,
        formData,
        status: "Minimal satu nomor resi harus diisi.",
        statusClass: "err",
        responseJson: "",
        validation: [],
        summary,
        couriers,
      })
    );
  }

  // VALIDASI KE BACKEND
  const validationResults = [];
  let hasInvalid = false;

  for (const r of resiArray) {
    try {
      // gunakan courierType murni dari input Jenis Kurir. Jika tidak tersedia,
      // fallback ke courierId (pilihan pool) — tapi prioritas: courierType.
      const courierParam = courierType || courierId || "";
      const vresp = await axios.get(apiBase + "/api/validate-resi", {
        params: { courier: courierParam, resi: r },
      });

      const { valid, error } = vresp.data;
      if (!valid) hasInvalid = true;

      validationResults.push({
        resi: r,
        valid: !!valid,
        message: error || (valid ? "OK" : ""),
      });
    } catch (e) {
      console.error("validate-resi error:", e.message);
      hasInvalid = true;
      validationResults.push({
        resi: r,
        valid: false,
        message: "Gagal validasi (error koneksi server)",
      });
    }
  }

  if (hasInvalid) {
    return res.send(
      renderFormPage({
        baseUrl: apiBase,
        formData,
        status:
          "Beberapa nomor resi tidak valid. Periksa tabel hasil validasi di bawah.",
        statusClass: "err",
        responseJson: "",
        validation: validationResults,
        summary,
        couriers,
      })
    );
  }

  // SEMUA VALID → kirim ke /api/shipments
  // BODY ke backend: kirim courierType sebagai sumber utama informasi kurir.
  const body = {
    lockerId,
    courierType,
    resiList: resiArray,
  };

  // tetap sertakan field opsional bila tersedia
  if (receiverName) body.receiverName = receiverName;
  if (receiverPhone) body.receiverPhone = receiverPhone;
  if (customerId) body.customerId = customerId;
  if (itemType) body.itemType = itemType;

  // bila user memilih dari pool (courierId) atau mengisi plat, sertakan juga
  if (courierId) body.courierId = courierId;
  if (courierPlate) body.courierPlate = courierPlate;

  try {
    const resp = await axios.post(apiBase + "/api/shipments", body, {
      headers: { "Content-Type": "application/json" },
    });

    return res.send(
      renderFormPage({
        baseUrl: apiBase,
        formData,
        status: "Semua resi valid & berhasil dikirim ke server.",
        statusClass: "ok",
        responseJson: JSON.stringify(resp.data, null, 2),
        validation: validationResults,
        summary,
        couriers,
      })
    );
  } catch (err) {
    console.error("Agent submit error:", err.response?.data || err.message);
    const msg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      "Unknown error";

    return res.send(
      renderFormPage({
        baseUrl: apiBase,
        formData,
        status: "Gagal mengirim data ke server: " + msg,
        statusClass: "err",
        responseJson: JSON.stringify(err.response?.data || {}, null, 2),
        validation: validationResults,
        summary,
        couriers,
      })
    );
  }
});

// GET: daftar shipments
app.get("/list", async (req, res) => {
  const apiBase = normalizeBaseUrl(API_BASE_DEFAULT);

  try {
    const resp = await axios.get(apiBase + "/api/shipments?limit=200");
    const shipments = resp.data?.data || [];

    res.send(renderListPage(shipments, apiBase));
  } catch (err) {
    console.error("fetch list error:", err.response?.data || err.message);
    res.send(
      renderListPage([], apiBase) +
        "<!-- Gagal mengambil data shipments dari backend -->"
    );
  }
});

app.listen(PORT, () => {
  console.log(`Agent App running at http://localhost:${PORT}`);
  console.log(`Backend API base default: ${API_BASE_DEFAULT}`);
});
