/* =========================================================
 *  My Eye - tampilan
 *  Ganti API_URL dengan URL Web App Apps Script Anda (berakhiran /exec).
 * ========================================================= */
const API_URL = window.SICAPSI_API || 'https://script.google.com/macros/s/AKfycbzaetSoOz1Gwpk0J_UFbk3qH5KSKo6pBugMfk3UCh8FbV8OawMKpLGvmKesj-6SD_sdcw/exec';

let TOKEN = null, USER = null, PENG = {}, SISWA = [], DASH = null;
let boardSel = 'Kebaikan', scopeSel = 'kelas';
const BOARD_COLOR = { Kebaikan: '#16a34a', Pelanggaran: '#dc2626', Prestasi: '#d97706', 'Tidak Masuk': '#7c3aed' };
const BOARD_ICON = { Kebaikan: 'bi-heart-fill', Pelanggaran: 'bi-exclamation-triangle-fill', Prestasi: 'bi-award-fill', 'Tidak Masuk': 'bi-person-x-fill' };
const PROGRAM = {
  'Bahasa Inggris': { a1: { nama: 'Academic Achievement', opsi: ['NI', 'IP', 'A'] }, a2: { nama: 'Attitude', opsi: ['LA', 'A'] } },
  'Matematika': { a1: { nama: 'Keterlibatan Belajar', opsi: ['BB', 'MB', 'BSH'] }, a2: { nama: 'Ketepatan Capaian', opsi: ['C', 'B', 'A'] } }
};
const LEGEND = {
  'Bahasa Inggris': 'NI = Need Improvement (butuh peningkatan) · IP = In Progress (sedang berkembang) · A = Achieved (tercapai) · Attitude: LA = Less Active (kurang aktif) · A = Active (aktif)',
  'Matematika': 'Keterlibatan: BB = Belum Berkembang · MB = Mulai Berkembang · BSH = Berkembang Sesuai Harapan · Ketepatan: C = Perlu Bimbingan · B = Cukup Tepat · A = Sangat Tepat'
};
const lvCls = (n, i) => (i <= 0 ? 'lo' : (i >= n - 1 ? 'hi' : 'mid'));
const nilaiBadge = (prog, asp, v) => { const d = PROGRAM[prog]; if (!d || !v) return v ? '<span class="ind mid">' + esc(v) + '</span>' : ''; const o = d[asp].opsi; return '<span class="ind ' + lvCls(o.length, o.indexOf(v)) + '" title="' + esc(d[asp].nama) + '">' + esc(v) + '</span>'; };
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/* ---------- util ---------- */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wib = () => { const d = new Date(); const p = (o) => new Intl.DateTimeFormat('en-CA', Object.assign({ timeZone: 'Asia/Jakarta' }, o)).format(d); return { date: p({ year: 'numeric', month: '2-digit', day: '2-digit' }), time: new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(d) }; };
function tglLong(s) { if (!s) return '-'; const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return s; const d = new Date(+m[1], +m[2] - 1, +m[3]); return HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear(); }
function bulanLong(ym) { return BULAN[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4); }
function toast(msg, err) { const t = $('toast'); t.textContent = msg; t.className = 'toast-box' + (err ? ' err' : ''); t.style.display = 'block'; clearTimeout(toast._t); toast._t = setTimeout(() => { t.style.display = 'none'; }, 3500); }
function showErr(id, msg) { const e = $(id); e.textContent = msg; e.classList.remove('d-none'); }
function hideErr(id) { $(id).classList.add('d-none'); }
function modal(id) { return bootstrap.Modal.getOrCreateInstance($(id)); }
function togglePw(id, btn) { const i = $(id); i.type = i.type === 'password' ? 'text' : 'password'; btn.innerHTML = '<i class="bi ' + (i.type === 'password' ? 'bi-eye' : 'bi-eye-slash') + '"></i>'; }
function uuid() { return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()); }
const isAdmin = () => USER && USER.role === 'Super Admin';
const seesAll = () => USER && (USER.role === 'Super Admin' || USER.role === 'Kepala');
const isWali = () => USER && USER.role === 'Guru' && USER.waliKelasDari;

function callAPI(action, params) {
  return fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, params: params || [] }) })
    .then((r) => r.json())
    .then((res) => {
      if (res.status !== 'OK') { const m = res.message || 'Terjadi kesalahan.'; if (/^Sesi berakhir/.test(m) && USER) { forceLogout(m); } throw new Error(m); }
      return res.data;
    }, () => { throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet.'); });
}
const api = (action, ...p) => callAPI(action, [TOKEN].concat(p));

/* ---------- auth ---------- */
function doLogin() {
  const btn = $('lgBtn'); $('loginError').style.display = 'none'; btn.disabled = true; btn.textContent = 'Memproses…';
  callAPI('login', [$('lgUser').value.trim(), $('lgPass').value]).then((d) => {
    TOKEN = d.token; localStorage.setItem('sicapsi_token', TOKEN); enterApp(d.user, d.pengaturan);
  }).catch((e) => { $('loginError').textContent = e.message; $('loginError').style.display = 'block'; })
    .finally(() => { btn.disabled = false; btn.innerHTML = 'Masuk <i class="bi bi-arrow-right ms-1"></i>'; });
}
function doLogout() { if (TOKEN) api('logout').catch(() => {}); forceLogout(); }
function forceLogout(msg) {
  localStorage.removeItem('sicapsi_token'); TOKEN = null; USER = null;
  $('app').classList.add('d-none'); $('loginView').classList.remove('d-none'); $('lgPass').value = '';
  if (msg) { $('loginError').textContent = msg; $('loginError').style.display = 'block'; }
}
function enterApp(user, peng) {
  USER = user; PENG = peng || PENG;
  $('loginView').classList.add('d-none'); $('app').classList.remove('d-none');
  $('uName').textContent = user.nama; $('uAv').textContent = (user.nama || '?').trim().charAt(0).toUpperCase();
  $('uRole').textContent = user.role === 'Kepala' ? 'Kepala Madrasah' : (user.role === 'Guru' && user.waliKelasDari ? 'Wali Kelas ' + user.waliKelasDari : user.role);
  document.querySelectorAll('.admin-only').forEach((e) => e.classList.toggle('d-none', !isAdmin()));
  $('cfBatalWrap').classList.toggle('d-none', !seesAll());
  buildNav();
  api('listSiswa').then((l) => { SISWA = l; fillKelasSelects(); }).catch(() => {});
  go('dashboard');
}
function openPw() { ['pwOld', 'pwNew'].forEach((i) => { $(i).value = ''; }); hideErr('pwErr'); modal('mPw').show(); }
function savePw() {
  hideErr('pwErr');
  api('ubahPassword', $('pwOld').value, $('pwNew').value).then(() => { modal('mPw').hide(); toast('Password berhasil diganti.'); }).catch((e) => showErr('pwErr', e.message));
}

/* ---------- navigasi ---------- */
const MENU = [
  { id: 'dashboard', t: 'Dashboard', i: 'bi-grid-1x2-fill', ok: () => true },
  { id: 'catatan', t: 'Catatan Siswa', i: 'bi-journal-text', ok: () => true },
  { id: 'siswa', t: 'Data Siswa', i: 'bi-people-fill', ok: () => true },
  { id: 'laporan', t: 'Laporan Bulanan', i: 'bi-file-earmark-text-fill', ok: () => seesAll() || isWali() },
  { id: 'pengguna', t: 'Pengguna', i: 'bi-person-gear', ok: isAdmin },
  { id: 'log', t: 'Log Aktivitas', i: 'bi-clock-history', ok: seesAll },
  { id: 'wa', t: 'WhatsApp', i: 'bi-whatsapp', ok: () => seesAll() || isWali() },
  { id: 'pengaturan', t: 'Pengaturan', i: 'bi-gear-fill', ok: isAdmin }
];
function buildNav() {
  $('nav').innerHTML = MENU.filter((m) => m.ok()).map((m) => '<a class="nav-i" data-p="' + m.id + '" onclick="go(\'' + m.id + '\')"><i class="bi ' + m.i + '"></i>' + m.t + '</a>').join('');
}
function toggleSidebar(open) { $('sidebar').classList.toggle('open', open); $('backdrop').classList.toggle('show', open); }
function go(p) {
  toggleSidebar(false);
  document.querySelectorAll('.page').forEach((e) => e.classList.remove('active')); $('page-' + p).classList.add('active');
  document.querySelectorAll('.nav-i[data-p]').forEach((e) => e.classList.toggle('active', e.dataset.p === p));
  const m = MENU.find((x) => x.id === p); $('pageTitle').textContent = m ? m.t : '';
  window.scrollTo(0, 0);
  if (p === 'dashboard') loadDashboard();
  if (p === 'catatan') { if (!$('cfBulan').value) $('cfBulan').value = wib().date.slice(0, 7); loadCatatan(); }
  if (p === 'siswa') loadSiswa();
  if (p === 'laporan') initLaporan();
  if (p === 'pengguna') loadUsers();
  if (p === 'log') loadLog();
  if (p === 'wa') initWa();
  if (p === 'pengaturan') { loadPengaturan(); bkShowLast(); }
}
function kelasList() { return Array.from(new Set(SISWA.map((s) => s.Kelas))).sort((a, b) => String(a).localeCompare(String(b), 'id', { numeric: true })); }
function fillKelasSelects() {
  const opts = '<option value="">Semua</option>' + kelasList().map((k) => '<option>' + esc(k) + '</option>').join('');
  const keep = $('cfKelas').value; $('cfKelas').innerHTML = opts; $('cfKelas').value = keep;
  const keep2 = $('sfKelas').value; $('sfKelas').innerHTML = opts; $('sfKelas').value = keep2;
}

/* =========================================================
 *  DASHBOARD & KLASEMEN
 * ========================================================= */
function dbPeriodeChange() { $('dbCustom').classList.toggle('d-none', $('dbPeriode').value !== 'custom'); if ($('dbPeriode').value !== 'custom') loadDashboard(); }
function dbRange() {
  const v = $('dbPeriode').value, t = wib().date;
  if (v === '30') { const d = new Date(Date.now() - 29 * 86400000 + 7 * 3600000).toISOString().slice(0, 10); return { from: d, to: t }; }
  if (v === 'ta') { const y = +t.slice(0, 4), m = +t.slice(5, 7); const sy = m >= 7 ? y : y - 1; return { from: sy + '-07-01', to: (sy + 1) + '-06-30' }; }
  if (v === 'custom' && $('dbFrom').value && $('dbTo').value) return { from: $('dbFrom').value, to: $('dbTo').value };
  return {};
}
function loadDashboard() {
  api('getDashboard', dbRange()).then((d) => { DASH = d; renderDashboard(); }).catch((e) => toast(e.message, true));
}
function renderDashboard() {
  const d = DASH, k = d.kartu;
  $('dbRangeText').textContent = tglLong(d.range.from) + ' – ' + tglLong(d.range.to);
  const card = (b, cls, label) => '<div class="col-6 col-lg"><div class="stat" onclick="selBoard(\'' + b + '\')"><div class="ic ' + cls + '"><i class="bi ' + BOARD_ICON[b] + '"></i></div><div><div class="n">' + k[b].kejadian + '</div><div class="l">' + label + '</div><div class="s">' + k[b].siswa + ' siswa</div></div></div></div>';
  $('dbCards').innerHTML = card('Pelanggaran', 'bg-pel', 'Pelanggaran') + card('Kebaikan', 'bg-keb', 'Kebaikan') + card('Prestasi', 'bg-pre', 'Prestasi') + card('Tidak Masuk', 'bg-abs', 'Tidak Masuk') +
    '<div class="col-6 col-lg"><div class="stat" onclick="go(\'siswa\')"><div class="ic bg-sis"><i class="bi bi-people-fill"></i></div><div><div class="n">' + d.siswaAktif + '</div><div class="l">Siswa aktif</div><div class="s">' + d.kelasList.length + ' kelas</div></div></div></div>';
  $('dbBoardTabs').innerHTML = ['Kebaikan', 'Pelanggaran', 'Prestasi', 'Tidak Masuk'].map((b) => '<div class="tab-g ' + (b === boardSel ? 'active' : '') + '" onclick="selBoard(\'' + b + '\')">' + b + '</div>').join('');
  $('dbScopeTabs').innerHTML = [['kelas', 'Per Kelas'], ['siswa', 'Per Siswa']].map((s) => '<div class="tab-g ' + (s[0] === scopeSel ? 'active' : '') + '" onclick="selScope(\'' + s[0] + '\')">' + s[1] + '</div>').join('');
  renderRank(); renderTren(); renderTerbaru();
}
function selBoard(b) { boardSel = b; if (DASH) renderDashboard(); }
function selScope(s) { scopeSel = s; if (DASH) renderDashboard(); }
function renderRank() {
  const d = DASH, b = boardSel, col = BOARD_COLOR[b];
  let items, valFn, subFn, nameFn, noteTxt;
  if (scopeSel === 'kelas') {
    items = d.kelasRank[b].filter((x) => x.jumlah > 0);
    valFn = (x) => x.rate.toFixed(1); subFn = (x) => x.jumlah + ' kejadian · ' + x.siswaAktif + ' siswa'; nameFn = (x) => 'Kelas ' + x.kelas;
    noteTxt = 'Peringkat memakai <b>rate per 100 siswa aktif</b> (kejadian ÷ jumlah siswa × 100), sehingga adil bagi kelas besar maupun kecil.';
  } else {
    items = d.siswaRank[b];
    if (items === null) { $('dbPodium').innerHTML = ''; $('dbRankList').innerHTML = '<div class="empty"><i class="bi bi-lock-fill"></i><br>Peringkat pelanggaran siswa hanya dapat dilihat Super Admin, Kepala Madrasah, dan wali kelas (untuk kelasnya).</div>'; $('dbRankNote').innerHTML = ''; return; }
    valFn = (x) => x.jumlah; subFn = (x) => 'Kelas ' + x.kelas; nameFn = (x) => x.nama;
    noteTxt = 'Sepuluh siswa teratas pada periode ini' + (b === 'Pelanggaran' && d.pelanggaranSiswa === 'kelas' ? ' (kelas Anda saja)' : '') + '.';
  }
  if (!items.length) { $('dbPodium').innerHTML = ''; $('dbRankList').innerHTML = '<div class="empty">Belum ada catatan ' + esc(b.toLowerCase()) + ' pada periode ini.</div>'; $('dbRankNote').innerHTML = noteTxt; return; }
  const maxV = Math.max.apply(null, items.map((x) => parseFloat(valFn(x))));
  const pod = (x, i) => x ? '<div class="pod p' + (i + 1) + '"><div class="nm">' + esc(nameFn(x)) + '</div><div class="bar">' + esc(valFn(x)) + '<small>' + (scopeSel === 'kelas' ? '/100 siswa' : 'kejadian') + '</small></div></div>' : '';
  const top = items.slice(0, 3);
  $('dbPodium').innerHTML = '<div class="podium">' + [pod(top[1], 1), pod(top[0], 0), pod(top[2], 2)].join('') + '</div>';
  $('dbRankList').innerHTML = items.map((x, i) => '<div class="rank-row"><div class="rank-no">' + (i + 1) + '</div><div class="nm"><b>' + esc(nameFn(x)) + '</b><small>' + esc(subFn(x)) + '</small><div class="meter"><i style="width:' + Math.max(4, parseFloat(valFn(x)) / maxV * 100) + '%;background:' + col + '"></i></div></div><div class="rank-val">' + esc(valFn(x)) + '<small>' + (scopeSel === 'kelas' ? 'rate' : 'kali') + '</small></div></div>').join('');
  $('dbRankNote').innerHTML = noteTxt;
}
function renderTren() {
  const t = DASH.tren, W = 300, H = 150, pl = 24, pb = 22, pt = 8;
  const series = ['Kebaikan', 'Pelanggaran', 'Prestasi', 'Tidak Masuk'];
  const maxV = Math.max(1, ...t.map((m) => Math.max(...series.map((s) => m[s]))));
  const x = (i) => pl + i * ((W - pl - 8) / (t.length - 1)), y = (v) => pt + (H - pt - pb) * (1 - v / maxV);
  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Tren 6 bulan">';
  [0, .5, 1].forEach((f) => { const yy = y(maxV * f); svg += '<line x1="' + pl + '" x2="' + (W - 8) + '" y1="' + yy + '" y2="' + yy + '" stroke="#eadfbd" stroke-dasharray="3 3"/><text x="' + (pl - 4) + '" y="' + (yy + 3) + '" font-size="8" text-anchor="end" fill="#8a7a4a">' + Math.round(maxV * f) + '</text>'; });
  series.forEach((s) => {
    svg += '<polyline fill="none" stroke="' + BOARD_COLOR[s] + '" stroke-width="2.2" stroke-linejoin="round" ' + (s === 'Prestasi' ? 'stroke-dasharray="4 3"' : '') + ' points="' + t.map((m, i) => x(i) + ',' + y(m[s])).join(' ') + '"/>';
    t.forEach((m, i) => { svg += '<circle cx="' + x(i) + '" cy="' + y(m[s]) + '" r="2.4" fill="' + BOARD_COLOR[s] + '"><title>' + s + ' ' + bulanLong(m.bulan) + ': ' + m[s] + '</title></circle>'; });
  });
  t.forEach((m, i) => { svg += '<text x="' + x(i) + '" y="' + (H - 6) + '" font-size="8.5" text-anchor="middle" fill="#6b7280">' + BULAN[+m.bulan.slice(5) - 1].slice(0, 3) + '</text>'; });
  svg += '</svg><div class="d-flex flex-wrap gap-2 justify-content-center meta">' + series.map((s) => '<span><i class="bi bi-circle-fill" style="color:' + BOARD_COLOR[s] + ';font-size:8px"></i> ' + s + '</span>').join('') + '</div>';
  $('dbTren').innerHTML = svg;
}
function renderTerbaru() {
  const l = DASH.terbaru;
  $('dbTerbaru').innerHTML = l.length ? l.map((k) => '<div class="rank-row"><span class="bd ' + badgeCls(k) + '">' + esc(badgeTxt(k)) + '</span><div class="nm"><b style="font-size:12.5px">' + esc(k.siswa.map((s) => s.nama).slice(0, 3).join(', ')) + (k.siswa.length > 3 ? ' +' + (k.siswa.length - 3) : '') + '</b><small>' + esc(tglLong(k.tanggal)) + ' · ' + esc(k.pencatat) + '</small></div></div>').join('') : '<div class="empty">Belum ada catatan.</div>';
}
const badgeCls = (k) => k.subkategori === 'Prestasi' ? 'Prestasi' : (k.kategori === 'Program Sekolah' ? 'Program' : (k.kategori === 'Tidak Masuk' ? 'TidakMasuk' : k.kategori));
const badgeTxt = (k) => k.subkategori === 'Prestasi' ? 'Prestasi' : (k.kategori === 'Program Sekolah' ? 'Program · ' + k.subkategori : (k.kategori === 'Tidak Masuk' ? 'Tidak Masuk · ' + (k.subkategori || '') : k.kategori));

/* =========================================================
 *  CATATAN
 * ========================================================= */
let CATATAN = {}, selSiswa = [], selNilai = {}, ctProg = '', ctKat = '', ctReq = '', _deb;
function debounceCatatan() { clearTimeout(_deb); _deb = setTimeout(loadCatatan, 350); }
function loadCatatan() {
  const ym = $('cfBulan').value || wib().date.slice(0, 7);
  const last = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
  const f = { from: ym + '-01', to: ym + '-' + ('0' + last).slice(-2), kategori: $('cfKat').value, kelas: $('cfKelas').value, q: $('cfQ').value, status: $('cfBatal').checked ? 'Semua' : 'Aktif' };
  $('catatanList').innerHTML = '<div class="empty">Memuat…</div>';
  api('listCatatan', f).then((l) => {
    CATATAN = {}; l.forEach((k) => { CATATAN[k.kejadianId] = k; });
    $('catatanList').innerHTML = l.length ? l.map(kjCard).join('') : '<div class="empty panel">Tidak ada catatan pada bulan dan filter ini.</div>';
  }).catch((e) => { $('catatanList').innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
}
function kjCard(k) {
  const kk = k.kategori === 'Program Sekolah' ? 'Program' : (k.kategori === 'Tidak Masuk' ? 'TidakMasuk' : k.kategori);
  return '<div class="kj k-' + kk + (k.status !== 'Aktif' ? ' batal' : '') + '"><div class="d-flex flex-wrap gap-2 align-items-center mb-1"><span class="bd ' + badgeCls(k) + '">' + esc(badgeTxt(k)) + '</span>' +
    (k.status !== 'Aktif' ? '<span class="bd Batal">Dibatalkan</span>' : '') + '<span class="meta ms-auto"><i class="bi bi-calendar-event"></i>' + esc(tglLong(k.tanggal)) + (k.jam ? ' · ' + esc(k.jam) : '') + '</span></div>' +
    (k.kategori === 'Program Sekolah' ? '<div class="mb-1"><b>' + esc(k.subkategori) + '</b> &middot; Materi: ' + esc(k.materi) + '</div>' : '') +
    '<div>' + k.siswa.map((s) => '<span class="chip"><b>' + esc(s.nama) + '</b> <small>' + esc(s.kelas) + '</small>' + (s.n1 ? ' ' + nilaiBadge(k.subkategori, 'a1', s.n1) + ' ' + nilaiBadge(k.subkategori, 'a2', s.n2) : '') + '</span>').join('') + '</div>' +
    (k.uraian ? '<div class="ur">' + esc(k.uraian) + '</div>' : '') +
    (k.tindakLanjut ? '<div class="meta"><i class="bi bi-arrow-return-right"></i><b>Tindak lanjut:</b> ' + esc(k.tindakLanjut) + '</div>' : '') +
    (k.status !== 'Aktif' ? '<div class="meta text-danger"><i class="bi bi-x-circle"></i>Alasan batal: ' + esc(k.alasanBatal) + '</div>' : '') +
    '<div class="d-flex flex-wrap gap-2 align-items-center mt-2"><span class="meta">' + (k.lokasi ? '<i class="bi bi-geo-alt"></i>' + esc(k.lokasi) + ' &nbsp;' : '') + '<i class="bi bi-person"></i>' + esc(k.pencatat) + '</span>' +
    '<span class="ms-auto">' + (k.canWa && PENG.WA_Aktif === 'Ya' ? (k.waKirim ? '<span class="meta me-2"><i class="bi bi-whatsapp text-success"></i> terkirim ' + k.waKirim + '/' + k.siswa.length + '</span>' : '') + '<button class="btn btn-sm btn-outline-gold me-1" onclick="waKirimCatatan(\'' + k.kejadianId + '\')"><i class="bi bi-whatsapp"></i> Kirim ke Wali</button>' : '') + (k.canKoreksi ? '<button class="btn btn-sm btn-outline-gold me-1" onclick="openKoreksi(\'' + k.kejadianId + '\')"><i class="bi bi-pencil"></i> Koreksi</button>' : '') +
    (k.canBatal ? '<button class="btn btn-sm btn-outline-danger" onclick="openBatal(\'' + k.kejadianId + '\')"><i class="bi bi-x-circle"></i> Batalkan</button>' : '') + '</span></div></div>';
}
function openCatatan() {
  selSiswa = []; selNilai = {}; ctProg = ''; ctKat = ''; ctAbsen = ''; ctReq = uuid(); $('ctMateri').value = '';
  $('materiList').innerHTML = String(PENG.DaftarProgram || '').split(',').map((x) => x.trim()).filter(Boolean).map((x) => '<option value="' + esc(x) + '">').join('');
  ['ctUraian', 'ctTL', 'ctLokasi', 'ctCari'].forEach((i) => { $(i).value = ''; }); $('ctPrestasi').checked = false;
  const n = wib(); $('ctTgl').value = n.date; $('ctJam').value = n.time;
  $('lokasiList').innerHTML = String(PENG.DaftarLokasi || '').split(',').map((x) => '<option value="' + esc(x.trim()) + '">').join('');
  setKat(''); renderChips(); $('ctPicker').classList.add('d-none'); hideErr('ctErr'); modal('mCatatan').show();
}
let ctAbsen = '';
function setAbsen(a) { ctAbsen = a; document.querySelectorAll('#ctAbsen .opt').forEach((e) => e.classList.toggle('on', e.dataset.a === a)); }
function setKat(k) {
  ctKat = k; if (k !== 'Tidak Masuk') setAbsen('');
  $('ctAbsenWrap').classList.toggle('d-none', k !== 'Tidak Masuk'); $('ctMateriWrap').classList.toggle('d-none', k !== 'Program Sekolah'); renderChips(); $('ctUraianReq').classList.toggle('d-none', k === 'Tidak Masuk' || k === 'Program Sekolah'); $('ctUraianOpt').classList.toggle('d-none', k !== 'Tidak Masuk' && k !== 'Program Sekolah');
  document.querySelectorAll('#ctKat .opt').forEach((e) => e.classList.toggle('on', e.dataset.k === k));
  $('ctPrestasiWrap').classList.toggle('d-none', k !== 'Kebaikan');
}
function renderPicker() {
  const q = $('ctCari').value.trim().toLowerCase(), box = $('ctPicker');
  if (!q) { box.classList.add('d-none'); return; }
  const ids = new Set(selSiswa.map((s) => s.SiswaID));
  const m = SISWA.filter((s) => !ids.has(s.SiswaID) && (String(s.Nama).toLowerCase().includes(q) || String(s.NIS).toLowerCase().includes(q) || String(s.Kelas).toLowerCase() === q)).slice(0, 30);
  box.innerHTML = m.length ? m.map((s) => '<div class="picker-item" onclick="addSiswa(\'' + s.SiswaID + '\')"><span>' + esc(s.Nama) + '</span><small>Kelas ' + esc(s.Kelas) + (s.NIS ? ' · ' + esc(s.NIS) : '') + '</small></div>').join('') : '<div class="empty">Siswa tidak ditemukan.</div>';
  box.classList.remove('d-none');
}
function addSiswa(id) { const s = SISWA.find((x) => x.SiswaID === id); if (s) selSiswa.push(s); $('ctCari').value = ''; $('ctPicker').classList.add('d-none'); renderChips(); }
function delSiswa(id) { selSiswa = selSiswa.filter((s) => s.SiswaID !== id); renderChips(); }
function setProg(p) { ctProg = p; selNilai = {}; document.querySelectorAll('#ctProg .opt').forEach((e) => e.classList.toggle('on', e.dataset.p === p)); renderChips(); }
function setNilai(id, asp, v) { (selNilai[id] = selNilai[id] || {})[asp] = v; renderChips(); }
function setNilaiAll(asp, v) { selSiswa.forEach((s) => { (selNilai[s.SiswaID] = selNilai[s.SiswaID] || {})[asp] = v; }); renderChips(); }
function renderChips() {
  if (!selSiswa.length) { $('ctChips').innerHTML = '<span class="meta">Belum ada siswa dipilih.</span>'; return; }
  if (ctKat !== 'Program Sekolah') { $('ctChips').innerHTML = selSiswa.map((s) => '<span class="chip"><b>' + esc(s.Nama) + '</b> <small>' + esc(s.Kelas) + '</small><button onclick="delSiswa(\'' + s.SiswaID + '\')" aria-label="Hapus">&times;</button></span>').join(''); return; }
  const d = PROGRAM[ctProg];
  if (!d) { $('ctChips').innerHTML = selSiswa.map((s) => '<span class="chip"><b>' + esc(s.Nama) + '</b> <small>' + esc(s.Kelas) + '</small><button onclick="delSiswa(\'' + s.SiswaID + '\')" aria-label="Hapus">&times;</button></span>').join('') + '<div class="meta mt-1">Pilih program di atas untuk mengisi penilaian.</div>'; return; }
  const row = (id, asp) => '<div class="ind-pick"><span class="asp">' + esc(d[asp].nama) + '</span>' + d[asp].opsi.map((o, i) => '<button type="button" class="' + lvCls(d[asp].opsi.length, i) + ((selNilai[id] || {})[asp === 'a1' ? 'n1' : 'n2'] === o ? ' on' : '') + '" onclick="setNilai(\'' + id + '\',\'' + (asp === 'a1' ? 'n1' : 'n2') + '\',\'' + o + '\')">' + o + '</button>').join('') + '</div>';
  const all = (asp, key) => '<div class="meta mb-1">Samakan semua &ndash; ' + esc(d[asp].nama) + ': ' + d[asp].opsi.map((o) => '<button type="button" class="btn btn-sm btn-outline-gold py-0 me-1" onclick="setNilaiAll(\'' + key + '\',\'' + o + '\')">' + o + '</button>').join('') + '</div>';
  $('ctChips').innerHTML = all('a1', 'n1') + all('a2', 'n2') +
    selSiswa.map((s) => '<div class="border rounded p-2 mb-1" style="background:#fffdf6"><div><b>' + esc(s.Nama) + '</b> <small class="text-muted">' + esc(s.Kelas) + '</small><button class="btn btn-sm text-danger float-end p-0" onclick="delSiswa(\'' + s.SiswaID + '\')" aria-label="Hapus">&times;</button></div>' + row(s.SiswaID, 'a1') + row(s.SiswaID, 'a2') + '</div>').join('');
}
function saveCatatan() {
  hideErr('ctErr');
  if (!ctKat) return showErr('ctErr', 'Pilih kategori catatan.');
  if (ctKat === 'Tidak Masuk' && !ctAbsen) return showErr('ctErr', 'Pilih jenis ketidakhadiran: Sakit, Izin, atau Alpa.');
  if (ctKat === 'Program Sekolah') {
    if (!ctProg) return showErr('ctErr', 'Pilih program: Bahasa Inggris atau Matematika.');
    if (!$('ctMateri').value.trim()) return showErr('ctErr', 'Isi materi / kode pelajaran yang diajarkan.');
    if (selSiswa.some((s) => !(selNilai[s.SiswaID] || {}).n1 || !(selNilai[s.SiswaID] || {}).n2)) return showErr('ctErr', 'Isi kedua penilaian untuk setiap siswa.');
  }
  const btn = $('ctSave'); btn.disabled = true;
  api('createCatatan', { kategori: ctKat, subkategori: ctKat === 'Tidak Masuk' ? ctAbsen : ($('ctPrestasi').checked ? 'Prestasi' : 'Umum'), siswaIds: selSiswa.map((s) => s.SiswaID), tanggal: $('ctTgl').value, jam: $('ctJam').value,
    lokasi: $('ctLokasi').value, uraian: $('ctUraian').value, tindakLanjut: $('ctTL').value, requestId: ctReq, materi: $('ctMateri').value, program: ctProg, nilai: selNilai })
    .then((r) => { modal('mCatatan').hide(); toast('Catatan tersimpan.' + (r && r.wa ? (r.wa.dilewati ? ' WA otomatis dilewati (lebih dari 10 siswa); kirim manual.' : ' WA ke wali: ' + r.wa.terkirim + ' terkirim' + (r.wa.gagal ? ', ' + r.wa.gagal + ' gagal' : '') + '.') : '')); if ($('page-catatan').classList.contains('active')) loadCatatan(); else go('catatan'); })
    .catch((e) => showErr('ctErr', e.message)).finally(() => { btn.disabled = false; });
}
function openKoreksi(id) {
  const k = CATATAN[id]; if (!k) return;
  $('kxId').value = id; $('kxTgl').value = k.tanggal; $('kxJam').value = k.jam; $('kxLokasi').value = k.lokasi; $('kxUraian').value = k.uraian; $('kxTL').value = k.tindakLanjut; $('kxAlasan').value = '';
  hideErr('kxErr'); modal('mKoreksi').show();
}
function saveKoreksi() {
  hideErr('kxErr');
  api('koreksiCatatan', $('kxId').value, { tanggal: $('kxTgl').value, jam: $('kxJam').value, lokasi: $('kxLokasi').value, uraian: $('kxUraian').value, tindakLanjut: $('kxTL').value }, $('kxAlasan').value)
    .then(() => { modal('mKoreksi').hide(); toast('Koreksi tersimpan dan tercatat di Log.'); loadCatatan(); }).catch((e) => showErr('kxErr', e.message));
}
function openBatal(id) { $('btId').value = id; $('btAlasan').value = ''; hideErr('btErr'); modal('mBatal').show(); }
function saveBatal() {
  hideErr('btErr');
  api('batalkanCatatan', $('btId').value, $('btAlasan').value).then(() => { modal('mBatal').hide(); toast('Catatan dibatalkan.'); loadCatatan(); }).catch((e) => showErr('btErr', e.message));
}

/* =========================================================
 *  SISWA
 * ========================================================= */
function loadSiswa() {
  api('listSiswa', { semua: isAdmin() }).then((l) => { SISWA = l.filter((s) => s.Status === 'Aktif'); window.SISWA_ALL = l; fillKelasSelects(); renderSiswa(); }).catch((e) => toast(e.message, true));
}
function renderSiswa() {
  const all = window.SISWA_ALL || SISWA, kl = $('sfKelas').value, q = $('sfQ').value.trim().toLowerCase();
  const wa = seesAll();
  $('siswaHead').innerHTML = '<tr><th>NIS</th><th>Nama</th><th>Kelas</th><th>L/P</th>' + (wa ? '<th>Wali</th><th>WhatsApp</th>' : '') + '<th>Status</th>' + (isAdmin() ? '<th></th>' : '') + '</tr>';
  const l = all.filter((s) => (!kl || s.Kelas === kl) && (!q || String(s.Nama).toLowerCase().includes(q) || String(s.NIS).includes(q)));
  $('siswaBody').innerHTML = l.length ? l.map((s) => '<tr><td>' + esc(s.NIS) + '</td><td><b>' + esc(s.Nama) + '</b></td><td>' + esc(s.Kelas) + '</td><td>' + (s.JenisKelamin === 'Perempuan' ? 'P' : 'L') + '</td>' +
    (wa ? '<td>' + esc(s.NamaWali) + '</td><td>' + (s.WhatsAppWali ? '+' + esc(s.WhatsAppWali) : '') + '</td>' : '') + '<td>' + esc(s.Status) + '</td>' +
    (isAdmin() ? '<td class="text-end"><button class="btn btn-sm btn-outline-gold" onclick="openSiswa(\'' + s.SiswaID + '\')"><i class="bi bi-pencil"></i></button></td>' : '') + '</tr>').join('') :
    '<tr><td colspan="9" class="empty">Belum ada data siswa. ' + (isAdmin() ? 'Impor dari Excel atau tambah manual.' : '') + '</td></tr>';
}
function openSiswa(id) {
  const s = id ? (window.SISWA_ALL || []).find((x) => x.SiswaID === id) : null;
  $('msTitle').textContent = s ? 'Ubah Siswa' : 'Tambah Siswa'; $('msId').value = s ? s.SiswaID : '';
  $('msNis').value = s ? s.NIS : ''; $('msKelas').value = s ? s.Kelas : ''; $('msNama').value = s ? s.Nama : ''; $('msJk').value = s ? s.JenisKelamin : 'Laki-laki';
  $('msStatus').value = s ? s.Status : 'Aktif'; $('msWali').value = s ? s.NamaWali : ''; $('msWa').value = s && s.WhatsAppWali ? String(s.WhatsAppWali).replace(/^62/, '') : '';
  $('msStatus').disabled = !s; hideErr('msErr'); modal('mSiswa').show();
}
function saveSiswa() {
  hideErr('msErr');
  const d = { SiswaID: $('msId').value, NIS: $('msNis').value, Kelas: $('msKelas').value, Nama: $('msNama').value, JenisKelamin: $('msJk').value, NamaWali: $('msWali').value, WhatsAppWali: $('msWa').value };
  const st = $('msStatus').value;
  api('saveSiswa', d).then((r) => (d.SiswaID && st ? api('setStatusSiswa', d.SiswaID, st) : null)).then(() => { modal('mSiswa').hide(); toast('Data siswa tersimpan.'); loadSiswa(); }).catch((e) => showErr('msErr', e.message));
}
function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([['NIS', 'Nama', 'Kelas', 'JenisKelamin', 'NamaWali', 'WhatsAppWali'], ['1234567890', 'Contoh Siswa', '5A', 'L', 'Nama Wali', '81234567890']]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Siswa'); XLSX.writeFile(wb, 'template-siswa-sicapsi.xlsx');
}
function importSiswa(inp) {
  const f = inp.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const wb = XLSX.read(rd.result, { type: 'array' }); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
      const pick = (r, names) => { for (const k of Object.keys(r)) if (names.includes(k.toLowerCase().replace(/[\s_]/g, ''))) return r[k]; return ''; };
      const data = rows.map((r) => ({ NIS: pick(r, ['nis', 'nisn']), Nama: pick(r, ['nama', 'namasiswa', 'namalengkap']), Kelas: pick(r, ['kelas', 'rombel']), JenisKelamin: pick(r, ['jeniskelamin', 'jk', 'l/p']),
        NamaWali: pick(r, ['namawali', 'wali', 'orangtua']), WhatsAppWali: pick(r, ['whatsappwali', 'whatsapp', 'wa', 'nohp', 'hpwali']) }));
      if (!data.length) throw new Error('File kosong.');
      if (!confirm('Impor ' + data.length + ' baris siswa? Siswa dengan NIS yang sama akan diperbarui.')) return;
      api('bulkSaveSiswa', data).then((r) => { toast('Impor selesai: ' + r.created + ' baru, ' + r.updated + ' diperbarui, ' + r.skipped + ' dilewati.'); if (r.errors.length) alert(r.errors.slice(0, 15).join('\n')); loadSiswa(); }).catch((e) => toast(e.message, true));
    } catch (e) { toast('File tidak dapat dibaca: ' + e.message, true); }
    inp.value = '';
  };
  rd.readAsArrayBuffer(f);
}

/* =========================================================
 *  LAPORAN BULANAN
 * ========================================================= */
function initLaporan() {
  if (!$('lpBulan').value) $('lpBulan').value = wib().date.slice(0, 7);
  fillLpTa();
  api('listSiswa').then((l) => {
    SISWA = l; const ks = isWali() && !seesAll() ? [USER.waliKelasDari] : kelasList();
    $('lpKelas').innerHTML = ks.map((k) => '<option>' + esc(k) + '</option>').join(''); fillLpSiswa();
  });
}
function fillLpTa() {
  const m = String(PENG.TahunAjaran || '').match(/^(\d{4})\/(\d{4})$/), y = m ? +m[1] : new Date().getFullYear(), keep = $('lpTa').value;
  $('lpTa').innerHTML = [y - 1, y, y + 1].map((a) => '<option value="' + a + '/' + (a + 1) + '">' + a + '/' + (a + 1) + '</option>').join(''); $('lpTa').value = keep || (y + '/' + (y + 1));
}
function lpJenisChange() { const sem = $('lpJenis').value !== 'bulan'; $('lpBulanWrap').classList.toggle('d-none', sem); $('lpTaWrap').classList.toggle('d-none', !sem); }
function lpPeriode() { const j = $('lpJenis').value; return j === 'bulan' ? $('lpBulan').value : j + ':' + $('lpTa').value; }
function periodeLabel(r) { return r.periode ? r.periode.label : bulanLong(r.bulan); }
function fillLpSiswa() {
  const k = $('lpKelas').value;
  $('lpSiswa').innerHTML = '<option value="">Semua siswa kelas ' + esc(k) + '</option>' + SISWA.filter((s) => s.Kelas === k).map((s) => '<option value="' + s.SiswaID + '">' + esc(s.Nama) + '</option>').join('');
}
let LP_LAST = [];
function downloadLaporanXls() {
  if (!LP_LAST.length) return toast('Tampilkan laporan terlebih dahulu.', true);
  if (typeof XLSX === 'undefined') return toast('Pustaka Excel belum termuat. Periksa internet lalu coba lagi.', true);
  const rekap = [['Nama', 'NIS', 'Kelas', 'Periode', 'Pelanggaran', 'Kebaikan', 'Prestasi', 'Tidak Masuk', 'Sakit', 'Izin', 'Alpa', 'Penilaian Program (kali)', 'Peringkat Kebaikan (kelas)', 'Peringkat Prestasi (kelas)', 'Peringkat Pelanggaran (kelas)', 'Peringkat Tidak Masuk (kelas)']];
  const det = [['Nama', 'NIS', 'Kelas', 'Kategori', 'Jenis / Program', 'Materi', 'Nilai 1', 'Nilai 2', 'Tanggal', 'Jam', 'Lokasi', 'Uraian', 'Tindak lanjut', 'Pencatat']], per = [['Nama', 'Kelas', 'Bulan', 'Pelanggaran', 'Kebaikan', 'Prestasi', 'Penilaian Program', 'Sakit', 'Izin', 'Alpa']];
  LP_LAST.forEach((r) => {
    const sg = r.siswa, s = r.ringkasan, pk = r.peringkat || {}, rk = (b) => (pk[b] ? pk[b].kelasRank : '');
    rekap.push([sg.nama, sg.nis, sg.kelas, periodeLabel(r), s.Pelanggaran, s.Kebaikan, s.Prestasi, s['Tidak Masuk'], s.Sakit, s.Izin, s.Alpa, s['Program Sekolah'], rk('Kebaikan'), rk('Prestasi'), rk('Pelanggaran'), rk('Tidak Masuk')]);
    ['Pelanggaran', 'Kebaikan', 'Program Sekolah', 'Tidak Masuk'].forEach((k) => (r[k] || []).forEach((x) => det.push([sg.nama, sg.nis, sg.kelas, k === 'Kebaikan' && x.prestasi ? 'Kebaikan (Prestasi)' : k, x.jenis || '', x.materi || '', x.n1 || '', x.n2 || '', x.tanggal, x.jam, x.lokasi, x.uraian, x.tindakLanjut, x.pencatat])));
    (r.rekapBulan || []).forEach((m) => per.push([sg.nama, sg.kelas, bulanLong(m.bulan), m.Pelanggaran, m.Kebaikan, m.Prestasi, m['Program Sekolah'], m.Sakit, m.Izin, m.Alpa]));
  });
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rekap), 'Rekap'); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(det), 'Catatan Lengkap');
  if (per.length > 1) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(per), 'Per Bulan');
  XLSX.writeFile(wb, 'laporan-' + LP_LAST[0].siswa.kelas + '-' + String(LP_LAST[0].bulan).replace(/[:\/]/g, '-') + '.xlsx');
}
function loadLaporan() {
  const periode = lpPeriode(); if (!periode) return toast('Pilih periode laporan.', true);
  const sid = $('lpSiswa').value;
  $('reportArea').innerHTML = '<div class="empty">Menyusun laporan…</div>';
  (sid ? api('getLaporanSiswa', sid, periode).then((r) => [r]) : api('getLaporanKelas', $('lpKelas').value, periode)).then((list) => {
    $('reportArea').innerHTML = list.length ? list.map(reportHtml).join('') + '<aside>' + devHtml('dev-print') + '</aside>' : '<div class="empty panel">Tidak ada siswa aktif di kelas ini.</div>';
    LP_LAST = list; document.querySelectorAll('.lp-dl').forEach((b) => b.classList.toggle('d-none', !list.length));
  }).catch((e) => { $('reportArea').innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
}
function rpTable(rows, withPrestasi) {
  if (!rows.length) return '<div class="rp-none">Tidak ada catatan pada periode ini.</div>';
  return '<table class="rp-tbl"><thead><tr><th style="width:17%">Tanggal / Jam</th><th style="width:14%">Lokasi</th><th>Uraian kejadian</th><th style="width:22%">Tindak lanjut</th><th style="width:13%">Pencatat</th></tr></thead><tbody>' +
    rows.map((r) => '<tr><td>' + esc(tglLong(r.tanggal)) + (r.jam ? '<br>' + esc(r.jam) : '') + '</td><td>' + esc(r.lokasi) + '</td><td>' + (withPrestasi && r.prestasi ? '<b>[Prestasi]</b> ' : '') + esc(r.uraian) + '</td><td>' + esc(r.tindakLanjut) + '</td><td>' + esc(r.pencatat) + '</td></tr>').join('') + '</tbody></table>';
}
function progChart(P) {
  if (!P.opsi2.length) return '';
  let pts = P.harian.map((h) => ({ x: h.tanggal.slice(8, 10) + '/' + h.tanggal.slice(5, 7), a: h.s1 / P.opsi1.length, b: h.s2 / P.opsi2.length }));
  if (P.harian.length > 24) {
    const g = {}, o = []; P.harian.forEach((h) => { const k = h.tanggal.slice(0, 7); if (!g[k]) { g[k] = []; o.push(k); } g[k].push(h); });
    pts = o.map((k) => ({ x: BULAN[+k.slice(5, 7) - 1].slice(0, 3), a: g[k].reduce((t, h) => t + h.s1 / P.opsi1.length, 0) / g[k].length, b: g[k].reduce((t, h) => t + h.s2 / P.opsi2.length, 0) / g[k].length }));
  }
  const W = 520, H = 150, L = 34, R = 10, T = 12, B = 24, n = pts.length, X = (i) => L + (n === 1 ? (W - L - R) / 2 : i * (W - L - R) / (n - 1)), Y = (v) => T + (1 - v) * (H - T - B);
  const line = (key, col) => '<polyline fill="none" stroke="' + col + '" stroke-width="2" points="' + pts.map((p, i) => X(i).toFixed(1) + ',' + Y(p[key]).toFixed(1)).join(' ') + '"/>' + pts.map((p, i) => '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(p[key]).toFixed(1) + '" r="3" fill="' + col + '"/>').join('');
  const step = Math.ceil(n / 10);
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-height:150px;margin:4px 0"><rect x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '" fill="#fafafa" stroke="#ccc"/>' +
    [0, 0.5, 1].map((v) => '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#ddd" stroke-dasharray="3 3"/>').join('') +
    '<text x="' + (L - 4) + '" y="' + (T + 4) + '" font-size="9" text-anchor="end" fill="#555">Tinggi</text><text x="' + (L - 4) + '" y="' + (H - B) + '" font-size="9" text-anchor="end" fill="#555">Rendah</text>' +
    line('a', '#2563eb') + line('b', '#d97706') + pts.map((p, i) => (i % step === 0 ? '<text x="' + X(i).toFixed(1) + '" y="' + (H - 8) + '" font-size="9" text-anchor="middle" fill="#555">' + esc(p.x) + '</text>' : '')).join('') + '</svg>' +
    '<div style="font-size:9.5px"><b style="color:#2563eb">&#9632;</b> ' + esc(P.a1) + ' &nbsp; <b style="color:#d97706">&#9632;</b> ' + esc(P.a2) + (P.harian.length > 24 ? ' &nbsp; (rata-rata per bulan)' : '') + '</div>';
}
function rpProgram(r) {
  const l = r.program || [];
  if (!l.length) return '<div class="rp-none">Belum ada penilaian program unggulan pada periode ini.</div>';
  return l.map((P) => {
    const rk = (o, m) => o.length ? o.map((k) => esc(k) + ' <b>' + (m[k] || 0) + '</b>').join(' &middot; ') : Object.keys(m).map((k) => esc(k) + ' <b>' + m[k] + '</b>').join(' &middot; ');
    return '<div class="pm-box"><b>Program ' + esc(P.program) + '</b> &mdash; Daily Achievement Checklist (' + P.harian.length + ' pertemuan)</div>' +
      '<table class="rp-tbl"><thead><tr><th style="width:15%">Hari / Tanggal</th><th style="width:26%">Materi / Kode pelajaran</th><th style="width:11%">' + esc(P.a1) + '</th>' + (P.a2 ? '<th style="width:11%">' + esc(P.a2) + '</th>' : '') + '<th>Catatan guru pendamping</th></tr></thead><tbody>' +
      P.harian.map((h) => '<tr><td>' + esc(tglLong(h.tanggal)) + '</td><td>' + esc(h.materi) + '</td><td style="text-align:center">' + nilaiBadge(P.program, 'a1', h.n1) + '</td>' + (P.a2 ? '<td style="text-align:center">' + nilaiBadge(P.program, 'a2', h.n2) + '</td>' : '') + '<td>' + esc(h.uraian) + (h.pendamping ? '<br><span style="font-size:9px;color:#777">' + esc(h.pendamping) + '</span>' : '') + '</td></tr>').join('') + '</tbody></table>' +
      '<div class="pm-box"><b>Monthly Progress Report</b><br>' + esc(P.a1) + ': ' + rk(P.opsi1, P.rekap1) + (P.a2 ? '<br>' + esc(P.a2) + ': ' + rk(P.opsi2, P.rekap2) : '') + '</div>' + progChart(P) +
      (LEGEND[P.program] ? '<div style="font-size:9px;color:#666">' + esc(LEGEND[P.program]) + '</div>' : '') +
      '<div class="rp-sign" style="margin-top:6px"><div>Guru Pendamping<div class="sp" style="height:26px"></div>(................)</div><div>Orang Tua / Wali<div class="sp" style="height:26px"></div>(................)</div></div>';
  }).join('') + '<div style="font-size:9px;color:#666;margin-top:2px">Program unggulan tidak dihitung dalam peringkat/klasemen.</div>';
}
function rpAbsen(rows) {
  if (!rows.length) return '<div class="rp-none">Tidak ada catatan tidak masuk pada periode ini.</div>';
  return '<table class="rp-tbl"><thead><tr><th style="width:26%">Tanggal</th><th style="width:12%">Jenis</th><th>Keterangan</th><th style="width:18%">Pencatat</th></tr></thead><tbody>' +
    rows.map((r) => '<tr><td>' + esc(tglLong(r.tanggal)) + '</td><td><b>' + esc(r.jenis) + '</b></td><td>' + (r.uraian && r.uraian !== r.jenis ? esc(r.uraian) : '-') + '</td><td>' + esc(r.pencatat) + '</td></tr>').join('') + '</tbody></table>';
}
function rpSemester(r) {
  const k = ['Pelanggaran', 'Kebaikan', 'Prestasi', 'Program Sekolah', 'Sakit', 'Izin', 'Alpa'], tot = {}; k.forEach((x) => { tot[x] = 0; });
  const body = r.rekapBulan.map((m) => { k.forEach((x) => { tot[x] += m[x]; }); return '<tr><td style="text-align:left">' + esc(bulanLong(m.bulan)) + '</td>' + k.map((x) => '<td>' + m[x] + '</td>').join('') + '</tr>'; }).join('');
  return '<div class="rp-sec" style="background:#444">Rekap per bulan (' + esc(r.periode.label) + ')</div><table class="rp-sem"><thead><tr><th>Bulan</th><th>Pelang-<br>garan</th><th>Kebaikan</th><th>Prestasi</th><th>Penilaian<br>Program</th><th>Sakit</th><th>Izin</th><th>Alpa</th></tr></thead><tbody>' + body +
    '<tr class="tot"><td style="text-align:left">Jumlah semester</td>' + k.map((x) => '<td>' + tot[x] + '</td>').join('') + '</tr></tbody></table>';
}
function rankBox(r) {
  const pk = r.peringkat; if (!pk) return '';
  const defs = [['Kebaikan', 'Kebaikan', '#15803d', false], ['Prestasi', 'Prestasi', '#b45309', false], ['Pelanggaran', 'Pelanggaran', '#b91c1c', true], ['Tidak Masuk', 'Tidak Masuk', '#6d28d9', true]];
  const cell = (d) => {
    const x = pk[d[0]]; if (!x) return '';
    const kosong = x.jumlah === 0;
    return '<div class="cell" style="--cc:' + d[2] + '"><div class="l">' + d[1] + '</div><div class="n">' + (kosong ? (d[3] ? '&#10003;' : '&ndash;') : '#' + x.kelasRank) + '</div>' +
      '<div class="d">' + (kosong ? (d[3] ? 'Tidak ada catatan' : 'Belum ada catatan') : 'dari ' + x.kelasTotal + ' siswa kelas') + '</div>' +
      '<div class="j">Sekolah: <b>' + (kosong ? '-' : '#' + x.sekolahRank) + '</b> dari ' + x.sekolahTotal + '<br><b>' + x.jumlah + '</b> catatan</div></div>';
  };
  return '<div class="rp-rank"><div class="ttl">&#9733; PERINGKAT ' + esc(String(r.siswa.nama).toUpperCase()) + ' &#9733;</div><div class="cells">' + defs.map(cell).join('') + '</div>' +
    '<div class="nt">Periode ' + esc(r.periode.label) + '. Kebaikan dan Prestasi: peringkat 1 = catatan terbanyak (terbaik). Pelanggaran dan Tidak Masuk: peringkat 1 = catatan terbanyak (paling perlu perhatian). Jumlah catatan sama = peringkat sama.</div></div>';
}
const DEV_COLORS = ['#ff1744', '#ff9100', '#00c853', '#2979ff', '#d500f9'];
function devHtml(cls) {
  let i = 0;
  const nm = 'Edoy D Hagane'.split('').map((c) => (c === ' ' ? ' ' : '<span style="color:' + DEV_COLORS[i++ % 5] + '">' + c + '</span>')).join('');
  return '<div class="dev ' + (cls || '') + '"><small>Aplikasi dikembangkan oleh</small><b>' + nm + '</b></div>';
}
function reportHtml(r) {
  const p = r.pengaturan || {}, s = r.ringkasan, sg = r.siswa, cetak = tglLong(wib().date), sem = r.periode.jenis === 'semester';
  return '<div class="report-page"><div class="rp-head"><img src="logo-madrasah.png" alt="Logo madrasah"><div class="t"><div class="m">' + esc(p.NamaMadrasah) + '</div><div class="a">' + esc(p.AlamatMadrasah) + '</div></div><div style="width:64px"></div></div>' +
    '<div class="rp-title">LAPORAN PERKEMBANGAN SISWA</div><div class="rp-per">Periode: ' + esc(r.periode.label) + ' &middot; Tahun ajaran ' + esc(r.periode.ta || sg.tahunAjaran || p.TahunAjaran) + '</div>' +
    '<table class="rp-id"><tr><td>Nama siswa</td><td>: <b>' + esc(sg.nama) + '</b></td><td>Kelas</td><td>: ' + esc(sg.kelas) + '</td></tr><tr><td>NIS</td><td>: ' + esc(sg.nis) + '</td><td>Wali kelas</td><td>: ' + esc(r.waliKelas || '-') + '</td></tr></table>' +
    rankBox(r) +
    '<div class="rp-sum"><div><b>' + s.Pelanggaran + '</b>Pelanggaran</div><div><b>' + s.Kebaikan + '</b>Kebaikan</div><div><b>' + s.Prestasi + '</b>Prestasi</div><div><b>' + s['Tidak Masuk'] + '</b>Tidak Masuk<br><span style="font-size:9px">S ' + s.Sakit + ' &middot; I ' + s.Izin + ' &middot; A ' + s.Alpa + '</span></div><div><b>' + s['Program Sekolah'] + '</b>Penilaian Program<br><span style="font-size:9px">' + (s.ProgramRinci || []).map((x) => esc(x.program) + ' ' + x.jumlah).join(' &middot; ') + '</span></div></div>' +
    (sem ? rpSemester(r) : '') +
    '<div class="rp-sec Pelanggaran">A. Pelanggaran</div>' + rpTable(r.Pelanggaran) +
    '<div class="rp-sec Kebaikan">B. Kebaikan</div>' + rpTable(r.Kebaikan, true) +
    '<div class="rp-sec Program">C. Program Unggulan &ndash; Perkembangan Siswa</div>' + rpProgram(r) +
    '<div class="rp-sec TidakMasuk">D. Catatan Tidak Masuk (Sakit / Izin / Alpa)</div>' + rpAbsen(r['Tidak Masuk']) +
    '<div class="rp-sec" style="background:#444">Catatan wali kelas</div><div class="rp-note" contenteditable="true" spellcheck="false"></div>' +
    '<div class="rp-sign"><div>Wali Kelas<div class="sp"></div><b>' + esc(r.waliKelas || '................') + '</b></div><div>Orang Tua / Wali<div class="sp"></div>(................)</div><div>Kepala Madrasah<div class="sp"></div><b>' + esc(p.NamaKepala || '................') + '</b>' + (p.NIPKepala ? '<br>NIP. ' + esc(p.NIPKepala) : '') + '</div></div>' +
    '<div style="font-size:9.5px;color:#777;margin-top:8px">Dicetak ' + esc(cetak) + ' &middot; My Eye</div>' + '<div class="rp-dev">' + devHtml() + '</div></div>';
}

/* =========================================================
 *  BACKUP & PULIHKAN
 * ========================================================= */
let BK_DATA = null;
function saveFile(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
function bkNama(tag) { const n = wib(); return 'backup-myeye' + (tag ? '-' + tag : '') + '-' + n.date + '-' + n.time.replace(':', '') + '.json'; }
function downloadBackup(tag) {
  toast('Menyiapkan backup…');
  return api('backupData').then((d) => {
    saveFile(bkNama(tag), JSON.stringify(d));
    const n = Object.keys(d.sheets).reduce((a, k) => a + d.sheets[k].rows.length, 0);
    try { localStorage.setItem('myeye_bk', wib().date + ' ' + wib().time + ' (' + n + ' baris)'); } catch (e) {}
    bkShowLast(); toast('Backup diunduh (' + n + ' baris data).'); return d;
  }).catch((e) => { toast(e.message, true); throw e; });
}
function bkShowLast() { let v = ''; try { v = localStorage.getItem('myeye_bk') || ''; } catch (e) {} $('bkLast').textContent = v ? 'Backup terakhir diunduh dari perangkat ini: ' + v : 'Belum ada backup yang diunduh dari perangkat ini.'; }
function bkPilih() {
  const f = $('bkFile').files[0]; BK_DATA = null; $('bkBtn').disabled = true; $('bkInfo').textContent = '';
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const d = JSON.parse(rd.result); if (d.app !== 'MyEye' || !d.sheets) throw new Error('x');
      BK_DATA = d; const n = Object.keys(d.sheets).reduce((a, k) => a + (d.sheets[k].rows || []).length, 0);
      $('bkInfo').innerHTML = '<b>Berkas valid.</b> Dibuat ' + esc(d.waktu || '-') + ' &middot; ' + esc(d.madrasah || '') + ' &middot; ' + n + ' baris (siswa ' + ((d.sheets.Siswa || { rows: [] }).rows.length) + ', catatan ' + ((d.sheets.Catatan || { rows: [] }).rows.length) + ').'; $('bkBtn').disabled = false;
    } catch (e) { $('bkInfo').innerHTML = '<span class="text-danger">Berkas bukan backup My Eye yang valid.</span>'; }
  };
  rd.readAsText(f);
}
function restoreBackup() {
  if (!BK_DATA) return;
  const k = prompt('PERHATIAN: semua data saat ini akan diganti dengan backup tanggal ' + (BK_DATA.waktu || '-') + '.\n\nKetik PULIHKAN untuk melanjutkan:'); if (k !== 'PULIHKAN') return toast('Pemulihan dibatalkan.', true);
  $('bkBtn').disabled = true;
  downloadBackup('sebelum-pulih').catch(() => null).then((ok) => {
    if (!ok && !confirm('Backup pengaman gagal diunduh. Tetap lanjutkan memulihkan?')) { $('bkBtn').disabled = false; return; }
    toast('Memulihkan data…');
    return api('restoreData', BK_DATA, 'PULIHKAN').then((r) => { toast('Berhasil dipulihkan: ' + r.baris + ' baris. Memuat ulang…'); setTimeout(() => location.reload(), 1800); });
  }).catch((e) => { toast(e.message, true); $('bkBtn').disabled = false; });
}
function injectDev() { document.querySelectorAll('.dev-slot').forEach((e) => { e.innerHTML = devHtml(); }); }

/* =========================================================
 *  PENGGUNA, LOG, PENGATURAN
 * ========================================================= */
let USERS = [];
function loadUsers() {
  api('listUsers').then((l) => { USERS = l; $('userBody').innerHTML = l.map((u) => '<tr><td><b>' + esc(u.Nama) + '</b></td><td>' + esc(u.Username) + '</td><td>' + esc(u.Role) + '</td><td>' + esc(u.WaliKelasDari || '-') + '</td><td>' + esc(u.Status) + '</td><td class="text-end"><button class="btn btn-sm btn-outline-gold" onclick="openUser(\'' + u.UserID + '\')"><i class="bi bi-pencil"></i></button></td></tr>').join(''); }).catch((e) => toast(e.message, true));
}
function muRoleChange() { $('muWaliWrap').classList.toggle('d-none', $('muRole').value !== 'Guru'); }
function openUser(id) {
  const u = id ? USERS.find((x) => x.UserID === id) : null;
  $('muTitle').textContent = u ? 'Ubah Pengguna' : 'Tambah Pengguna'; $('muId').value = u ? u.UserID : '';
  $('muNama').value = u ? u.Nama : ''; $('muUser').value = u ? u.Username : ''; $('muRole').value = u ? u.Role : 'Guru'; $('muWali').value = u ? u.WaliKelasDari : ''; $('muStatus').value = u ? u.Status : 'Aktif'; $('muPw').value = '';
  $('muPwWrap').classList.toggle('d-none', !!u); $('muResetWrap').classList.toggle('d-none', !u); muRoleChange(); hideErr('muErr'); modal('mUser').show();
}
function saveUser() {
  hideErr('muErr');
  api('saveUser', { UserID: $('muId').value, Nama: $('muNama').value, Username: $('muUser').value, Role: $('muRole').value, WaliKelasDari: $('muWali').value, Status: $('muStatus').value, Password: $('muPw').value })
    .then(() => { modal('mUser').hide(); toast('Pengguna tersimpan.'); loadUsers(); }).catch((e) => showErr('muErr', e.message));
}
function resetPwUser() {
  const pw = prompt('Password baru untuk pengguna ini (minimal 8 karakter):'); if (!pw) return;
  api('resetPasswordUser', $('muId').value, pw).then(() => toast('Password direset.')).catch((e) => showErr('muErr', e.message));
}
function loadLog() {
  api('getLog', 200).then((l) => { $('logBody').innerHTML = l.length ? l.map((x) => '<tr><td style="white-space:nowrap">' + esc(x.waktu) + '</td><td>' + esc(x.pelaku) + '</td><td><b>' + esc(x.aksi) + '</b></td><td>' + esc(x.entitas) + ' ' + esc(x.entitasId) + (x.lama || x.baru ? '<br><small class="text-muted">' + esc(x.lama) + (x.lama && x.baru ? ' → ' : '') + esc(x.baru) + '</small>' : '') + '</td><td>' + esc(x.alasan) + '</td></tr>').join('') : '<tr><td colspan="5" class="empty">Belum ada aktivitas.</td></tr>'; }).catch((e) => toast(e.message, true));
}
function loadPengaturan() {
  api('getPengaturan').then((p) => { PENG = p; $('pgNama').value = p.NamaMadrasah; $('pgAlamat').value = p.AlamatMadrasah; $('pgTa').value = p.TahunAjaran; $('pgNip').value = p.NIPKepala; $('pgKepala').value = p.NamaKepala; $('pgLokasi').value = p.DaftarLokasi; $('pgProgram').value = p.DaftarProgram || ''; });
}
function savePengaturan() {
  api('savePengaturan', { NamaMadrasah: $('pgNama').value, AlamatMadrasah: $('pgAlamat').value, TahunAjaran: $('pgTa').value, NIPKepala: $('pgNip').value, NamaKepala: $('pgKepala').value, DaftarLokasi: $('pgLokasi').value, DaftarProgram: $('pgProgram').value })
    .then((p) => { PENG = p; toast('Pengaturan tersimpan.'); }).catch((e) => toast(e.message, true));
}


/* =========================================================
 *  WHATSAPP
 * ========================================================= */
let waTab = '';
const WA_TABS = [
  { id: 'peng', t: 'Pengumuman', i: 'bi-megaphone-fill', ok: seesAll },
  { id: 'lap', t: 'Laporan ke Wali', i: 'bi-file-earmark-text', ok: () => seesAll() || isWali() },
  { id: 'set', t: 'Pengaturan WA', i: 'bi-gear', ok: isAdmin },
  { id: 'riw', t: 'Riwayat', i: 'bi-clock-history', ok: seesAll }
];
function initWa() {
  const tabs = WA_TABS.filter((t) => t.ok());
  $('waTabs').innerHTML = tabs.map((t) => '<button class="tab-g" data-t="' + t.id + '" onclick="waGo(\'' + t.id + '\')"><i class="bi ' + t.i + ' me-1"></i>' + t.t + '</button>').join('');
  api('getPengaturan').then((p) => { PENG = p; }).catch(() => {});
  const ks = isWali() && !seesAll() ? [USER.waliKelasDari] : kelasList();
  $('waTarget').innerHTML = '<option value="semua">Semua kelas</option>' + ks.map((k) => '<option value="' + esc(k) + '">Kelas ' + esc(k) + '</option>').join('');
  $('waLpKelas').innerHTML = ks.map((k) => '<option>' + esc(k) + '</option>').join('');
  if (!$('waLpBulan').value) $('waLpBulan').value = wib().date.slice(0, 7);
  if (!ks.length && !initWa._t) { initWa._t = 1; api('listSiswa').then((l) => { SISWA = l; initWa(); }).catch(() => {}); }
  waGo(waTab && tabs.some((t) => t.id === waTab) ? waTab : tabs[0].id);
}
function waGo(t) {
  waTab = t;
  document.querySelectorAll('#waTabs .tab-g').forEach((e) => e.classList.toggle('active', e.dataset.t === t));
  document.querySelectorAll('.wa-pane').forEach((e) => e.classList.toggle('on', e.id === 'waP-' + t));
  if (t === 'peng') waHitung();
  if (t === 'set') waLoadSet();
  if (t === 'riw') waLoadRiw();
}
function waHitung() {
  $('waInfoPen').textContent = 'Menghitung penerima…';
  api('waHitungPenerima', $('waTarget').value).then((r) => { $('waInfoPen').innerHTML = '<b>' + r.nomor + '</b> nomor wali akan menerima' + (r.tanpaNomor ? ' &middot; ' + r.tanpaNomor + ' siswa belum punya nomor WA' : ''); }).catch((e) => { $('waInfoPen').textContent = e.message; });
}
function waProgHtml(r, done) {
  let h = '<div class="alert ' + (r.gagal && r.gagal.length ? 'alert-warning' : 'alert-success') + ' py-2 small mb-1"><b>' + (done ? 'Selesai.' : 'Mengirim…') + '</b> ' + r.terkirim + ' terkirim, ' + (r.gagal ? r.gagal.length : 0) + ' gagal dari ' + r.total + ' nomor.' + (r.tanpaNomor ? ' ' + r.tanpaNomor + ' siswa tanpa nomor WA dilewati.' : '') + '</div>';
  if (r.gagal && r.gagal.length) h += '<div class="small text-danger">' + r.gagal.slice(0, 15).map((g) => esc(g.nama) + ': ' + esc(g.alasan)).join('<br>') + (r.gagal.length > 15 ? '<br>…dan ' + (r.gagal.length - 15) + ' lainnya' : '') + '</div>';
  return h;
}
// kirim bertahap: server memproses 25 nomor per panggilan agar tidak kena batas waktu Apps Script
async function waLoop(btn, box, call, build) {
  btn.disabled = true; const acc = { terkirim: 0, gagal: [], total: 0, tanpaNomor: 0 }; box.classList.remove('d-none');
  let offset = 0, extra = {};
  try {
    for (;;) {
      const r = await call(offset, acc, extra);
      acc.terkirim += r.terkirim; acc.gagal = acc.gagal.concat(r.gagal || []); acc.total = r.total; if (r.tanpaNomor !== undefined) acc.tanpaNomor = r.tanpaNomor; if (r.pid) extra.pid = r.pid;
      box.innerHTML = waProgHtml(acc, r.done);
      if (r.done || r.next <= offset) break;
      offset = r.next;
    }
    toast('Pengiriman selesai: ' + acc.terkirim + ' terkirim.');
  } catch (e) { box.innerHTML = waProgHtml(acc, false) + '<div class="alert alert-danger py-2 small mt-2">' + esc(e.message) + ' Pengiriman berhenti; yang sudah terkirim tidak akan hilang.</div>'; }
  btn.disabled = false;
}
function waKirimPeng() {
  const judul = $('waJudul').value.trim(), isi = $('waIsi').value.trim(), target = $('waTarget').value;
  if (!judul || isi.length < 5) { toast('Judul dan isi pengumuman wajib diisi.', true); return; }
  if (!confirm('Kirim pengumuman "' + judul + '" ke ' + (target === 'semua' ? 'semua wali murid' : 'wali murid kelas ' + target) + '?')) return;
  waLoop($('waBtnPeng'), $('waProgPeng'), (offset, acc, extra) => api('waKirimPengumuman', { judul: judul, isi: isi, target: target, offset: offset, pid: extra.pid || '', sudahTerkirim: acc.terkirim, sudahGagal: acc.gagal.length }));
}
function waKirimLap() {
  const kelas = $('waLpKelas').value, bulan = $('waLpBulan').value;
  if (!kelas || !bulan) { toast('Pilih bulan dan kelas.', true); return; }
  if (!confirm('Kirim ringkasan laporan ' + bulanLong(bulan) + ' ke seluruh wali murid kelas ' + kelas + '?')) return;
  waLoop($('waBtnLap'), $('waProgLap'), (offset) => api('waKirimLaporan', { kelas: kelas, bulan: bulan, offset: offset }));
}
function waKirimCatatan(kid) {
  const k = CATATAN[kid]; if (!k) return;
  const ulang = k.waKirim > 0;
  if (!confirm((ulang ? 'Sebagian wali sudah menerima pesan ini. Kirim hanya ke yang belum?' : 'Kirim catatan ini ke wali ' + k.siswa.length + ' siswa?'))) return;
  toast('Mengirim…');
  api('waKirimCatatan', kid, false).then((r) => {
    if (r.sudahTerkirim) toast('Semua wali sudah menerima pesan ini.');
    else toast(r.terkirim + ' terkirim' + (r.gagal.length ? ', ' + r.gagal.length + ' gagal: ' + r.gagal[0].alasan : '') + (r.tanpaNomor ? ', ' + r.tanpaNomor + ' tanpa nomor WA' : ''), r.gagal.length > 0 && r.terkirim === 0);
    loadCatatan();
  }).catch((e) => toast(e.message, true));
}
function waStatus(r) { $('waStatus').innerHTML = '<div class="alert ' + (r.ok ? 'alert-success' : 'alert-warning') + ' py-2 small mb-0"><i class="bi ' + (r.ok ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill') + ' me-1"></i>' + esc(r.message) + '</div>'; }
function waLoadSet() {
  api('waGetConfig').then((c) => { $('waToken').value = c.token || ''; if (c.token) waCek(); else waStatus({ ok: false, message: 'Token Fonnte belum diisi.' }); }).catch((e) => toast(e.message, true));
  api('getPengaturan').then((p) => { PENG = p; $('waAktif').value = p.WA_Aktif; $('waAutoPel').value = p.WA_AutoPelanggaran; $('waAutoKeb').value = p.WA_AutoKebaikan; $('waTplCat').value = p.WA_TplCatatan; $('waTplLap').value = p.WA_TplLaporan; });
}
function waSimpanToken() {
  const t = $('waToken').value.trim(); if (!t) { toast('Token belum diisi.', true); return; }
  $('waStatus').innerHTML = '<div class="meta">Menyimpan dan mengecek token…</div>';
  api('waSaveToken', t).then((r) => { waStatus(r); toast(r.ok ? 'Token tersimpan dan valid.' : 'Token tersimpan, tetapi: ' + r.message, !r.ok); }).catch((e) => toast(e.message, true));
}
function waCek() { $('waStatus').innerHTML = '<div class="meta">Mengecek koneksi…</div>'; api('waCekKoneksi').then(waStatus).catch((e) => waStatus({ ok: false, message: e.message })); }
function waTes() {
  const hp = $('waTes').value.trim(); if (!hp) { toast('Isi nomor tujuan tes.', true); return; }
  api('waTestKirim', hp).then((r) => toast(r.ok ? 'Pesan tes terkirim.' : 'Gagal: ' + r.reason, !r.ok)).catch((e) => toast(e.message, true));
}
function waSimpanAturan() {
  api('savePengaturan', { WA_Aktif: $('waAktif').value, WA_AutoPelanggaran: $('waAutoPel').value, WA_AutoKebaikan: $('waAutoKeb').value, WA_TplCatatan: $('waTplCat').value, WA_TplLaporan: $('waTplLap').value })
    .then((p) => { PENG = p; toast('Aturan WhatsApp tersimpan.'); }).catch((e) => toast(e.message, true));
}
function waLoadRiw() {
  api('waRiwayat').then((r) => {
    $('waRiwPeng').innerHTML = r.pengumuman.length ? r.pengumuman.map((x) => '<tr><td style="white-space:nowrap">' + esc(x.waktu) + '</td><td>' + esc(x.judul) + '</td><td>' + esc(x.target) + '</td><td>' + esc(x.oleh) + '</td><td>' + esc(x.status) + '</td></tr>').join('') : '<tr><td colspan="5" class="empty">Belum ada pengumuman.</td></tr>';
    $('waRiwLog').innerHTML = r.log.length ? r.log.map((x) => '<tr><td style="white-space:nowrap">' + esc(x.waktu) + '</td><td>' + esc(x.pelaku) + '</td><td><b>' + esc(x.aksi) + '</b></td><td>' + esc(x.rincian) + '</td></tr>').join('') : '<tr><td colspan="4" class="empty">Belum ada aktivitas.</td></tr>';
  }).catch((e) => toast(e.message, true));
}

/* ---------- mulai ---------- */
window.addEventListener('DOMContentLoaded', () => {
  injectDev();
  const t = localStorage.getItem('sicapsi_token');
  if (t) { TOKEN = t; api('me').then((d) => enterApp(d.user, d.pengaturan)).catch(() => forceLogout()); }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.SICAPSI_API) navigator.serviceWorker.register('sw.js').catch(() => {});
});
