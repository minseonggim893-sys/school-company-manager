import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

type Bindings = { DB: D1Database }
const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors({ origin: '*', credentials: true }))
app.use('/static/*', serveStatic({ root: './public' }))

/* ── 간단한 해시 (SHA-256 via Web Crypto) ── */
async function hashPassword(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function randomId(): string {
  return crypto.randomUUID()
}

/* ── DB 초기화 ── */
async function initDB(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    industry TEXT,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run()
  await db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`).run()
}

/* ── 세션 인증 미들웨어 ── */
async function getSessionUser(c: any) {
  const db: D1Database = c.env.DB
  const sid = getCookie(c, 'sid')
  if (!sid) return null
  const row = await db.prepare(
    'SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ?'
  ).bind(sid).first() as any
  return row || null
}

/* ── 메인 페이지 ── */
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>학교 업체관리 시스템</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body{font-family:'Apple SD Gothic Neo',sans-serif;background:#f8fafc;}
    .btn{display:inline-flex;align-items:center;justify-content:center;padding:6px 14px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;transition:all .15s;border:none;}
    .btn-primary{background:#1e40af;color:#fff;}.btn-primary:hover{background:#1d3a9e;}
    .btn-danger{background:#dc2626;color:#fff;}.btn-danger:hover{background:#b91c1c;}
    .btn-outline{background:#fff;color:#374151;border:1px solid #d1d5db;}.btn-outline:hover{background:#f3f4f6;}
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
    .log-item{padding:8px 0;border-top:1px solid #f1f5f9;}
    .log-item:first-child{border-top:none;}
    .info-box{background:#f8fafc;padding:10px;border-radius:8px;}
    .info-label{font-size:11px;color:#94a3b8;margin-bottom:2px;}
    .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:100;padding:16px;}
  </style>
</head>
<body>
<div id="app"></div>
<script src="/static/app.js"></script>
</body>
</html>`)
})

/* ════════════════════════════════
   AUTH API
════════════════════════════════ */

/* ── 회원가입 ── */
app.post('/api/auth/register', async (c) => {
  const db = c.env.DB
  await initDB(db)
  const body = await c.req.json() as any
  const { name, dept, username, password } = body
  if (!name || !dept || !username || !password) {
    return c.json({ error: '모든 항목을 입력해주세요.' }, 400)
  }
  if (password.length < 4) {
    return c.json({ error: '비밀번호는 4자 이상이어야 합니다.' }, 400)
  }
  const exists = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
  if (exists) return c.json({ error: '이미 사용 중인 아이디입니다.' }, 409)
  const hashed = await hashPassword(password)
  await db.prepare('INSERT INTO users (name, dept, username, password) VALUES (?, ?, ?, ?)')
    .bind(name, dept, username, hashed).run()
  return c.json({ message: '회원가입 완료! 로그인하세요.' }, 201)
})

/* ── 로그인 ── */
app.post('/api/auth/login', async (c) => {
  const db = c.env.DB
  await initDB(db)
  const body = await c.req.json() as any
  const { username, password } = body
  if (!username || !password) return c.json({ error: '아이디와 비밀번호를 입력하세요.' }, 400)
  const user = await db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first() as any
  if (!user) return c.json({ error: '아이디 또는 비밀번호가 틀렸습니다.' }, 401)
  const hashed = await hashPassword(password)
  if (user.password !== hashed) return c.json({ error: '아이디 또는 비밀번호가 틀렸습니다.' }, 401)
  const sid = randomId()
  await db.prepare('INSERT INTO sessions (id, user_id) VALUES (?, ?)').bind(sid, user.id).run()
  setCookie(c, 'sid', sid, { path: '/', httpOnly: true, sameSite: 'Lax', maxAge: 60 * 60 * 24 * 7 })
  return c.json({ user: { id: user.id, name: user.name, dept: user.dept } })
})

/* ── 로그아웃 ── */
app.post('/api/auth/logout', async (c) => {
  const db = c.env.DB
  const sid = getCookie(c, 'sid')
  if (sid) await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sid).run()
  deleteCookie(c, 'sid', { path: '/' })
  return c.json({ message: '로그아웃 완료' })
})

/* ── 현재 세션 확인 ── */
app.get('/api/auth/me', async (c) => {
  const db = c.env.DB
  await initDB(db)
  const user = await getSessionUser(c)
  if (!user) return c.json({ user: null })
  return c.json({ user: { id: user.id, name: user.name, dept: user.dept } })
})

/* ════════════════════════════════
   COMPANY API
════════════════════════════════ */

/* ── 업체 목록 ── */
app.get('/api/companies', async (c) => {
  const db = c.env.DB
  await initDB(db)
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  const companies = await db.prepare('SELECT * FROM companies ORDER BY created_at DESC').all()
  const depts = await db.prepare('SELECT * FROM company_departments').all()
  const result = (companies.results as any[]).map(co => ({
    ...co,
    departments: (depts.results as any[]).filter(d => d.company_id === co.id).map(d => d.department)
  }))
  return c.json({ companies: result })
})

/* ── 업체 등록 ── */
app.post('/api/companies', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  const body = await c.req.json() as any
  const res = await db.prepare('INSERT INTO companies (name, industry) VALUES (?, ?)').bind(body.name, body.industry || null).run()
  const id = res.meta.last_row_id
  if (Array.isArray(body.departments)) {
    for (const dept of body.departments) {
      await db.prepare('INSERT OR IGNORE INTO company_departments (company_id, department) VALUES (?, ?)').bind(id, dept).run()
    }
  }
  return c.json({ id, message: '업체가 등록되었습니다.' }, 201)
})

/* ── 업체 삭제 ── */
app.delete('/api/companies/:id', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  const id = c.req.param('id')
  await db.prepare('DELETE FROM contact_logs WHERE company_id = ?').bind(id).run()
  await db.prepare('DELETE FROM employment_histories WHERE company_id = ?').bind(id).run()
  await db.prepare('DELETE FROM company_departments WHERE company_id = ?').bind(id).run()
  await db.prepare('DELETE FROM companies WHERE id = ?').bind(id).run()
  return c.json({ message: '업체가 삭제되었습니다.' })
})

/* ── 연락 이력 조회 ── */
app.get('/api/companies/:id/contacts', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  const id = c.req.param('id')
  const logs = await db.prepare('SELECT * FROM contact_logs WHERE company_id = ? ORDER BY date DESC, created_at DESC').bind(id).all()
  return c.json({ logs: logs.results })
})

/* ── 연락 이력 추가 ── */
app.post('/api/companies/:id/contacts', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  const id = c.req.param('id')
  const body = await c.req.json() as any
  await db.prepare('INSERT INTO contact_logs (company_id, date, method, content, writer, dept) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, body.date, body.method || '전화', body.content || '', body.writer || '', body.dept || '').run()
  await db.prepare('UPDATE companies SET last_contact = ? WHERE id = ?').bind(body.date, id).run()
  return c.json({ message: '연락 이력 추가됨' }, 201)
})

/* ── 취업/실습 이력 조회 ── */
app.get('/api/companies/:id/histories', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  const id = c.req.param('id')
  const histories = await db.prepare('SELECT * FROM employment_histories WHERE company_id = ? ORDER BY year DESC, created_at DESC').bind(id).all()
  return c.json({ histories: histories.results })
})

/* ── 취업/실습 이력 추가 ── */
app.post('/api/companies/:id/histories', async (c) => {
  const db = c.env.DB
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: '로그인이 필요합니다.' }, 401)
  const id = c.req.param('id')
  const body = await c.req.json() as any
  await db.prepare('INSERT INTO employment_histories (company_id, year, department, student, type, writer) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, body.year || '', body.department || '', body.student || '', body.type || '취업', body.writer || '').run()
  return c.json({ message: '이력 추가됨' }, 201)
})

export default app
