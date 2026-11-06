# DK블라썸 홈페이지 개편

## 구현 범위

- 메인 첫 화면을 4개 장면으로 구성: DK블라썸, 앱·웹 개발, AI 솔루션, AI 활용 교육.
- 기존 브랜드 이미지를 WebP로 최적화하고, 이미지 확대와 꽃잎 움직임을 적용. 영상 파일을 재생하는 방식은 아님.
- 투명 헤더, 스크롤 시 배경 처리, 모바일 메뉴와 언어 선택 메뉴 배치.
- 8초 자동 전환, 재생/일시정지, 수동 선택 및 키보드 탐색.
- 사용자가 장면을 선택하거나 키보드로 탐색하면 자동 재생 중단. 움직임 줄이기 설정, 탭 숨김, 화면 이탈에도 대응.
- 현재 운영 중인 한국어 메인 페이지의 나머지 콘텐츠·메타데이터·언어 링크 유지.

## 운영 반영 전 확인

**이 브랜치 전체를 현재 상태로 운영에 승격하지 마세요.**

2026-11-06에 확인한 운영 사이트는 최근 Vercel CLI 배포이며, GitHub main은
`430c22b9943436cb8c8f375103560245bbf83bb3`(2026-10-29)입니다. 운영판의 일부 제품 페이지,
다국어 페이지, 서버 기능이 main보다 새롭습니다. 이번 브랜치에는 디자인 검토를 위해
공개된 최신 메인 HTML과 직접 참조하는 정적 자산을 복원했으며, 운영 소스 전체를 동기화한 것은 아닙니다.

Vercel 브라우저 대시보드에서는 프로젝트를 확인했지만, 연결된 API에서는 같은 프로젝트·팀 ID로
조회해도 404가 반환되었습니다. 이 문제를 해결하거나 현재 운영판의 완전한 소스에서 배포해야 합니다.

## 최신 운영 소스에 최소 변경 적용

완전한 현재 운영 소스 체크아웃이 준비되면 이 브랜치의 도구를 사용합니다.

```bash
python tools/apply-home-cinematic.py --root /path/to/current-site
python tools/apply-home-cinematic.py --root /path/to/current-site --write
```

첫 명령은 적용 가능 여부만 확인합니다. 두 번째 명령은 다음 파일만 갱신하며 배포하지 않습니다.

- `index.html`: 기존 hero 교체, body 클래스, CSS/JS 참조 추가.
- `assets/css/home-cinematic.css`
- `assets/js/home-cinematic.js`
- `assets/company/home-blossom.webp`
- `assets/company/dk-ai-shield-symbol.svg` (운영판에서 가져온 기존 심볼).

공용 `main.js`, `company.js`, `company.css`, API, 환경 변수, 모바일 배포 파일 및
다국어 페이지는 이 도구가 수정하지 않습니다. 운영 배포는 기존 프로젝트의 정상 배포 절차로 진행합니다.

## 검토용 페이지

`home-cinematic-preview.html`은 같은 메인 화면의 검토용 페이지입니다. 본문 링크는 현재 운영
사이트로 연결해 이 브랜치에 없는 최신 제품 페이지도 열 수 있도록 했습니다. 변경 후 다음 명령으로 재생성합니다.

```bash
python tools/build-home-cinematic-preview.py
```

## 검증

- 새로운 JavaScript 문법 검사.
- 통합 HTML의 단일 h1, 고유 ID, 장면·버튼 및 ARIA 대상 검사.
- 실제 운영 사이트의 소개/개발/AI Shield/교육/문의 링크 HTTP 200 확인.
- 최신 운영 HTML의 hero·body 클래스·새 CSS/JS 참조 외 영역이 바이트 단위로 유지됨을 확인.
- 적용 도구의 반복 실행 시 중복 삽입 없음, hero 누락/중복 소스 거부 확인.
- DOM 및 타이머 모의 환경에서 자동 전환, 포인터·키보드 입력, 수동 정지, 움직임 줄이기,
  문서 숨김/복귀, IntersectionObserver 및 대체 스크롤 처리 검사.

DOM 검증은 실제 브라우저의 화면 배치 검증을 대신하지 않습니다. Vercel Preview가 생성되면
데스크톱과 모바일 화면을 확인하고, 운영 승격 전 완전한 최신 소스를 기준으로 배포 검증을 완료해야 합니다.
