const demoStudents = [
  { id: "S-001", nis: "1001", name: "Alya Putri", class: "XII IPA 1" },
  { id: "S-002", nis: "1002", name: "Bima Pratama", class: "XII IPA 1" },
  { id: "S-003", nis: "1003", name: "Citra Lestari", class: "XII IPS 1" },
  { id: "S-004", nis: "1004", name: "Daffa Rizky", class: "XII IPS 1" }
];

let students = JSON.parse(localStorage.getItem("absensiqu_students") || "null") || demoStudents;
let attendance = JSON.parse(localStorage.getItem("absensiqu_attendance") || "[]");
let subjects = JSON.parse(localStorage.getItem("absensiqu_subjects") || "null") ||
  ["Matematika", "Bahasa Indonesia", "Bahasa Inggris", "Fisika", "Biologi"];

let scanner = null;
let scanLocked = false;
let qrReady = false;
let page = location.hash.slice(1) || "dashboard";

const $ = s => document.querySelector(s);

const save = () => {
  localStorage.setItem("absensiqu_students", JSON.stringify(students));
  localStorage.setItem("absensiqu_attendance", JSON.stringify(attendance));
  localStorage.setItem("absensiqu_subjects", JSON.stringify(subjects));
};

const today = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
};

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[c]));

function shell(body) {
  return `<div class="layout"><aside>
    <a class="logo" href="#dashboard"><b>A</b><span>ABSENSIQU<small>SMART ATTENDANCE</small></span></a>
    <nav>${[
      ["dashboard", "Dashboard", "⌂"],
      ["attendance", "Absensi", "✓"],
      ["students", "Siswa", "♙"],
      ["reports", "Rekap", "▤"],
      ["settings", "Pengaturan", "⚙"]
    ].map(n => `<a class="${page === n[0] ? "active" : ""}" href="#${n[0]}"><i>${n[2]}</i>${n[1]}</a>`).join("")}</nav>
    <div class="side"><button onclick="toggleTheme()">◐ Tema</button><span>● Sistem siap</span></div>
  </aside><main>
    <header><a class="mobile-logo" href="#dashboard">ABSENSIQU</a><button onclick="toggleTheme()">◐</button></header>
    ${body}
  </main></div>`;
}

function stats() {
  const t = attendance.filter(a => a.date === today());
  return `<div class="stats">
    <div><small>HADIR</small><strong>${t.filter(a => a.status === "Hadir").length}</strong><em>Hari ini</em></div>
    <div><small>TERLAMBAT</small><strong>${t.filter(a => a.status === "Terlambat").length}</strong><em>Hari ini</em></div>
    <div><small>IZIN / SAKIT</small><strong>${t.filter(a => ["Izin", "Sakit"].includes(a.status)).length}</strong><em>Hari ini</em></div>
    <div><small>TOTAL SISWA</small><strong>${students.length}</strong><em>Terdaftar</em></div>
  </div>`;
}

function dashboard() {
  const recent = attendance.filter(a => a.date === today()).slice(-6).reverse();
  return shell(`<section>
    <span class="eyebrow">SMART ATTENDANCE SYSTEM</span>
    <div class="hero"><div><h1>Selamat datang di <span>ABSENSIQU.</span></h1><p>Kelola kehadiran dengan cepat, rapi, dan siap terhubung ke Google Sheets.</p></div><a class="btn dark" href="#attendance">+ Mulai Absensi</a></div>
    ${stats()}
    <div class="columns">
      <div class="card"><span class="eyebrow">QUICK ACTION</span><h2>Apa yang mau dilakukan?</h2><div class="actions">
        <a href="#attendance"><b>✓</b><span>Catat Kehadiran<small>Scan QR siswa</small></span></a>
        <a href="#students"><b>♙</b><span>Kelola Siswa<small>Data siswa & QR</small></span></a>
        <a href="#reports"><b>▤</b><span>Lihat Rekap<small>Analitik kehadiran</small></span></a>
        <a href="#settings"><b>⚙</b><span>Google Sheets<small>Sinkronisasi</small></span></a>
      </div></div>
      <div class="card"><span class="eyebrow">AKTIVITAS</span><h2>Absensi terbaru</h2>
        ${recent.length ? recent.map(a => `<div class="activity"><b>${esc(a.name).slice(0, 1)}</b><span><strong>${esc(a.name)}</strong><small>${a.time} · ${esc(a.class)} · ${esc(a.subject)}</small></span><label class="badge ${a.status.toLowerCase()}">${a.status}</label></div>`).join("") : "<p class='empty'>Belum ada absensi hari ini.</p>"}
      </div>
    </div>
  </section>`);
}

function attendancePage() {
  return shell(`<section>
    <span class="eyebrow">01 · ABSENSI</span>
    <div class="title"><div><h1>Scan Kehadiran</h1><p>Pilih mapel lalu scan QR siswa. Satu siswa hanya bisa absen sekali per mapel per tanggal.</p></div></div>
    <div class="card form">
      <div class="formgrid">
        <label>Tanggal<input id="date" type="date" value="${today()}"></label>
        <label>Mata Pelajaran<select id="subject">${subjects.map(s => `<option>${esc(s)}</option>`).join("")}</select></label>
        <label>Status<select id="status"><option>Hadir</option><option>Terlambat</option><option>Izin</option><option>Sakit</option><option>Alpha</option></select></label>
      </div>
      <div id="reader" class="reader"></div>
      <div id="scanStatus" class="scanstatus">Kamera belum aktif.</div>
      <button class="btn dark" id="scanBtn" onclick="toggleScanner()">▣ Mulai Scan QR</button>
    </div>
    <div class="card"><div class="cardhead"><h2>Riwayat</h2><input id="aq" placeholder="Cari siswa…"></div>
      <div class="tablewrap"><table><thead><tr><th>Waktu</th><th>Siswa</th><th>Kelas</th><th>Mapel</th><th>Status</th><th>Catatan</th></tr></thead><tbody id="attendanceRows"></tbody></table></div>
    </div>
  </section>`);
}

function studentsPage() {
  return shell(`<section>
    <span class="eyebrow">02 · DATA MASTER</span>
    <div class="title"><div><h1>Data Siswa</h1><p>Kelola siswa yang dapat melakukan absensi.</p></div></div>
    <div class="card form"><div class="formgrid">
      <label>NISN<input id="nis" placeholder="0012345678"></label>
      <label>Nama lengkap<input id="name" placeholder="Nama siswa"></label>
      <label>Kelas<input id="class" placeholder="XII IPA 1"></label>
    </div><button class="btn dark" onclick="addStudent()">+ Tambah Siswa</button></div>
    <input class="search" id="sq" placeholder="Cari nama, NIS, atau kelas…">
    <div class="studentgrid" id="studentGrid"></div>
  </section>`);
}

function reportsPage() {
  return shell(`<section>
    <span class="eyebrow">03 · ANALITIK</span>
    <div class="title"><div><h1>Rekap Kehadiran</h1><p>Semua catatan absensi yang tersimpan di perangkat ini.</p></div><button class="btn" onclick="exportCSV()">↓ Export CSV</button></div>
    ${stats()}
    <div class="card"><div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Waktu</th><th>Siswa</th><th>Kelas</th><th>Mapel</th><th>Status</th><th>Catatan</th></tr></thead><tbody>
      ${[...attendance].reverse().map(a => `<tr><td>${esc(a.date)}</td><td>${esc(a.time)}</td><td><strong>${esc(a.name)}</strong></td><td>${esc(a.class)}</td><td>${esc(a.subject)}</td><td><label class="badge ${a.status.toLowerCase()}">${esc(a.status)}</label></td><td>${esc(a.note) || "—"}</td></tr>`).join("") || "<tr><td colspan='7' class='empty'>Belum ada data.</td></tr>"}
    </tbody></table></div></div>
  </section>`);
}

function settingsPage() {
  return shell(`<section>
    <span class="eyebrow">04 · PENGATURAN</span>
    <div class="title"><div><h1>Google Sheets</h1><p>Masukkan URL Google Apps Script Web App untuk sinkronisasi.</p></div></div>
    <div class="card form"><label>Apps Script Web App URL<input id="scriptUrl" value="${esc(localStorage.getItem("absensiqu_script_url") || "")}" placeholder="https://script.google.com/macros/s/.../exec"></label>
      <div class="actions"><button class="btn dark" onclick="saveSettings()">Simpan</button><button class="btn" onclick="testConnection()">Tes Koneksi</button></div>
      <div id="connectionStatus" class="scanstatus"></div>
    </div>
    <div class="card"><span class="eyebrow">FORMAT SHEET</span><h2>Students</h2><p>id · nis · name · class · active</p><h2>Attendance</h2><p>id · date · time · studentId · nis · name · class · subject · status · note</p><hr><p><strong>Arsitektur:</strong> ABSENSIQU → Google Apps Script → Google Sheets.</p></div>
  </section>`);
}

function render() {
  const renderer =
    {
      dashboard,
      attendance: attendancePage,
      students: studentsPage,
      reports: reportsPage,
      settings: settingsPage
    }[page] || dashboard;

  document.querySelector("#app").innerHTML = renderer();

  if (page === "attendance") paintAttendance();
  if (page === "students") paintStudents();
}

function paintAttendance() {
  const q = ($("#aq")?.value || "").toLowerCase();
  const selectedDate = $("#date")?.value || today();
  const selectedSubject = $("#subject")?.value || "";
  const rows = attendance.filter(a =>
    a.date === selectedDate &&
    (!selectedSubject || a.subject === selectedSubject) &&
    a.name.toLowerCase().includes(q)
  ).reverse();

  $("#attendanceRows").innerHTML = rows.map(a => `<tr>
    <td>${esc(a.time)}</td><td><strong>${esc(a.name)}</strong></td><td>${esc(a.class)}</td>
    <td>${esc(a.subject)}</td><td><label class="badge ${a.status.toLowerCase()}">${esc(a.status)}</label></td><td>${esc(a.note) || "—"}</td>
  </tr>`).join("") || "<tr><td colspan='6' class='empty'>Belum ada data.</td></tr>";
}

function paintStudents() {
  const q = ($("#sq")?.value || "").toLowerCase();
  $("#studentGrid").innerHTML = students
    .filter(s => (s.name + s.nis + s.class).toLowerCase().includes(q))
    .map(s => `<article class="student">
      <div class="qr" id="qr-${esc(s.id)}"></div>
      <h3>${esc(s.name)}</h3><p>${esc(s.class)} · NIS ${esc(s.nis)}</p><code>${esc(s.id)}</code>
    </article>`).join("") || "<p class='empty'>Belum ada siswa.</p>";

  if (qrReady && window.QRCode) {
    students.filter(s => (s.name + s.nis + s.class).toLowerCase().includes(q)).forEach(s => {
      const el = $(`#qr-${CSS.escape(s.id)}`);
      if (el) new QRCode(el, {
        text: s.nis,
        width: 128,
        height: 128,
        correctLevel: QRCode.CorrectLevel.M
      });
    });
  }
}

async function addAttendanceByQR(raw) {
  const key = String(raw).trim();
  const s = students.find(x => String(x.id) === key || String(x.nis) === key);

  if (!s) {
    $("#scanStatus").textContent = "⛔ QR tidak dikenali.";
    return;
  }

  const date = $("#date").value;
  const subject = $("#subject").value;

  if (attendance.some(a => a.date === date && a.subject === subject && a.studentId === s.id)) {
    $("#scanStatus").textContent = "⛔ " + s.name + " sudah scan untuk " + subject + " pada tanggal tersebut.";
    return;
  }

  const a = {
    id: crypto.randomUUID(),
    date,
    time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    studentId: s.id,
    nis: s.nis,
    name: s.name,
    class: s.class,
    subject,
    status: $("#status").value,
    note: "QR Scan"
  };

  attendance.push(a);
  save();
  paintAttendance();
  $("#scanStatus").textContent = "✓ " + s.name + " tercatat. Menyinkronkan…";

  const result = await syncAttendance(a);

  if (result.ok) {
    a.syncStatus = "synced";
    save();
    $("#scanStatus").textContent = "✓ " + s.name + " berhasil absen & tersimpan di Google Sheets.";
    return;
  }

  if (result.code === "DUPLICATE_ATTENDANCE") {
    attendance = attendance.filter(x => x.id !== a.id);
    save();
    paintAttendance();
    $("#scanStatus").textContent = "⛔ Absensi ditolak server karena sudah tercatat.";
    return;
  }

  a.syncStatus = "pending";
  save();
  $("#scanStatus").textContent = "⚠ Absen tersimpan di perangkat, tetapi sinkronisasi Google Sheets gagal.";
}

async function syncAttendance(a) {
  const u = localStorage.getItem("absensiqu_script_url");
  if (!u) return { ok: true, localOnly: true };

  try {
    const response = await fetch(u, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "addAttendance", attendance: a })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

async function syncStudent(s) {
  const u = localStorage.getItem("absensiqu_script_url");
  if (!u) return { ok: true, localOnly: true };

  try {
    const response = await fetch(u, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "addStudent",
        student: { id: s.id, nis: s.nis, name: s.name, class: s.class, active: true }
      })
    });
    return await response.json();
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

async function toggleScanner() {
  if (!window.Html5Qrcode) {
    $("#scanStatus").textContent = "Library kamera QR belum siap. Coba refresh halaman.";
    return;
  }

  if (scanner) {
    try {
      await scanner.stop();
      await scanner.clear();
    } catch (_) {}
    scanner = null;
    $("#scanBtn").textContent = "▣ Mulai Scan QR";
    $("#scanStatus").textContent = "Kamera dihentikan.";
    return;
  }

  scanner = new Html5Qrcode("reader");

  try {
    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 230 },
      text => {
        if (scanLocked) return;
        scanLocked = true;
        addAttendanceByQR(text).finally(() => setTimeout(() => scanLocked = false, 1200));
      },
      () => {}
    );

    $("#scanStatus").textContent = "Kamera aktif — arahkan ke QR siswa.";
    $("#scanBtn").textContent = "■ Hentikan Scan";
  } catch (_) {
    $("#scanStatus").textContent = "Kamera gagal. Gunakan HTTPS dan izinkan akses kamera.";
    scanner = null;
  }
}

async function addStudent() {
  const nis = $("#nis").value.trim();
  const name = $("#name").value.trim();
  const klass = $("#class").value.trim();

  if (!nis || !name || !klass) return alert("Lengkapi data siswa.");
  if (students.some(s => String(s.nis).trim() === nis)) return alert("NISN sudah terdaftar.");

  const s = { id: "S-" + nis, nis, name, class: klass };
  students.push(s);
  save();
  render();

  const result = await syncStudent(s);
  if (result.ok) {
    alert("Siswa ditambahkan dan tersimpan di Google Sheets.");
  } else if (result.error === "NISN already exists") {
    students = students.filter(x => x.id !== s.id);
    save();
    render();
    alert("Siswa ditolak karena NISN sudah ada di Google Sheets.");
  } else {
    alert("Siswa ditambahkan di perangkat, tetapi sinkronisasi Google Sheets gagal.");
  }
}

function exportCSV() {
  const rows = [
    ["Tanggal", "Waktu", "NIS", "Nama", "Kelas", "Mapel", "Status", "Catatan"],
    ...attendance.map(a => [a.date, a.time, a.nis, a.name, a.class, a.subject, a.status, a.note || ""])
  ];

  const csv = rows
    .map(r => r.map(v => '"' + String(v).replaceAll('"', '""') + '"').join(","))
    .join("\n");

  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = "absensiqu-rekap.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function testConnection() {
  const u = $("#scriptUrl")?.value.trim();
  const box = $("#connectionStatus");
  if (!u) {
    box.textContent = "Masukkan URL Web App terlebih dahulu.";
    return;
  }

  box.textContent = "Mengecek koneksi…";

  try {
    const response = await fetch(u, { method: "GET" });
    const data = await response.json();

    if (data.ok) {
      box.textContent = "✓ Google Apps Script terhubung.";
    } else {
      box.textContent = "⛔ Server merespons error.";
    }
  } catch (error) {
    box.textContent = "⛔ Koneksi gagal. Pastikan URL /exec benar dan deployment dapat diakses.";
  }
}

function saveSettings() {
  const u = $("#scriptUrl").value.trim();
  localStorage.setItem("absensiqu_script_url", u);
  alert("URL Google Apps Script disimpan.");
}

function toggleTheme() {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem(
    "absensiqu_theme",
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
}

window.addEventListener("hashchange", () => {
  page = location.hash.slice(1) || "dashboard";
  if (scanner) {
    scanner.stop().catch(() => {});
    scanner = null;
  }
  render();
});

if (localStorage.getItem("absensiqu_theme") === "dark") {
  document.documentElement.classList.add("dark");
}

const qrScript = document.createElement("script");
qrScript.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
qrScript.onload = () => {
  qrReady = true;
  if (page === "students") paintStudents();
};
document.head.appendChild(qrScript);

const scanScript = document.createElement("script");
scanScript.src = "https://unpkg.com/html5-qrcode";
document.head.appendChild(scanScript);

document.addEventListener("input", event => {
  if (event.target?.id === "aq") paintAttendance();
  if (event.target?.id === "sq") paintStudents();
});

document.addEventListener("change", event => {
  if (event.target?.id === "date" || event.target?.id === "subject") paintAttendance();
});

render();
