# DK블라썸 회사 홈페이지 — 2026-10-13

기존 Vercel `avs` 프로젝트와 www.alphavipertrading.com 도메인을 사용합니다. AVS 제품은 회사의 서비스 제품으로 분리합니다.

## 페이지

- `/`: 회사 메인, 제작·교육 지원, AVS와 자체 앱 소개
- `/about`, `/services`, `/projects`, `/contact`: 회사/사업/사례/상담
- `/product`: 제품 목록, Android 앱 분야 필터, 실제 화면 팝업
- `/avs`: AVS 웹 기반 PC·모바일 제품 소개
- 기존 AVS 기능·다운로드·설치·오류 접수 주소 유지
- `privacy/*`, `mobile/*`, `downloads/*`, `app-ads.txt` 원본 보존

## 수정과 재생성

`tools/build-company.py`와 `assets/css/company.css`가 회사 페이지 소스입니다.
앱 설명은 `assets/company/content.json`, 실제 이미지 파일은 같은 디렉터리에 있습니다.
Python 3에서 `python tools/build-company.py`로 재생성합니다. 기존 지원 페이지의 내용은 `tools/company-legacy/` 원본을 읽어 회사 헤더·푸터만 적용합니다.
구형 `tools/build-site.js`는 AVS 전용 홈페이지를 생성하므로 사용하지 않습니다.
제품 업데이트 시에는 다운로드 템플릿 `tools/company-legacy/download.html`도 최신 페이지 내용과 함께 갱신해야 재생성으로 이전 버전 안내가 복원되지 않습니다.

## 배포

Vercel 로그인 및 기존 `.vercel/project.json` 연결 상태를 확인하고:

`npx --yes vercel@63.1.0 deploy --prod --yes --scope alphavipertrading`

앱 바이너리는 다시 빌드하지 않습니다. 배포 전후 `/mobile/update.json` 버전·해시와 공개 APK를 확인합니다.
문의는 기존 Resend API 및 Vercel 환경변수를 유지합니다. 개인정보 수집 동의와 입력·첨부 검증을 유지합니다.
사이트에는 앱 설치 링크별 Play referrer를 적용했고 관리표는 `assets/company/channel-links.csv`입니다. 클릭 수집이나 설치 성과 측정이 별도로 구축되었다는 의미는 아닙니다.
새 PC에서는 Vercel 인증과 Resend 환경변수를 안전한 별도 절차로 준비합니다. 비밀키·개인 계좌정보를 ZIP에 포함하지 않습니다.
