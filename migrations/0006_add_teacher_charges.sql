-- 연도별 담당교사 테이블
CREATE TABLE IF NOT EXISTS teacher_charges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  teacher_name TEXT NOT NULL,
  department TEXT,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_teacher_charges_company_id ON teacher_charges(company_id);
CREATE INDEX IF NOT EXISTS idx_teacher_charges_year ON teacher_charges(year);
