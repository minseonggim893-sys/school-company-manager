const DEPARTMENTS = [
  "파티시에과","스마트기계과","모빌리티과","친환경자동차과",
  "전기과","스마트전자과","드론지형정보과","건축리모델링과","전기배터리과"
];
const APP_TITLE = '학교 업체관리 시스템';
const APP_SUBTITLE = '대전도시과학고등학교';

let state = {
  user: null,
  authMode: 'login',
  authError: '', authSuccess: '',
  page: 'main',        // 'main' | 'admin'
  adminTab: 'users',   // 'users' | 'stats'
  adminUsers: [],
  adminStats: null,
  adminError: '',
  resetTarget: null,   // { id, name }
  resetPw: '',
  showResetModal: false,
  companies: [],
  selected: null,
  search: '', filterDept: '전체',
  contactLogs: {}, histories: {},
  showAdd: false, showContactAdd: false, showHistoryAdd: false, showDeleteConfirm: false,
  deleteTarget: null,
  newCompany: { name: '', industry: '', departments: [] },
  newLog: { date: '', method: '전화', content: '' },
  newHistory: { year: '', department: '', student: '', type: '취업' },
  duplicateMsg: ''
};

/* ── 토큰 ── */
function saveToken(t) { t ? localStorage.setItem('auth_token', t) : localStorage.removeItem('auth_token'); }
function getToken() { return localStorage.getItem('auth_token') || ''; }

/* ── API ── */
async function api(method, path, body) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const r = await fetch('/api' + path, opts);
    const data = await r.json();
    if (r.status === 401 && path !== '/auth/login' && path !== '/auth/me') {
      saveToken(null); state.user = null; render(); return {};
    }
    return data;
  } catch(e) { console.error(e); return {}; }
}

/* ── 데이터 로드 ── */
async function loadCompanies() {
  const d = await api('GET', '/companies');
  state.companies = d.companies || [];
}
async function loadContactLogs(id) {
  const d = await api('GET', `/companies/${id}/contacts`);
  state.contactLogs[id] = d.logs || [];
}
async function loadHistories(id) {
  const d = await api('GET', `/companies/${id}/histories`);
  state.histories[id] = d.histories || [];
}
async function loadAdminUsers() {
  const d = await api('GET', '/admin/users');
  state.adminUsers = d.users || [];
}
async function loadAdminStats() {
  const d = await api('GET', '/admin/stats');
  state.adminStats = d;
}

/* ── XSS 방어 ── */
function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function getFiltered() {
  return state.companies.filter(c => {
    const mS = !state.search || c.name.toLowerCase().includes(state.search.toLowerCase());
    const mD = state.filterDept === '전체' || (c.departments||[]).includes(state.filterDept);
    return mS && mD;
  });
}

/* ══════════════════════════════
   렌더링
══════════════════════════════ */
function render() {
  document.getElementById('app').innerHTML = state.user ? renderMain() : renderAuth();
}

/* ── 로그인/회원가입 ── */
function renderAuth() {
  const isLogin = state.authMode === 'login';
  return `
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#3b82f6 100%);padding:16px;">
    <div style="width:100%;max-width:420px;">
      <div style="text-align:center;margin-bottom:28px;">
        <div style="font-size:48px;margin-bottom:10px;">🏫</div>
        <h1 style="font-size:20px;font-weight:800;color:#fff;margin:0;">${APP_TITLE}</h1>
        <p style="color:#93c5fd;font-size:14px;font-weight:600;margin-top:4px;">${APP_SUBTITLE}</p>
      </div>
      <div style="background:#fff;border-radius:20px;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="display:flex;background:#f1f5f9;border-radius:10px;padding:4px;margin-bottom:24px;">
          <button onclick="switchAuthMode('login')" style="flex:1;padding:9px;border-radius:7px;border:none;font-size:14px;font-weight:600;cursor:pointer;
            background:${isLogin?'#fff':'transparent'};color:${isLogin?'#1e40af':'#64748b'};
            box-shadow:${isLogin?'0 1px 4px rgba(0,0,0,.12)':'none'};">로그인</button>
          <button onclick="switchAuthMode('register')" style="flex:1;padding:9px;border-radius:7px;border:none;font-size:14px;font-weight:600;cursor:pointer;
            background:${!isLogin?'#fff':'transparent'};color:${!isLogin?'#1e40af':'#64748b'};
            box-shadow:${!isLogin?'0 1px 4px rgba(0,0,0,.12)':'none'};">회원가입</button>
        </div>
        ${state.authError?`<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:9px;padding:11px 14px;font-size:13px;color:#b91c1c;margin-bottom:16px;">⚠️ ${esc(state.authError)}</div>`:''}
        ${state.authSuccess?`<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:9px;padding:11px 14px;font-size:13px;color:#15803d;margin-bottom:16px;">✅ ${esc(state.authSuccess)}</div>`:''}
        <form onsubmit="${isLogin?'submitLogin':'submitRegister'}(event)" style="display:grid;gap:14px;">
          ${!isLogin?`
            <div><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">이름</label>
              <input type="text" id="reg-name" placeholder="실명 입력" required /></div>
            <div><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">소속 학과</label>
              <select id="reg-dept" required>
                <option value="">학과 선택</option>
                ${DEPARTMENTS.map(d=>`<option value="${d}">${d}</option>`).join('')}
              </select></div>`:''}
          <div><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">아이디</label>
            <input type="text" id="auth-username" placeholder="아이디 입력" required autocomplete="username"/></div>
          <div><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">비밀번호</label>
            <input type="password" id="auth-password" placeholder="${isLogin?'비밀번호 입력':'4자 이상'}" required
              autocomplete="${isLogin?'current-password':'new-password'}"/></div>
          <button type="submit" class="btn btn-primary" style="width:100%;padding:12px;font-size:15px;font-weight:700;">
            ${isLogin?'로그인':'회원가입'}</button>
        </form>
        <p style="text-align:center;font-size:13px;color:#94a3b8;margin-top:16px;margin-bottom:0;">
          ${isLogin
            ?`계정이 없으신가요? <button onclick="switchAuthMode('register')" style="background:none;border:none;color:#1e40af;font-weight:600;cursor:pointer;">회원가입</button>`
            :`이미 계정이 있으신가요? <button onclick="switchAuthMode('login')" style="background:none;border:none;color:#1e40af;font-weight:600;cursor:pointer;">로그인</button>`}
        </p>
      </div>
    </div>
  </div>`;
}

/* ── 공통 헤더 ── */
function renderHeader() {
  const u = state.user;
  const isAdmin = u.role === 'admin';
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
    <div>
      <h1 style="font-size:20px;font-weight:800;color:#1e293b;margin:0;">🏫 ${APP_TITLE}</h1>
      <p style="font-size:13px;color:#64748b;margin:2px 0 0;">${APP_SUBTITLE}</p>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      ${isAdmin?`
        <button class="btn btn-sm ${state.page==='main'?'btn-primary':'btn-outline'}" onclick="goPage('main')">📋 업체관리</button>
        <button class="btn btn-sm ${state.page==='admin'?'btn-primary':'btn-outline'}" onclick="goPage('admin')">⚙️ 관리자</button>
      `:''}
      <div style="background:#eff6ff;padding:6px 12px;border-radius:8px;font-size:13px;color:#1e40af;font-weight:600;">
        ${isAdmin?'👑':'👤'} ${esc(u.name)}
        <span style="font-weight:400;color:#64748b;">(${esc(u.dept)})</span>
        ${isAdmin?`<span class="badge badge-admin" style="margin-left:4px;">관리자</span>`:''}
      </div>
      <button class="btn btn-outline btn-sm" onclick="doLogout()">로그아웃</button>
    </div>
  </div>`;
}

/* ── 메인(업체관리) 페이지 ── */
function renderMain() {
  if (state.page === 'admin') return renderAdminPage();
  const filtered = getFiltered();
  const sel = state.selected;
  return `
  <div style="max-width:1200px;margin:0 auto;padding:24px 16px;display:grid;gap:20px;">
    ${renderHeader()}
    <div class="card" style="padding:16px;display:grid;gap:12px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <input type="text" placeholder="업체명 검색" value="${esc(state.search)}"
          style="flex:1;min-width:180px;" oninput="onSearch(this.value)" />
        <button class="btn btn-outline" onclick="clearSearch()">초기화</button>
        <button class="btn btn-primary" onclick="openAdd()">+ 업체 등록</button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-sm ${state.filterDept==='전체'?'btn-active':'btn-outline'}" onclick="setDeptFilter('전체')">전체</button>
        ${DEPARTMENTS.map(d=>`<button class="btn btn-sm ${state.filterDept===d?'btn-active':'btn-outline'}" onclick="setDeptFilter('${d}')">${d}</button>`).join('')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div class="card" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <span style="font-weight:700;font-size:15px;">업체 목록</span>
          <span style="font-size:12px;color:#94a3b8;">총 ${filtered.length}개</span>
        </div>
        <div style="overflow-x:auto;border-radius:10px;border:1px solid #e5e7eb;">
          <table>
            <thead><tr><th>업체명</th><th>업종</th><th>관련 학과</th><th>최근 연락일</th><th></th></tr></thead>
            <tbody>
              ${filtered.length===0
                ?`<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px;">검색 결과 없음</td></tr>`
                :filtered.map(c=>`
                  <tr class="${sel?.id===c.id?'row-selected':''}" onclick="selectCompany(${c.id})">
                    <td style="font-weight:600;color:#1e40af;">${esc(c.name)}</td>
                    <td style="color:#64748b;">${esc(c.industry||'-')}</td>
                    <td style="color:#64748b;">${(c.departments||[]).map(esc).join(', ')||'-'}</td>
                    <td style="color:#94a3b8;white-space:nowrap;">${esc(c.last_contact||'-')}</td>
                    <td onclick="event.stopPropagation()">
                      <button class="btn btn-sm btn-danger" style="padding:3px 8px;" onclick="openDeleteConfirm(${c.id},'${esc(c.name)}')">🗑</button>
                    </td>
                  </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card" style="padding:16px;">
        <span style="font-weight:700;font-size:15px;">업체 상세</span>
        ${!sel?`<p style="font-size:13px;color:#94a3b8;margin-top:8px;">업체를 선택하세요.</p>`:renderDetail(sel)}
      </div>
    </div>
    ${state.showAdd?renderAddPanel():''}
    ${state.showContactAdd&&sel?renderContactAddPanel():''}
    ${state.showHistoryAdd&&sel?renderHistoryAddPanel():''}
  </div>
  ${state.showDeleteConfirm?renderDeleteModal():''}
  ${state.showResetModal?renderResetModal():''}`;
}

/* ── 관리자 페이지 ── */
function renderAdminPage() {
  const stats = state.adminStats;
  return `
  <div style="max-width:1100px;margin:0 auto;padding:24px 16px;display:grid;gap:20px;">
    ${renderHeader()}

    <!-- 탭 -->
    <div style="display:flex;border-bottom:2px solid #e5e7eb;gap:4px;">
      <button class="tab-btn ${state.adminTab==='stats'?'active':''}" onclick="setAdminTab('stats')">📊 통계</button>
      <button class="tab-btn ${state.adminTab==='users'?'active':''}" onclick="setAdminTab('users')">👥 회원 관리</button>
    </div>

    ${state.adminError?`<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:9px;padding:11px 14px;font-size:13px;color:#b91c1c;">⚠️ ${esc(state.adminError)}</div>`:''}

    ${state.adminTab==='stats'?renderAdminStats(stats):renderAdminUsers()}
  </div>
  ${state.showResetModal?renderResetModal():''}`;
}

function renderAdminStats(s) {
  if (!s) return `<div class="card"><p style="color:#94a3b8;font-size:14px;">통계 로딩 중...</p></div>`;
  const items = [
    { icon:'👥', label:'전체 회원', val: s.users, color:'#eff6ff', tc:'#1e40af' },
    { icon:'🏢', label:'등록 업체', val: s.companies, color:'#f0fdf4', tc:'#15803d' },
    { icon:'📞', label:'연락 이력', val: s.contacts, color:'#fef9c3', tc:'#a16207' },
    { icon:'🎓', label:'취업/실습 이력', val: s.histories, color:'#fdf4ff', tc:'#9333ea' },
  ];
  return `
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">
    ${items.map(i=>`
      <div class="card" style="text-align:center;padding:24px 16px;">
        <div style="font-size:32px;margin-bottom:8px;">${i.icon}</div>
        <div style="font-size:28px;font-weight:800;color:${i.tc};">${i.val}</div>
        <div style="font-size:13px;color:#64748b;margin-top:4px;">${i.label}</div>
      </div>`).join('')}
  </div>`;
}

function renderAdminUsers() {
  const users = state.adminUsers;
  return `
  <div class="card" style="padding:16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <span style="font-weight:700;font-size:15px;">회원 목록</span>
      <span style="font-size:12px;color:#94a3b8;">총 ${users.length}명</span>
    </div>
    <div style="overflow-x:auto;border-radius:10px;border:1px solid #e5e7eb;">
      <table>
        <thead><tr><th>이름</th><th>아이디</th><th>소속 학과</th><th>역할</th><th>가입일</th><th>관리</th></tr></thead>
        <tbody>
          ${users.length===0
            ?`<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:24px;">회원 없음</td></tr>`
            :users.map(u=>`
              <tr>
                <td style="font-weight:600;">${esc(u.name)}</td>
                <td style="color:#64748b;">${esc(u.username)}</td>
                <td style="color:#64748b;">${esc(u.dept)}</td>
                <td><span class="badge badge-${u.role}">${u.role==='admin'?'👑 관리자':'교사'}</span></td>
                <td style="color:#94a3b8;font-size:13px;">${esc((u.created_at||'').slice(0,10))}</td>
                <td>
                  <div style="display:flex;gap:4px;flex-wrap:wrap;">
                    <button class="btn btn-sm btn-outline" style="font-size:12px;"
                      onclick="toggleRole(${u.id},'${u.role}')">
                      ${u.role==='admin'?'교사로 변경':'관리자 지정'}
                    </button>
                    <button class="btn btn-sm btn-outline" style="font-size:12px;"
                      onclick="openResetModal(${u.id},'${esc(u.name)}')">🔑 비번초기화</button>
                    <button class="btn btn-sm btn-danger" style="font-size:12px;"
                      onclick="deleteUser(${u.id},'${esc(u.name)}')">🗑 삭제</button>
                  </div>
                </td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function renderResetModal() {
  const t = state.resetTarget;
  return `
  <div class="modal-bg" onclick="closeResetModal()">
    <div style="background:#fff;border-radius:18px;padding:28px;max-width:360px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25);" onclick="event.stopPropagation()">
      <h3 style="font-size:16px;font-weight:700;margin-bottom:6px;">🔑 비밀번호 초기화</h3>
      <p style="font-size:13px;color:#64748b;margin-bottom:16px;"><b>${esc(t?.name)}</b> 님의 새 비밀번호를 입력하세요.</p>
      <input type="password" id="reset-pw-input" placeholder="새 비밀번호 (4자 이상)" style="margin-bottom:16px;"
        oninput="state.resetPw=this.value" />
      <div style="display:flex;gap:10px;">
        <button class="btn btn-outline" style="flex:1;" onclick="closeResetModal()">취소</button>
        <button class="btn btn-primary" style="flex:1;" onclick="confirmResetPassword()">변경</button>
      </div>
    </div>
  </div>`;
}

function renderDetail(sel) {
  const logs = state.contactLogs[sel.id]||[];
  const hists = state.histories[sel.id]||[];
  return `
  <div style="display:grid;gap:10px;font-size:14px;margin-top:10px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div class="info-box"><p class="info-label">업체명</p><p style="font-weight:700;">${esc(sel.name)}</p></div>
      <div class="info-box"><p class="info-label">업종</p><p>${esc(sel.industry||'-')}</p></div>
    </div>
    <div class="info-box"><p class="info-label">관련 학과</p>
      <div>${(sel.departments||[]).map(d=>`<span class="tag">${esc(d)}</span>`).join(' ')||'-'}</div>
    </div>
    <div class="info-box"><p class="info-label">최근 연락일</p><p>${esc(sel.last_contact||'-')}</p></div>
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-weight:600;font-size:13px;">📞 연락 이력</span>
        <button class="btn btn-outline btn-sm" onclick="openContactAdd()">이력 추가</button>
      </div>
      ${!logs.length?`<p style="font-size:13px;color:#94a3b8;">기록 없음</p>`:
        logs.map(l=>`<div class="log-item">
          <p style="font-weight:600;color:#1e293b;">${esc(l.date)} · ${esc(l.method)}</p>
          <p style="color:#475569;margin:2px 0;">${esc(l.content||'')}</p>
          <p style="font-size:12px;color:#94a3b8;">${esc(l.writer)} (${esc(l.dept)})</p>
        </div>`).join('')}
    </div>
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-weight:600;font-size:13px;">🎓 취업 / 실습 이력</span>
        <button class="btn btn-outline btn-sm" onclick="openHistoryAdd()">기록 추가</button>
      </div>
      ${!hists.length?`<p style="font-size:13px;color:#94a3b8;">기록 없음</p>`:
        hists.map(h=>`<div class="log-item">
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
      업체명 기준으로 중복 확인 후 등록합니다.
    </div>
    <input type="text" placeholder="업체명" value="${esc(nc.name)}" oninput="updateField('newCompany','name',this.value)" />
    ${state.duplicateMsg?`<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;font-size:13px;color:#b91c1c;">${esc(state.duplicateMsg)}</div>`:''}
    <input type="text" placeholder="업종" value="${esc(nc.industry)}" oninput="updateField('newCompany','industry',this.value)" />
    <div>
      <p style="font-size:13px;font-weight:600;margin-bottom:8px;">관련 학과 선택</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${DEPARTMENTS.map(d=>`<button class="btn btn-sm ${nc.departments.includes(d)?'btn-active':'btn-outline'}" onclick="toggleDept('${d}')">${d}</button>`).join('')}
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
  return `
  <div class="card" style="padding:20px;display:grid;gap:14px;">
    <h2 style="font-weight:700;font-size:15px;">연락 이력 추가</h2>
    <p style="font-size:13px;color:#64748b;">작성자: <b>${esc(state.user.name)}</b> (${esc(state.user.dept)})</p>
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
  return `
  <div class="card" style="padding:20px;display:grid;gap:14px;">
    <h2 style="font-weight:700;font-size:15px;">취업 / 실습 기록 추가</h2>
    <p style="font-size:13px;color:#64748b;">기록자: <b>${esc(state.user.name)}</b></p>
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
    <div style="background:#fff;border-radius:18px;padding:32px;max-width:360px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.25);" onclick="event.stopPropagation()">
      <div style="font-size:44px;margin-bottom:12px;">🗑️</div>
      <h3 style="font-size:17px;font-weight:700;color:#1e293b;margin-bottom:8px;">업체 삭제</h3>
      <p style="font-size:14px;color:#475569;margin-bottom:6px;"><b style="color:#dc2626;">${esc(t?.name)}</b> 업체를 삭제하시겠습니까?</p>
      <p style="font-size:13px;color:#94a3b8;margin-bottom:24px;">연락 이력, 취업/실습 이력이 모두 함께 삭제됩니다.</p>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-outline" style="flex:1;padding:11px;" onclick="closeDeleteConfirm()">취소</button>
        <button class="btn btn-danger" style="flex:1;padding:11px;font-weight:700;" onclick="confirmDelete()">삭제</button>
      </div>
    </div>
  </div>`;
}

/* ══════════════════════════════
   이벤트 핸들러
══════════════════════════════ */
function switchAuthMode(m) { state.authMode=m; state.authError=''; state.authSuccess=''; render(); }

async function submitLogin(e) {
  e.preventDefault();
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;
  const data = await api('POST', '/auth/login', { username, password });
  if (data.error) { state.authError = data.error; render(); return; }
  saveToken(data.token);
  state.user = data.user;
  state.authError = '';
  await loadCompanies();
  if (data.user.role === 'admin') { await loadAdminStats(); await loadAdminUsers(); }
  render();
}

async function submitRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const dept = document.getElementById('reg-dept').value;
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!name||!dept||!username||!password) { state.authError='모든 항목을 입력해주세요.'; render(); return; }
  const data = await api('POST', '/auth/register', { name, dept, username, password });
  if (data.error) { state.authError=data.error; render(); return; }
  state.authError=''; state.authSuccess=data.message; state.authMode='login'; render();
}

async function doLogout() {
  await api('POST', '/auth/logout');
  saveToken(null);
  state.user=null; state.companies=[]; state.selected=null;
  state.contactLogs={}; state.histories={}; state.page='main';
  render();
}

function goPage(p) {
  state.page = p;
  if (p==='admin') { loadAdminStats(); loadAdminUsers(); }
  render();
}
function setAdminTab(t) { state.adminTab=t; render(); }

/* 관리자: 역할 변경 */
async function toggleRole(id, currentRole) {
  const newRole = currentRole==='admin' ? 'teacher' : 'admin';
  const data = await api('PUT', `/admin/users/${id}/role`, { role: newRole });
  if (data.error) { state.adminError=data.error; render(); return; }
  state.adminError='';
  await loadAdminUsers(); render();
}

/* 관리자: 비번 초기화 모달 */
function openResetModal(id, name) { state.resetTarget={id,name}; state.resetPw=''; state.showResetModal=true; render(); }
function closeResetModal() { state.showResetModal=false; state.resetTarget=null; state.resetPw=''; render(); }
async function confirmResetPassword() {
  if (!state.resetPw||state.resetPw.length<4) { alert('비밀번호는 4자 이상이어야 합니다.'); return; }
  const data = await api('PUT', `/admin/users/${state.resetTarget.id}/reset-password`, { password: state.resetPw });
  if (data.error) { alert(data.error); return; }
  closeResetModal();
}

/* 관리자: 회원 삭제 */
async function deleteUser(id, name) {
  if (!confirm(`${name} 님을 삭제하시겠습니까?`)) return;
  const data = await api('DELETE', `/admin/users/${id}`);
  if (data.error) { state.adminError=data.error; render(); return; }
  state.adminError='';
  await loadAdminUsers(); render();
}

/* 업체 */
async function selectCompany(id) {
  state.selected = state.companies.find(c=>c.id===id)||null;
  if (state.selected) await Promise.all([loadContactLogs(id), loadHistories(id)]);
  render();
}
function onSearch(v) { state.search=v; render(); }
function clearSearch() { state.search=''; render(); }
function setDeptFilter(d) { state.filterDept=d; render(); }
function openAdd() { state.showAdd=true; state.duplicateMsg=''; render(); }
function closeAdd() { state.showAdd=false; state.duplicateMsg=''; state.newCompany={name:'',industry:'',departments:[]}; render(); }
function openContactAdd() { state.showContactAdd=true; render(); }
function closeContactAdd() { state.showContactAdd=false; render(); }
function openHistoryAdd() { state.showHistoryAdd=true; render(); }
function closeHistoryAdd() { state.showHistoryAdd=false; render(); }
function updateField(obj, key, val) { state[obj][key]=val; if(obj==='newCompany'&&key==='name') state.duplicateMsg=''; }
function toggleDept(d) {
  const arr = state.newCompany.departments;
  state.newCompany.departments = arr.includes(d)?arr.filter(x=>x!==d):[...arr,d];
  render();
}
async function addCompany() {
  const name = state.newCompany.name.trim();
  if (!name) { state.duplicateMsg='업체명을 입력해주세요.'; render(); return; }
  const norm = name.replace(/\s+/g,'').toLowerCase();
  const dup = state.companies.find(c=>c.name.replace(/\s+/g,'').toLowerCase()===norm);
  if (dup) { state.duplicateMsg=`이미 등록된 업체입니다: ${dup.name}`; render(); return; }
  const result = await api('POST', '/companies', { name, industry: state.newCompany.industry.trim(), departments: state.newCompany.departments });
  if (result.error) { state.duplicateMsg=result.error; render(); return; }
  await loadCompanies();
  state.newCompany={name:'',industry:'',departments:[]}; state.duplicateMsg=''; state.showAdd=false;
  render();
}
function openDeleteConfirm(id, name) { state.deleteTarget={id,name}; state.showDeleteConfirm=true; render(); }
function closeDeleteConfirm() { state.showDeleteConfirm=false; state.deleteTarget=null; render(); }
async function confirmDelete() {
  const t = state.deleteTarget;
  if (!t) return;
  await api('DELETE', `/companies/${t.id}`);
  if (state.selected?.id===t.id) state.selected=null;
  await loadCompanies();
  state.showDeleteConfirm=false; state.deleteTarget=null; render();
}
async function addContactLog() {
  const sel = state.selected;
  if (!sel||!state.newLog.date||!state.newLog.content) return;
  await api('POST', `/companies/${sel.id}/contacts`, { ...state.newLog, writer: state.user.name, dept: state.user.dept });
  await Promise.all([loadContactLogs(sel.id), loadCompanies()]);
  state.selected = state.companies.find(c=>c.id===sel.id)||sel;
  state.newLog={date:'',method:'전화',content:''}; state.showContactAdd=false; render();
}
async function addHistory() {
  const sel = state.selected;
  if (!sel||!state.newHistory.year) return;
  await api('POST', `/companies/${sel.id}/histories`, { ...state.newHistory, writer: state.user.name });
  await loadHistories(sel.id);
  state.newHistory={year:'',department:'',student:'',type:'취업'}; state.showHistoryAdd=false; render();
}

/* ── 시작 ── */
async function init() {
  const token = getToken();
  if (token) {
    const data = await api('GET', '/auth/me');
    if (data.user) {
      state.user = data.user;
      await loadCompanies();
      if (data.user.role==='admin') { await loadAdminStats(); await loadAdminUsers(); }
    } else { saveToken(null); }
  }
  render();
}
init();
