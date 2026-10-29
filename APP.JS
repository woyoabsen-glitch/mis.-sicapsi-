/* =========================================================
 *  SICAPSI - tampilan (Fase 1)
 *  Ganti API_URL dengan URL Web App Apps Script Anda (berakhiran /exec).
 * ========================================================= */
const API_URL = window.SICAPSI_API || 'GANTI_DENGAN_URL_WEB_APP_ANDA';

let TOKEN = null, USER = null, PENG = {}, SISWA = [], DASH = null;
let boardSel = 'Kebaikan', scopeSel = 'kelas';
const BOARD_COLOR = { Kebaikan: '#16a34a', Pelanggaran: '#dc2626', Prestasi: '#d97706', 'Program Sekolah': '#0369a1' };
const BOARD_ICON = { Kebaikan: 'bi-heart-fill', Pelanggaran: 'bi-exclamation-triangle-fill', Prestasi: 'bi-award-fill', 'Program Sekolah': 'bi-mortarboard-fill' };
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
  if (p === 'pengaturan') loadPengaturan();
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
  $('dbCards').innerHTML = card('Pelanggaran', 'bg-pel', 'Pelanggaran') + card('Kebaikan', 'bg-keb', 'Kebaikan') + card('Prestasi', 'bg-pre', 'Prestasi') + card('Program Sekolah', 'bg-prog', 'Program Sekolah') +
    '<div class="col-6 col-lg"><div class="stat" onclick="go(\'siswa\')"><div class="ic bg-sis"><i class="bi bi-people-fill"></i></div><div><div class="n">' + d.siswaAktif + '</div><div class="l">Siswa aktif</div><div class="s">' + d.kelasList.length + ' kelas</div></div></div></div>';
  $('dbBoardTabs').innerHTML = ['Kebaikan', 'Pelanggaran', 'Prestasi', 'Program Sekolah'].map((b) => '<div class="tab-g ' + (b === boardSel ? 'active' : '') + '" onclick="selBoard(\'' + b + '\')">' + b + '</div>').join('');
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
  const series = ['Kebaikan', 'Pelanggaran', 'Prestasi', 'Program Sekolah'];
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
const badgeCls = (k) => k.subkategori === 'Prestasi' ? 'Prestasi' : (k.kategori === 'Program Sekolah' ? 'Program' : k.kategori);
const badgeTxt = (k) => k.subkategori === 'Prestasi' ? 'Prestasi' : k.kategori;

/* =========================================================
 *  CATATAN
 * ========================================================= */
let CATATAN = {}, selSiswa = [], ctKat = '', ctReq = '', _deb;
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
  const kk = k.kategori === 'Program Sekolah' ? 'Program' : k.kategori;
  return '<div class="kj k-' + kk + (k.status !== 'Aktif' ? ' batal' : '') + '"><div class="d-flex flex-wrap gap-2 align-items-center mb-1"><span class="bd ' + badgeCls(k) + '">' + esc(badgeTxt(k)) + '</span>' +
    (k.status !== 'Aktif' ? '<span class="bd Batal">Dibatalkan</span>' : '') + '<span class="meta ms-auto"><i class="bi bi-calendar-event"></i>' + esc(tglLong(k.tanggal)) + (k.jam ? ' · ' + esc(k.jam) : '') + '</span></div>' +
    '<div>' + k.siswa.map((s) => '<span class="chip"><b>' + esc(s.nama) + '</b> <small>' + esc(s.kelas) + '</small></span>').join('') + '</div>' +
    '<div class="ur">' + esc(k.uraian) + '</div>' +
    (k.tindakLanjut ? '<div class="meta"><i class="bi bi-arrow-return-right"></i><b>Tindak lanjut:</b> ' + esc(k.tindakLanjut) + '</div>' : '') +
    (k.status !== 'Aktif' ? '<div class="meta text-danger"><i class="bi bi-x-circle"></i>Alasan batal: ' + esc(k.alasanBatal) + '</div>' : '') +
    '<div class="d-flex flex-wrap gap-2 align-items-center mt-2"><span class="meta">' + (k.lokasi ? '<i class="bi bi-geo-alt"></i>' + esc(k.lokasi) + ' &nbsp;' : '') + '<i class="bi bi-person"></i>' + esc(k.pencatat) + '</span>' +
    '<span class="ms-auto">' + (k.canKoreksi ? '<button class="btn btn-sm btn-outline-gold me-1" onclick="openKoreksi(\'' + k.kejadianId + '\')"><i class="bi bi-pencil"></i> Koreksi</button>' : '') +
    (k.canBatal ? '<button class="btn btn-sm btn-outline-danger" onclick="openBatal(\'' + k.kejadianId + '\')"><i class="bi bi-x-circle"></i> Batalkan</button>' : '') + '</span></div></div>';
}
function openCatatan() {
  selSiswa = []; ctKat = ''; ctReq = uuid();
  ['ctUraian', 'ctTL', 'ctLokasi', 'ctCari'].forEach((i) => { $(i).value = ''; }); $('ctPrestasi').checked = false;
  const n = wib(); $('ctTgl').value = n.date; $('ctJam').value = n.time;
  $('lokasiList').innerHTML = String(PENG.DaftarLokasi || '').split(',').map((x) => '<option value="' + esc(x.trim()) + '">').join('');
  setKat(''); renderChips(); $('ctPicker').classList.add('d-none'); hideErr('ctErr'); modal('mCatatan').show();
}
function setKat(k) {
  ctKat = k;
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
function renderChips() { $('ctChips').innerHTML = selSiswa.length ? selSiswa.map((s) => '<span class="chip"><b>' + esc(s.Nama) + '</b> <small>' + esc(s.Kelas) + '</small><button onclick="delSiswa(\'' + s.SiswaID + '\')" aria-label="Hapus">&times;</button></span>').join('') : '<span class="meta">Belum ada siswa dipilih.</span>'; }
function saveCatatan() {
  hideErr('ctErr');
  if (!ctKat) return showErr('ctErr', 'Pilih kategori catatan.');
  const btn = $('ctSave'); btn.disabled = true;
  api('createCatatan', { kategori: ctKat, subkategori: $('ctPrestasi').checked ? 'Prestasi' : 'Umum', siswaIds: selSiswa.map((s) => s.SiswaID), tanggal: $('ctTgl').value, jam: $('ctJam').value,
    lokasi: $('ctLokasi').value, uraian: $('ctUraian').value, tindakLanjut: $('ctTL').value, requestId: ctReq })
    .then(() => { modal('mCatatan').hide(); toast('Catatan tersimpan.'); if ($('page-catatan').classList.contains('active')) loadCatatan(); else go('catatan'); })
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
  api('listSiswa').then((l) => {
    SISWA = l; const ks = isWali() && !seesAll() ? [USER.waliKelasDari] : kelasList();
    $('lpKelas').innerHTML = ks.map((k) => '<option>' + esc(k) + '</option>').join(''); fillLpSiswa();
  });
}
function fillLpSiswa() {
  const k = $('lpKelas').value;
  $('lpSiswa').innerHTML = '<option value="">Semua siswa kelas ' + esc(k) + '</option>' + SISWA.filter((s) => s.Kelas === k).map((s) => '<option value="' + s.SiswaID + '">' + esc(s.Nama) + '</option>').join('');
}
function loadLaporan() {
  const bulan = $('lpBulan').value; if (!bulan) return toast('Pilih bulan laporan.', true);
  const sid = $('lpSiswa').value;
  $('reportArea').innerHTML = '<div class="empty">Menyusun laporan…</div>';
  (sid ? api('getLaporanSiswa', sid, bulan).then((r) => [r]) : api('getLaporanKelas', $('lpKelas').value, bulan)).then((list) => {
    $('reportArea').innerHTML = list.length ? list.map(reportHtml).join('') : '<div class="empty panel">Tidak ada siswa aktif di kelas ini.</div>';
    $('lpPrint').classList.toggle('d-none', !list.length);
  }).catch((e) => { $('reportArea').innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
}
function rpTable(rows, withPrestasi) {
  if (!rows.length) return '<div class="rp-none">Tidak ada catatan pada periode ini.</div>';
  return '<table class="rp-tbl"><thead><tr><th style="width:17%">Tanggal / Jam</th><th style="width:14%">Lokasi</th><th>Uraian kejadian</th><th style="width:22%">Tindak lanjut</th><th style="width:13%">Pencatat</th></tr></thead><tbody>' +
    rows.map((r) => '<tr><td>' + esc(tglLong(r.tanggal)) + (r.jam ? '<br>' + esc(r.jam) : '') + '</td><td>' + esc(r.lokasi) + '</td><td>' + (withPrestasi && r.prestasi ? '<b>[Prestasi]</b> ' : '') + esc(r.uraian) + '</td><td>' + esc(r.tindakLanjut) + '</td><td>' + esc(r.pencatat) + '</td></tr>').join('') + '</tbody></table>';
}
function reportHtml(r) {
  const p = r.pengaturan || {}, s = r.ringkasan, sg = r.siswa, cetak = tglLong(wib().date);
  return '<div class="report-page"><div class="rp-head"><div class="m">' + esc(p.NamaMadrasah) + '</div><div class="a">' + esc(p.AlamatMadrasah) + '</div></div>' +
    '<div class="rp-title">LAPORAN PERKEMBANGAN SISWA</div><div class="rp-per">Periode: ' + esc(bulanLong(r.bulan)) + ' &middot; Tahun ajaran ' + esc(sg.tahunAjaran || p.TahunAjaran) + '</div>' +
    '<table class="rp-id"><tr><td>Nama siswa</td><td>: <b>' + esc(sg.nama) + '</b></td><td>Kelas</td><td>: ' + esc(sg.kelas) + '</td></tr><tr><td>NIS</td><td>: ' + esc(sg.nis) + '</td><td>Wali kelas</td><td>: ' + esc(r.waliKelas || '-') + '</td></tr></table>' +
    '<div class="rp-sum"><div><b>' + s.Pelanggaran + '</b>Pelanggaran</div><div><b>' + s.Kebaikan + '</b>Kebaikan</div><div><b>' + s.Prestasi + '</b>Prestasi</div><div><b>' + s['Program Sekolah'] + '</b>Program Sekolah</div></div>' +
    '<div class="rp-sec Pelanggaran">A. Pelanggaran</div>' + rpTable(r.Pelanggaran) +
    '<div class="rp-sec Kebaikan">B. Kebaikan</div>' + rpTable(r.Kebaikan, true) +
    '<div class="rp-sec Program">C. Program Sekolah</div>' + rpTable(r['Program Sekolah']) +
    '<div class="rp-sec" style="background:#444">Catatan wali kelas</div><div class="rp-note" contenteditable="true" spellcheck="false"></div>' +
    '<div class="rp-sign"><div>Wali Kelas<div class="sp"></div><b>' + esc(r.waliKelas || '................') + '</b></div><div>Orang Tua / Wali<div class="sp"></div>(................)</div><div>Kepala Madrasah<div class="sp"></div><b>' + esc(p.NamaKepala || '................') + '</b>' + (p.NIPKepala ? '<br>NIP. ' + esc(p.NIPKepala) : '') + '</div></div>' +
    '<div style="font-size:9.5px;color:#777;margin-top:8px">Dicetak ' + esc(cetak) + ' &middot; SICAPSI</div></div>';
}

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
  api('getPengaturan').then((p) => { PENG = p; $('pgNama').value = p.NamaMadrasah; $('pgAlamat').value = p.AlamatMadrasah; $('pgTa').value = p.TahunAjaran; $('pgNip').value = p.NIPKepala; $('pgKepala').value = p.NamaKepala; $('pgLokasi').value = p.DaftarLokasi; });
}
function savePengaturan() {
  api('savePengaturan', { NamaMadrasah: $('pgNama').value, AlamatMadrasah: $('pgAlamat').value, TahunAjaran: $('pgTa').value, NIPKepala: $('pgNip').value, NamaKepala: $('pgKepala').value, DaftarLokasi: $('pgLokasi').value })
    .then((p) => { PENG = p; toast('Pengaturan tersimpan.'); }).catch((e) => toast(e.message, true));
}

/* ---------- mulai ---------- */
window.addEventListener('DOMContentLoaded', () => {
  const t = localStorage.getItem('sicapsi_token');
  if (t) { TOKEN = t; api('me').then((d) => enterApp(d.user, d.pengaturan)).catch(() => forceLogout()); }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.SICAPSI_API) navigator.serviceWorker.register('sw.js').catch(() => {});
});
