-- 회사 명단 테이블
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 기본 정보
  name TEXT NOT NULL,                        -- 회사명
  industry TEXT,                             -- 업종/분류
  address TEXT,                              -- 주소
  phone TEXT,                                -- 전화번호
  email TEXT,                                -- 이메일
  website TEXT,                              -- 홈페이지
  
  -- 담당자 정보
  contact_name TEXT,                         -- 담당자 이름
  contact_position TEXT,                     -- 담당자 직책
  contact_phone TEXT,                        -- 담당자 연락처
  contact_email TEXT,                        -- 담당자 이메일
  
  -- 학교 관계
  relation_type TEXT,                        -- 협력유형: 취업연계/인턴십/납품업체/후원/MOU/기타
  contract_start DATE,                       -- 계약 시작일
  contract_end DATE,                         -- 계약 만료일
  contract_status TEXT DEFAULT '활성',       -- 계약 상태: 활성/만료/협의중/중단
  
  -- 기타
  memo TEXT,                                 -- 메모/특이사항
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_relation_type ON companies(relation_type);
CREATE INDEX IF NOT EXISTS idx_companies_contract_status ON companies(contract_status);
