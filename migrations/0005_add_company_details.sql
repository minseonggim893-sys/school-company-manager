-- 업체 테이블에 주소/담당자 정보 추가
ALTER TABLE companies ADD COLUMN address TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN phone TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN manager_name TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN manager_phone TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN manager_email TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN memo TEXT DEFAULT '';
