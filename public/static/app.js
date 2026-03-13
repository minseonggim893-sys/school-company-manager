const DEPARTMENTS = [
  "파티시에과","스마트기계과","모빌리티과","친환경자동차과",
  "전기과","스마트전자과","드론지형정보과","건축리모델링과","전기배터리과","보통교과"
];
const APP_TITLE = '학교 업체관리 시스템';
const APP_SUBTITLE = '대전도시과학고등학교';

const PAGE_SIZE = 10;

let state = {
  user: null,
  authMode: 'login',
  authError: '', authSuccess: '',
  page: 'main',
  currentPage: 1,
  adminTab: 'users',
  adminUsers: [],
  adminStats: null,
  adminError: '',
  resetTarget: null,
  resetPw: '',
  showResetModal: false,
  companies: [],
  selected: null,
  search: '',
  filterDept: '전체',
  contactLogs: {},
  histories: {},
  // 모달 상태
  showAdd: false,
  showEditCompany: false,
  showContactAdd: false,
  showContactEdit: false,
  showHistoryAdd: false,
  showHistoryEdit: false,
  showDeleteConfirm: false,
  deleteTarget: null,
  editContactTarget: null,
  editHistoryTarget: null,
  // 폼 데이터
  newCompany: { name:'', industry:'', address:'', phone:'', manager_name:'', manager_phone:'', manager_email:'', memo:'', departments:[] },
  editCompany: { id:null, name:'', industry:'', address:'', phone:'', manager_name:'', manager_phone:'', manager_email:'', memo:'', departments:[] },
  newLog: { date:'', method:'전화', content:'' },
  editLog: { id:null, date:'', method:'전화', content:'' },
  newHistory: { year:'', department:'', student:'', type:'취업' },
  editHistory: { id:null, year:'', department:'', student:'', type:'취업' },
  duplicateMsg: ''
};

/* ── 토큰 ── */
function saveToken(t) { t ? localStorage.setItem('auth_token',t) : localStorage.removeItem('auth_token'); }
function getToken() { return localStorage.getItem('auth_token') || ''; }

/* ── API ── */
async function api(method, path, body) {
  const token = getToken();
  const headers = { 'Content-Type':'application/json' };
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
function getPagedCompanies() {
  const filtered = getFiltered();
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(state.currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  return { items: filtered.slice(start, start + PAGE_SIZE), total, totalPages, currentPage: safePage };
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
      <div style="text-align:center;margin-top:20px;">
        <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;">© ${new Date().getFullYear()} Copyright by <strong style="color:rgba(255,255,255,0.85);">김민성</strong></p>
        <p style="margin:4px 0 0;"><a href="mailto:anzel386@naver.com" style="color:rgba(255,255,255,0.6);font-size:12px;text-decoration:none;">anzel386@naver.com</a></p>
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

/* ── 메인 페이지 ── */
function renderMain() {
  if (state.page === 'admin') return renderAdminPage();
  const filtered = getFiltered();
  const sel = state.selected;
  return `
  <div style="max-width:1300px;margin:0 auto;padding:24px 16px;display:grid;gap:20px;">
    ${renderHeader()}
    <div class="card" style="padding:16px;display:grid;gap:12px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <input type="text" id="search-input" placeholder="업체명 검색" value="${esc(state.search)}"
          style="flex:1;min-width:180px;"
          oninput="onSearch(this.value)" />
        <button class="btn btn-outline" onclick="clearSearch()">초기화</button>
        <button class="btn btn-primary" onclick="openAdd()">+ 업체 등록</button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-sm ${state.filterDept==='전체'?'btn-active':'btn-outline'} dept-filter-btn" data-dept="전체" onclick="setDeptFilter('전체')">전체</button>
        ${DEPARTMENTS.map(d=>`<button class="btn btn-sm ${state.filterDept===d?'btn-active':'btn-outline'} dept-filter-btn" data-dept="${d}" onclick="setDeptFilter('${d}')">${d}</button>`).join('')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div class="card" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <span style="font-weight:700;font-size:15px;">업체 목록</span>
          <span id="company-list-count" style="font-size:12px;color:#94a3b8;">총 ${filtered.length}개</span>
        </div>
        <div style="overflow-x:auto;border-radius:10px;border:1px solid #e5e7eb;">
          <table style="table-layout:fixed;width:100%;">
            <colgroup>
              <col style="width:26%"/>
              <col style="width:15%"/>
              <col style="width:22%"/>
              <col style="width:13%"/>
              <col style="width:16%"/>
              <col style="width:8%"/>
            </colgroup>
            <thead><tr>
              <th>업체명</th>
              <th>업종</th>
              <th>관련 학과</th>
              <th>최근 연락일</th>
              <th>연락자</th>
              <th></th>
            </tr></thead>
            <tbody id="company-list-body">
              ${(()=>{const {items,total,totalPages,currentPage}=getPagedCompanies();
                return items.length===0
                  ?`<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:24px;">검색 결과 없음</td></tr>`
                  :items.map(c=>`
                  <tr class="${sel?.id===c.id?'row-selected':''}" onclick="selectCompany(${c.id})">
                    <td style="font-weight:600;color:#1e40af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(c.name)}</td>
                    <td style="color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(c.industry||'-')}</td>
                    <td style="color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;">${(c.departments||[]).map(esc).join(', ')||'-'}</td>
                    <td style="color:#94a3b8;white-space:nowrap;font-size:12px;">${esc(!c.last_contact||c.last_contact==='-'?'-':c.last_contact)}</td>
                    <td style="color:#3b82f6;white-space:nowrap;font-size:12px;overflow:hidden;text-overflow:ellipsis;">${esc(c.last_contact_writer||'-')}</td>
                    <td onclick="event.stopPropagation()" style="text-align:center;">
                      ${state.user?.role==='admin'?`<button class="btn btn-sm btn-danger" style="padding:3px 8px;" onclick="openDeleteConfirm(${c.id},'${esc(c.name)}')">🗑</button>`:''}
                    </td>
                  </tr>`).join('');})()}
            </tbody>
          </table>
        </div>
        <div id="company-pagination" style="margin-top:12px;">${buildPaginationHTML()}</div>
      </div>
      <div id="company-detail-panel" class="card" style="padding:16px;overflow-y:auto;max-height:700px;">
        <span style="font-weight:700;font-size:15px;">업체 상세</span>
        ${!sel?`<p style="font-size:13px;color:#94a3b8;margin-top:8px;">업체를 선택하세요.</p>`:renderDetail(sel)}
      </div>
    </div>
  </div>
  ${state.showAdd?renderAddModal():''}
  ${state.showEditCompany?renderEditCompanyModal():''}
  ${state.showContactAdd&&sel?renderContactAddModal():''}
  ${state.showContactEdit?renderContactEditModal():''}
  ${state.showHistoryAdd&&sel?renderHistoryAddModal():''}
  ${state.showHistoryEdit?renderHistoryEditModal():''}
  ${state.showDeleteConfirm?renderDeleteModal():''}
  ${state.showResetModal?renderResetModal():''}
  <footer style="text-align:center;padding:32px 16px 24px;color:#94a3b8;font-size:13px;">
    <div>© ${new Date().getFullYear()} Copyright by <strong style="color:#64748b;">김민성</strong></div>
    <div style="margin-top:4px;">문의 이메일: <a href="mailto:anzel386@naver.com" style="color:#3b82f6;">anzel386@naver.com</a></div>
  </footer>`;
}

/* ── 업체 상세 ── */
function renderDetail(c) {
  const logs = state.contactLogs[c.id] || [];
  const hists = state.histories[c.id] || [];
  return `
  <div style="margin-top:12px;display:grid;gap:14px;">
    <!-- 업체 기본정보 -->
    <div style="background:#f8fafc;border-radius:10px;padding:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-weight:700;font-size:14px;color:#1e293b;">🏢 기본 정보</span>
        ${state.user?.role==='admin'?`<button class="btn btn-sm btn-warning" onclick="openEditCompany(${c.id})">✏️ 수정</button>`:''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><div class="info-label">업체명</div><div style="font-weight:600;font-size:14px;">${esc(c.name)}</div></div>
        <div><div class="info-label">업종</div><div style="font-size:14px;">${esc(c.industry||'-')}</div></div>
        <div style="grid-column:1/-1;"><div class="info-label">주소</div><div style="font-size:14px;">${esc(c.address||'-')}</div></div>
        <div><div class="info-label">회사 전화</div><div style="font-size:14px;">${esc(c.phone||'-')}</div></div>
        <div><div class="info-label">담당자 이름</div><div style="font-size:14px;">${esc(c.manager_name||'-')}</div></div>
        <div><div class="info-label">담당자 연락처</div><div style="font-size:14px;">${esc(c.manager_phone||'-')}</div></div>
        <div><div class="info-label">담당자 이메일</div><div style="font-size:14px;">${esc(c.manager_email||'-')}</div></div>
        <div style="grid-column:1/-1;"><div class="info-label">관련 학과</div><div style="font-size:14px;">${(c.departments||[]).map(d=>`<span class="tag">${esc(d)}</span>`).join('')||'-'}</div></div>
        ${c.memo?`<div style="grid-column:1/-1;"><div class="info-label">메모</div><div style="font-size:13px;color:#64748b;">${esc(c.memo)}</div></div>`:''}
      </div>
    </div>

    <!-- 연락 이력 -->
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-weight:700;font-size:14px;color:#1e293b;">📞 연락 이력</span>
        <button class="btn btn-sm btn-primary" onclick="openContactAdd()">+ 추가</button>
      </div>
      ${logs.length===0
        ?`<p style="font-size:13px;color:#94a3b8;">연락 이력이 없습니다.</p>`
        :logs.map(l=>`
          <div class="log-item">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
              <div style="flex:1;">
                <div style="display:flex;gap:6px;align-items:center;margin-bottom:3px;">
                  <span style="font-size:12px;color:#94a3b8;">${esc(l.date)}</span>
                  <span class="tag" style="font-size:11px;padding:1px 7px;">${esc(l.method)}</span>
                  ${l.writer?`<span style="font-size:12px;color:#64748b;">${esc(l.writer)}</span>`:''}
                </div>
                <div style="font-size:13px;color:#374151;white-space:pre-wrap;">${esc(l.content)}</div>
              </div>
              <div style="display:flex;gap:4px;flex-shrink:0;">
                <button class="btn btn-sm btn-warning" style="padding:2px 7px;font-size:11px;"
                  onclick="openContactEdit(${l.id},'${esc(l.date)}','${esc(l.method)}',\`${esc(l.content)}\`)">✏️</button>
                <button class="btn btn-sm btn-danger" style="padding:2px 7px;font-size:11px;"
                  onclick="deleteContact(${l.id})">🗑</button>
              </div>
            </div>
          </div>`).join('')}
    </div>

    <!-- 취업/실습 이력 -->
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-weight:700;font-size:14px;color:#1e293b;">🎓 취업/실습 이력</span>
        <button class="btn btn-sm btn-primary" onclick="openHistoryAdd()">+ 추가</button>
      </div>
      ${hists.length===0
        ?`<p style="font-size:13px;color:#94a3b8;">취업/실습 이력이 없습니다.</p>`
        :hists.map(h=>`
          <div class="log-item">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
              <div style="flex:1;">
                <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                  <span class="badge badge-${h.type||'취업'}">${esc(h.type||'취업')}</span>
                  <span style="font-size:13px;font-weight:600;">${esc(h.year||'-')}년</span>
                  <span style="font-size:13px;color:#374151;">${esc(h.department||'-')}</span>
                  <span style="font-size:13px;color:#64748b;">${esc(h.student||'-')}</span>
                  ${h.writer?`<span style="font-size:12px;color:#94a3b8;">(작성: ${esc(h.writer)})</span>`:''}
                </div>
              </div>
              <div style="display:flex;gap:4px;flex-shrink:0;">
                <button class="btn btn-sm btn-warning" style="padding:2px 7px;font-size:11px;"
                  onclick="openHistoryEdit(${h.id},'${esc(h.year)}','${esc(h.department)}','${esc(h.student)}','${esc(h.type)}')">✏️</button>
                <button class="btn btn-sm btn-danger" style="padding:2px 7px;font-size:11px;"
                  onclick="deleteHistory(${h.id})">🗑</button>
              </div>
            </div>
          </div>`).join('')}
    </div>
  </div>`;
}

/* ── 업체 등록 모달 ── */
function renderAddModal() {
  const nc = state.newCompany;
  return `
  <div class="modal-bg" onclick="if(event.target===this)closeAdd()">
    <div style="background:#fff;border-radius:16px;padding:28px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;">
      <h3 style="font-size:17px;font-weight:700;margin:0 0 20px;">🏢 업체 등록</h3>
      <div style="display:grid;gap:12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">업체명 *</label>
            <input type="text" placeholder="업체명" value="${esc(nc.name)}"
              oninput="updateNew('name',this.value)" onblur="checkDuplicate(this.value)" />
            ${state.duplicateMsg?`<p style="font-size:12px;color:#dc2626;margin:3px 0 0;">${esc(state.duplicateMsg)}</p>`:''}
          </div>
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">업종</label>
            <input type="text" placeholder="예: IT, 제조업" value="${esc(nc.industry)}" oninput="updateNew('industry',this.value)" />
          </div>
        </div>
        <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">주소</label>
          <input type="text" placeholder="회사 주소" value="${esc(nc.address)}" oninput="updateNew('address',this.value)" />
        </div>
        <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">회사 전화</label>
          <input type="text" placeholder="02-1234-5678" value="${esc(nc.phone)}" oninput="updateNew('phone',this.value)" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">담당자 이름</label>
            <input type="text" placeholder="홍길동" value="${esc(nc.manager_name)}" oninput="updateNew('manager_name',this.value)" />
          </div>
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">담당자 연락처</label>
            <input type="text" placeholder="010-1234-5678" value="${esc(nc.manager_phone)}" oninput="updateNew('manager_phone',this.value)" />
          </div>
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">담당자 이메일</label>
            <input type="text" placeholder="hong@company.com" value="${esc(nc.manager_email)}" oninput="updateNew('manager_email',this.value)" />
          </div>
        </div>
        <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">메모</label>
          <textarea rows="2" placeholder="특이사항, 메모" oninput="updateNew('memo',this.value)">${esc(nc.memo)}</textarea>
        </div>
        <div>
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px;">관련 학과</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${DEPARTMENTS.map(d=>`
              <button type="button" class="btn btn-sm ${nc.departments.includes(d)?'btn-active':'btn-outline'}"
                onclick="toggleNewDept('${d}')">${d}</button>`).join('')}
          </div>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
        <button class="btn btn-outline" onclick="closeAdd()">취소</button>
        <button class="btn btn-primary" onclick="submitAdd()">등록</button>
      </div>
    </div>
  </div>`;
}

/* ── 업체 수정 모달 ── */
function renderEditCompanyModal() {
  const ec = state.editCompany;
  return `
  <div class="modal-bg" onclick="if(event.target===this)closeEditCompany()">
    <div style="background:#fff;border-radius:16px;padding:28px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;">
      <h3 style="font-size:17px;font-weight:700;margin:0 0 20px;">✏️ 업체 정보 수정</h3>
      <div style="display:grid;gap:12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">업체명 *</label>
            <input type="text" placeholder="업체명" value="${esc(ec.name)}" oninput="updateEdit('name',this.value)" />
          </div>
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">업종</label>
            <input type="text" placeholder="예: IT, 제조업" value="${esc(ec.industry)}" oninput="updateEdit('industry',this.value)" />
          </div>
        </div>
        <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">주소</label>
          <input type="text" placeholder="회사 주소" value="${esc(ec.address)}" oninput="updateEdit('address',this.value)" />
        </div>
        <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">회사 전화</label>
          <input type="text" placeholder="02-1234-5678" value="${esc(ec.phone)}" oninput="updateEdit('phone',this.value)" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">담당자 이름</label>
            <input type="text" placeholder="홍길동" value="${esc(ec.manager_name)}" oninput="updateEdit('manager_name',this.value)" />
          </div>
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">담당자 연락처</label>
            <input type="text" placeholder="010-1234-5678" value="${esc(ec.manager_phone)}" oninput="updateEdit('manager_phone',this.value)" />
          </div>
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">담당자 이메일</label>
            <input type="text" placeholder="hong@company.com" value="${esc(ec.manager_email)}" oninput="updateEdit('manager_email',this.value)" />
          </div>
        </div>
        <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">메모</label>
          <textarea rows="2" placeholder="특이사항, 메모" oninput="updateEdit('memo',this.value)">${esc(ec.memo)}</textarea>
        </div>
        <div>
          <label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px;">관련 학과</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${DEPARTMENTS.map(d=>`
              <button type="button" class="btn btn-sm ${ec.departments.includes(d)?'btn-active':'btn-outline'}"
                onclick="toggleEditDept('${d}')">${d}</button>`).join('')}
          </div>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
        <button class="btn btn-outline" onclick="closeEditCompany()">취소</button>
        <button class="btn btn-primary" onclick="submitEditCompany()">저장</button>
      </div>
    </div>
  </div>`;
}

/* ── 연락이력 추가 모달 ── */
function renderContactAddModal() {
  const l = state.newLog;
  const today = new Date().toISOString().slice(0,10);
  return `
  <div class="modal-bg" onclick="if(event.target===this)closeContactAdd()">
    <div style="background:#fff;border-radius:16px;padding:28px;width:100%;max-width:440px;">
      <h3 style="font-size:17px;font-weight:700;margin:0 0 20px;">📞 연락 이력 추가</h3>
      <div style="display:grid;gap:12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">날짜 *</label>
            <input type="date" value="${l.date||today}" oninput="state.newLog.date=this.value" />
          </div>
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">방법</label>
            <select onchange="state.newLog.method=this.value">
              ${['전화','방문','이메일','문자','기타'].map(m=>`<option value="${m}" ${l.method===m?'selected':''}>${m}</option>`).join('')}
            </select>
          </div>
        </div>
        <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">내용</label>
          <textarea rows="3" placeholder="연락 내용을 입력하세요" oninput="state.newLog.content=this.value">${esc(l.content)}</textarea>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
        <button class="btn btn-outline" onclick="closeContactAdd()">취소</button>
        <button class="btn btn-primary" onclick="submitContactAdd()">추가</button>
      </div>
    </div>
  </div>`;
}

/* ── 연락이력 수정 모달 ── */
function renderContactEditModal() {
  const l = state.editLog;
  return `
  <div class="modal-bg" onclick="if(event.target===this)closeContactEdit()">
    <div style="background:#fff;border-radius:16px;padding:28px;width:100%;max-width:440px;">
      <h3 style="font-size:17px;font-weight:700;margin:0 0 20px;">✏️ 연락 이력 수정</h3>
      <div style="display:grid;gap:12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">날짜 *</label>
            <input type="date" value="${esc(l.date)}" oninput="state.editLog.date=this.value" />
          </div>
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">방법</label>
            <select onchange="state.editLog.method=this.value">
              ${['전화','방문','이메일','문자','기타'].map(m=>`<option value="${m}" ${l.method===m?'selected':''}>${m}</option>`).join('')}
            </select>
          </div>
        </div>
        <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">내용</label>
          <textarea rows="3" placeholder="연락 내용을 입력하세요" oninput="state.editLog.content=this.value">${esc(l.content)}</textarea>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
        <button class="btn btn-outline" onclick="closeContactEdit()">취소</button>
        <button class="btn btn-primary" onclick="submitContactEdit()">저장</button>
      </div>
    </div>
  </div>`;
}

/* ── 취업/실습 이력 추가 모달 ── */
function renderHistoryAddModal() {
  const h = state.newHistory;
  const curYear = new Date().getFullYear();
  return `
  <div class="modal-bg" onclick="if(event.target===this)closeHistoryAdd()">
    <div style="background:#fff;border-radius:16px;padding:28px;width:100%;max-width:440px;">
      <h3 style="font-size:17px;font-weight:700;margin:0 0 20px;">🎓 취업/실습 이력 추가</h3>
      <div style="display:grid;gap:12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">연도 *</label>
            <input type="number" placeholder="${curYear}" value="${esc(h.year)}" oninput="state.newHistory.year=this.value" />
          </div>
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">구분</label>
            <select onchange="state.newHistory.type=this.value">
              ${['취업','현장실습'].map(t=>`<option value="${t}" ${h.type===t?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">학과</label>
          <select onchange="state.newHistory.department=this.value">
            <option value="">학과 선택</option>
            ${DEPARTMENTS.map(d=>`<option value="${d}" ${h.department===d?'selected':''}>${d}</option>`).join('')}
          </select>
        </div>
        <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">학생 이름</label>
          <input type="text" placeholder="홍길동" value="${esc(h.student)}" oninput="state.newHistory.student=this.value" />
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
        <button class="btn btn-outline" onclick="closeHistoryAdd()">취소</button>
        <button class="btn btn-primary" onclick="submitHistoryAdd()">추가</button>
      </div>
    </div>
  </div>`;
}

/* ── 취업/실습 이력 수정 모달 ── */
function renderHistoryEditModal() {
  const h = state.editHistory;
  return `
  <div class="modal-bg" onclick="if(event.target===this)closeHistoryEdit()">
    <div style="background:#fff;border-radius:16px;padding:28px;width:100%;max-width:440px;">
      <h3 style="font-size:17px;font-weight:700;margin:0 0 20px;">✏️ 취업/실습 이력 수정</h3>
      <div style="display:grid;gap:12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">연도 *</label>
            <input type="number" placeholder="연도" value="${esc(h.year)}" oninput="state.editHistory.year=this.value" />
          </div>
          <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">구분</label>
            <select onchange="state.editHistory.type=this.value">
              ${['취업','현장실습'].map(t=>`<option value="${t}" ${h.type===t?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">학과</label>
          <select onchange="state.editHistory.department=this.value">
            <option value="">학과 선택</option>
            ${DEPARTMENTS.map(d=>`<option value="${d}" ${h.department===d?'selected':''}>${d}</option>`).join('')}
          </select>
        </div>
        <div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">학생 이름</label>
          <input type="text" placeholder="홍길동" value="${esc(h.student)}" oninput="state.editHistory.student=this.value" />
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
        <button class="btn btn-outline" onclick="closeHistoryEdit()">취소</button>
        <button class="btn btn-primary" onclick="submitHistoryEdit()">저장</button>
      </div>
    </div>
  </div>`;
}

/* ── 삭제 확인 모달 ── */
function renderDeleteModal() {
  const t = state.deleteTarget;
  return `
  <div class="modal-bg">
    <div style="background:#fff;border-radius:16px;padding:28px;width:100%;max-width:380px;text-align:center;">
      <div style="font-size:40px;margin-bottom:12px;">⚠️</div>
      <h3 style="font-size:17px;font-weight:700;margin:0 0 8px;">업체 삭제</h3>
      <p style="font-size:14px;color:#64748b;margin-bottom:24px;">
        <strong style="color:#1e293b;">${esc(t?.name)}</strong> 업체를 삭제하시겠습니까?<br/>
        <span style="font-size:12px;color:#dc2626;">연락이력과 취업/실습이력이 모두 삭제됩니다.</span>
      </p>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="btn btn-outline" onclick="closeDeleteConfirm()">취소</button>
        <button class="btn btn-danger" onclick="confirmDelete()">삭제</button>
      </div>
    </div>
  </div>`;
}

/* ── 비밀번호 초기화 모달 ── */
function renderResetModal() {
  return `
  <div class="modal-bg">
    <div style="background:#fff;border-radius:16px;padding:28px;width:100%;max-width:380px;">
      <h3 style="font-size:17px;font-weight:700;margin:0 0 16px;">🔑 비밀번호 초기화</h3>
      <p style="font-size:13px;color:#64748b;margin-bottom:16px;"><strong>${esc(state.resetTarget?.name)}</strong>의 비밀번호를 초기화합니다.</p>
      <input type="password" placeholder="새 비밀번호 (4자 이상)" oninput="state.resetPw=this.value" style="margin-bottom:16px;" />
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button class="btn btn-outline" onclick="closeResetModal()">취소</button>
        <button class="btn btn-primary" onclick="submitResetPassword()">초기화</button>
      </div>
    </div>
  </div>`;
}

/* ── 관리자 페이지 ── */
function renderAdminPage() {
  const stats = state.adminStats;
  return `
  <div style="max-width:1100px;margin:0 auto;padding:24px 16px;display:grid;gap:20px;">
    ${renderHeader()}
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
    { icon:'👥', label:'전체 회원', val:s.users, color:'#eff6ff', tc:'#1e40af' },
    { icon:'🏢', label:'등록 업체', val:s.companies, color:'#f0fdf4', tc:'#15803d' },
    { icon:'📞', label:'연락 이력', val:s.contacts, color:'#fef9c3', tc:'#a16207' },
    { icon:'🎓', label:'취업/실습 이력', val:s.histories, color:'#fdf4ff', tc:'#9333ea' },
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
                    <button class="btn btn-sm btn-outline" style="font-size:12px;" onclick="toggleRole(${u.id},'${u.role}')">
                      ${u.role==='admin'?'교사로 변경':'관리자 지정'}</button>
                    <button class="btn btn-sm btn-outline" style="font-size:12px;" onclick="openResetModal(${u.id},'${esc(u.name)}')">🔑 비번초기화</button>
                    <button class="btn btn-sm btn-danger" style="font-size:12px;" onclick="deleteUser(${u.id},'${esc(u.name)}')">🗑 삭제</button>
                  </div>
                </td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

/* ══════════════════════════════
   이벤트 핸들러
══════════════════════════════ */

/* ── 인증 ── */
function switchAuthMode(m) { state.authMode=m; state.authError=''; state.authSuccess=''; render(); }

async function submitLogin(e) {
  e.preventDefault();
  const username = document.getElementById('auth-username')?.value.trim();
  const password = document.getElementById('auth-password')?.value;
  if (!username || !password) { state.authError='아이디와 비밀번호를 입력하세요.'; render(); return; }
  const d = await api('POST', '/auth/login', { username, password });
  if (d.error) { state.authError=d.error; render(); return; }
  saveToken(d.token);
  state.user = d.user;
  state.authError=''; state.authSuccess='';
  await loadCompanies();
  render();
}

async function submitRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name')?.value.trim();
  const dept = document.getElementById('reg-dept')?.value;
  const username = document.getElementById('auth-username')?.value.trim();
  const password = document.getElementById('auth-password')?.value;
  if (!name||!dept||!username||!password) { state.authError='모든 항목을 입력해주세요.'; render(); return; }
  const d = await api('POST', '/auth/register', { name, dept, username, password });
  if (d.error) { state.authError=d.error; render(); return; }
  state.authSuccess=d.message; state.authError=''; state.authMode='login';
  render();
}

async function doLogout() {
  await api('POST', '/auth/logout');
  saveToken(null);
  state.user=null; state.companies=[]; state.selected=null;
  state.contactLogs={}; state.histories={};
  render();
}

/* ── 검색/필터 ── */
function onSearch(v) {
  state.search = v;
  state.currentPage = 1;
  renderListOnly();
}
function clearSearch() {
  state.search = '';
  state.currentPage = 1;
  const el = document.getElementById('search-input');
  if (el) { el.value = ''; el.focus(); }
  renderListOnly();
}
function setDeptFilter(d) { state.filterDept=d; state.currentPage=1; renderListOnly(); }
function goToPage(p) { state.currentPage=p; renderListOnly(); }

/* ── 페이지네이션 HTML 생성 (공통) ── */
function buildPaginationHTML(totalPages, currentPage) {
  if (totalPages === undefined) {
    const paged = getPagedCompanies();
    totalPages = paged.totalPages;
    currentPage = paged.currentPage;
  }
  let btns = '';
  btns += `<button onclick="goToPage(${currentPage-1})" ${currentPage===1?'disabled':''}
    style="padding:5px 10px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;
    cursor:${currentPage===1?'default':'pointer'};color:${currentPage===1?'#cbd5e1':'#374151'};font-size:13px;">◀</button>`;
  const range = 2;
  let prevDot = false, nextDot = false;
  for (let i=1; i<=totalPages; i++) {
    if (i===1 || i===totalPages || (i>=currentPage-range && i<=currentPage+range)) {
      prevDot = false; nextDot = false;
      btns += `<button onclick="goToPage(${i})"
        style="padding:5px 10px;border:1px solid ${i===currentPage?'#1e40af':'#e5e7eb'};border-radius:6px;
        background:${i===currentPage?'#1e40af':'#fff'};color:${i===currentPage?'#fff':'#374151'};
        font-weight:${i===currentPage?700:400};cursor:pointer;font-size:13px;">${i}</button>`;
    } else if (i < currentPage-range && !prevDot) {
      prevDot = true;
      btns += `<span style="padding:5px 4px;font-size:13px;color:#94a3b8;">...</span>`;
    } else if (i > currentPage+range && !nextDot) {
      nextDot = true;
      btns += `<span style="padding:5px 4px;font-size:13px;color:#94a3b8;">...</span>`;
    }
  }
  btns += `<button onclick="goToPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}
    style="padding:5px 10px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;
    cursor:${currentPage===totalPages?'default':'pointer'};color:${currentPage===totalPages?'#cbd5e1':'#374151'};font-size:13px;">▶</button>`;
  return `<div style="display:flex;gap:4px;justify-content:center;align-items:center;flex-wrap:wrap;">${btns}</div>`;
}

/* ── 목록만 부분 업데이트 (검색/필터/페이지용) ── */
function renderListOnly() {
  const listEl = document.getElementById('company-list-body');
  const countEl = document.getElementById('company-list-count');
  const pageEl  = document.getElementById('company-pagination');
  if (!listEl || !countEl) { render(); return; }

  const { items, total, totalPages, currentPage } = getPagedCompanies();
  state.currentPage = currentPage;
  countEl.textContent = '총 ' + total + '개';

  listEl.innerHTML = items.length === 0
    ? `<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:24px;">검색 결과 없음</td></tr>`
    : items.map(c => `
        <tr class="${state.selected?.id===c.id?'row-selected':''}" onclick="selectCompany(${c.id})">
          <td style="font-weight:600;color:#1e40af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(c.name)}</td>
          <td style="color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(c.industry||'-')}</td>
          <td style="color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;">${(c.departments||[]).map(esc).join(', ')||'-'}</td>
          <td style="color:#94a3b8;white-space:nowrap;font-size:12px;">${esc(!c.last_contact||c.last_contact==='-'?'-':c.last_contact)}</td>
          <td style="color:#3b82f6;white-space:nowrap;font-size:12px;overflow:hidden;text-overflow:ellipsis;">${esc(c.last_contact_writer||'-')}</td>
          <td onclick="event.stopPropagation()" style="text-align:center;">
            ${state.user?.role==='admin'?`<button class="btn btn-sm btn-danger" style="padding:3px 8px;" onclick="openDeleteConfirm(${c.id},'${esc(c.name)}')">🗑</button>`:''}
          </td>
        </tr>`).join('');

  if (pageEl) {
    pageEl.innerHTML = buildPaginationHTML(totalPages, currentPage);
  }

  document.querySelectorAll('.dept-filter-btn').forEach(btn => {
    const d = btn.dataset.dept;
    btn.className = d === state.filterDept
      ? 'btn btn-sm btn-active dept-filter-btn'
      : 'btn btn-sm btn-outline dept-filter-btn';
  });
}

/* ── 업체 선택 ── */
async function selectCompany(id) {
  const c = state.companies.find(x=>x.id===id);
  if (!c) return;
  state.selected = c;
  state.showContactAdd=false; state.showHistoryAdd=false;
  await Promise.all([loadContactLogs(id), loadHistories(id)]);

  // 우측 상세 패널만 업데이트 (페이지네이션 유지)
  const detailEl = document.getElementById('company-detail-panel');
  if (detailEl) {
    detailEl.innerHTML = `<span style="font-weight:700;font-size:15px;">업체 상세</span>${renderDetail(c)}`;
    // 선택된 행 하이라이트 업데이트
    document.querySelectorAll('#company-list-body tr').forEach(tr => {
      tr.classList.remove('row-selected');
    });
    const rows = document.querySelectorAll('#company-list-body tr');
    rows.forEach(tr => {
      if (tr.getAttribute('onclick') === `selectCompany(${id})`) {
        tr.classList.add('row-selected');
      }
    });
  } else {
    render();
  }
}

/* ── 업체 등록 ── */
function openAdd() {
  state.newCompany={ name:'',industry:'',address:'',phone:'',manager_name:'',manager_phone:'',manager_email:'',memo:'',departments:[] };
  state.duplicateMsg=''; state.showAdd=true; render();
}
function closeAdd() { state.showAdd=false; render(); }
function updateNew(k,v) { state.newCompany[k]=v; }
function toggleNewDept(d) {
  const arr = state.newCompany.departments;
  const i = arr.indexOf(d);
  if (i>=0) arr.splice(i,1); else arr.push(d);
  render();
}
function checkDuplicate(v) {
  const exists = state.companies.some(c=>c.name===v.trim());
  state.duplicateMsg = exists?'이미 등록된 업체명입니다.':'';
  const el = document.querySelector('#app p[style*="dc2626"]');
  // re-render only message area
}
async function submitAdd() {
  const nc = state.newCompany;
  if (!nc.name.trim()) { alert('업체명을 입력해주세요.'); return; }
  if (state.duplicateMsg) { alert(state.duplicateMsg); return; }
  const d = await api('POST', '/companies', nc);
  if (d.error) { alert(d.error); return; }
  state.showAdd=false;
  await loadCompanies();
  render();
}

/* ── 업체 수정 ── */
function openEditCompany(id) {
  const c = state.companies.find(x=>x.id===id);
  if (!c) return;
  state.editCompany = {
    id: c.id,
    name: c.name||'', industry: c.industry||'',
    address: c.address||'', phone: c.phone||'',
    manager_name: c.manager_name||'', manager_phone: c.manager_phone||'',
    manager_email: c.manager_email||'', memo: c.memo||'',
    departments: [...(c.departments||[])]
  };
  state.showEditCompany=true; render();
}
function closeEditCompany() { state.showEditCompany=false; render(); }
function updateEdit(k,v) { state.editCompany[k]=v; }
function toggleEditDept(d) {
  const arr = state.editCompany.departments;
  const i = arr.indexOf(d);
  if (i>=0) arr.splice(i,1); else arr.push(d);
  render();
}
async function submitEditCompany() {
  const ec = state.editCompany;
  if (!ec.name.trim()) { alert('업체명을 입력해주세요.'); return; }
  const d = await api('PUT', `/companies/${ec.id}`, ec);
  if (d.error) { alert(d.error); return; }
  state.showEditCompany=false;
  await loadCompanies();
  // 선택된 업체 업데이트
  if (state.selected?.id === ec.id) {
    state.selected = state.companies.find(c=>c.id===ec.id) || null;
  }
  render();
}

/* ── 업체 삭제 ── */
function openDeleteConfirm(id, name) { state.deleteTarget={id,name}; state.showDeleteConfirm=true; render(); }
function closeDeleteConfirm() { state.showDeleteConfirm=false; state.deleteTarget=null; render(); }
async function confirmDelete() {
  const t = state.deleteTarget;
  if (!t) return;
  const d = await api('DELETE', `/companies/${t.id}`);
  if (d.error) { alert(d.error); return; }
  state.showDeleteConfirm=false; state.deleteTarget=null;
  if (state.selected?.id===t.id) state.selected=null;
  await loadCompanies();
  render();
}

/* ── 연락 이력 ── */
function openContactAdd() {
  state.newLog={ date:new Date().toISOString().slice(0,10), method:'전화', content:'' };
  state.showContactAdd=true; render();
}
function closeContactAdd() { state.showContactAdd=false; render(); }
async function submitContactAdd() {
  const sel = state.selected;
  if (!sel) return;
  const l = state.newLog;
  if (!l.date) { alert('날짜를 입력해주세요.'); return; }
  const d = await api('POST', `/companies/${sel.id}/contacts`, { ...l, writer:state.user?.name, dept:state.user?.dept });
  if (d.error) { alert(d.error); return; }
  state.showContactAdd=false;
  await loadContactLogs(sel.id);
  // 최근 연락일 업데이트
  const co = state.companies.find(c=>c.id===sel.id);
  if (co) { co.last_contact=l.date; state.selected=co; }
  render();
}

function openContactEdit(id, date, method, content) {
  state.editLog={ id, date, method, content };
  state.showContactEdit=true; render();
}
function closeContactEdit() { state.showContactEdit=false; render(); }
async function submitContactEdit() {
  const l = state.editLog;
  if (!l.date) { alert('날짜를 입력해주세요.'); return; }
  const d = await api('PUT', `/contacts/${l.id}`, { date:l.date, method:l.method, content:l.content });
  if (d.error) { alert(d.error); return; }
  state.showContactEdit=false;
  if (state.selected) await loadContactLogs(state.selected.id);
  render();
}
async function deleteContact(id) {
  if (!confirm('이 연락 이력을 삭제하시겠습니까?')) return;
  const d = await api('DELETE', `/contacts/${id}`);
  if (d.error) { alert(d.error); return; }
  if (state.selected) await loadContactLogs(state.selected.id);
  render();
}

/* ── 취업/실습 이력 ── */
function openHistoryAdd() {
  state.newHistory={ year:String(new Date().getFullYear()), department:'', student:'', type:'취업' };
  state.showHistoryAdd=true; render();
}
function closeHistoryAdd() { state.showHistoryAdd=false; render(); }
async function submitHistoryAdd() {
  const sel = state.selected;
  if (!sel) return;
  const h = state.newHistory;
  if (!h.year) { alert('연도를 입력해주세요.'); return; }
  const d = await api('POST', `/companies/${sel.id}/histories`, { ...h, writer:state.user?.name });
  if (d.error) { alert(d.error); return; }
  state.showHistoryAdd=false;
  await loadHistories(sel.id);
  render();
}

function openHistoryEdit(id, year, department, student, type) {
  state.editHistory={ id, year, department, student, type };
  state.showHistoryEdit=true; render();
}
function closeHistoryEdit() { state.showHistoryEdit=false; render(); }
async function submitHistoryEdit() {
  const h = state.editHistory;
  if (!h.year) { alert('연도를 입력해주세요.'); return; }
  const d = await api('PUT', `/histories/${h.id}`, { year:h.year, department:h.department, student:h.student, type:h.type });
  if (d.error) { alert(d.error); return; }
  state.showHistoryEdit=false;
  if (state.selected) await loadHistories(state.selected.id);
  render();
}
async function deleteHistory(id) {
  if (!confirm('이 이력을 삭제하시겠습니까?')) return;
  const d = await api('DELETE', `/histories/${id}`);
  if (d.error) { alert(d.error); return; }
  if (state.selected) await loadHistories(state.selected.id);
  render();
}

/* ── 관리자 ── */
function goPage(p) {
  state.page=p;
  if (p==='admin') { loadAdminUsers(); loadAdminStats(); }
  render();
}
async function setAdminTab(t) {
  state.adminTab=t; state.adminError='';
  if (t==='users') await loadAdminUsers();
  else await loadAdminStats();
  render();
}
async function toggleRole(id, currentRole) {
  const newRole = currentRole==='admin'?'teacher':'admin';
  if (!confirm(`역할을 ${newRole==='admin'?'관리자':'교사'}로 변경하시겠습니까?`)) return;
  const d = await api('PUT', `/admin/users/${id}/role`, { role:newRole });
  if (d.error) { state.adminError=d.error; render(); return; }
  await loadAdminUsers(); render();
}
async function deleteUser(id, name) {
  if (!confirm(`${name} 회원을 삭제하시겠습니까?`)) return;
  const d = await api('DELETE', `/admin/users/${id}`);
  if (d.error) { state.adminError=d.error; render(); return; }
  await loadAdminUsers(); render();
}
function openResetModal(id, name) { state.resetTarget={id,name}; state.resetPw=''; state.showResetModal=true; render(); }
function closeResetModal() { state.showResetModal=false; render(); }
async function submitResetPassword() {
  if (!state.resetPw || state.resetPw.length<4) { alert('비밀번호는 4자 이상이어야 합니다.'); return; }
  const d = await api('PUT', `/admin/users/${state.resetTarget.id}/reset-password`, { password:state.resetPw });
  if (d.error) { alert(d.error); return; }
  alert(d.message);
  state.showResetModal=false; render();
}

/* ── 앱 초기화 ── */
async function init() {
  const d = await api('GET', '/auth/me');
  if (d.user) {
    state.user = d.user;
    await loadCompanies();
  }
  render();
}

init();
