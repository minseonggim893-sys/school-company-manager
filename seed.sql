-- 샘플 업체 데이터
INSERT OR IGNORE INTO companies (name, industry, last_contact) VALUES
  ('대덕모터스', '자동차/정비', '2026-03-05'),
  ('에코배터리테크', '배터리', '2026-03-03'),
  ('스마트정밀', '기계/자동화', '2026-02-28');

-- 업체-학과 매핑
INSERT OR IGNORE INTO company_departments (company_id, department) VALUES
  (1, '모빌리티과'), (1, '친환경자동차과'),
  (2, '전기배터리과'), (2, '전기과'),
  (3, '스마트기계과'), (3, '스마트전자과');

-- 샘플 연락 이력
INSERT OR IGNORE INTO contact_logs (company_id, date, method, content, writer, dept) VALUES
  (1, '2026-03-05', '전화', '채용 관련 문의 및 방문 일정 조율', '김민성', '전기과'),
  (2, '2026-03-03', '방문', '배터리 기술 관련 산학 협력 논의', '김민성', '전기과');

-- 샘플 취업/실습 이력
INSERT OR IGNORE INTO employment_histories (company_id, year, department, student, type, writer) VALUES
  (1, '2025', '모빌리티과', '홍길동', '취업', '김민성'),
  (1, '2025', '친환경자동차과', '이순신', '현장실습', '김민성'),
  (3, '2024', '스마트기계과', '장보고', '취업', '김민성');
