import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = { DB: D1Database }
const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors({ origin: '*', credentials: true }))
app.use('/static/*', serveStatic({ root: './public' }))

/* ── SHA-256 해시 ── */
async function hashPassword(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/* ── DB 초기화 ── */
async function initDB(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    industry TEXT,
    address TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    manager_name TEXT DEFAULT '',
    manager_phone TEXT DEFAULT '',
    manager_email TEXT DEFAULT '',
    memo TEXT DEFAULT '',
    last_contact TEXT DEFAULT '-',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run()
  await db.prepare(`CREATE TABLE IF NOT EXISTS company_departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    department TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE(company_id, department)
  )`).run()
  await db.prepare(`CREATE TABLE IF NOT EXISTS contact_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    method TEXT DEFAULT '전화',
    content TEXT,
    writer TEXT,
    dept TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  )`).run()
  await db.prepare(`CREATE TABLE IF NOT EXISTS employment_histories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    year TEXT,
    department TEXT,
    student TEXT,
    type TEXT DEFAULT '취업',
    writer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  )`).run()
  await db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    dept TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'teacher',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run()
  await db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`).run()

  // 컬럼 추가 (이미 있으면 무시)
  const colsToAdd = [
    `ALTER TABLE companies ADD COLUMN address TEXT DEFAULT ''`,
    `ALTER TABLE companies ADD COLUMN phone TEXT DEFAULT ''`,
    `ALTER TABLE companies ADD COLUMN manager_name TEXT DEFAULT ''`,
    `ALTER TABLE companies ADD COLUMN manager_phone TEXT DEFAULT ''`,
    `ALTER TABLE companies ADD COLUMN manager_email TEXT DEFAULT ''`,
    `ALTER TABLE companies ADD COLUMN memo TEXT DEFAULT ''`,
  ]
  for (const sql of colsToAdd) {
    try { await db.prepare(sql).run() } catch {}
  }

  // 기본 관리자 계정 자동 생성 (admin / admin1234)
  const adminExists = await db.prepare(`SELECT id FROM users WHERE username = 'admin'`).first()
  if (!adminExists) {
    const hashed = await hashPassword('admin1234')
    await db.prepare(`INSERT INTO users (name, dept, username, password, role) VALUES (?, ?, ?, ?, ?)`)
      .bind('관리자', '관리부', 'admin', hashed, 'admin').run()
  }
}

/* ── 세션 인증 ── */
async function getSessionUser(c: any) {
  const db: D1Database = c.env.DB
  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return null
  const row = await db.prepare(
    'SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ?'
  ).bind(token).first() as any
  return row || null
}

/* ── 메인 페이지 ── */
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>학교 업체관리 시스템 (대전도시과학고등학교)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body{font-family:'Apple SD Gothic Neo',sans-serif;background:#f8fafc;}
    .btn{display:inline-flex;align-items:center;justify-content:center;padding:6px 14px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;transition:all .15s;border:none;}
    .btn-primary{background:#1e40af;color:#fff;}.btn-primary:hover{background:#1d3a9e;}
    .btn-danger{background:#dc2626;color:#fff;}.btn-danger:hover{background:#b91c1c;}
    .btn-success{background:#16a34a;color:#fff;}.btn-success:hover{background:#15803d;}
    .btn-outline{background:#fff;color:#374151;border:1px solid #d1d5db;}.btn-outline:hover{background:#f3f4f6;}
    .btn-warning{background:#d97706;color:#fff;}.btn-warning:hover{background:#b45309;}
    .btn-sm{padding:4px 10px;font-size:13px;}
    .btn-active{background:#1e40af;color:#fff;}
    .card{background:#fff;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.07);padding:20px;}
    input,select,textarea{width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;}
    input:focus,select:focus,textarea:focus{border-color:#3b82f6;box-shadow:0 0 0 2px #bfdbfe;}
    table{width:100%;border-collapse:collapse;font-size:14px;}
    thead{background:#f8fafc;}
    th{padding:10px 14px;text-align:left;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;}
    td{padding:10px 14px;border-bottom:1px solid #f1f5f9;vertical-align:top;word-break:break-word;}
    tr.row-selected td{background:#eff6ff;}
    tbody tr:hover td{background:#f8fafc;cursor:pointer;}
    .tag{display:inline-block;padding:3px 9px;border-radius:99px;font-size:12px;background:#eff6ff;color:#1e40af;margin:2px;}
    .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:12px;font-weight:600;}
    .badge-취업{background:#dcfce7;color:#15803d;}
    .badge-현장실습{background:#fef9c3;color:#a16207;}
    .badge-admin{background:#fef3c7;color:#d97706;}
    .badge-teacher{background:#eff6ff;color:#1e40af;}
    .log-item{padding:8px 0;border-top:1px solid #f1f5f9;}
    .log-item:first-child{border-top:none;}
    .info-box{background:#f8fafc;padding:10px;border-radius:8px;}
    .info-label{font-size:11px;color:#94a3b8;margin-bottom:2px;}
    .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:100;padding:16px;}
    .tab-btn{padding:8px 20px;border:none;background:none;font-size:14px;font-weight:600;cursor:pointer;color:#64748b;border-bottom:2px solid transparent;}
    .tab-btn.active{color:#1e40af;border-bottom:2px solid #1e40af;}
  </style>
</head>
<body>
<div id="app"></div>
<script src="/static/app.js"></script>
</body>
</html>`)
})

/* ════════════════════
   AUTH API
════════════════════ */
app.post('/api/auth/register', async (c) => {
  const db = c.env.DB
  await initDB(db)
  const body = await c.req.json() as any
  const { name, dept, username, password } = body
  if (!name || !dept || !username || !password)
    return c.json({ error: '모든 항목을 입력해주세요.' }, 400)
  if (password.length < 4)
    return c.json({ error: '비밀번호는 4자 이상이어야 합니다.' }, 400)
  const exists = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
  if (exists) return c.json({ error: '이미 사용 중인 아이디입니다.' }, 409)
  const hashed = await hashPassword(password)
  await db.prepare('INSERT INTO users (name, dept, username, password, role) VALUES (?, ?, ?, ?, ?)')
    .bind(name, dept, username, hashed, 'teacher').run()
  return c.json({ message: '회원가입이 완료되었습니다! 로그인하세요.' }, 201)
})

app.post('/api/auth/login', async (c) => {
  const db = c.env.DB
  await initDB(db)
  const body = await c.req.json() as any
  const { username, password } = body
  if (!username || !password)
    return c.json({ error: '아이디와 비밀번호를 입력하세요.' }, 400)
  const user = await db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first() as any
  if (!user) return c.json({ error: '아이디 또는 비밀번호가 틀렸습니다.' }, 401)
  const hashed = await hashPassword(password)
  if (user.password !== hashed)
    return c.json({ error: '아이디 또는 비밀번호가 틀렸습니다.' }, 401)
  const sid = crypto.randomUUID()
  await db.prepare('INSERT INTO sessions (id, user_id) VALUES (?, ?)').bind(sid, user.id).run()
  return c.json({ token: sid, user: { id: user.id, name: user.name, dept: user.dept, role: user.role } })
})

app.post('/api/auth/logout', async (c) => {
  const user = await getSessionUser(c)
  if (user) {
    const db = c.env.DB
    const token = (c.req.header('Authorization') || '').slice(7)
    if (token) await db.prepare('DELETE FROM sessions WHERE id = ?').bind(token).run()
  }
  return c.json({ message: '로그아웃 완료' })
})

app.get('/api/auth/me', async (c) => {
  const db = c.env.DB
  await initDB(db)
  const user = await getSessionUser(c)
  if (!user) return c.json({ user: null })
  return c.json({ user: { id: user.id, name: user.name, dept: user.dept, role: user.role } })
})

/* ════════════════════
   ADMIN API
════════════════════ */
app.get('/api/admin/users', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user || user.role !== 'admin') return c.json({ error: '관리자 권한이 필요합니다.' }, 403)
  const users = await db.prepare(
    `SELECT id, name, dept, username, role, created_at FROM users ORDER BY created_at DESC`
  ).all()
  return c.json({ users: users.results })
})

app.delete('/api/admin/users/:id', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user || user.role !== 'admin') return c.json({ error: '관리자 권한이 필요합니다.' }, 403)
  const id = c.req.param('id')
  if (String(user.id) === String(id)) return c.json({ error: '자기 자신은 삭제할 수 없습니다.' }, 400)
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run()
  await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
  return c.json({ message: '회원이 삭제되었습니다.' })
})

app.put('/api/admin/users/:id/role', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user || user.role !== 'admin') return c.json({ error: '관리자 권한이 필요합니다.' }, 403)
  const id = c.req.param('id')
  const body = await c.req.json() as any
  const role = body.role === 'admin' ? 'admin' : 'teacher'
  await db.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, id).run()
  return c.json({ message: '역할이 변경되었습니다.' })
})

app.put('/api/admin/users/:id/reset-password', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user || user.role !== 'admin') return c.json({ error: '관리자 권한이 필요합니다.' }, 403)
  const id = c.req.param('id')
  const body = await c.req.json() as any
  if (!body.password || body.password.length < 4)
    return c.json({ error: '비밀번호는 4자 이상이어야 합니다.' }, 400)
  const hashed = await hashPassword(body.password)
  await db.prepare('UPDATE users SET password = ? WHERE id = ?').bind(hashed, id).run()
  return c.json({ message: '비밀번호가 초기화되었습니다.' })
})

app.get('/api/admin/stats', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user || user.role !== 'admin') return c.json({ error: '관리자 권한이 필요합니다.' }, 403)
  const [users, companies, contacts, histories] = await Promise.all([
    db.prepare('SELECT COUNT(*) as cnt FROM users').first() as any,
    db.prepare('SELECT COUNT(*) as cnt FROM companies').first() as any,
    db.prepare('SELECT COUNT(*) as cnt FROM contact_logs').first() as any,
    db.prepare('SELECT COUNT(*) as cnt FROM employment_histories').first() as any,
  ])
  return c.json({
    users: (users as any)?.cnt ?? 0,
    companies: (companies as any)?.cnt ?? 0,
    contacts: (contacts as any)?.cnt ?? 0,
    histories: (histories as any)?.cnt ?? 0,
  })
})

/* ════════════════════
   COMPANY API
════════════════════ */
app.get('/api/companies', async (c) => {
  const db = c.env.DB
  await initDB(db)
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  // 최근 연락일 기준 내림차순, 없으면 등록일 기준
  const companies = await db.prepare(`
    SELECT * FROM companies
    ORDER BY
      CASE WHEN last_contact = '-' OR last_contact IS NULL THEN 1 ELSE 0 END,
      last_contact DESC,
      created_at DESC
  `).all()
  const depts = await db.prepare('SELECT * FROM company_departments').all()
  // 각 업체의 가장 최근 연락 이력에서 연락자 이름 가져오기
  const latestContacts = await db.prepare(`
    SELECT company_id, writer
    FROM contact_logs
    WHERE id IN (
      SELECT MAX(id) FROM contact_logs GROUP BY company_id
    )
  `).all()
  const writerMap: Record<number, string> = {}
  for (const row of (latestContacts.results as any[])) {
    writerMap[row.company_id] = row.writer || ''
  }
  const result = (companies.results as any[]).map(co => ({
    ...co,
    departments: (depts.results as any[]).filter(d => d.company_id === co.id).map(d => d.department),
    last_contact_writer: writerMap[co.id] || ''
  }))
  return c.json({ companies: result })
})

app.post('/api/companies', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  const body = await c.req.json() as any
  if (!body.name?.trim()) return c.json({ error: '업체명을 입력해주세요.' }, 400)
  const res = await db.prepare(
    'INSERT INTO companies (name, industry, address, phone, manager_name, manager_phone, manager_email, memo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    body.name.trim(),
    body.industry || '',
    body.address || '',
    body.phone || '',
    body.manager_name || '',
    body.manager_phone || '',
    body.manager_email || '',
    body.memo || ''
  ).run()
  const id = res.meta.last_row_id
  if (Array.isArray(body.departments)) {
    for (const dept of body.departments) {
      await db.prepare('INSERT OR IGNORE INTO company_departments (company_id, department) VALUES (?, ?)')
        .bind(id, dept).run()
    }
  }
  return c.json({ id, message: '업체가 등록되었습니다.' }, 201)
})

// 업체 수정
app.put('/api/companies/:id', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  if (user.role !== 'admin') return c.json({ error: '관리자만 수정할 수 있습니다.' }, 403)
  const id = c.req.param('id')
  const body = await c.req.json() as any
  if (!body.name?.trim()) return c.json({ error: '업체명을 입력해주세요.' }, 400)
  await db.prepare(`
    UPDATE companies SET
      name = ?, industry = ?, address = ?, phone = ?,
      manager_name = ?, manager_phone = ?, manager_email = ?, memo = ?
    WHERE id = ?
  `).bind(
    body.name.trim(),
    body.industry || '',
    body.address || '',
    body.phone || '',
    body.manager_name || '',
    body.manager_phone || '',
    body.manager_email || '',
    body.memo || '',
    id
  ).run()
  // 학과 업데이트
  await db.prepare('DELETE FROM company_departments WHERE company_id = ?').bind(id).run()
  if (Array.isArray(body.departments)) {
    for (const dept of body.departments) {
      await db.prepare('INSERT OR IGNORE INTO company_departments (company_id, department) VALUES (?, ?)')
        .bind(id, dept).run()
    }
  }
  return c.json({ message: '업체 정보가 수정되었습니다.' })
})

app.delete('/api/companies/:id', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  if (user.role !== 'admin') return c.json({ error: '관리자만 삭제할 수 있습니다.' }, 403)
  const id = c.req.param('id')
  await db.prepare('DELETE FROM contact_logs WHERE company_id = ?').bind(id).run()
  await db.prepare('DELETE FROM employment_histories WHERE company_id = ?').bind(id).run()
  await db.prepare('DELETE FROM company_departments WHERE company_id = ?').bind(id).run()
  await db.prepare('DELETE FROM companies WHERE id = ?').bind(id).run()
  return c.json({ message: '업체가 삭제되었습니다.' })
})

/* ── 연락 이력 ── */
app.get('/api/companies/:id/contacts', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  const id = c.req.param('id')
  const logs = await db.prepare(
    'SELECT * FROM contact_logs WHERE company_id = ? ORDER BY date DESC, created_at DESC'
  ).bind(id).all()
  return c.json({ logs: logs.results })
})

app.post('/api/companies/:id/contacts', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  const id = c.req.param('id')
  const body = await c.req.json() as any
  await db.prepare(
    'INSERT INTO contact_logs (company_id, date, method, content, writer, dept) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, body.date, body.method || '전화', body.content || '', body.writer || '', body.dept || '').run()
  await db.prepare('UPDATE companies SET last_contact = ? WHERE id = ?').bind(body.date, id).run()
  return c.json({ message: '연락 이력 추가됨' }, 201)
})

// 연락 이력 수정
app.put('/api/contacts/:id', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  if (user.role !== 'admin') return c.json({ error: '관리자만 수정할 수 있습니다.' }, 403)
  const id = c.req.param('id')
  const body = await c.req.json() as any
  await db.prepare(
    'UPDATE contact_logs SET date = ?, method = ?, content = ? WHERE id = ?'
  ).bind(body.date, body.method || '전화', body.content || '', id).run()
  return c.json({ message: '연락 이력이 수정되었습니다.' })
})

// 연락 이력 삭제
app.delete('/api/contacts/:id', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  if (user.role !== 'admin') return c.json({ error: '관리자만 삭제할 수 있습니다.' }, 403)
  const id = c.req.param('id')
  await db.prepare('DELETE FROM contact_logs WHERE id = ?').bind(id).run()
  return c.json({ message: '연락 이력이 삭제되었습니다.' })
})

/* ── 취업/실습 이력 ── */
app.get('/api/companies/:id/histories', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  const id = c.req.param('id')
  const histories = await db.prepare(
    'SELECT * FROM employment_histories WHERE company_id = ? ORDER BY year DESC, created_at DESC'
  ).bind(id).all()
  return c.json({ histories: histories.results })
})

app.post('/api/companies/:id/histories', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  const id = c.req.param('id')
  const body = await c.req.json() as any
  await db.prepare(
    'INSERT INTO employment_histories (company_id, year, department, student, type, writer) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, body.year || '', body.department || '', body.student || '', body.type || '취업', body.writer || '').run()
  return c.json({ message: '이력 추가됨' }, 201)
})

// 취업/실습 이력 수정
app.put('/api/histories/:id', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  if (user.role !== 'admin') return c.json({ error: '관리자만 수정할 수 있습니다.' }, 403)
  const id = c.req.param('id')
  const body = await c.req.json() as any
  await db.prepare(
    'UPDATE employment_histories SET year = ?, department = ?, student = ?, type = ? WHERE id = ?'
  ).bind(body.year || '', body.department || '', body.student || '', body.type || '취업', id).run()
  return c.json({ message: '이력이 수정되었습니다.' })
})

// 취업/실습 이력 삭제
app.delete('/api/histories/:id', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  if (user.role !== 'admin') return c.json({ error: '관리자만 삭제할 수 있습니다.' }, 403)
  const id = c.req.param('id')
  await db.prepare('DELETE FROM employment_histories WHERE id = ?').bind(id).run()
  return c.json({ message: '이력이 삭제되었습니다.' })
})

/* ── 연도별 담당교사 API ── */
app.get('/api/companies/:id/charges', async (c) => {
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  const db = c.env.DB
  const id = c.req.param('id')
  const charges = await db.prepare(
    'SELECT * FROM teacher_charges WHERE company_id = ? ORDER BY year DESC, created_at DESC'
  ).bind(id).all()
  return c.json({ charges: charges.results })
})

app.post('/api/companies/:id/charges', async (c) => {
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  const db = c.env.DB
  const id = c.req.param('id')
  const { year, teacher_name, department, note } = await c.req.json()
  if (!year || !teacher_name) return c.json({ error: '연도와 담당교사 이름은 필수입니다.' }, 400)
  const result = await db.prepare(
    'INSERT INTO teacher_charges (company_id, year, teacher_name, department, note) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, year, teacher_name, department || '', note || '').run()
  return c.json({ id: result.meta.last_row_id, message: '담당교사가 추가되었습니다.' })
})

app.put('/api/charges/:id', async (c) => {
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  if (user.role !== 'admin') return c.json({ error: '관리자만 수정할 수 있습니다.' }, 403)
  const db = c.env.DB
  const id = c.req.param('id')
  const { year, teacher_name, department, note } = await c.req.json()
  await db.prepare(
    'UPDATE teacher_charges SET year = ?, teacher_name = ?, department = ?, note = ? WHERE id = ?'
  ).bind(year, teacher_name, department || '', note || '', id).run()
  return c.json({ message: '담당교사 정보가 수정되었습니다.' })
})

app.delete('/api/charges/:id', async (c) => {
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  if (user.role !== 'admin') return c.json({ error: '관리자만 삭제할 수 있습니다.' }, 403)
  const db = c.env.DB
  const id = c.req.param('id')
  await db.prepare('DELETE FROM teacher_charges WHERE id = ?').bind(id).run()
  return c.json({ message: '담당교사가 삭제되었습니다.' })
})

/* ════════════════════
   취업 대시보드 API
════════════════════ */

// 연도 목록 + 연도별 집계
app.get('/api/dashboard/summary', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)

  // 연도별 취업/실습 건수
  const byYear = await db.prepare(`
    SELECT year, type, COUNT(*) as cnt
    FROM employment_histories
    GROUP BY year, type
    ORDER BY year DESC
  `).all()

  // 학과별 취업/실습 건수 (전체)
  const byDept = await db.prepare(`
    SELECT department, type, COUNT(*) as cnt
    FROM employment_histories
    GROUP BY department, type
    ORDER BY cnt DESC
  `).all()

  // 연도별 업체별 배치 수
  const byCompany = await db.prepare(`
    SELECT eh.year, c.name as company_name, COUNT(*) as cnt
    FROM employment_histories eh
    JOIN companies c ON eh.company_id = c.id
    GROUP BY eh.year, c.id
    ORDER BY eh.year DESC, cnt DESC
  `).all()

  return c.json({
    byYear: byYear.results,
    byDept: byDept.results,
    byCompany: byCompany.results,
  })
})

// 특정 연도의 졸업생 목록 (상세)
app.get('/api/dashboard/year/:year', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)

  const year = c.req.param('year')
  const students = await db.prepare(`
    SELECT
      eh.id, eh.year, eh.type, eh.department, eh.student, eh.writer,
      eh.company_id, c.name as company_name,
      c.industry, c.address, c.phone,
      c.manager_name, c.manager_phone, c.manager_email
    FROM employment_histories eh
    JOIN companies c ON eh.company_id = c.id
    WHERE eh.year = ?
    ORDER BY eh.department, eh.student
  `).bind(year).all()

  return c.json({ students: students.results, year })
})

export default app
