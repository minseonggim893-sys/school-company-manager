-- 기존 테이블 초기화 후 재설계

DROP TABLE IF EXISTS contact_logs;
DROP TABLE IF EXISTS employment_histories;
DROP TABLE IF EXISTS company_departments;
DROP TABLE IF EXISTS companies;

-- 업체 테이블
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  industry TEXT,
  last_contact TEXT DEFAULT '-',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 업체-학과 매핑 테이블 (다대다)
CREATE TABLE IF NOT EXISTS company_departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  department TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id, department)
);

-- 연락 이력 테이블
CREATE TABLE IF NOT EXISTS contact_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  method TEXT DEFAULT '전화',
  content TEXT,
  writer TEXT,
  dept TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 취업/실습 이력 테이블
CREATE TABLE IF NOT EXISTS employment_histories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  year TEXT,
  department TEXT,
  student TEXT,
  type TEXT DEFAULT '취업',
  writer TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_contact_logs_company ON contact_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_employment_company ON employment_histories(company_id);
CREATE INDEX IF NOT EXISTS idx_company_dept ON company_departments(company_id);
