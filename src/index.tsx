import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))

// ────────────────────────────────────────────
// 메인 페이지
// ────────────────────────────────────────────
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>학교 협력 회사 명단</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    .modal-backdrop { background: rgba(0,0,0,0.5); }
    .badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .badge-취업연계 { background: #dbeafe; color: #1d4ed8; }
    .badge-인턴십 { background: #dcfce7; color: #15803d; }
    .badge-납품업체 { background: #fef9c3; color: #a16207; }
    .badge-후원 { background: #fce7f3; color: #be185d; }
    .badge-MOU { background: #ede9fe; color: #6d28d9; }
    .badge-기타 { background: #f3f4f6; color: #374151; }
    .status-활성 { background: #dcfce7; color: #15803d; }
    .status-만료 { background: #fee2e2; color: #b91c1c; }
    .status-협의중 { background: #fef9c3; color: #a16207; }
    .status-중단 { background: #f3f4f6; color: #6b7280; }
    tr:hover td { background: #f8fafc; }
    .sortable { cursor: pointer; user-select: none; }
    .sortable:hover { background: #f1f5f9; }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">

<!-- 헤더 -->
<header class="bg-blue-700 text-white shadow-lg">
  <div class="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <i class="fas fa-building text-2xl"></i>
      <div>
        <h1 class="text-xl font-bold">학교 협력 회사 명단</h1>
        <p class="text-blue-200 text-sm">School Partner Companies</p>
      </div>
    </div>
    <div class="flex gap-2">
      <button onclick="exportExcel()" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition">
        <i class="fas fa-file-excel"></i> 엑셀 내보내기
      </button>
      <button onclick="openAddModal()" class="bg-white text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition">
        <i class="fas fa-plus"></i> 회사 추가
      </button>
    </div>
  </div>
</header>

<!-- 통계 카드 -->
<div class="max-w-screen-xl mx-auto px-6 py-6">
  <div id="stats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <div class="bg-white rounded-xl shadow p-4 flex items-center gap-3">
      <div class="bg-blue-100 p-3 rounded-lg"><i class="fas fa-building text-blue-600 text-xl"></i></div>
      <div><p class="text-gray-500 text-sm">전체 회사</p><p class="text-2xl font-bold text-gray-800" id="stat-total">-</p></div>
    </div>
    <div class="bg-white rounded-xl shadow p-4 flex items-center gap-3">
      <div class="bg-green-100 p-3 rounded-lg"><i class="fas fa-check-circle text-green-600 text-xl"></i></div>
      <div><p class="text-gray-500 text-sm">활성 계약</p><p class="text-2xl font-bold text-gray-800" id="stat-active">-</p></div>
    </div>
    <div class="bg-white rounded-xl shadow p-4 flex items-center gap-3">
      <div class="bg-purple-100 p-3 rounded-lg"><i class="fas fa-handshake text-purple-600 text-xl"></i></div>
      <div><p class="text-gray-500 text-sm">MOU 체결</p><p class="text-2xl font-bold text-gray-800" id="stat-mou">-</p></div>
    </div>
    <div class="bg-white rounded-xl shadow p-4 flex items-center gap-3">
      <div class="bg-yellow-100 p-3 rounded-lg"><i class="fas fa-user-tie text-yellow-600 text-xl"></i></div>
      <div><p class="text-gray-500 text-sm">인턴십</p><p class="text-2xl font-bold text-gray-800" id="stat-intern">-</p></div>
    </div>
  </div>

  <!-- 검색/필터 -->
  <div class="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-3 items-center">
    <div class="flex-1 min-w-[200px] relative">
      <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
      <input id="search" type="text" placeholder="회사명, 업종, 담당자 검색..." 
        class="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
        oninput="filterAndRender()" />
    </div>
    <select id="filter-relation" onchange="filterAndRender()"
      class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
      <option value="">전체 협력유형</option>
      <option value="취업연계">취업연계</option>
      <option value="인턴십">인턴십</option>
      <option value="납품업체">납품업체</option>
      <option value="후원">후원</option>
      <option value="MOU">MOU</option>
      <option value="기타">기타</option>
    </select>
    <select id="filter-status" onchange="filterAndRender()"
      class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
      <option value="">전체 상태</option>
      <option value="활성">활성</option>
      <option value="만료">만료</option>
      <option value="협의중">협의중</option>
      <option value="중단">중단</option>
    </select>
    <select id="filter-industry" onchange="filterAndRender()"
      class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
      <option value="">전체 업종</option>
    </select>
    <button onclick="resetFilters()" class="text-gray-500 hover:text-blue-600 text-sm flex items-center gap-1">
      <i class="fas fa-rotate-left"></i> 초기화
    </button>
    <span class="text-gray-400 text-sm ml-auto" id="result-count"></span>
  </div>

  <!-- 테이블 -->
  <div class="bg-white rounded-xl shadow overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left text-gray-600 font-semibold sortable" onclick="sortBy('name')">
              회사명 <i class="fas fa-sort text-gray-300 ml-1"></i>
            </th>
            <th class="px-4 py-3 text-left text-gray-600 font-semibold">업종</th>
            <th class="px-4 py-3 text-left text-gray-600 font-semibold">협력유형</th>
            <th class="px-4 py-3 text-left text-gray-600 font-semibold">담당자</th>
            <th class="px-4 py-3 text-left text-gray-600 font-semibold">연락처</th>
            <th class="px-4 py-3 text-left text-gray-600 font-semibold sortable" onclick="sortBy('contract_end')">
              계약만료 <i class="fas fa-sort text-gray-300 ml-1"></i>
            </th>
            <th class="px-4 py-3 text-left text-gray-600 font-semibold">상태</th>
            <th class="px-4 py-3 text-center text-gray-600 font-semibold">관리</th>
          </tr>
        </thead>
        <tbody id="table-body">
          <tr><td colspan="8" class="text-center py-10 text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>로딩 중...</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- 회사 추가/수정 모달 -->
<div id="form-modal" class="hidden fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
    <div class="bg-blue-700 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
      <h2 class="text-lg font-bold flex items-center gap-2">
        <i class="fas fa-building"></i>
        <span id="modal-title">회사 추가</span>
      </h2>
      <button onclick="closeModal()" class="text-blue-200 hover:text-white text-xl"><i class="fas fa-times"></i></button>
    </div>
    <form id="company-form" onsubmit="submitForm(event)" class="p-6 space-y-5">
      <input type="hidden" id="form-id" />

      <!-- 기본 정보 -->
      <div>
        <h3 class="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
          <i class="fas fa-info-circle"></i> 기본 정보
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">회사명 <span class="text-red-500">*</span></label>
            <input type="text" id="form-name" required placeholder="예: 삼성전자"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">업종/분류</label>
            <input type="text" id="form-industry" placeholder="예: IT/전자"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
            <input type="text" id="form-phone" placeholder="예: 02-1234-5678"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input type="email" id="form-email" placeholder="예: info@company.com"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">홈페이지</label>
            <input type="text" id="form-website" placeholder="예: https://www.company.com"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">주소</label>
            <input type="text" id="form-address" placeholder="예: 서울특별시 강남구 테헤란로 123"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
        </div>
      </div>

      <!-- 담당자 정보 -->
      <div>
        <h3 class="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
          <i class="fas fa-user-tie"></i> 담당자 정보
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">담당자 이름</label>
            <input type="text" id="form-contact-name" placeholder="예: 홍길동"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">직책</label>
            <input type="text" id="form-contact-position" placeholder="예: 채용담당자"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">담당자 연락처</label>
            <input type="text" id="form-contact-phone" placeholder="예: 010-1234-5678"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">담당자 이메일</label>
            <input type="email" id="form-contact-email" placeholder="예: contact@company.com"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
        </div>
      </div>

      <!-- 학교 관계 -->
      <div>
        <h3 class="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
          <i class="fas fa-handshake"></i> 학교 관계
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">협력 유형</label>
            <select id="form-relation-type"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm">
              <option value="">선택하세요</option>
              <option value="취업연계">취업연계</option>
              <option value="인턴십">인턴십</option>
              <option value="납품업체">납품업체</option>
              <option value="후원">후원</option>
              <option value="MOU">MOU</option>
              <option value="기타">기타</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">계약 상태</label>
            <select id="form-contract-status"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm">
              <option value="활성">활성</option>
              <option value="협의중">협의중</option>
              <option value="만료">만료</option>
              <option value="중단">중단</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">계약 시작일</label>
            <input type="date" id="form-contract-start"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">계약 만료일</label>
            <input type="date" id="form-contract-end"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" />
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">메모/특이사항</label>
            <textarea id="form-memo" rows="3" placeholder="특이사항, 비고 등을 입력하세요"
              class="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none"></textarea>
          </div>
        </div>
      </div>

      <div class="flex gap-3 pt-2">
        <button type="button" onclick="closeModal()"
          class="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium transition">
          취소
        </button>
        <button type="submit"
          class="flex-1 bg-blue-700 text-white py-2.5 rounded-lg hover:bg-blue-800 text-sm font-semibold transition flex items-center justify-center gap-2">
          <i class="fas fa-save"></i> 저장
        </button>
      </div>
    </form>
  </div>
</div>

<!-- 상세보기 모달 -->
<div id="detail-modal" class="hidden fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
    <div class="bg-blue-700 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
      <h2 class="text-lg font-bold flex items-center gap-2">
        <i class="fas fa-building"></i>
        <span id="detail-company-name">회사 상세정보</span>
      </h2>
      <button onclick="closeDetailModal()" class="text-blue-200 hover:text-white text-xl"><i class="fas fa-times"></i></button>
    </div>
    <div id="detail-content" class="p-6"></div>
  </div>
</div>

<!-- 삭제 확인 모달 -->
<div id="delete-modal" class="hidden fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
    <div class="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
      <i class="fas fa-trash-alt text-red-600 text-2xl"></i>
    </div>
    <h3 class="text-lg font-bold text-gray-800 mb-2">회사 삭제</h3>
    <p class="text-gray-500 text-sm mb-6"><span id="delete-name" class="font-semibold text-gray-700"></span>을(를) 삭제하시겠습니까?<br>삭제된 데이터는 복구할 수 없습니다.</p>
    <div class="flex gap-3">
      <button onclick="closeDeleteModal()" class="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium">취소</button>
      <button onclick="confirmDelete()" class="flex-1 bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 text-sm font-semibold">삭제</button>
    </div>
  </div>
</div>

<script>
let allCompanies = [];
let deleteTargetId = null;
let sortField = null;
let sortDir = 'asc';

// ── 초기 로드 ──
async function loadCompanies() {
  try {
    const res = await axios.get('/api/companies');
    allCompanies = res.data.companies;
    updateIndustryFilter();
    updateStats();
    filterAndRender();
  } catch(e) {
    document.getElementById('table-body').innerHTML =
      '<tr><td colspan="8" class="text-center py-10 text-red-400"><i class="fas fa-exclamation-triangle mr-2"></i>데이터를 불러오지 못했습니다.</td></tr>';
  }
}

// ── 통계 ──
function updateStats() {
  document.getElementById('stat-total').textContent = allCompanies.length;
  document.getElementById('stat-active').textContent = allCompanies.filter(c => c.contract_status === '활성').length;
  document.getElementById('stat-mou').textContent = allCompanies.filter(c => c.relation_type === 'MOU').length;
  document.getElementById('stat-intern').textContent = allCompanies.filter(c => c.relation_type === '인턴십').length;
}

// ── 업종 필터 옵션 자동 생성 ──
function updateIndustryFilter() {
  const industries = [...new Set(allCompanies.map(c => c.industry).filter(Boolean))].sort();
  const sel = document.getElementById('filter-industry');
  const current = sel.value;
  sel.innerHTML = '<option value="">전체 업종</option>' + industries.map(i => \`<option value="\${i}">\${i}</option>\`).join('');
  sel.value = current;
}

// ── 필터 & 렌더 ──
function filterAndRender() {
  const q = document.getElementById('search').value.toLowerCase();
  const rel = document.getElementById('filter-relation').value;
  const stat = document.getElementById('filter-status').value;
  const ind = document.getElementById('filter-industry').value;

  let filtered = allCompanies.filter(c => {
    const matchQ = !q || [c.name, c.industry, c.contact_name, c.address, c.memo].some(f => f && f.toLowerCase().includes(q));
    const matchRel = !rel || c.relation_type === rel;
    const matchStat = !stat || c.contract_status === stat;
    const matchInd = !ind || c.industry === ind;
    return matchQ && matchRel && matchStat && matchInd;
  });

  if (sortField) {
    filtered.sort((a, b) => {
      const av = a[sortField] || '', bv = b[sortField] || '';
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }

  document.getElementById('result-count').textContent = \`총 \${filtered.length}개\`;
  renderTable(filtered);
}

function resetFilters() {
  document.getElementById('search').value = '';
  document.getElementById('filter-relation').value = '';
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-industry').value = '';
  filterAndRender();
}

function sortBy(field) {
  if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  else { sortField = field; sortDir = 'asc'; }
  filterAndRender();
}

// ── 테이블 렌더링 ──
function renderTable(data) {
  const tbody = document.getElementById('table-body');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-12 text-gray-400"><i class="fas fa-search mr-2"></i>검색 결과가 없습니다.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(c => {
    const relBadge = c.relation_type ? \`<span class="badge badge-\${c.relation_type}">\${c.relation_type}</span>\` : '-';
    const statBadge = c.contract_status ? \`<span class="badge status-\${c.contract_status}">\${c.contract_status}</span>\` : '-';
    const expiring = isExpiringSoon(c.contract_end);
    return \`<tr class="border-b border-gray-100 cursor-pointer" onclick="openDetail(\${c.id})">
      <td class="px-4 py-3 font-semibold text-blue-700">\${c.name}</td>
      <td class="px-4 py-3 text-gray-500">\${c.industry || '-'}</td>
      <td class="px-4 py-3">\${relBadge}</td>
      <td class="px-4 py-3 text-gray-600">\${c.contact_name ? c.contact_name + (c.contact_position ? ' · ' + c.contact_position : '') : '-'}</td>
      <td class="px-4 py-3 text-gray-500">\${c.contact_phone || c.phone || '-'}</td>
      <td class="px-4 py-3 text-gray-500 \${expiring ? 'text-red-500 font-semibold' : ''}">\${c.contract_end || '-'} \${expiring ? '<i class="fas fa-exclamation-circle"></i>' : ''}</td>
      <td class="px-4 py-3">\${statBadge}</td>
      <td class="px-4 py-3 text-center" onclick="event.stopPropagation()">
        <button onclick="openEditModal(\${c.id})" class="text-blue-500 hover:text-blue-700 mr-2 p-1" title="수정"><i class="fas fa-edit"></i></button>
        <button onclick="openDeleteModal(\${c.id}, '\${c.name.replace(/'/g, "\\\\'")}')" class="text-red-400 hover:text-red-600 p-1" title="삭제"><i class="fas fa-trash"></i></button>
      </td>
    </tr>\`;
  }).join('');
}

function isExpiringSoon(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr), now = new Date();
  const diff = (d - now) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 30;
}

// ── 상세보기 ──
function openDetail(id) {
  const c = allCompanies.find(x => x.id === id);
  if (!c) return;
  document.getElementById('detail-company-name').textContent = c.name;
  document.getElementById('detail-content').innerHTML = \`
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-xs text-gray-400 mb-1">업종</p><p class="font-medium">\${c.industry || '-'}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-xs text-gray-400 mb-1">협력유형</p>
          <p>\${c.relation_type ? '<span class="badge badge-' + c.relation_type + '">' + c.relation_type + '</span>' : '-'}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3 col-span-2">
          <p class="text-xs text-gray-400 mb-1">주소</p><p class="font-medium">\${c.address || '-'}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-xs text-gray-400 mb-1">전화번호</p><p class="font-medium">\${c.phone || '-'}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <p class="text-xs text-gray-400 mb-1">이메일</p>
          <p class="font-medium">\${c.email ? '<a href="mailto:' + c.email + '" class="text-blue-600 underline">' + c.email + '</a>' : '-'}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-3 col-span-2">
          <p class="text-xs text-gray-400 mb-1">홈페이지</p>
          <p class="font-medium">\${c.website ? '<a href="' + c.website + '" target="_blank" class="text-blue-600 underline">' + c.website + '</a>' : '-'}</p>
        </div>
      </div>
      <hr />
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-green-50 rounded-lg p-3">
          <p class="text-xs text-green-600 mb-1">담당자</p><p class="font-medium">\${c.contact_name || '-'} \${c.contact_position ? '(' + c.contact_position + ')' : ''}</p>
        </div>
        <div class="bg-green-50 rounded-lg p-3">
          <p class="text-xs text-green-600 mb-1">담당자 연락처</p><p class="font-medium">\${c.contact_phone || '-'}</p>
        </div>
        <div class="bg-green-50 rounded-lg p-3 col-span-2">
          <p class="text-xs text-green-600 mb-1">담당자 이메일</p>
          <p class="font-medium">\${c.contact_email ? '<a href="mailto:' + c.contact_email + '" class="text-blue-600 underline">' + c.contact_email + '</a>' : '-'}</p>
        </div>
      </div>
      <hr />
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-purple-50 rounded-lg p-3">
          <p class="text-xs text-purple-600 mb-1">계약 시작일</p><p class="font-medium">\${c.contract_start || '-'}</p>
        </div>
        <div class="bg-purple-50 rounded-lg p-3">
          <p class="text-xs text-purple-600 mb-1">계약 만료일</p><p class="font-medium">\${c.contract_end || '-'}</p>
        </div>
        <div class="bg-purple-50 rounded-lg p-3 col-span-2">
          <p class="text-xs text-purple-600 mb-1">계약 상태</p>
          <p>\${c.contract_status ? '<span class="badge status-' + c.contract_status + '">' + c.contract_status + '</span>' : '-'}</p>
        </div>
      </div>
      \${c.memo ? '<div class="bg-yellow-50 rounded-lg p-3"><p class="text-xs text-yellow-700 mb-1">메모</p><p class="text-sm text-gray-700">' + c.memo + '</p></div>' : ''}
    </div>
    <div class="flex gap-3 mt-6">
      <button onclick="closeDetailModal(); openEditModal(\${c.id})" class="flex-1 bg-blue-700 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition">
        <i class="fas fa-edit mr-1"></i> 수정
      </button>
      <button onclick="closeDetailModal()" class="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50 transition">닫기</button>
    </div>
  \`;
  document.getElementById('detail-modal').classList.remove('hidden');
}
function closeDetailModal() { document.getElementById('detail-modal').classList.add('hidden'); }

// ── 추가 모달 ──
function openAddModal() {
  document.getElementById('modal-title').textContent = '회사 추가';
  document.getElementById('company-form').reset();
  document.getElementById('form-id').value = '';
  document.getElementById('form-modal').classList.remove('hidden');
}

// ── 수정 모달 ──
function openEditModal(id) {
  const c = allCompanies.find(x => x.id === id);
  if (!c) return;
  document.getElementById('modal-title').textContent = '회사 수정';
  document.getElementById('form-id').value = c.id;
  document.getElementById('form-name').value = c.name || '';
  document.getElementById('form-industry').value = c.industry || '';
  document.getElementById('form-phone').value = c.phone || '';
  document.getElementById('form-email').value = c.email || '';
  document.getElementById('form-website').value = c.website || '';
  document.getElementById('form-address').value = c.address || '';
  document.getElementById('form-contact-name').value = c.contact_name || '';
  document.getElementById('form-contact-position').value = c.contact_position || '';
  document.getElementById('form-contact-phone').value = c.contact_phone || '';
  document.getElementById('form-contact-email').value = c.contact_email || '';
  document.getElementById('form-relation-type').value = c.relation_type || '';
  document.getElementById('form-contract-status').value = c.contract_status || '활성';
  document.getElementById('form-contract-start').value = c.contract_start || '';
  document.getElementById('form-contract-end').value = c.contract_end || '';
  document.getElementById('form-memo').value = c.memo || '';
  document.getElementById('form-modal').classList.remove('hidden');
}

function closeModal() { document.getElementById('form-modal').classList.add('hidden'); }

// ── 폼 제출 ──
async function submitForm(e) {
  e.preventDefault();
  const id = document.getElementById('form-id').value;
  const data = {
    name: document.getElementById('form-name').value,
    industry: document.getElementById('form-industry').value,
    phone: document.getElementById('form-phone').value,
    email: document.getElementById('form-email').value,
    website: document.getElementById('form-website').value,
    address: document.getElementById('form-address').value,
    contact_name: document.getElementById('form-contact-name').value,
    contact_position: document.getElementById('form-contact-position').value,
    contact_phone: document.getElementById('form-contact-phone').value,
    contact_email: document.getElementById('form-contact-email').value,
    relation_type: document.getElementById('form-relation-type').value,
    contract_status: document.getElementById('form-contract-status').value,
    contract_start: document.getElementById('form-contract-start').value,
    contract_end: document.getElementById('form-contract-end').value,
    memo: document.getElementById('form-memo').value,
  };
  try {
    if (id) await axios.put(\`/api/companies/\${id}\`, data);
    else await axios.post('/api/companies', data);
    closeModal();
    await loadCompanies();
  } catch(err) {
    alert('저장 중 오류가 발생했습니다.');
  }
}

// ── 삭제 ──
function openDeleteModal(id, name) {
  deleteTargetId = id;
  document.getElementById('delete-name').textContent = name;
  document.getElementById('delete-modal').classList.remove('hidden');
}
function closeDeleteModal() { document.getElementById('delete-modal').classList.add('hidden'); deleteTargetId = null; }
async function confirmDelete() {
  if (!deleteTargetId) return;
  try {
    await axios.delete(\`/api/companies/\${deleteTargetId}\`);
    closeDeleteModal();
    await loadCompanies();
  } catch(err) { alert('삭제 중 오류가 발생했습니다.'); }
}

// ── 엑셀 내보내기 ──
function exportExcel() {
  const q = document.getElementById('search').value.toLowerCase();
  const rel = document.getElementById('filter-relation').value;
  const stat = document.getElementById('filter-status').value;
  const ind = document.getElementById('filter-industry').value;
  let filtered = allCompanies.filter(c => {
    const matchQ = !q || [c.name, c.industry, c.contact_name, c.address, c.memo].some(f => f && f.toLowerCase().includes(q));
    return matchQ && (!rel || c.relation_type === rel) && (!stat || c.contract_status === stat) && (!ind || c.industry === ind);
  });

  const headers = ['회사명','업종','협력유형','주소','전화번호','이메일','홈페이지','담당자','직책','담당자연락처','담당자이메일','계약시작일','계약만료일','계약상태','메모'];
  const rows = filtered.map(c => [c.name, c.industry, c.relation_type, c.address, c.phone, c.email, c.website,
    c.contact_name, c.contact_position, c.contact_phone, c.contact_email, c.contract_start, c.contract_end, c.contract_status, c.memo]
    .map(v => v == null ? '' : String(v).replace(/,/g, '，')));
  
  const csv = [headers, ...rows].map(r => r.join(',')).join('\\n');
  const BOM = '\\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = '협력회사명단_' + new Date().toLocaleDateString('ko-KR').replace(/\\. /g, '-').replace('.', '') + '.csv';
  a.click(); URL.revokeObjectURL(url);
}

// 모달 외부 클릭 닫기
document.getElementById('form-modal').addEventListener('click', function(e) { if(e.target === this) closeModal(); });
document.getElementById('detail-modal').addEventListener('click', function(e) { if(e.target === this) closeDetailModal(); });
document.getElementById('delete-modal').addEventListener('click', function(e) { if(e.target === this) closeDeleteModal(); });

loadCompanies();
</script>
</body>
</html>`)
})

// ────────────────────────────────────────────
// API: 회사 목록 조회
// ────────────────────────────────────────────
app.get('/api/companies', async (c) => {
  const db = c.env.DB

  // 테이블 없으면 생성
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      industry TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      contact_name TEXT,
      contact_position TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      relation_type TEXT,
      contract_start DATE,
      contract_end DATE,
      contract_status TEXT DEFAULT '활성',
      memo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run()

  const result = await db.prepare(
    'SELECT * FROM companies ORDER BY created_at DESC'
  ).all()

  return c.json({ companies: result.results })
})

// ────────────────────────────────────────────
// API: 회사 단건 조회
// ────────────────────────────────────────────
app.get('/api/companies/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const company = await db.prepare('SELECT * FROM companies WHERE id = ?').bind(id).first()
  if (!company) return c.json({ error: '회사를 찾을 수 없습니다.' }, 404)
  return c.json(company)
})

// ────────────────────────────────────────────
// API: 회사 추가
// ────────────────────────────────────────────
app.post('/api/companies', async (c) => {
  const db = c.env.DB
  const body = await c.req.json() as Record<string, string>

  const result = await db.prepare(`
    INSERT INTO companies (name, industry, address, phone, email, website,
      contact_name, contact_position, contact_phone, contact_email,
      relation_type, contract_start, contract_end, contract_status, memo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.name, body.industry || null, body.address || null,
    body.phone || null, body.email || null, body.website || null,
    body.contact_name || null, body.contact_position || null,
    body.contact_phone || null, body.contact_email || null,
    body.relation_type || null,
    body.contract_start || null, body.contract_end || null,
    body.contract_status || '활성', body.memo || null
  ).run()

  return c.json({ id: result.meta.last_row_id, message: '회사가 추가되었습니다.' }, 201)
})

// ────────────────────────────────────────────
// API: 회사 수정
// ────────────────────────────────────────────
app.put('/api/companies/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const body = await c.req.json() as Record<string, string>

  await db.prepare(`
    UPDATE companies SET
      name = ?, industry = ?, address = ?, phone = ?, email = ?, website = ?,
      contact_name = ?, contact_position = ?, contact_phone = ?, contact_email = ?,
      relation_type = ?, contract_start = ?, contract_end = ?, contract_status = ?,
      memo = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    body.name, body.industry || null, body.address || null,
    body.phone || null, body.email || null, body.website || null,
    body.contact_name || null, body.contact_position || null,
    body.contact_phone || null, body.contact_email || null,
    body.relation_type || null,
    body.contract_start || null, body.contract_end || null,
    body.contract_status || '활성', body.memo || null,
    id
  ).run()

  return c.json({ message: '회사 정보가 수정되었습니다.' })
})

// ────────────────────────────────────────────
// API: 회사 삭제
// ────────────────────────────────────────────
app.delete('/api/companies/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  await db.prepare('DELETE FROM companies WHERE id = ?').bind(id).run()
  return c.json({ message: '회사가 삭제되었습니다.' })
})

export default app
