const DEPARTMENTS = [
  "파티시에과","스마트기계과","모빌리티과","친환경자동차과",
  "전기과","스마트전자과","드론지형정보과","건축리모델링과","전기배터리과"
];

let state = {
  user: null,           // { id, name, dept }
  authMode: 'login',    // 'login' | 'register'
  authError: '',
  authSuccess: '',
  companies: [],
  selected: null,
  search: "",
  filterDept: "전체",
  contactLogs: {},
  histories: {},
  showAdd: false,
  showContactAdd: false,
  showHistoryAdd: false,
  showDeleteConfirm: false,
  deleteTarget: null,   // { id, name }
  newCompany: { name: "", industry: "", departments: [] },
  newLog: { date: "", method: "전화", content: "" },
  newHistory: { year: "", department: "", student: "", type: "취업" },
  duplicateMsg: "",
  loading: false
};

/* ─────────────────────────────
   API 헬퍼
───────────────────────────── */
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch('/api' + path, opts);
  return r.json();
}

/* ─────────────────────────────
   데이터 로드
───────────────────────────── */
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

/* ─────────────────────────────
   XSS 방어
───────────────────────────── */
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─────────────────────────────
   필터
───────────────────────────── */
function getFiltered() {
  return state.companies.filter(c => {
    const matchS = !state.search || c.name.toLowerCase().includes(state.search.toLowerCase());
    const matchD = state.filterDept === '전체' || (c.departments||[]).includes(state.filterDept);
    return matchS && matchD;
  });
}

/* ═══════════════════════════════
   렌더링
═══════════════════════════════ */
function render() {
  document.getElementById('app').innerHTML = state.user ? renderMain() : renderAuth();
}

/* ── 로그인/회원가입 화면 ── */
function renderAuth() {
  const isLogin = state.authMode === 'login';
  return `
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:16px;">
    <div style="width:100%;max-width:420px;">

      <!-- 로고 -->
      <div style="text-align:center;margin-bottom:28px;">
        <div style="font-size:48px;margin-bottom:10px;">🏫</div>
        <h1 style="font-size:22px;font-weight:700;color:#fff;margin:0;">학교 업체관리 시스템</h1>
        <p style="color:#bfdbfe;font-size:13px;margin-top:4px;">School Partner Company Management</p>
      </div>

      <!-- 카드 -->
      <div style="background:#fff;border-radius:18px;padding:32px;box-shadow:0 20px 50px rgba(0,0,0,0.2);">

        <!-- 탭 -->
        <div style="display:flex;background:#f1f5f9;border-radius:10px;padding:4px;margin-bottom:24px;">
          <button onclick="switchAuthMode('login')"
            style="flex:1;padding:8px;border-radius:7px;border:none;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;
            background:${isLogin?'#fff':'transparent'};color:${isLogin?'#1e40af':'#64748b'};
            box-shadow:${isLogin?'0 1px 4px rgba(0,0,0,0.1)':'none'};">
            로그인
          </button>
          <button onclick="switchAuthMode('register')"
            style="flex:1;padding:8px;border-radius:7px;border:none;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;
            background:${!isLogin?'#fff':'transparent'};color:${!isLogin?'#1e40af':'#64748b'};
            box-shadow:${!isLogin?'0 1px 4px rgba(0,0,0,0.1)':'none'};">
            회원가입
          </button>
        </div>

        ${state.authError ? `
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;font-size:13px;color:#b91c1c;margin-bottom:16px;">
            ⚠️ ${esc(state.authError)}
          </div>` : ''}
        ${state.authSuccess ? `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;font-size:13px;color:#15803d;margin-bottom:16px;">
            ✅ ${esc(state.authSuccess)}
          </div>` : ''}

        <form onsubmit="${isLogin?'submitLogin':'submitRegister'}(event)" style="display:grid;gap:14px;">
          ${!isLogin ? `
            <div>
              <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">이름</label>
              <input type="text" id="reg-name" placeholder="실명을 입력하세요" required />
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">소속 학과</label>
              <select id="reg-dept" required style="width:100%;">
                <option value="">학과 선택</option>
                ${DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('')}
              </select>
            </div>
          ` : ''}
          <div>
            <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">아이디</label>
            <input type="text" id="auth-username" placeholder="아이디 입력" required autocomplete="username" />
          </div>
          <div>
            <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">비밀번호</label>
            <input type="password" id="auth-password" placeholder="${isLogin?'비밀번호 입력':'4자 이상 입력'}" required autocomplete="${isLogin?'current-password':'new-password'}" />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;padding:12px;font-size:15px;font-weight:700;margin-top:4px;">
            ${isLogin ? '로그인' : '회원가입'}
          </button>
        </form>

        ${isLogin ? `
          <p style="text-align:center;font-size:13px;color:#94a3b8;margin-top:16px;">
            계정이 없으신가요?
            <button onclick="switchAuthMode('register')" style="background:none;border:none;color:#1e40af;font-weight:600;cursor:pointer;">회원가입</button>
          </p>` : `
          <p style="text-align:center;font-size:13px;color:#94a3b8;margin-top:16px;">
            이미 계정이 있으신가요?
            <button onclick="switchAuthMode('login')" style="background:none;border:none;color:#1e40af;font-weight:600;cursor:pointer;">로그인</button>
          </p>`}
      </div>
    </div>
  </div>`;
}

/* ── 메인 화면 ── */
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
        <div style="background:#eff6ff;padding:6px 12px;border-radius:8px;font-size:13px;color:#1e40af;font-weight:600;">
          👤 ${esc(u.name)} <span style="font-weight:400;color:#64748b;">(${esc(u.dept)})</span>
        </div>
        <button class="btn btn-outline btn-sm" onclick="doLogout()">로그아웃</button>
      </div>
    </div>

    <!-- 검색/필터 -->
    <div class="card" style="padding:16px;display:grid;gap:12px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <input type="text" placeholder="업체명 검색" value="${esc(state.search)}"
          style="flex:1;min-width:180px;" oninput="onSearch(this.value)" />
        <button class="btn btn-outline" onclick="clearSearch()">초기화</button>
        <button class="btn btn-primary" onclick="openAdd()">+ 업체 등록</button>
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
              <tr><th>업체명</th><th>업종</th><th>관련 학과</th><th>최근 연락일</th><th></th></tr>
            </thead>
            <tbody>
              ${filtered.length === 0
                ? `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px;">검색 결과가 없습니다.</td></tr>`
                : filtered.map(c => `
                  <tr class="${sel?.id===c.id?'row-selected':''}" onclick="selectCompany(${c.id})">
                    <td style="font-weight:600;color:#1e40af;">${esc(c.name)}</td>
                    <td style="color:#64748b;">${esc(c.industry||'-')}</td>
                    <td style="color:#64748b;">${(c.departments||[]).map(esc).join(', ')||'-'}</td>
                    <td style="color:#94a3b8;white-space:nowrap;">${esc(c.last_contact||'-')}</td>
                    <td onclick="event.stopPropagation()">
                      <button class="btn btn-sm btn-danger" onclick="openDeleteConfirm(${c.id},'${esc(c.name)}')"
                        title="삭제" style="padding:3px 8px;">🗑</button>
                    </td>
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
          : renderDetail(sel)}
      </div>
    </div>

    <!-- 업체 등록 패널 -->
    ${state.showAdd ? renderAddPanel() : ''}
    <!-- 연락 이력 추가 패널 -->
    ${state.showContactAdd && sel ? renderContactAddPanel() : ''}
    <!-- 취업/실습 기록 추가 패널 -->
    ${state.showHistoryAdd && sel ? renderHistoryAddPanel() : ''}

  </div>

  <!-- 삭제 확인 모달 -->
  ${state.showDeleteConfirm ? renderDeleteModal() : ''}
  `;
}

function renderDetail(sel) {
  const logs = state.contactLogs[sel.id] || [];
  const hists = state.histories[sel.id] || [];
  return `
  <div style="display:grid;gap:10px;font-size:14px;margin-top:10px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div class="info-box"><p class="info-label">업체명</p><p style="font-weight:700;">${esc(sel.name)}</p></div>
      <div class="info-box"><p class="info-label">업종</p><p>${esc(sel.industry||'-')}</p></div>
    </div>
    <div class="info-box">
      <p class="info-label">관련 학과</p>
      <div>${(sel.departments||[]).map(d=>`<span class="tag">${esc(d)}</span>`).join(' ')||'-'}</div>
    </div>
    <div class="info-box"><p class="info-label">최근 연락일</p><p>${esc(sel.last_contact||'-')}</p></div>

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
          </div>`).join('')}
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
          </div>`).join('')}
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
    <input type="text" placeholder="업체명" value="${esc(nc.name)}" oninput="updateField('newCompany','name',this.value)" />
    ${state.duplicateMsg ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:13px;color:#b91c1c;">${esc(state.duplicateMsg)}</div>` : ''}
    <input type="text" placeholder="업종" value="${esc(nc.industry)}" oninput="updateField('newCompany','industry',this.value)" />
    <div>
      <p style="font-size:13px;font-weight:600;margin-bottom:8px;">관련 학과 선택</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${DEPARTMENTS.map(d => `
          <button class="btn btn-sm ${nc.departments.includes(d)?'btn-active':'btn-outline'}" onclick="toggleDept('${d}')">${d}</button>
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
    <input type="date" value="${esc(nl.date)}" onchange="updateField('newLog','date',this.value)" />
    <select onchange="updateField('newLog','method',this.value)">
      ${['전화','방문','이메일','문자','기타'].map(m=>`<option ${nl.method===m?'selected':''}>${m}</option>`).join('')}
    </select>
    <input type="text" placeholder="연락 내용" value="${esc(nl.content)}" oninput="updateField('newLog','content',this.value)" />
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
    <input type="text" placeholder="연도 (예: 2026)" value="${esc(nh.year)}" oninput="updateField('newHistory','year',this.value)" />
    <input type="text" placeholder="학과" value="${esc(nh.department)}" oninput="updateField('newHistory','department',this.value)" />
    <input type="text" placeholder="학생 이름" value="${esc(nh.student)}" oninput="updateField('newHistory','student',this.value)" />
    <select onchange="updateField('newHistory','type',this.value)">
      ${['취업','현장실습'].map(t=>`<option ${nh.type===t?'selected':''}>${t}</option>`).join('')}
    </select>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-primary" onclick="addHistory()">저장</button>
      <button class="btn btn-outline" onclick="closeHistoryAdd()">취소</button>
    </div>
  </div>`;
}

function renderDeleteModal() {
  const t = state.deleteTarget;
  return `
  <div class="modal-bg" onclick="closeDeleteConfirm()">
    <div style="background:#fff;border-radius:16px;padding:32px;max-width:360px;width:100%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
      <div style="font-size:48px;margin-bottom:12px;">🗑️</div>
      <h3 style="font-size:17px;font-weight:700;color:#1e293b;margin-bottom:8px;">업체 삭제</h3>
      <p style="font-size:14px;color:#475569;margin-bottom:8px;">
        <b style="color:#dc2626;">${esc(t?.name)}</b> 업체를 삭제하시겠습니까?
      </p>
      <p style="font-size:13px;color:#94a3b8;margin-bottom:24px;">연락 이력, 취업/실습 이력이 모두 함께 삭제됩니다.</p>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-outline" style="flex:1;padding:11px;" onclick="closeDeleteConfirm()">취소</button>
        <button class="btn btn-danger" style="flex:1;padding:11px;font-weight:700;" onclick="confirmDelete()">삭제</button>
      </div>
    </div>
  </div>`;
}

/* ═══════════════════════════════
   이벤트 핸들러
═══════════════════════════════ */

/* ─ 인증 ─ */
function switchAuthMode(mode) {
  state.authMode = mode;
  state.authError = '';
  state.authSuccess = '';
  render();
}

async function submitLogin(e) {
  e.preventDefault();
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!username || !password) return;
  const data = await api('POST', '/auth/login', { username, password });
  if (data.error) { state.authError = data.error; render(); return; }
  state.user = data.user;
  state.authError = '';
  await loadCompanies();
  render();
}

async function submitRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const dept = document.getElementById('reg-dept').value;
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!name || !dept || !username || !password) { state.authError = '모든 항목을 입력해주세요.'; render(); return; }
  const data = await api('POST', '/auth/register', { name, dept, username, password });
  if (data.error) { state.authError = data.error; render(); return; }
  state.authError = '';
  state.authSuccess = data.message + ' 로그인 화면으로 이동합니다.';
  state.authMode = 'login';
  render();
}

async function doLogout() {
  await api('POST', '/auth/logout');
  state.user = null;
  state.companies = [];
  state.selected = null;
  state.contactLogs = {};
  state.histories = {};
  render();
}

/* ─ 업체 ─ */
async function selectCompany(id) {
  state.selected = state.companies.find(c => c.id === id) || null;
  if (state.selected) await Promise.all([loadContactLogs(id), loadHistories(id)]);
  render();
}
function onSearch(v) { state.search = v; render(); }
function clearSearch() { state.search = ""; render(); }
function setDeptFilter(d) { state.filterDept = d; render(); }

function openAdd() { state.showAdd = true; state.duplicateMsg = ""; render(); }
function closeAdd() { state.showAdd=false; state.duplicateMsg=""; state.newCompany={name:"",industry:"",departments:[]}; render(); }
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
  state.newCompany.departments = arr.includes(d) ? arr.filter(x=>x!==d) : [...arr,d];
  render();
}

async function addCompany() {
  const name = state.newCompany.name.trim();
  if (!name) return;
  const norm = name.replace(/\s+/g,'').toLowerCase();
  const dup = state.companies.find(c => c.name.replace(/\s+/g,'').toLowerCase()===norm);
  if (dup) { state.duplicateMsg=`이미 등록된 업체입니다: ${dup.name}`; render(); return; }
  await api('POST', '/companies', { name, industry: state.newCompany.industry.trim(), departments: state.newCompany.departments });
  await loadCompanies();
  state.newCompany={name:"",industry:"",departments:[]}; state.duplicateMsg=""; state.showAdd=false;
  render();
}

/* ─ 삭제 ─ */
function openDeleteConfirm(id, name) {
  state.deleteTarget = { id, name };
  state.showDeleteConfirm = true;
  render();
}
function closeDeleteConfirm() {
  state.showDeleteConfirm = false;
  state.deleteTarget = null;
  render();
}
async function confirmDelete() {
  const t = state.deleteTarget;
  if (!t) return;
  await api('DELETE', `/companies/${t.id}`);
  if (state.selected?.id === t.id) state.selected = null;
  await loadCompanies();
  state.showDeleteConfirm = false;
  state.deleteTarget = null;
  render();
}

/* ─ 연락/이력 ─ */
async function addContactLog() {
  const sel = state.selected;
  if (!sel || !state.newLog.date || !state.newLog.content) return;
  await api('POST', `/companies/${sel.id}/contacts`, { ...state.newLog, writer: state.user.name, dept: state.user.dept });
  await Promise.all([loadContactLogs(sel.id), loadCompanies()]);
  state.selected = state.companies.find(c=>c.id===sel.id)||sel;
  state.newLog={date:"",method:"전화",content:""}; state.showContactAdd=false;
  render();
}
async function addHistory() {
  const sel = state.selected;
  if (!sel || !state.newHistory.year) return;
  await api('POST', `/companies/${sel.id}/histories`, { ...state.newHistory, writer: state.user.name });
  await loadHistories(sel.id);
  state.newHistory={year:"",department:"",student:"",type:"취업"}; state.showHistoryAdd=false;
  render();
}

/* ═══════════════════════════════
   앱 시작 - 세션 확인
═══════════════════════════════ */
async function init() {
  const data = await api('GET', '/auth/me');
  if (data.user) {
    state.user = data.user;
    await loadCompanies();
  }
  render();
}

init();
