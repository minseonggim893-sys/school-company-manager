-- 샘플 데이터
INSERT INTO companies (name, industry, address, phone, email, website, contact_name, contact_position, contact_phone, contact_email, relation_type, contract_start, contract_end, contract_status, memo) VALUES
('삼성전자', 'IT/전자', '경기도 수원시 영통구 삼성로 129', '031-200-1114', 'info@samsung.com', 'https://www.samsung.com', '김철수', '채용담당자', '031-200-1234', 'chulsoo.kim@samsung.com', '취업연계', '2024-01-01', '2025-12-31', '활성', 'SW개발 분야 취업연계'),
('LG전자', 'IT/전자', '서울특별시 영등포구 여의대로 128', '02-3777-1114', 'info@lge.com', 'https://www.lg.com', '이영희', '인사팀장', '02-3777-2345', 'yh.lee@lge.com', 'MOU', '2023-06-01', '2026-05-31', '활성', '산학협력 MOU 체결'),
('현대자동차', '자동차/기계', '서울특별시 서초구 헌릉로 12', '02-3464-1114', 'info@hyundai.com', 'https://www.hyundai.com', '박민준', '인재개발팀', '02-3464-3456', 'minjun.park@hyundai.com', '인턴십', '2024-03-01', '2025-02-28', '활성', '하계/동계 인턴십 프로그램'),
('네이버', 'IT/인터넷', '경기도 성남시 분당구 불정로 6', '1588-3820', 'recruit@navercorp.com', 'https://www.navercorp.com', '최지현', '채용팀', '031-784-1234', 'jihyun.choi@navercorp.com', '취업연계', '2024-01-01', '2024-12-31', '활성', '개발직군 채용 연계'),
('카카오', 'IT/인터넷', '제주특별자치도 제주시 첨단로 242', '1577-3754', 'recruit@kakao.com', 'https://www.kakao.com', '정수빈', 'HR팀', '064-795-1234', 'subin.jung@kakao.com', '인턴십', '2024-06-01', '2024-08-31', '만료', '하계 인턴십 완료'),
('교보문구', '유통/교육', '서울특별시 종로구 종로 1', '02-1588-1234', 'edu@kyobo.com', 'https://www.kyobobook.co.kr', '한소영', '교육팀장', '02-1588-2345', 'soyoung.han@kyobo.com', '납품업체', '2023-01-01', '2025-12-31', '활성', '교재 및 학용품 납품'),
('롯데백화점', '유통/서비스', '서울특별시 중구 남대문로 81', '02-771-2500', 'hr@lotteshopping.com', 'https://www.lotteshopping.com', '김태준', '인사부', '02-771-3456', 'taejun.kim@lotteshopping.com', '취업연계', '2024-02-01', '2025-01-31', '활성', '서비스 직군 취업연계'),
('신세계건설', '건설/부동산', '서울특별시 중구 소공로 63', '02-310-1234', 'info@shinsegae.com', 'https://www.shinsegae.com', '오현우', '채용팀', '02-310-2345', 'hw.oh@shinsegae.com', '후원', '2023-09-01', '2025-08-31', '활성', '장학금 후원사');
