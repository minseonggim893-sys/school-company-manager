const DEPARTMENTS = [
  "파티시에과","스마트기계과","모빌리티과","친환경자동차과",
  "전기과","스마트전자과","드론지형정보과","건축리모델링과","전기배터리과"
];
const USERS = [
  { id: 1, name: "김민성", dept: "전기과" },
  { id: 2, name: "박OO",   dept: "스마트전자과" },
  { id: 3, name: "이OO",   dept: "모빌리티과" }
];

let state = {
  user: null,
  companies: [],
  selected: null,
  search: "",
  filterDept: "전체",
  contactLogs: {},
  histories: {},
  showAdd: false,
  showContactAdd: false,
  showHistoryAdd: false,
  newCompany: { name: "", industry: "", departments: [] },
  newLog: { date: "", method: "전화", content: "" },
  newHistory: { year: "", department: "", student: "", type: "취업" },
  duplicateMsg: ""
};

/* ──────────────────────────────
   API 헬퍼
────────────────────────────── */
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch('/api' + path, opts);
  return r.json();
}

async function loadCompanies() {
  const data = await api('GET', '/companies');
  state.companies = data.companies || [];
}

async function loadContactLogs(id) {
  const data = await api('GET', `/companies/${id}/contacts`);
  state.contactLogs[id] = data.logs || [];
}

async function loadHistories(id) {
  const data = await api('GET', `/companies/${id}/histories`);
  state.histories[id] = data.histories || [];
}

/* ──────────────────────────────
   필터
────────────────────────────── */
function getFiltered() {
  return state.companies.filter(c => {
    const matchS = !state.search || c.name.toLowerCase().includes(state.search.toLowerCase());
    const matchD = state.filterDept === '전체' || (c.departments || []).includes(state.filterDept);
    return matchS && matchD;
  });
}

/* ──────────────────────────────
   렌더링
────────────────────────────── */
function render() {
  document.getElementById('app').innerHTML = state.user ? renderMain() : renderLogin();
}

function renderLogin() {
  return `
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#eff6ff;">
    <div style="width:100%;max-width:400px;padding:16px;">
      <div class="card" style="padding:32px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:36px;margin-bottom:8px;">🏫</div>
          <h1 style="font-size:20px;font-weight:700;color:#1e293b;">학교 업체관리 시스템</h1>
          <p style="font-size:13px;color:#64748b;margin-top:4px;">로그인할 교사를 선택하세요</p>
        </div>
        <div style="display:grid;gap:10px;">
          ${USERS.map(u => `
            <button class="btn btn-outline" style="width:100%;padding:12px;justify-content:flex-start;gap:10px;"
              onclick="selectUser(${u.id})">
              <span style="font-size:20px;">👤</span>
              <span style="font-weight:600;">${u.name}</span>
              <span style="color:#64748b;font-size:13px;">· ${u.dept}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function renderMain() {
  const u = state.user;
  const filtered = getFiltered();
  const sel = state.selected;

  return `
  <div style="max-width:1200px;margin:0 auto;padding:24px 16px;display:grid;gap:20px;">

    <!-- 헤더 -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <h1 style="font-size:22px;font-weight:700;color:#1e293b;">🏫 학교 업체관리 시스템</h1>
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:13px;color:#64748b;">로그인: <b>${u.name}</b> (${u.dept})</span>
        <button class="btn btn-outline btn-sm" onclick="logout()">로그아웃</button>
      </div>
    </div>

    <!-- 검색/필터 카드 -->
    <div class="card" style="padding:16px;display:grid;gap:12px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <input type="text" placeholder="업체명 검색" value="${esc(state.search)}"
          style="flex:1;min-width:180px;" oninput="onSearch(this.value)" />
        <button class="btn btn-outline" onclick="clearSearch()">초기화</button>
        <button class="btn btn-primary" onclick="openAdd()">업체 등록</button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-sm ${state.filterDept==='전체'?'btn-active':'btn-outline'}" onclick="setDeptFilter('전체')">전체</button>
        ${DEPARTMENTS.map(d => `
          <button class="btn btn-sm ${state.filterDept===d?'btn-active':'btn-outline'}" onclick="setDeptFilter('${d}')">${d}</button>
        `).join('')}
      </div>
    </div>

    <!-- 2패널 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">

      <!-- 업체 목록 -->
      <div class="card" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <span style="font-weight:700;font-size:15px;">업체 목록</span>
          <span style="font-size:12px;color:#94a3b8;">총 ${filtered.length}개 업체</span>
        </div>
        <div style="overflow-x:auto;border-radius:10px;border:1px solid #e5e7eb;">
          <table>
            <thead>
              <tr><th>업체명</th><th>업종</th><th>관련 학과</th><th>최근 연락일</th></tr>
            </thead>
            <tbody>
              ${filtered.length === 0
                ? `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:24px;">검색 결과가 없습니다.</td></tr>`
                : filtered.map(c => `
                  <tr class="${sel?.id===c.id?'row-selected':''}" onclick="selectCompany(${c.id})">
                    <td style="font-weight:600;color:#1e40af;">${esc(c.name)}</td>
                    <td style="color:#64748b;">${esc(c.industry||'-')}</td>
                    <td style="color:#64748b;">${(c.departments||[]).map(esc).join(', ')||'-'}</td>
                    <td style="color:#94a3b8;white-space:nowrap;">${esc(c.last_contact||'-')}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 업체 상세 -->
      <div class="card" style="padding:16px;">
        <span style="font-weight:700;font-size:15px;">업체 상세</span>
        ${!sel
          ? `<p style="font-size:13px;color:#94a3b8;margin-top:8px;">업체를 선택하세요.</p>`
          : renderDetail(sel)
        }
      </div>
    </div>

    <!-- 업체 등록 패널 -->
    ${state.showAdd ? renderAddPanel() : ''}

    <!-- 연락 이력 추가 패널 -->
    ${state.showContactAdd && sel ? renderContactAddPanel() : ''}

    <!-- 취업/실습 기록 추가 패널 -->
    ${state.showHistoryAdd && sel ? renderHistoryAddPanel() : ''}

  </div>`;
}

function renderDetail(sel) {
  const logs = state.contactLogs[sel.id] || [];
  const hists = state.histories[sel.id] || [];
  return `
  <div style="display:grid;gap:10px;font-size:14px;margin-top:10px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div class="info-box">
        <p class="info-label">업체명</p>
        <p style="font-weight:700;">${esc(sel.name)}</p>
      </div>
      <div class="info-box">
        <p class="info-label">업종</p>
        <p>${esc(sel.industry||'-')}</p>
      </div>
    </div>
    <div class="info-box">
      <p class="info-label">관련 학과</p>
      <div>${(sel.departments||[]).map(d=>`<span class="tag">${esc(d)}</span>`).join(' ')||'-'}</div>
    </div>
    <div class="info-box">
      <p class="info-label">최근 연락일</p>
      <p>${esc(sel.last_contact||'-')}</p>
    </div>

    <!-- 연락 이력 -->
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-weight:600;font-size:13px;">📞 연락 이력</span>
        <button class="btn btn-outline btn-sm" onclick="openContactAdd()">이력 추가</button>
      </div>
      ${!logs.length
        ? `<p style="font-size:13px;color:#94a3b8;">기록 없음</p>`
        : logs.map(log => `
          <div class="log-item">
            <p style="font-weight:600;color:#1e293b;">${esc(log.date)} · ${esc(log.method)}</p>
            <p style="color:#475569;margin:2px 0;">${esc(log.content||'')}</p>
            <p style="font-size:12px;color:#94a3b8;">${esc(log.writer)} (${esc(log.dept)})</p>
          </div>
        `).join('')}
    </div>

    <!-- 취업/실습 이력 -->
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-weight:600;font-size:13px;">🎓 취업 / 실습 이력</span>
        <button class="btn btn-outline btn-sm" onclick="openHistoryAdd()">기록 추가</button>
      </div>
      ${!hists.length
        ? `<p style="font-size:13px;color:#94a3b8;">기록 없음</p>`
        : hists.map(h => `
          <div class="log-item">
            <p style="font-weight:600;color:#1e293b;">${esc(h.year)} · ${esc(h.department)}</p>
            <p style="color:#475569;margin:2px 0;">${esc(h.student)} · <span class="badge badge-${esc(h.type)}">${esc(h.type)}</span></p>
            <p style="font-size:12px;color:#94a3b8;">기록자: ${esc(h.writer)}</p>
          </div>
        `).join('')}
    </div>
  </div>`;
}

function renderAddPanel() {
  const nc = state.newCompany;
  return `
  <div class="card" style="padding:20px;display:grid;gap:14px;">
    <h2 style="font-weight:700;font-size:15px;">신규 업체 등록</h2>
    <div style="background:#f1f5f9;border-radius:8px;padding:10px;font-size:13px;color:#475569;">
      업체명 기준으로 중복 확인 후 등록합니다. 기존 업체가 있으면 새로 만들지 말고 기존 업체에 이력을 추가하세요.
    </div>
    <input type="text" placeholder="업체명" value="${esc(nc.name)}"
      oninput="updateField('newCompany','name',this.value)" />
    ${state.duplicateMsg
      ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:13px;color:#b91c1c;">${esc(state.duplicateMsg)}</div>`
      : ''}
    <input type="text" placeholder="업종" value="${esc(nc.industry)}"
      oninput="updateField('newCompany','industry',this.value)" />
    <div>
      <p style="font-size:13px;font-weight:600;margin-bottom:8px;">관련 학과 선택</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${DEPARTMENTS.map(d => `
          <button class="btn btn-sm ${nc.departments.includes(d)?'btn-active':'btn-outline'}"
            onclick="toggleDept('${d}')">${d}</button>
        `).join('')}
      </div>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-primary" onclick="addCompany()">등록</button>
      <button class="btn btn-outline" onclick="closeAdd()">취소</button>
    </div>
  </div>`;
}

function renderContactAddPanel() {
  const nl = state.newLog;
  const u = state.user;
  return `
  <div class="card" style="padding:20px;display:grid;gap:14px;">
    <h2 style="font-weight:700;font-size:15px;">연락 이력 추가</h2>
    <p style="font-size:13px;color:#64748b;">작성자: <b>${esc(u.name)}</b> (${esc(u.dept)})</p>
    <input type="date" value="${esc(nl.date)}"
      onchange="updateField('newLog','date',this.value)" />
    <select onchange="updateField('newLog','method',this.value)">
      ${['전화','방문','이메일','문자','기타'].map(m =>
        `<option ${nl.method===m?'selected':''}>${m}</option>`
      ).join('')}
    </select>
    <input type="text" placeholder="연락 내용" value="${esc(nl.content)}"
      oninput="updateField('newLog','content',this.value)" />
    <div style="display:flex;gap:8px;">
      <button class="btn btn-primary" onclick="addContactLog()">저장</button>
      <button class="btn btn-outline" onclick="closeContactAdd()">취소</button>
    </div>
  </div>`;
}

function renderHistoryAddPanel() {
  const nh = state.newHistory;
  const u = state.user;
  return `
  <div class="card" style="padding:20px;display:grid;gap:14px;">
    <h2 style="font-weight:700;font-size:15px;">취업 / 실습 기록 추가</h2>
    <p style="font-size:13px;color:#64748b;">기록자: <b>${esc(u.name)}</b></p>
    <input type="text" placeholder="연도 (예: 2026)" value="${esc(nh.year)}"
      oninput="updateField('newHistory','year',this.value)" />
    <input type="text" placeholder="학과" value="${esc(nh.department)}"
      oninput="updateField('newHistory','department',this.value)" />
    <input type="text" placeholder="학생 이름" value="${esc(nh.student)}"
      oninput="updateField('newHistory','student',this.value)" />
    <select onchange="updateField('newHistory','type',this.value)">
      ${['취업','현장실습'].map(t =>
        `<option ${nh.type===t?'selected':''}>${t}</option>`
      ).join('')}
    </select>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-primary" onclick="addHistory()">저장</button>
      <button class="btn btn-outline" onclick="closeHistoryAdd()">취소</button>
    </div>
  </div>`;
}

/* ──────────────────────────────
   XSS 방어
────────────────────────────── */
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* ──────────────────────────────
   이벤트 핸들러
────────────────────────────── */
function selectUser(id) {
  state.user = USERS.find(u => u.id === id);
  loadCompanies().then(render);
}

function logout() {
  state.user = null;
  state.selected = null;
  state.search = "";
  state.filterDept = "전체";
  render();
}

async function selectCompany(id) {
  state.selected = state.companies.find(c => c.id === id) || null;
  if (state.selected) {
    await Promise.all([loadContactLogs(id), loadHistories(id)]);
  }
  render();
}

function onSearch(v) { state.search = v; render(); }
function clearSearch() { state.search = ""; render(); }
function setDeptFilter(d) { state.filterDept = d; render(); }

function openAdd() { state.showAdd = true; state.duplicateMsg = ""; render(); }
function closeAdd() {
  state.showAdd = false;
  state.duplicateMsg = "";
  state.newCompany = { name: "", industry: "", departments: [] };
  render();
}
function openContactAdd() { state.showContactAdd = true; render(); }
function closeContactAdd() { state.showContactAdd = false; render(); }
function openHistoryAdd() { state.showHistoryAdd = true; render(); }
function closeHistoryAdd() { state.showHistoryAdd = false; render(); }

function updateField(obj, key, val) {
  state[obj][key] = val;
  if (obj === 'newCompany' && key === 'name') state.duplicateMsg = "";
}

function toggleDept(d) {
  const arr = state.newCompany.departments;
  state.newCompany.departments = arr.includes(d)
    ? arr.filter(x => x !== d)
    : [...arr, d];
  render();
}

async function addCompany() {
  const name = state.newCompany.name.trim();
  if (!name) return;
  const norm = name.replace(/\s+/g, '').toLowerCase();
  const dup = state.companies.find(c => c.name.replace(/\s+/g, '').toLowerCase() === norm);
  if (dup) {
    state.duplicateMsg = `이미 등록된 업체입니다: ${dup.name}`;
    render();
    return;
  }
  await api('POST', '/companies', {
    name,
    industry: state.newCompany.industry.trim(),
    departments: state.newCompany.departments
  });
  await loadCompanies();
  state.newCompany = { name: "", industry: "", departments: [] };
  state.duplicateMsg = "";
  state.showAdd = false;
  render();
}

async function addContactLog() {
  const sel = state.selected;
  if (!sel || !state.newLog.date || !state.newLog.content) return;
  await api('POST', `/companies/${sel.id}/contacts`, {
    ...state.newLog,
    writer: state.user.name,
    dept: state.user.dept
  });
  await Promise.all([loadContactLogs(sel.id), loadCompanies()]);
  state.selected = state.companies.find(c => c.id === sel.id) || sel;
  state.newLog = { date: "", method: "전화", content: "" };
  state.showContactAdd = false;
  render();
}

async function addHistory() {
  const sel = state.selected;
  if (!sel || !state.newHistory.year) return;
  await api('POST', `/companies/${sel.id}/histories`, {
    ...state.newHistory,
    writer: state.user.name
  });
  await loadHistories(sel.id);
  state.newHistory = { year: "", department: "", student: "", type: "취업" };
  state.showHistoryAdd = false;
  render();
}

/* ── 시작 ── */
render();
