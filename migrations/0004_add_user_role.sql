-- users 테이블에 role 컬럼 추가 (admin / teacher)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'teacher';
