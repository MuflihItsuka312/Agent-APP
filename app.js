// agent.js - Web UI Agent untuk Smart Locker (Express + Axios)
require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();

// === CONFIG BACKEND ===
// contoh: SMARTLOCKER_API_BASE=http://127.0.0.1:3000
const API_BASE_DEFAULT =
  process.env.SMARTLOCKER_API_BASE || "http://localhost:3000";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// === HELPER FUNCTIONS ===

function renderStatusBadge(status) {
  const badges = {
    online: '<span class="badge badge-online">🟢 ONLINE</span>',
    offline: '<span class="badge badge-offline">🔴 OFFLINE</span>',
    active: '<span class="badge badge-active">ACTIVE</span>',
    inactive: '<span class="badge badge-inactive">INACTIVE</span>',
    ongoing: '<span class="badge badge-inactive">ONGOING</span>',
  };
  return badges[status] || '<span class="badge badge-unknown">UNKNOWN</span>';
}

function formatTimestamp(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString("id-ID");
}

function errorPage(title, message, details = null) {
  return layout(title, '', `
    <div style="text-align: center; padding: 40px;">
      <div style="font-size: 48px;">⚠️</div>
      <h1>${title}</h1>
      <p style="color: #6b7280;">${message}</p>
      ${details ? `<details><summary>Details</summary><pre>${details}</pre></details>` : ''}
      <a href="/" class="btn btn-primary">Kembali</a>
    </div>
  `);
}

function getPendingItems(locker) {
  const items = locker.pendingShipments || locker.pendingResi || [];
  return items.filter(p => typeof p === 'object' ? p.status === 'pending' : true);
}

function sortByDateDesc(items, dateField) {
  return [...items].sort((a, b) => {
    const dateA = a[dateField] ? new Date(a[dateField]).getTime() : 0;
    const dateB = b[dateField] ? new Date(b[dateField]).getTime() : 0;
    return dateB - dateA;
  });
}

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
    .badge-ongoing { background:#fef3c7; color:#92400e; }
    .badge-warning { background:#fef3c7; color:#92400e; margin-left:4px; }
    .badge-danger { background:#fee2e2; color:#991b1b; margin-left:4px; }

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

    /* Info Grid for Locker Details */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin: 20px 0;
    }
    .info-item {
      background: #f9fafb;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .info-item label {
      display: block;
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    /* Token Display */
    .token-display {
      background: #fef3c7;
      color: #92400e;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-family: monospace;
    }

    /* Cards Container */
    .cards-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
      margin: 20px 0;
    }

    .card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      transition: box-shadow 0.2s;
    }
    .card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .history-card {
      border-left: 4px solid #2563eb;
    }

    /* Search Box */
    .search-box {
      margin: 16px 0;
      padding: 10px 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      width: 100%;
      max-width: 400px;
    }
    .search-box:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    /* Hover effects */
    tbody tr:hover {
      background-color: #f0f9ff !important;
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
  <script>
    function filterTable(tableId, query) {
      const table = document.getElementById(tableId);
      if (!table) return;
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;
}

// ====================== ROUTES UI =======================

// redirect root
app.get("/", (req, res) => res.redirect("/shipments/new"));

// ---------- Input Pengiriman (UPDATED with searchable dropdowns and active resi) ----------
app.get("/shipments/new", async (req, res) => {
  const apiBase = normalizeBaseUrl(process.env.SMARTLOCKER_API_BASE || API_BASE_DEFAULT);

  let courierOptionsHtml = "";
  let customerOptionsHtml = "";
  let lockerOptionsHtml = "";
  let activeResiOptionsHtml = "";
  let courierListJson = "[]";

  try {
    // Fetch couriers, customers, lockers, and active resi in parallel
    const fetchPromises = [
      axios.get(apiBase + "/api/couriers"),
      axios.get(apiBase + "/api/customers"),
      axios.get(apiBase + "/api/lockers")
    ];

    // Try to fetch active resi (may not exist in backend yet)
    let activeResiPromise = axios.get(apiBase + "/api/agent/active-resi").catch(err => {
      console.log("[FORM] Active resi endpoint not available yet:", err.message);
      return { data: { ok: false, data: [] } };
    });
    fetchPromises.push(activeResiPromise);

    const [courierResp, customerResp, lockerResp, activeResiResp] = await Promise.all(fetchPromises);

    // Build courier options (only active)
    const courierList = (courierResp.data?.data || []).filter((c) => c.state === "active");
    courierOptionsHtml = courierList
      .map(
        (c) =>
          `<option value="${c.courierId}" data-company="${c.company.toLowerCase()}">${c.company.toUpperCase()} – ${c.name} (${c.plate})</option>`
      )
      .join("");
    
    // Store courier list as JSON for client-side filtering
    courierListJson = JSON.stringify(courierList.map(c => ({
      courierId: c.courierId,
      company: c.company.toLowerCase(),
      name: c.name,
      plate: c.plate
    })));

    // Build customer options
    const customers = customerResp.data?.data || [];
    customerOptionsHtml = customers
      .map(c => `<option value="${c.customerId}" data-name="${c.name}" data-phone="${c.phone}">${c.customerId} - ${c.name} (${c.phone})</option>`)
      .join("");

    // Build locker options (only online lockers)
    const lockers = Array.isArray(lockerResp.data) ? lockerResp.data : (lockerResp.data?.data || []);
    const onlineLockers = lockers.filter(l => l.status === 'online');
    lockerOptionsHtml = onlineLockers
      .map(l => {
        const pendingCount = Array.isArray(l.pendingResi) ? l.pendingResi.length : 0;
        const lastHb = l.lastHeartbeat ? new Date(l.lastHeartbeat).toLocaleString('id-ID', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : 'Never';
        return `<option value="${l.lockerId}" data-pending="${pendingCount}">${l.lockerId} (${pendingCount} pending • ${lastHb})</option>`;
      })
      .join("");

    // Build active resi options
    const activeResiList = activeResiResp.data?.data || [];
    if (activeResiList.length > 0) {
      activeResiOptionsHtml = activeResiList
        .map(r => {
          const displayLabel = r.displayLabel || `${r.resi} - ${r.courierType.toUpperCase()} - ${r.customerName}`;
          return `<option value='${JSON.stringify(r)}'>${displayLabel}</option>`;
        })
        .join("");
      console.log(`[FORM] Loaded ${activeResiList.length} active resi`);
    }

    console.log(`[FORM] Loaded ${customers.length} customers, ${onlineLockers.length} online lockers, ${activeResiList.length} active resi`);

  } catch (err) {
    console.error("Error fetching form data:", err.message);
    courierOptionsHtml = "";
    customerOptionsHtml = "";
    lockerOptionsHtml = "";
    activeResiOptionsHtml = "";
  }

  const body = `
    <h1>Input Pengiriman</h1>

    <form method="POST" action="/shipments/new" id="shipmentForm">
      <!-- NEW: Active Resi Selection (Primary) -->
      <div style="background:#f0f9ff; border:2px solid #3b82f6; padding:16px; border-radius:8px; margin-bottom:20px;">
        <label style="font-size:14px; font-weight:600; color:#1e40af; display:block; margin-bottom:8px;">
          🎯 Pilih Resi Aktif (Belum Diantar)
        </label>
        <select 
          id="activeResiSelect" 
          style="width:100%; padding:9px 11px; border-radius:8px; border:1px solid #3b82f6; font-size:14px; background:white;">
          <option value="">-- Pilih Resi atau Biarkan Kosong untuk Input Manual --</option>
          ${activeResiOptionsHtml}
        </select>
        <div class="muted mt-2" style="font-size: 12px; color:#1e40af;">
          💡 Memilih resi akan otomatis mengisi semua field di bawah
        </div>
      </div>

      <div class="form-row">
        <div class="form-col">
          <label>Locker ID</label>
          
          <!-- Dropdown for selecting online locker -->
          <select id="lockerSelect" style="width:100%; padding:7px 9px; border-radius:8px; border:1px solid #d1d5db; font-size:13px; margin-bottom:8px;">
            <option value="">-- Pilih Locker Online atau Biarkan Kosong --</option>
            ${lockerOptionsHtml}
          </select>
          
          <!-- Manual input field -->
          <input 
            type="text" 
            id="lockerId" 
            name="lockerId" 
            placeholder="Atau ketik Locker ID manual" 
            required
            style="width:100%;"
          />
          
          <div class="muted mt-2" style="font-size: 11px;">
            💡 Pilih dari dropdown (online locker) atau ketik manual ID
          </div>
          <div id="lockerAutoSuggested" class="muted mt-2" style="font-size: 11px; color:#059669; display:none;">
            ✨ Auto-suggested based on availability
          </div>
        </div>
        <div class="form-col">
          <label>Pilih Kurir dari Pool <span id="courierFilterBadge" style="display:none;" class="badge badge-active"></span></label>
          <select id="courierSelect" name="courierId" required>
            <option value="">-- Pilih Kurir --</option>
            ${courierOptionsHtml}
          </select>
          <div id="courierFilterInfo" class="muted mt-2" style="font-size: 11px; display:none;"></div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-col">
          <label>Nama Penerima</label>
          <input type="text" id="receiverName" name="receiverName" placeholder="Nama customer" />
        </div>
        <div class="form-col">
          <label>No. HP Penerima</label>
          <input type="text" id="receiverPhone" name="receiverPhone" placeholder="08xxxxxxxxxx" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-col">
          <label>Customer ID (6 digit)</label>
          
          <!-- Dropdown for selecting existing customer (now secondary) -->
          <select id="customerSelect" style="width:100%; padding:7px 9px; border-radius:8px; border:1px solid #d1d5db; font-size:13px; margin-bottom:8px;">
            <option value="">-- Pilih Customer Lama atau Biarkan Kosong --</option>
            ${customerOptionsHtml}
          </select>
          
          <!-- Manual input field -->
          <input 
            type="text" 
            id="customerId" 
            name="customerId" 
            placeholder="Atau ketik Customer ID baru (6 digit)" 
            maxlength="6" 
            style="font-weight: 600; width:100%;"
          />
          
          <div id="customerAutoFilled" class="muted mt-2" style="font-size: 11px; color:#059669; display:none;">
            🔒 Auto-filled dari resi yang dipilih
          </div>
          <div id="customerManualInfo" class="muted mt-2" style="font-size: 11px;">
            💡 Pilih dari dropdown untuk auto-fill, atau ketik ID baru di bawahnya
          </div>
        </div>
        <div class="form-col">
          <label>Tipe Barang (opsional)</label>
          <input type="text" name="itemType" placeholder="Dokumen / Paket kecil / dll" />
        </div>
      </div>

      <div class="mt-3">
        <label>Daftar Nomor Resi (satu per baris)</label>
        <textarea id="resiList" name="resiList" placeholder="11002899918893&#10;10008015952761" required></textarea>
        <div id="resiAutoFilled" class="muted mt-2" style="font-size: 11px; color:#059669; display:none;">
          ✨ Pre-filled dengan resi yang dipilih
        </div>
      </div>

      <div class="mt-4 text-right">
        <button class="btn btn-secondary" type="reset" onclick="resetAllFields()">Reset</button>
        <button class="btn btn-primary" type="submit">Simpan & Assign ke Locker</button>
      </div>
    </form>

    <script>
      // ========== COURIER LIST DATA ==========
      const allCouriers = ${courierListJson};
      let currentSelectedResi = null;
      
      // ========== ACTIVE RESI AUTO-FILL ==========
      const activeResiSelect = document.getElementById('activeResiSelect');
      const customerIdInput = document.getElementById('customerId');
      const receiverNameInput = document.getElementById('receiverName');
      const receiverPhoneInput = document.getElementById('receiverPhone');
      const resiListTextarea = document.getElementById('resiList');
      const lockerIdInput = document.getElementById('lockerId');
      const courierSelect = document.getElementById('courierSelect');
      const customerSelect = document.getElementById('customerSelect');
      const lockerSelect = document.getElementById('lockerSelect');
      
      activeResiSelect.addEventListener('change', function(e) {
        if (e.target.value) {
          try {
            const resiData = JSON.parse(e.target.value);
            currentSelectedResi = resiData;
            
            console.log('[Active Resi] Selected:', resiData);
            
            // Auto-fill customer info
            customerIdInput.value = resiData.customerId || '';
            receiverNameInput.value = resiData.customerName || '';
            receiverPhoneInput.value = resiData.customerPhone || '';
            
            // Pre-fill resi list
            resiListTextarea.value = resiData.resi || '';
            
            // Show auto-filled indicators
            document.getElementById('customerAutoFilled').style.display = 'block';
            document.getElementById('customerManualInfo').style.display = 'none';
            document.getElementById('resiAutoFilled').style.display = 'block';
            
            // Visual feedback - green highlight
            const fieldsToHighlight = [customerIdInput, receiverNameInput, receiverPhoneInput, resiListTextarea];
            fieldsToHighlight.forEach(field => {
              field.style.background = '#d1fae5';
              field.readOnly = true;
            });
            
            setTimeout(() => {
              fieldsToHighlight.forEach(field => {
                field.style.background = '#f0f9ff'; // Keep light blue to indicate locked
              });
            }, 1500);
            
            // Reset customer dropdown since we're using active resi
            customerSelect.value = '';
            
            // Filter courier pool by service type
            filterCouriersByService(resiData.courierType);
            
            // Suggest available locker
            suggestAvailableLocker();
            
          } catch (err) {
            console.error('[Active Resi] Parse error:', err);
          }
        } else {
          // Reset to manual mode
          resetToManualMode();
        }
      });
      
      // ========== COURIER FILTERING BY SERVICE TYPE ==========
      function filterCouriersByService(serviceType) {
        const serviceLower = serviceType.toLowerCase();
        
        // Clear current options
        courierSelect.innerHTML = '<option value="">-- Pilih Kurir --</option>';
        
        // Filter and add matching couriers
        const matchingCouriers = allCouriers.filter(c => c.company.toLowerCase() === serviceLower);
        
        matchingCouriers.forEach(c => {
          const option = document.createElement('option');
          option.value = c.courierId;
          option.setAttribute('data-company', c.company.toLowerCase());
          option.textContent = \`\${c.company.toUpperCase()} – \${c.name} (\${c.plate})\`;
          courierSelect.appendChild(option);
        });
        
        // Update filter badge and info
        const filterBadge = document.getElementById('courierFilterBadge');
        const filterInfo = document.getElementById('courierFilterInfo');
        
        if (matchingCouriers.length > 0) {
          filterBadge.textContent = \`🎯 Filtered: \${serviceType.toUpperCase()}\`;
          filterBadge.style.display = 'inline-block';
          filterInfo.textContent = \`Hanya menampilkan \${matchingCouriers.length} kurir \${serviceType.toUpperCase()}\`;
          filterInfo.style.color = '#059669';
          filterInfo.style.display = 'block';
        } else {
          filterBadge.style.display = 'none';
          filterInfo.textContent = \`⚠️ Tidak ada kurir \${serviceType.toUpperCase()} yang aktif\`;
          filterInfo.style.color = '#dc2626';
          filterInfo.style.display = 'block';
        }
        
        console.log(\`[Courier Filter] Filtered \${matchingCouriers.length} couriers for \${serviceType}\`);
      }
      
      // ========== AUTO-SUGGEST LOCKER ==========
      function suggestAvailableLocker() {
        // Find locker with least pending
        const lockerOptions = Array.from(lockerSelect.options).slice(1); // Skip first "-- Pilih --" option
        
        if (lockerOptions.length > 0) {
          // Sort by pending count (stored in data-pending attribute)
          const sortedLockers = lockerOptions.sort((a, b) => {
            const pendingA = parseInt(a.getAttribute('data-pending') || '999');
            const pendingB = parseInt(b.getAttribute('data-pending') || '999');
            return pendingA - pendingB;
          });
          
          // Select the best locker
          const bestLocker = sortedLockers[0];
          lockerIdInput.value = bestLocker.value;
          lockerSelect.value = bestLocker.value;
          
          document.getElementById('lockerAutoSuggested').style.display = 'block';
          
          // Visual feedback
          lockerIdInput.style.background = '#d1fae5';
          setTimeout(() => {
            lockerIdInput.style.background = '#f0f9ff';
          }, 1500);
          
          console.log('[Locker] Auto-suggested:', bestLocker.value);
        }
      }
      
      // ========== RESET TO MANUAL MODE ==========
      function resetToManualMode() {
        currentSelectedResi = null;
        
        // Reset field locks
        customerIdInput.readOnly = false;
        receiverNameInput.readOnly = false;
        receiverPhoneInput.readOnly = false;
        resiListTextarea.readOnly = false;
        
        // Reset backgrounds
        [customerIdInput, receiverNameInput, receiverPhoneInput, resiListTextarea].forEach(field => {
          field.style.background = '';
        });
        
        // Hide auto-fill indicators
        document.getElementById('customerAutoFilled').style.display = 'none';
        document.getElementById('customerManualInfo').style.display = 'block';
        document.getElementById('resiAutoFilled').style.display = 'none';
        document.getElementById('lockerAutoSuggested').style.display = 'none';
        
        // Reset courier filter
        courierSelect.innerHTML = '<option value="">-- Pilih Kurir --</option>';
        allCouriers.forEach(c => {
          const option = document.createElement('option');
          option.value = c.courierId;
          option.setAttribute('data-company', c.company.toLowerCase());
          option.textContent = \`\${c.company.toUpperCase()} – \${c.name} (\${c.plate})\`;
          courierSelect.appendChild(option);
        });
        
        document.getElementById('courierFilterBadge').style.display = 'none';
        document.getElementById('courierFilterInfo').style.display = 'none';
        
        console.log('[Reset] Switched to manual mode');
      }
      
      // ========== LOCKER AUTO-FILL (from dropdown) ==========
      lockerSelect.addEventListener('change', function(e) {
        if (e.target.value) {
          lockerIdInput.value = e.target.value;
          
          // Visual feedback
          lockerIdInput.style.background = '#d1fae5';
          setTimeout(() => {
            lockerIdInput.style.background = '';
          }, 1000);
        }
      });
      
      // Allow manual typing to override
      lockerIdInput.addEventListener('input', function(e) {
        if (e.target.value) {
          // Reset dropdown if user types manually
          lockerSelect.value = '';
          document.getElementById('lockerAutoSuggested').style.display = 'none';
        }
      });
      
      // ========== CUSTOMER AUTO-FILL (from dropdown - manual mode only) ==========
      customerSelect.addEventListener('change', function(e) {
        // Don't allow customer select if active resi is selected
        if (currentSelectedResi) {
          alert('⚠️ Active resi sudah dipilih. Reset form jika ingin pilih customer manual.');
          e.target.value = '';
          return;
        }
        
        const selectedOption = e.target.options[e.target.selectedIndex];
        
        if (selectedOption.value) {
          const customerId = selectedOption.value;
          const name = selectedOption.getAttribute('data-name');
          const phone = selectedOption.getAttribute('data-phone');
          
          // Fill the inputs
          customerIdInput.value = customerId;
          
          if (name && name !== 'Unknown') {
            receiverNameInput.value = name;
          }
          if (phone) {
            receiverPhoneInput.value = phone;
          }
          
          // Visual feedback
          customerIdInput.style.background = '#d1fae5';
          receiverNameInput.style.background = '#d1fae5';
          receiverPhoneInput.style.background = '#d1fae5';
          
          setTimeout(() => {
            customerIdInput.style.background = '';
            receiverNameInput.style.background = '';
            receiverPhoneInput.style.background = '';
          }, 1500);
          
          console.log('Customer selected:', customerId, name, phone);
        }
      });
      
      // Allow manual typing to override
      customerIdInput.addEventListener('input', function(e) {
        if (e.target.value && !currentSelectedResi) {
          // Reset dropdown if user types manually
          customerSelect.value = '';
        }
      });
      
      // ========== FORM VALIDATION ==========
      document.getElementById('shipmentForm').addEventListener('submit', function(e) {
        // Validate courier matches resi service type if active resi was selected
        if (currentSelectedResi && courierSelect.value) {
          const selectedCourierOption = courierSelect.options[courierSelect.selectedIndex];
          const courierCompany = selectedCourierOption.getAttribute('data-company');
          const resiService = currentSelectedResi.courierType.toLowerCase();
          
          if (courierCompany !== resiService) {
            e.preventDefault();
            alert(\`⚠️ Tidak cocok!\\n\\nResi: \${resiService.toUpperCase()}\\nKurir: \${courierCompany.toUpperCase()}\\n\\nSilakan pilih kurir yang sesuai dengan tipe resi.\`);
            return false;
          }
        }
        
        return true;
      });
      
      // ========== RESET ALL FIELDS ==========
      function resetAllFields() {
        activeResiSelect.value = '';
        lockerSelect.value = '';
        lockerIdInput.value = '';
        customerSelect.value = '';
        customerIdInput.value = '';
        receiverNameInput.value = '';
        receiverPhoneInput.value = '';
        resiListTextarea.value = '';
        resetToManualMode();
      }
    </script>
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

    const now = new Date();

    const rows = list
      .map((c) => {
        let badgeClass = "badge-unknown";
        let badgeText = c.state || "unknown";

        if (c.state === "active") {
          badgeClass = "badge-active";
          badgeText = "ACTIVE";
        } else if (c.state === "ongoing") {
          badgeClass = "badge-ongoing";
          badgeText = "ONGOING";
        } else if (c.state === "inactive") {
          badgeClass = "badge-inactive";
          badgeText = "INACTIVE";
        }

        const lastActive = c.lastActiveAt ? new Date(c.lastActiveAt) : null;
        const daysSinceActive = lastActive
          ? Math.floor((now - lastActive) / (1000 * 60 * 60 * 24))
          : null;

        return `
          <tr>
            <td>${c.courierId}</td>
            <td>${c.company.toUpperCase()}</td>
            <td>${c.name}</td>
            <td>${c.plate}</td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td>${lastActive ? lastActive.toLocaleString("id-ID") : "-"}</td>
            <td>${daysSinceActive !== null ? daysSinceActive + ' hari lalu' : 'Never'}</td>
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
            <th>Last Active</th>
            <th>Days Since Active</th>
            <th class="text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="8" class="text-center">Belum ada kurir.</td></tr>`}
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
        const statusBadge = renderStatusBadge(l.status);
        const hb = formatTimestamp(l.lastHeartbeat);
        const pendingCount = Array.isArray(l.pendingResi) ? l.pendingResi.length : 0;
        const deliveryCount = (l.courierHistory || []).length;

        return `
          <tr>
            <td>${l.lockerId}</td>
            <td><span class="pill">${l.lockerToken || "-"}</span></td>
            <td>${pendingCount}</td>
            <td><strong>${deliveryCount}</strong></td>
            <td>${statusBadge}</td>
            <td>${hb}</td>
            <td class="text-right">
              <a class="btn btn-primary" href="/lockers/${encodeURIComponent(l.lockerId)}/detail">📊 View History</a>
              <a class="btn btn-ghost" href="${apiBase}/api/debug/locker/${encodeURIComponent(l.lockerId)}" target="_blank">Debug</a>
              <a class="btn btn-danger" href="/lockers/delete/${l.lockerId}" onclick="return confirm('Hapus locker ini dari DB?')">Hapus</a>
            </td>
          </tr>
        `;
      })
      .join("");

    const body = `
      <h1>Locker Client Pool</h1>

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

      <input
        type="text"
        class="search-box"
        placeholder="🔍 Cari locker..."
        onkeyup="filterTable('lockersTable', this.value)"
      />

      <table id="lockersTable">
        <thead>
          <tr>
            <th>Locker ID</th>
            <th>Token</th>
            <th>Pending Resi</th>
            <th>Deliveries</th>
            <th>Status</th>
            <th>Last Heartbeat</th>
            <th class="text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="7" class="text-center">Belum ada locker.</td></tr>`}
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

// ---------- Locker Detail Page ----------
app.get("/lockers/:lockerId/detail", async (req, res) => {
  const { lockerId } = req.params;
  const apiBase = normalizeBaseUrl(process.env.SMARTLOCKER_API_BASE || API_BASE_DEFAULT);

  try {
    const resp = await axios.get(`${apiBase}/api/lockers/${lockerId}`);
    const locker = resp.data?.data || resp.data;

    if (!locker) {
      return res.status(404).send(errorPage("Not Found", `Locker ${lockerId} tidak ditemukan`));
    }

    // Info Grid
    const statusBadge = renderStatusBadge(locker.status);
    const lastHb = formatTimestamp(locker.lastHeartbeat);
    const tokenUpdated = formatTimestamp(locker.tokenUpdatedAt);
    const pendingItems = getPendingItems(locker);
    const pendingCount = pendingItems.length;
    const deliveryCount = (locker.courierHistory || []).length;

    // Pending Shipments Cards
    const pendingHtml = pendingItems
      .map(p => {
        if (typeof p === 'string') {
          return `
            <div class="card">
              <div><strong>Resi:</strong> ${p}</div>
              <div><strong>Status:</strong> <span class="pill">pending</span></div>
            </div>
          `;
        }
        return `
          <div class="card">
            <div><strong>Resi:</strong> ${p.resi || '-'}</div>
            <div><strong>Customer:</strong> ${p.customerId || '-'}</div>
            <div><strong>Token:</strong> <code class="token-display">${p.token || '-'}</code></div>
            <div><strong>Status:</strong> <span class="pill">${p.status || '-'}</span></div>
          </div>
        `;
      }).join('') || '<p class="muted">Tidak ada pending shipments</p>';

    // Courier History Cards
    const sortedHistory = sortByDateDesc(locker.courierHistory || [], 'deliveredAt');
    const historyHtml = sortedHistory
      .map(h => `
        <div class="card history-card">
          <div style="font-size:15px; font-weight:600; margin-bottom:8px; border-bottom:2px solid #e5e7eb; padding-bottom:8px;">
            🚚 ${h.courierName || '-'} (${h.courierId || '-'})
          </div>
          <div><span class="muted">Plat:</span> ${h.courierPlate || '-'}</div>
          <div><span class="muted">Resi:</span> ${h.resi || '-'}</div>
          <div><span class="muted">Customer ID:</span> ${h.customerId || '-'}</div>
          <div><span class="muted">Token:</span> <code class="token-display">${h.usedToken || '-'}</code></div>
          <div><span class="muted">Delivered:</span> ${formatTimestamp(h.deliveredAt)}</div>
        </div>
      `).join('') || '<p class="muted">Belum ada delivery history</p>';

    const body = `
      <div style="margin-bottom: 20px;">
        <a href="/lockers" class="btn btn-secondary">← Kembali</a>
      </div>

      <h1>Detail Locker: ${locker.lockerId}</h1>

      <div class="info-grid">
        <div class="info-item">
          <label>Current Token</label>
          <div><code class="token-display">${locker.lockerToken || '-'}</code></div>
        </div>
        <div class="info-item">
          <label>Status</label>
          <div>${statusBadge}</div>
        </div>
        <div class="info-item">
          <label>Last Heartbeat</label>
          <div>${lastHb}</div>
        </div>
        <div class="info-item">
          <label>Token Rotated</label>
          <div>${tokenUpdated}</div>
        </div>
        <div class="info-item">
          <label>Pending</label>
          <div><strong>${pendingCount}</strong></div>
        </div>
        <div class="info-item">
          <label>Deliveries</label>
          <div><strong>${deliveryCount}</strong></div>
        </div>
      </div>

      <h2 style="margin-top:30px;">📦 Pending Shipments</h2>
      <div class="cards-container">${pendingHtml}</div>

      <h2 style="margin-top:30px;">🚚 Courier Delivery History</h2>
      <div class="cards-container">${historyHtml}</div>
    `;

    res.send(layout(`Detail ${lockerId}`, "lockers", body));
  } catch (err) {
    console.error("GET /lockers/:lockerId/detail error:", err.response?.data || err.message);
    res.status(500).send(errorPage("Error", "Gagal load detail locker", JSON.stringify(err.response?.data || err.message, null, 2)));
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
  const binderApiKey = process.env.BINDERBYTE_API_KEY;
  
  // Helper function to detect courier by trying each one
  async function detectCourier(resi) {
    const couriers = ['jne', 'jnt', 'sicepat', 'anteraja', 'ninja', 'pos'];
    
    for (const courier of couriers) {
      try {
        const response = await axios.get(`https://api.binderbyte.com/v1/track`, {
          params: {
            api_key: binderApiKey,
            courier: courier,
            awb: resi
          },
          timeout: 3000
        });
        
        if (response.data?.status === 200 && response.data?.data) {
          console.log(`[BinderByte] ${resi} -> ${courier.toUpperCase()}`);
          return courier;
        }
      } catch (err) {
        // Continue to next courier
        continue;
      }
    }
    
    console.log(`[BinderByte] ${resi} -> unknown (no courier found)`);
    return 'unknown';
  }
  
  try {
    const resp = await axios.get(apiBase + "/api/manual-resi");
    const list = resp.data?.data || [];
    
    // Fetch courier info from BinderByte for each resi
    const resiWithCourier = await Promise.all(
      list.map(async (r) => {
        const detectedCourier = await detectCourier(r.resi);
        return { ...r, detectedCourier };
      })
    );

    const body = `
      <h1>Resi Manual dari User</h1>

      <input 
        type="text" 
        class="search-box" 
        id="resiSearchBox"
        placeholder="🔍 Cari resi atau ketik resi baru untuk deteksi kurir..."
        onkeyup="searchAndDetect(this.value)"
        style="max-width: 600px;"
      />
      
      <div id="courierDetection" style="display:none; margin:12px 0; padding:12px 16px; background:#f0fdf4; border:1px solid #86efac; border-radius:8px;">
        <span style="font-size:14px; color:#166534;">
          🤖 Kurir Terdeteksi: <strong id="detectedCourierName" style="text-transform:uppercase;"></strong>
        </span>
      </div>

      <table id="manualResiTable">
        <thead>
          <tr>
            <th>Resi</th>
            <th>Customer ID</th>
            <th>Kurir Terdeteksi</th>
          </tr>
        </thead>
        <tbody>
          ${resiWithCourier.map((r) => {
            return `
              <tr>
                <td>${r.resi}</td>
                <td>${r.customerId || "-"}</td>
                <td><span class="badge" style="background:#3b82f6; color:white;">${r.detectedCourier.toUpperCase()}</span></td>
              </tr>
            `;
          }).join("") || `<tr><td colspan="3" class="text-center">Belum ada input resi manual.</td></tr>`}
        </tbody>
      </table>
      
      <script>
        async function detectCourierFromResi(resi) {
          const couriers = ['jne', 'jnt', 'sicepat', 'anteraja', 'ninja', 'pos'];
          const apiKey = '${process.env.BINDERBYTE_API_KEY}';
          
          for (const courier of couriers) {
            try {
              const response = await fetch(\`https://api.binderbyte.com/v1/track?api_key=\${apiKey}&courier=\${courier}&awb=\${encodeURIComponent(resi)}\`);
              const data = await response.json();
              
              if (data.status === 200 && data.data) {
                return courier;
              }
            } catch (err) {
              continue;
            }
          }
          return null;
        }
        
        async function searchAndDetect(query) {
          // Search functionality
          filterTable('manualResiTable', query);
          
          const detectionDiv = document.getElementById('courierDetection');
          const detectedNameSpan = document.getElementById('detectedCourierName');
          
          // Auto-detect if query looks like a resi
          if (query.length >= 10) {
            const courier = await detectCourierFromResi(query);
            
            if (courier) {
              detectionDiv.style.display = 'block';
              detectedNameSpan.textContent = courier.toUpperCase();
            } else {
              detectionDiv.style.display = 'none';
            }
          } else {
            detectionDiv.style.display = 'none';
          }
        }
      </script>
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