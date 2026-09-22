const demoStudents = [
  { id: "S-001", nis: "1001", name: "Alya Putri", class: "XII IPA 1", active: true },
  { id: "S-002", nis: "1002", name: "Bima Pratama", class: "XII IPA 1", active: true },
  { id: "S-003", nis: "1003", name: "Citra Lestari", class: "XII IPS 1", active: true },
  { id: "S-004", nis: "1004", name: "Daffa Rizky", class: "XII IPS 1", active: true }
];

let students = JSON.parse(localStorage.getItem("absensiqu_students") || "null") || demoStudents;
let attendance = JSON.parse(localStorage.getItem("absensiqu_attendance") || "[]");
let subjects = JSON.parse(localStorage.getItem("absensiqu_subjects") || "null") ||
  ["Matematika", "Bahasa Indonesia", "Bahasa Inggris", "Fisika", "Biologi"];
let page = location.hash.slice(1) || "dashboard";
let scanner = null;
let scanLocked = false;
let qrReady = false;
let syncState = "idle";
let lastSync = localStorage.getItem("absensiqu_last_sync") || "";

const $ = s => document.querySelector(s);
const save = () => {
  localStorage.setItem("absensiqu_students", JSON.stringify(students));
  localStorage.setItem("absensiqu_attendance", JSON.stringify(attendance));
  localStorage.setItem("absensiqu_subjects", JSON.stringify(subjects));
  if (lastSync) localStorage.setItem("absensiqu_last_sync", lastSync);
};
const scriptUrl = () => localStorage.getItem("absensiqu_script_url") || "";
const today = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
};
const nowTime = () => new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const isOnline = () => navigator.onLine;

function markSynced() {
  lastSync = new Date().toLocaleString("id-ID",{dateStyle:"short",timeStyle:"short"});
  syncState = "ok";
  save();
}

function shell(body) {
  return `<div class="layout"><aside>
    <a class="logo" href="#dashboard"><b>A</b><span>ABSENSIQU<small>SMART ATTENDANCE</small></span></a>
    <nav>${[
      ["dashboard","Dashboard","⌂"],["attendance","Absensi","✓"],["students","Siswa","♙"],
      ["reports","Rekap","▤"],["settings","Pengaturan","⚙"]
    ].map(n=>`<a class="${page===n[0]?"active":""}" href="#${n[0]}"><i>${n[2]}</i>${n[1]}</a>`).join("")}</nav>
    <div class="side"><button onclick="toggleTheme()">◐ Tema</button><span>● ${isOnline()?"Online":"Offline"}</span></div>
  </aside><main>
    <header><a class="mobile-logo" href="#dashboard">ABSENSIQU</a><button onclick="toggleTheme()">◐</button></header>
    ${body}
  </main></div>`;
}

function stats() {
  const t = attendance.filter(a=>a.date===today());
  return `<div class="stats">
    <div><small>HADIR</small><strong>${t.filter(a=>a.status==="Hadir").length}</strong><em>Hari ini</em></div>
    <div><small>TERLAMBAT</small><strong>${t.filter(a=>a.status==="Terlambat").length}</strong><em>Hari ini</em></div>
    <div><small>IZIN / SAKIT</small><strong>${t.filter(a=>["Izin","Sakit"].includes(a.status)).length}</strong><em>Hari ini</em></div>
    <div><small>TOTAL SISWA</small><strong>${students.filter(s=>s.active!==false).length}</strong><em>Aktif</em></div>
  </div>`;
}

function dashboard() {
  const t = attendance.filter(a=>a.date===today());
  const recent = [...t].reverse().slice(0,6);
  const presentIds = new Set(t.map(a=>a.studentId));
  const rate = students.length ? Math.round((presentIds.size/students.filter(s=>s.active!==false).length)*100) : 0;
  return shell(`<section>
    <span class="eyebrow">SMART ATTENDANCE SYSTEM</span>
    <div class="hero"><div><h1>Selamat datang di <span>ABSENSIQU.</span></h1><p>Absensi QR yang cepat, rapi, dan tersinkronisasi dengan Google Sheets.</p></div><a class="btn dark" href="#attendance">+ Mulai Absensi</a></div>
    ${stats()}
    <div class="columns">
      <div class="card"><span class="eyebrow">RINGKASAN HARI INI</span><h2>Kehadiran ${rate}%</h2><div class="progress"><i style="width:${Math.min(rate,100)}%"></i></div><p>${presentIds.size} dari ${students.filter(s=>s.active!==false).length} siswa aktif sudah memiliki catatan hari ini.</p></div>
      <div class="card"><span class="eyebrow">STATUS SINKRONISASI</span><h2>${syncState==="ok"?"✓ Tersinkron":"● Siap digunakan"}</h2><p>${lastSync ? "Sinkron terakhir: "+esc(lastSync) : "Belum ada sinkronisasi pada sesi ini."}</p><button class="btn" onclick="syncFromServer()">↻ Sinkronkan Sekarang</button></div>
    </div>
    <div class="columns">
      <div class="card"><span class="eyebrow">QUICK ACTION</span><h2>Apa yang mau dilakukan?</h2><div class="actions">
        <a href="#attendance"><b>✓</b><span>Catat Kehadiran<small>Scan QR siswa</small></span></a>
        <a href="#students"><b>♙</b><span>Kelola Siswa<small>Data siswa & QR</small></span></a>
        <a href="#reports"><b>▤</b><span>Lihat Rekap<small>Filter & export</small></span></a>
        <a href="#settings"><b>⚙</b><span>Google Sheets<small>Sinkronisasi</small></span></a>
      </div></div>
      <div class="card"><span class="eyebrow">AKTIVITAS</span><h2>Absensi terbaru</h2>
        ${recent.length ? recent.map(a=>`<div class="activity"><b>${esc(a.name).slice(0,1)}</b><span><strong>${esc(a.name)}</strong><small>${esc(a.time)} · ${esc(a.class)} · ${esc(a.subject)}</small></span><label class="badge ${String(a.status).toLowerCase()}">${esc(a.status)}</label></div>`).join("") : "<p class='empty'>Belum ada absensi hari ini.</p>"}
      </div>
    </div>
  </section>`);
}

function attendancePage() {
  return shell(`<section>
    <span class="eyebrow">01 · ABSENSI</span><div class="title"><div><h1>Scan Kehadiran</h1><p>Pilih mapel lalu scan QR siswa. Satu siswa hanya bisa absen sekali per mapel per tanggal.</p></div></div>
    <div class="card form"><div class="formgrid">
      <label>Tanggal<input id="date" type="date" value="${today()}"></label>
      <label>Mata Pelajaran<select id="subject">${subjects.map(s=>`<option>${esc(s)}</option>`).join("")}</select></label>
      <label>Status<select id="status"><option>Hadir</option><option>Terlambat</option><option>Izin</option><option>Sakit</option><option>Alpha</option></select></label>
    </div>
    <div id="reader" class="reader"></div><div id="scanStatus" class="scanstatus">Kamera belum aktif.</div>
    <button class="btn dark" id="scanBtn" onclick="toggleScanner()">▣ Mulai Scan QR</button></div>
    <div class="card"><div class="cardhead"><h2>Riwayat</h2><input id="aq" placeholder="Cari siswa…"></div>
      <div class="tablewrap"><table><thead><tr><th>Waktu</th><th>Siswa</th><th>Kelas</th><th>Mapel</th><th>Status</th><th>Catatan</th></tr></thead><tbody id="attendanceRows"></tbody></table></div>
    </div>
  </section>`);
}

function studentsPage() {
  return shell(`<section>
    <span class="eyebrow">02 · DATA MASTER</span><div class="title"><div><h1>Data Siswa</h1><p>Kelola siswa dan QR masing-masing.</p></div></div>
    <div class="card form"><div class="formgrid"><label>NISN<input id="nis" placeholder="0012345678"></label><label>Nama lengkap<input id="name" placeholder="Nama siswa"></label><label>Kelas<input id="class" placeholder="XII IPA 1"></label></div><button class="btn dark" onclick="addStudent()">+ Tambah Siswa</button></div>
    <input class="search" id="sq" placeholder="Cari nama, NIS, atau kelas…"><div class="studentgrid" id="studentGrid"></div>
  </section>`);
}

function reportsPage() {
  const dates = [...new Set(attendance.map(a=>a.date))].sort().reverse();
  return shell(`<section>
    <span class="eyebrow">03 · ANALITIK</span><div class="title"><div><h1>Rekap Kehadiran</h1><p>Filter data lokal dan ekspor untuk laporan sekolah.</p></div><div class="actions-inline"><button class="btn" onclick="exportCSV()">↓ CSV</button><button class="btn" onclick="printReport()">⎙ Cetak / PDF</button></div></div>
    ${stats()}
    <div class="card form"><div class="formgrid"><label>Dari<input id="fromDate" type="date"></label><label>Sampai<input id="toDate" type="date"></label><label>Status<select id="reportStatus"><option value="">Semua status</option><option>Hadir</option><option>Terlambat</option><option>Izin</option><option>Sakit</option><option>Alpha</option></select></label></div><div class="formgrid"><label>Mapel<select id="reportSubject"><option value="">Semua mapel</option>${subjects.map(s=>`<option>${esc(s)}</option>`).join("")}</select></label><label>Siswa<input id="reportStudent" placeholder="Nama/NIS…"></label><div></div></div></div>
    <div class="card"><div class="cardhead"><h2 id="reportCount">Rekap</h2><span class="muted">${dates.length} tanggal tersimpan</span></div><div class="tablewrap"><table><thead><tr><th>Tanggal</th><th>Waktu</th><th>Siswa</th><th>Kelas</th><th>Mapel</th><th>Status</th><th>Catatan</th></tr></thead><tbody id="reportRows"></tbody></table></div></div>
  </section>`);
}

function settingsPage() {
  return shell(`<section><span class="eyebrow">04 · PENGATURAN</span><div class="title"><div><h1>Pengaturan</h1><p>Hubungkan backend, kelola mapel, dan siapkan aplikasi untuk perangkat.</p></div></div>
    <div class="card form"><label>Apps Script Web App URL<input id="scriptUrl" value="${esc(scriptUrl())}" placeholder="https://script.google.com/macros/s/.../exec"></label><div class="actions-inline"><button class="btn dark" onclick="saveSettings()">Simpan</button><button class="btn" onclick="testConnection()">Tes Koneksi</button><button class="btn" onclick="syncFromServer()">↻ Tarik Data</button></div><div id="connectionStatus" class="scanstatus"></div></div>
    <div class="card form"><span class="eyebrow">MATA PELAJARAN</span><h2>Daftar Mapel</h2><div id="subjectList">${subjects.map((s,i)=>`<div class="subjectrow"><input value="${esc(s)}" data-subject-index="${i}"><button class="btn" onclick="removeSubject(${i})">Hapus</button></div>`).join("")}</div><div class="actions-inline"><button class="btn dark" onclick="addSubject()">+ Tambah Mapel</button><button class="btn" onclick="saveSubjects()">Simpan Mapel</button></div></div>
    <div class="card"><span class="eyebrow">APLIKASI</span><h2>ABSENSIQU</h2><p>Versi 3.0 · PWA · Offline-ready · Google Sheets sync.</p><button class="btn" onclick="installApp()">＋ Install Aplikasi</button><hr><p><strong>Catatan keamanan:</strong> PIN admin di perangkat membantu membatasi akses UI, tetapi bukan pengganti autentikasi server.</p><button class="btn" onclick="setAdminPin()">🔐 Atur PIN Admin</button><button class="btn danger" onclick="clearLocalData()">Hapus data lokal</button></div>
  </section>`);
}

function render() {
  const renderer={dashboard,attendance:attendancePage,students:studentsPage,reports:reportsPage,settings:settingsPage}[page]||dashboard;
  document.querySelector("#app").innerHTML=renderer();
  if(page==="attendance") paintAttendance();
  if(page==="students") paintStudents();
  if(page==="reports") paintReports();
}

function paintAttendance() {
  const q=($("#aq")?.value||"").toLowerCase();
  const d=$("#date")?.value||today(), sub=$("#subject")?.value||"";
  const rows=attendance.filter(a=>a.date===d&&(!sub||a.subject===sub)&&String(a.name).toLowerCase().includes(q)).reverse();
  $("#attendanceRows").innerHTML=rows.map(a=>`<tr><td>${esc(a.time)}</td><td><strong>${esc(a.name)}</strong></td><td>${esc(a.class)}</td><td>${esc(a.subject)}</td><td><label class="badge ${String(a.status).toLowerCase()}">${esc(a.status)}</label></td><td>${esc(a.note)||"—"}</td></tr>`).join("")||"<tr><td colspan='6' class='empty'>Belum ada data.</td></tr>";
}

function paintStudents() {
  const q=($("#sq")?.value||"").toLowerCase();
  const list=students.filter(s=>s.active!==false&&(s.name+s.nis+s.class).toLowerCase().includes(q));
  $("#studentGrid").innerHTML=list.map(s=>`<article class="student"><div class="qr" id="qr-${esc(s.id)}"></div><h3>${esc(s.name)}</h3><p>${esc(s.class)} · NIS ${esc(s.nis)}</p><code>${esc(s.id)}</code></article>`).join("")||"<p class='empty'>Belum ada siswa.</p>";
  if(qrReady&&window.QRCode) list.forEach(s=>{const el=$(`#qr-${CSS.escape(s.id)}`);if(el)new QRCode(el,{text:s.nis,width:128,height:128,correctLevel:QRCode.CorrectLevel.M});});
}

function filteredReports() {
  const from=$("#fromDate")?.value||"0000-00-00", to=$("#toDate")?.value||"9999-99-99", status=$("#reportStatus")?.value||"", sub=$("#reportSubject")?.value||"", q=($("#reportStudent")?.value||"").toLowerCase();
  return [...attendance].filter(a=>a.date>=from&&a.date<=to&&(!status||a.status===status)&&(!sub||a.subject===sub)&&(!q||(a.name+a.nis).toLowerCase().includes(q))).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
}
function paintReports() {
  const rows=filteredReports();
  const el=$("#reportRows"); if(!el)return;
  $("#reportCount").textContent=`Rekap · ${rows.length} catatan`;
  el.innerHTML=rows.map(a=>`<tr><td>${esc(a.date)}</td><td>${esc(a.time)}</td><td><strong>${esc(a.name)}</strong></td><td>${esc(a.class)}</td><td>${esc(a.subject)}</td><td><label class="badge ${String(a.status).toLowerCase()}">${esc(a.status)}</label></td><td>${esc(a.note)||"—"}</td></tr>`).join("")||"<tr><td colspan='7' class='empty'>Tidak ada data sesuai filter.</td></tr>";
}

async function addAttendanceByQR(raw) {
  const key=String(raw).trim(), s=students.find(x=>String(x.id)===key||String(x.nis)===key);
  if(!s){$("#scanStatus").textContent="⛔ QR tidak dikenali.";return;}
  const date=$("#date").value, subject=$("#subject").value;
  if(attendance.some(a=>a.date===date&&a.subject===subject&&a.studentId===s.id)){$("#scanStatus").textContent=`⛔ ${s.name} sudah scan untuk ${subject} hari ini.`;return;}
  const a={id:crypto.randomUUID(),date,time:nowTime(),studentId:s.id,nis:s.nis,name:s.name,class:s.class,subject,status:$("#status").value,note:"QR Scan",syncStatus:"pending"};
  attendance.push(a);save();paintAttendance();$("#scanStatus").textContent=`✓ ${s.name} tercatat. Menyinkronkan…`;
  const result=await syncAttendance(a);
  if(result.ok){a.syncStatus="synced";markSynced();save();$("#scanStatus").textContent=`✓ ${s.name} berhasil absen & tersimpan di Google Sheets.`;return;}
  if(result.code==="DUPLICATE_ATTENDANCE"){attendance=attendance.filter(x=>x.id!==a.id);save();paintAttendance();$("#scanStatus").textContent="⛔ Absensi ditolak server karena sudah tercatat.";return;}
  $("#scanStatus").textContent="⚠ Tersimpan lokal. Sinkronisasi akan dicoba lagi saat koneksi tersedia.";
}

async function syncAttendance(a){
  const u=scriptUrl(); if(!u)return {ok:false,error:"NO_URL"};
  try{const r=await fetch(u,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"addAttendance",attendance:a})});return await r.json();}
  catch(e){return {ok:false,error:String(e)};}
}
async function syncStudent(s){
  const u=scriptUrl(); if(!u)return {ok:false,error:"NO_URL"};
  try{const r=await fetch(u,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"addStudent",student:{id:s.id,nis:s.nis,name:s.name,class:s.class,active:true}})});return await r.json();}
  catch(e){return {ok:false,error:String(e)};}
}

async function syncFromServer(){
  const u=scriptUrl(), box=$("#connectionStatus");
  if(!u){if(box)box.textContent="Masukkan URL Apps Script terlebih dahulu.";return false;}
  syncState="working";if(box)box.textContent="Mengambil data dari Google Sheets…";
  try{
    const [sr,ar]=await Promise.all([fetch(u+"?action=getStudents"),fetch(u+"?action=getAttendance")]);
    const sd=await sr.json(), ad=await ar.json();
    if(!sd.ok||!ad.ok)throw Error("Server mengembalikan error.");
    students=sd.data.map(x=>({id:String(x.id),nis:String(x.nis),name:String(x.name),class:String(x.class),active:x.active!==false&&String(x.active).toLowerCase()!=="false"}));
    attendance=ad.data.map(x=>({id:String(x.id),date:String(x.date).slice(0,10),time:String(x.time).slice(0,5),studentId:String(x.studentId),nis:String(x.nis),name:String(x.name),class:String(x.class),subject:String(x.subject),status:String(x.status),note:String(x.note||""),syncStatus:"synced"}));
    markSynced();render();if(box)box.textContent="✓ Data Google Sheets berhasil ditarik ke aplikasi.";return true;
  }catch(e){syncState="error";if(box)box.textContent="⛔ Gagal menarik data. Periksa deployment Apps Script.";return false;}
}

async function retryPending(){
  if(!scriptUrl()||!isOnline())return;
  const pending=[...attendance.filter(a=>a.syncStatus==="pending")];
  for(const a of pending){
    const r=await syncAttendance(a);
    if(r.ok){a.syncStatus="synced";markSynced();}
    else if(r.code==="DUPLICATE_ATTENDANCE"){a.syncStatus="synced";markSynced();}
  }
  save();
}

async function toggleScanner(){
  if(!window.Html5Qrcode){$("#scanStatus").textContent="Library kamera belum siap. Coba refresh.";return;}
  if(scanner){try{await scanner.stop();await scanner.clear();}catch(_){}scanner=null;$("#scanBtn").textContent="▣ Mulai Scan QR";$("#scanStatus").textContent="Kamera dihentikan.";return;}
  scanner=new Html5Qrcode("reader");
  try{await scanner.start({facingMode:"environment"},{fps:10,qrbox:230},text=>{if(scanLocked)return;scanLocked=true;addAttendanceByQR(text).finally(()=>setTimeout(()=>scanLocked=false,1200));},()=>{});$("#scanStatus").textContent="Kamera aktif — arahkan ke QR siswa.";$("#scanBtn").textContent="■ Hentikan Scan";}catch(e){$("#scanStatus").textContent="Kamera gagal. Pastikan HTTPS dan izin kamera aktif.";scanner=null;}
}

async function addStudent(){
  const nis=$("#nis").value.trim(),name=$("#name").value.trim(),klass=$("#class").value.trim();
  if(!nis||!name||!klass)return alert("Lengkapi data siswa.");
  if(students.some(s=>String(s.nis).trim()===nis))return alert("NISN sudah terdaftar.");
  const s={id:"S-"+nis,nis,name,class:klass,active:true};students.push(s);save();render();
  const r=await syncStudent(s);
  if(r.ok){markSynced();alert("Siswa ditambahkan dan tersimpan di Google Sheets.");}
  else if(r.error==="NISN already exists"){students=students.filter(x=>x.id!==s.id);save();render();alert("Siswa ditolak karena NISN sudah ada di Google Sheets.");}
  else alert("Siswa tersimpan lokal. Sinkronisasi akan dicoba lagi.");
}

function exportCSV(){
  const rows=[["Tanggal","Waktu","NIS","Nama","Kelas","Mapel","Status","Catatan"],...filteredReports().map(a=>[a.date,a.time,a.nis,a.name,a.class,a.subject,a.status,a.note||""])];
  const csv="\\ufeff"+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\n");
  const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));link.download="absensiqu-rekap.csv";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
function printReport(){window.print();}
async function testConnection(){const u=$("#scriptUrl")?.value.trim(),box=$("#connectionStatus");if(!u){box.textContent="Masukkan URL Web App terlebih dahulu.";return;}box.textContent="Mengecek koneksi…";try{const r=await fetch(u);const d=await r.json();box.textContent=d.ok?"✓ Google Apps Script terhubung.":"⛔ Server merespons error.";}catch(e){box.textContent="⛔ Koneksi gagal. Pastikan URL /exec benar dan deployment dapat diakses.";}}
function saveSettings(){localStorage.setItem("absensiqu_script_url",$("#scriptUrl").value.trim());alert("URL Google Apps Script disimpan.");}
function addSubject(){subjects.push("Mapel Baru");render();}
function removeSubject(i){if(subjects.length<=1)return alert("Minimal satu mapel.");subjects.splice(i,1);save();render();}
function saveSubjects(){const inputs=[...document.querySelectorAll("[data-subject-index]")];subjects=inputs.map(x=>x.value.trim()).filter(Boolean);save();render();alert("Daftar mapel disimpan.");}
function toggleTheme(){document.documentElement.classList.toggle("dark");localStorage.setItem("absensiqu_theme",document.documentElement.classList.contains("dark")?"dark":"light");}
function setAdminPin(){const pin=prompt("Buat PIN admin 4–8 digit:");if(!/^\d{4,8}$/.test(pin||""))return alert("PIN harus 4–8 digit.");localStorage.setItem("absensiqu_admin_pin",pin);alert("PIN admin disimpan di perangkat ini.");}
function clearLocalData(){if(confirm("Hapus data lokal perangkat? Data Google Sheets tidak ikut terhapus.")){localStorage.removeItem("absensiqu_students");localStorage.removeItem("absensiqu_attendance");localStorage.removeItem("absensiqu_subjects");location.reload();}}
let deferredInstallPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;});
async function installApp(){if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;}else alert("Jika tombol install belum muncul, gunakan menu browser “Install app” / “Add to Home Screen”.");}

window.addEventListener("hashchange",()=>{page=location.hash.slice(1)||"dashboard";if(scanner){scanner.stop().catch(()=>{});scanner=null;}render();});
window.addEventListener("online",()=>{syncState="ok";retryPending();render();});
window.addEventListener("offline",()=>{syncState="offline";render();});
document.addEventListener("input",e=>{if(["aq","sq"].includes(e.target?.id))page==="attendance"?paintAttendance():paintStudents();if(["fromDate","toDate","reportStatus","reportSubject","reportStudent"].includes(e.target?.id))paintReports();});
document.addEventListener("change",e=>{if(["date","subject"].includes(e.target?.id))paintAttendance();if(["fromDate","toDate","reportStatus","reportSubject"].includes(e.target?.id))paintReports();});

if(localStorage.getItem("absensiqu_theme")==="dark")document.documentElement.classList.add("dark");

const qrScript=document.createElement("script");qrScript.src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";qrScript.onload=()=>{qrReady=true;if(page==="students")paintStudents();};document.head.appendChild(qrScript);
const scanScript=document.createElement("script");scanScript.src="https://unpkg.com/html5-qrcode";document.head.appendChild(scanScript);

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
render();
