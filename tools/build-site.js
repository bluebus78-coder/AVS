const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const nav = [
  ["index.html", "홈"],
  ["product.html", "제품소개"],
  ["features.html", "핵심기능"],
  ["workflow.html", "운영흐름"],
  ["dashboard.html", "화면구성"],
  ["security.html", "보안/리스크"],
  ["download.html", "다운로드센터"],
  ["install.html", "설치가이드"],
  ["contact.html", "문의"],
  ["bug-report.html", "버그접수"],
  ["privacy.html", "개인정보처리방침"],
];

function layout({ file, title, description, body, sub = false }) {
  const links = nav.map(([href, label]) => `<a href="${href}" class="${href === file ? "active" : ""}">${label}</a>`).join("");
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | Alpha Viper System</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${title} | Alpha Viper System">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<link rel="icon" href="assets/images/favicon.svg">
<link rel="stylesheet" href="assets/css/style.css">
<link rel="stylesheet" href="assets/css/rev8.css">
</head>
<body class="${sub ? "subpage" : ""}">
<div class="noise"></div>
<header class="top">
  <div class="wrap nav">
    <a class="brand" href="index.html">
      <img src="assets/images/logo-symbol.png" alt="Alpha Viper">
      <span><b>Alpha Viper</b><small>QUANT ENGINE · V1.0</small></span>
    </a>
    <button class="hamb" type="button" aria-label="메뉴 열기" data-menu>☰</button>
    <nav data-nav>${links}</nav>
  </div>
</header>
<main class="${sub ? "sub" : ""}">
${body}
</main>
${footer()}
<script src="assets/js/main.js"></script>
</body>
</html>`;
}

function footer() {
  return `<footer>
  <div class="wrap foot">
    <div>
      <b>Alpha Viper System [QUANT ENGINE]</b>
      <p>종목 선별, 포트폴리오 구성, 자동매매 감시, 리스크 기준, 거래 기록을 하나의 운영 콘솔로 정리합니다.</p>
    </div>
    <div>
      <span>PRODUCT</span>
      <a href="features.html">핵심 기능</a>
      <a href="dashboard.html">화면 구성</a>
      <a href="workflow.html">운영 흐름</a>
    </div>
    <div>
      <span>SUPPORT</span>
      <a href="contact.html">도입 문의</a>
      <a href="terms.html">이용약관</a>
      <a href="privacy.html">개인정보처리방침</a>
    </div>
  </div>
  <div class="wrap risknote">본 제품은 투자 정보 확인과 자동화된 투자 운영을 보조하는 소프트웨어입니다. 투자 판단과 책임은 사용자에게 있으며, 특정 수익률 또는 투자 결과를 보장하지 않습니다. 투자에는 원금 손실 위험이 있습니다.</div>
</footer>`;
}

function pageHead(label, h1, text) {
  return `<section class="pagehead wrap"><span>${label}</span><h1>${h1}</h1><p>${text}</p></section>`;
}

function cards(items, extra = "") {
  return `<div class="wrap cards ${extra}">${items.map((item, index) => `<article><i>${String(index + 1).padStart(2, "0")}</i><h3>${item[0]}</h3><p>${item[1]}</p></article>`).join("")}</div>`;
}

const pages = {
  "index.html": layout({
    file: "index.html",
    title: "AI 자동매매 운영 시스템",
    description: "Alpha Viper System 제품 소개",
    body: `
<section class="hero avs-hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <span class="eyebrow"><i></i>Alpha Viper System [QUANT ENGINE] · V1.0</span>
      <h1>전략 발굴부터 자동매매 감시까지 <em>하나의 운영 콘솔</em></h1>
      <p class="lead">실시간 시장 데이터, AI 포트폴리오 구성, 주문계획, 계좌/API 설정, 백업/복구, 거래로그를 한 흐름으로 연결합니다. 투자 판단을 감정이 아닌 기준과 기록으로 운영할 수 있도록 설계했습니다.</p>
      <div class="actions"><a class="btn primary" href="contact.html">도입 문의하기</a><a class="btn ghost" href="dashboard.html">제품 화면 보기</a></div>
      <div class="metrics"><div><b>Scan</b><span>단기·중기·전략 후보 선별</span></div><div><b>Control</b><span>주문 조건과 리스크 감시</span></div><div><b>Record</b><span>체결·실패·설정 이력 보관</span></div></div>
    </div>
    <div class="hero-shot">
      <div class="halo"></div>
      <div class="terminal main-terminal"><div class="bar"><span>PRODUCT MAIN</span><b>CONNECTED</b></div><img src="assets/images/product-main-home.png?v=home-rev10" alt="Alpha Viper 홈 메인 화면"></div>
      <div class="pod pod1"><b>총 수익률 +234%</b><span>기준금액 대비 누적 성과</span></div>
      <div class="pod pod2"><b>334,000,000원</b><span>총 평가금액</span></div>
    </div>
  </div>
</section>
<section class="section problem">
  <div class="wrap split-title">
    <div><span>Why It Matters</span><h2>투자 운영에서 가장 위험한 순간은 기준이 흔들리는 순간입니다.</h2></div>
    <p>Alpha Viper System은 종목 확인, 비중 결정, 주문 감시, 체결 기록, 복구 절차를 분리하지 않고 하나의 작업 흐름으로 묶습니다. 사용자는 시장을 계속 쫓아다니기보다, 사전에 정한 기준이 정확히 실행되는지 확인하는 데 집중할 수 있습니다.</p>
  </div>
  ${cards([
    ["상태 확인 지연 감소", "계좌, API, 자동매매, 라이선스, 시장바 상태를 첫 화면에서 빠르게 확인합니다."],
    ["감정 개입 축소", "손절, 익절, 비중, 주문 조건을 미리 고정해 충동적인 판단을 줄입니다."],
    ["다종목 감시 효율화", "후보 종목과 주문계획을 한 화면 흐름으로 연결해 반복 확인 시간을 줄입니다."],
    ["기록 기반 개선", "거래 로그와 실패 사유를 축적해 다음 전략 점검의 근거로 활용합니다."],
  ], "compact")}
</section>
<section class="section showcase">
  <div class="wrap two">
    <div class="stack sleek"><img class="mainshot" src="assets/images/engine-management.png" alt="엔진 관리 화면"><img class="subshot" src="assets/images/home-portfolio-small.png?v=home-rev10" alt="홈 메인 하단 포트폴리오 구성 화면"></div>
    <div class="title"><span>Executive Console</span><h2>고객이 보고 싶은 것은 설명보다 작동 구조입니다.</h2><p>홈페이지는 실제 제품 화면을 중심으로 구성했습니다. 대시보드, 엔진 관리, 주문계획, 자동매매 모니터, 백업/복구까지 도입 후 사용자가 보게 될 화면을 명확히 보여줍니다.</p><div class="checks"><div>실제 제품 화면 기반</div><div>자동매매 운영 흐름</div><div>AI 포트폴리오 구성</div><div>백업/복구 체계</div><div>알림과 로그 관리</div><div>다국어 시스템 설정</div></div></div>
  </div>
</section>
<section class="section"><div class="wrap cta"><div><span>Adoption</span><h2>제품 도입 검토를 시작해 보세요.</h2><p>사용 환경, 운용 목적, 필요한 지원 범위를 남기면 제품 구성과 도입 절차를 안내받을 수 있습니다.</p></div><a class="btn primary" href="contact.html">문의 양식 작성</a></div></section>`,
  }),

  "product.html": layout({
    file: "product.html",
    title: "제품소개",
    description: "Alpha Viper System 제품 소개",
    sub: true,
    body: `${pageHead("Product Overview", "운영 흐름이 보이는 AI 자동매매 운영 시스템", "종목 선별, 포트폴리오 구성, 주문 감시, 리스크 기준, 거래 기록을 하나의 화면 흐름으로 정리합니다.")}
<section class="section"><div class="wrap two"><div class="panel"><h2>제품 개요</h2><p>Alpha Viper System은 주식 자동매매 운영을 위한 통합 콘솔입니다. 데이터를 수집하고, 후보 종목을 정리하고, 전략별 비중과 주문계획을 확인하며, 체결과 실패 이력을 로그로 남깁니다.</p><div class="tags"><span>AI Portfolio</span><span>Order Plan</span><span>Risk Guard</span><span>Trade Log</span><span>Backup</span></div></div><div class="terminal"><div class="bar"><span>PRODUCT BRIEF</span><b>V1.0</b></div><img src="assets/images/product-overview.png" alt="제품 소개서"></div></div></section>
<section class="section problem">${cards([
  ["데이터 수집", "실시간 시세와 거래 데이터를 운영 화면에 맞게 정리합니다."],
  ["종목 선별", "단기, 중기, 전략 후보군을 분류해 검토 대상을 줄입니다."],
  ["AI 포트폴리오", "시장추세와 엔진 기준을 반영해 비중과 구성 방향을 확인합니다."],
  ["자동매매 감시", "주문계획, 조건 충족, 체결 결과를 실시간으로 추적합니다."],
  ["백업/복구", "설정값과 거래내역을 보존해 운영 안정성을 높입니다."],
  ["거래 기록", "체결, 실패, 사유, 전략 결과를 다음 점검 자료로 남깁니다."],
], "value")}</section>`,
  }),

  "features.html": layout({
    file: "features.html",
    title: "핵심기능",
    description: "Alpha Viper System 핵심 기능",
    sub: true,
    body: `${pageHead("Features", "도입 후 바로 확인할 수 있는 기능 중심 구성", "화면에 보이는 기능과 실제 운영 흐름이 연결되도록 설계했습니다.")}
<section class="section"><div class="wrap matrix">
<article><i>01</i><h3>AI 엔진 관리</h3><p>운용 엔진, 백테스트 기준, 선택 상태를 확인하고 운용 기준을 점검합니다.</p></article>
<article><i>02</i><h3>포트폴리오 구성</h3><p>단기, 중기, 전략, 현금 비중을 한 화면에서 비교합니다.</p></article>
<article><i>03</i><h3>주문계획</h3><p>종목별 주문금액, 조건, 상태를 정리해 실행 전 점검을 돕습니다.</p></article>
<article><i>04</i><h3>자동매매 모니터</h3><p>실행 단계, 실시간 로그, 대기 주문을 운영자가 계속 확인할 수 있습니다.</p></article>
<article><i>05</i><h3>알림 설정</h3><p>체결, 리스크, 시스템 오류, 리포트 알림 채널을 관리합니다.</p></article>
<article><i>06</i><h3>다국어 시스템 설정</h3><p>테마, 언어, 로그 레벨 등 운영 환경을 명확하게 조정합니다.</p></article>
</div></section>
<section class="section showcase"><div class="wrap dashgallery feature-full"><figure><img src="assets/images/engine-management.png?v=features-full" alt="AI 엔진관리"><figcaption>AI 엔진관리</figcaption></figure><figure><img src="assets/images/feature-portfolio-ai-decision.png?v=features-full" alt="포트폴리오 구성과 AI 판단사유"><figcaption>포트폴리오 구성</figcaption></figure><figure><img src="assets/images/feature-order-plan-detail.png?v=features-full" alt="주문계획 상세와 즉시주문"><figcaption>주문계획 상세</figcaption></figure><figure><img src="assets/images/auto-monitor.png?v=features-full" alt="자동매매 모니터"><figcaption>자동매매 모니터</figcaption></figure><figure><img src="assets/images/notification-settings.png?v=features-full" alt="알림 설정"><figcaption>알림설정</figcaption></figure><figure><img src="assets/images/feature-schedule-routine.png?v=features-full" alt="스케줄링과 오늘 운용 루틴"><figcaption>스케줄링</figcaption></figure></div></section>`,
  }),

  "workflow.html": layout({
    file: "workflow.html",
    title: "운영흐름",
    description: "Alpha Viper System 운영 흐름",
    sub: true,
    body: `${pageHead("Workflow", "확인, 감시, 실행, 기록으로 이어지는 운영 흐름", "운용 전 설정 확인부터 조건 감시, 체결 기록, 마감 점검까지 하나의 절차로 연결합니다.")}
<section class="section"><div class="wrap timeline"><article><time>08:30</time><h3>데이터 갱신</h3><p>시세, 거래 데이터, 후보 종목 정보를 업데이트합니다.</p></article><article><time>08:50</time><h3>운용 모드 확인</h3><p>모의투자/실전투자, 계좌/API 연결, 리스크 제한을 점검합니다.</p></article><article><time>09:05</time><h3>종목 스캔</h3><p>단기, 중기, 전략 후보군을 분류합니다.</p></article><article><time>09:06</time><h3>조건 감시</h3><p>주문계획과 조건 충족 여부를 확인합니다.</p></article><article><time>15:40</time><h3>마감 점검</h3><p>거래 로그, 실패 사유, 체결 결과, 보유잔고를 정리합니다.</p></article></div></section>
<section class="section showcase"><div class="wrap two"><div class="terminal"><div class="bar"><span>TRADE LOG</span><b>RECORDED</b></div><img src="assets/images/trade-log.png?v=trade-log-rev12" alt="샘플 체결 데이터가 표시된 거래로그 화면"></div><div class="title"><span>Runbook</span><h2>자동화는 일정과 로그가 함께 있을 때 신뢰할 수 있습니다.</h2><p>데이터 갱신, 종목 스캔, 자동매매 실행, 마감 점검과 함께 체결 내역까지 남겨 운영자가 어떤 주문이 실행됐는지 빠르게 확인할 수 있습니다.</p></div></div></section>`,
  }),

  "dashboard.html": layout({
    file: "dashboard.html",
    title: "화면구성",
    description: "Alpha Viper System 화면 구성",
    sub: true,
    body: `${pageHead("Dashboard", "실제 제품 화면으로 확인하는 운영 구조", "현재 제품의 주요 화면을 최신 캡처 기준으로 정리했습니다.")}
<section class="section"><div class="wrap dashgallery">
<figure class="wide"><img src="assets/images/screen-dashboard-updated.png?v=dashboard-20260620b" alt="대시보드"><figcaption>대시보드 · 운용흐름, 계좌 현황, 포트폴리오 상태 통합 확인</figcaption></figure>
<figure><img src="assets/images/screen-portfolio-updated.png?v=dashboard-20260620" alt="포트폴리오 구성"><figcaption>포트폴리오 구성</figcaption></figure>
<figure><img src="assets/images/screen-order-plan-updated.png?v=dashboard-20260620" alt="주문계획"><figcaption>주문계획</figcaption></figure>
<figure><img src="assets/images/engine-management.png" alt="엔진 관리"><figcaption>엔진 관리</figcaption></figure>
<figure><img src="assets/images/auto-monitor.png" alt="자동매매 모니터"><figcaption>자동매매 모니터</figcaption></figure>
<figure><img src="assets/images/screen-trade-performance-updated.png?v=dashboard-20260620" alt="거래로그와 성과통계"><figcaption>거래로그/성과통계</figcaption></figure>
<figure><img src="assets/images/screen-schedule-updated.png?v=dashboard-20260620" alt="스케줄링"><figcaption>스케줄링</figcaption></figure>
<figure><img src="assets/images/screen-backtester-updated.png?v=dashboard-20260620" alt="백테스터"><figcaption>백테스터</figcaption></figure>
<figure><img src="assets/images/screen-multilingual-updated.png?v=dashboard-20260620" alt="다국어지원"><figcaption>다국어지원 · 영어/일본어</figcaption></figure>
</div></section>`,
  }),

  "security.html": layout({
    file: "security.html",
    title: "보안 및 리스크",
    description: "Alpha Viper System 보안 및 리스크",
    sub: true,
    body: `${pageHead("Risk & Security", "자동매매는 속도보다 통제가 먼저입니다.", "실전 운용 전 확인해야 할 기준과 복구 체계를 제품 흐름에 포함했습니다.")}
<section class="section"><div class="wrap matrix"><article><i>01</i><h3>실전투자 전 확인</h3><p>계좌, 주문 조건, 투자 비중, 손절/익절 기준을 실행 전 확인합니다.</p></article><article><i>02</i><h3>리스크 제한</h3><p>종목별 비중, 주문금액, 최대 손실 기준을 사용자별로 설정합니다.</p></article><article><i>03</i><h3>주문 안정성</h3><p>중복 주문, API 지연, 주문 실패, 미체결 상태를 기록으로 남깁니다.</p></article><article><i>04</i><h3>운영 로그</h3><p>체결, 실패, 전략 변경, 설정 변경 이력을 보관합니다.</p></article><article><i>05</i><h3>백업/복구</h3><p>설정값과 거래내역을 백업하고 장애 상황의 복구를 지원합니다.</p></article><article><i>06</i><h3>투자 유의사항</h3><p>제품의 역할과 사용자 책임을 화면과 약관에 명확히 표기합니다.</p></article></div></section>`,
  }),

  "download.html": layout({
    file: "download.html",
    title: "도입안내",
    description: "Alpha Viper System 도입 안내",
    sub: true,
    body: `${pageHead("Adoption", "제품 검토부터 설치 지원까지 단계적으로 진행합니다.", "도입 조건, 사용 환경, 필요한 지원 범위를 확인한 뒤 안내합니다.")}
<section class="section"><div class="wrap matrix"><article><i>01</i><h3>도입 문의</h3><p>문의 양식으로 사용 목적과 환경을 전달합니다.</p></article><article><i>02</i><h3>환경 확인</h3><p>운영 PC, 브라우저, 네트워크, 증권사 API 사용 조건을 확인합니다.</p></article><article><i>03</i><h3>설치 안내</h3><p>고객 환경에 맞춘 설치 절차와 점검 항목을 안내합니다.</p></article><article><i>04</i><h3>모의 검증</h3><p>모의투자 또는 가상 운용으로 기능과 로그를 먼저 확인합니다.</p></article><article><i>05</i><h3>운영 전환</h3><p>계좌/API 설정, 리스크 기준, 알림과 백업을 점검합니다.</p></article><article><i>06</i><h3>운영 지원</h3><p>장애 대응, 설정 점검, 업데이트 안내를 지원합니다.</p></article></div></section>
<section class="section"><div class="wrap note"><h2>제품 도입 자료 요청</h2><p>도입 목적과 사용 환경을 남기면 필요한 자료와 검토 절차를 안내합니다.</p><a class="btn primary" href="contact.html">문의 양식 작성</a></div></section>`,
  }),

  "install.html": layout({
    file: "install.html",
    title: "설치가이드",
    description: "Alpha Viper System 설치 가이드",
    sub: true,
    body: `${pageHead("Install Guide", "설치 전 확인부터 모의 실행까지 순서대로 점검합니다.", "운영 환경에 맞춰 설치, 라이선스 활성화, 계좌/API 설정, 모의 실행을 진행합니다.")}
<section class="section">${cards([
  ["환경 확인", "운영 PC, 네트워크, 보안 프로그램, 브라우저 환경을 확인합니다."],
  ["패키지 준비", "고객 환경에 맞는 설치 파일과 실행 절차를 준비합니다."],
  ["라이선스 활성화", "라이선스 키를 입력하고 사용 권한 상태를 확인합니다."],
  ["계좌/API 설정", "모의투자 또는 실전투자 계좌 연결 상태를 확인합니다."],
  ["전략 조건 설정", "손절, 익절, 비중, 자동매매 시간 등 운용 기준을 설정합니다."],
  ["테스트 실행", "모의투자 환경에서 기능과 로그 저장 상태를 먼저 확인합니다."],
], "value")}</section>`,
  }),

  "contact.html": layout({
    file: "contact.html",
    title: "문의",
    description: "Alpha Viper System 도입 문의",
    sub: true,
    body: `${pageHead("Contact", "도입 검토를 위한 문의를 남겨주세요.", "사용 환경, 운용 목적, 필요한 지원 범위를 알려주시면 제품 구성과 도입 절차를 안내합니다.")}
<section class="section"><div class="wrap contactbox premium-contact"><div><h2>메일 문의</h2><p>아래 내용을 작성하면 설정된 운영 메일로 바로 발송됩니다. 사용 목적과 필요한 지원 범위를 중심으로 남겨 주세요.</p><div class="contact-points"><span>운용 목적</span><span>사용 환경</span><span>필요 기능</span><span>지원 범위</span></div></div>
<form data-contact>
<label>성함 또는 식별명<input name="name" placeholder="문의자 식별명을 입력해 주세요." autocomplete="name" required></label>
<label>회신 연락처<input name="contact" placeholder="예: contact@example.com" autocomplete="email" required></label>
<label>문의 내용<textarea name="message" rows="7" placeholder="도입 목적, 사용 환경, 궁금한 기능을 적어 주세요." required></textarea></label>
<label class="consent"><input type="checkbox" name="consent" required> 문의 응대를 위한 개인정보 수집 및 이용에 동의합니다.</label>
<p class="form-status" data-contact-status aria-live="polite"></p>
<button class="btn primary" type="submit">메일 문의 보내기</button>
</form></div></section>`,
  }),

  "privacy.html": layout({
    file: "privacy.html",
    title: "개인정보처리방침",
    description: "Alpha Viper System 개인정보처리방침",
    sub: true,
    body: `${pageHead("Privacy", "개인정보처리방침", "제품 문의, 버그 접수, 설치 안내, 고객지원 과정에서 처리되는 개인정보 기준을 안내합니다.")}
<section class="section"><div class="wrap legalbox"><h2>1. 처리 목적</h2><p>Alpha Viper System은 제품 문의 응대, 도입 검토, 설치 안내, 오류 확인, 고객지원, 접수 이력 관리를 위해 필요한 범위에서 개인정보를 처리합니다.</p><h2>2. 수집 항목</h2><ul><li>문의자 식별명 또는 성함</li><li>회신 연락처</li><li>문의 또는 버그 접수 내용</li><li>오류 확인에 필요한 사용 버전, 설치 환경, 재현 순서, 로그 또는 화면 캡처 정보</li></ul><h2>3. 보유 및 이용 기간</h2><p>개인정보는 문의 응대와 오류 대응 목적이 달성된 후 파기합니다. 다만 분쟁 대응, 서비스 품질 개선, 관계 법령 준수를 위해 필요한 경우 필요한 기간 동안 보관할 수 있습니다.</p><h2>4. 제3자 제공</h2><p>법령에 근거가 있거나 사용자의 별도 동의가 있는 경우를 제외하고 개인정보를 외부에 제공하지 않습니다.</p><h2>5. 처리 위탁</h2><p>문의 및 버그 접수 메일 발송을 위해 메일 발송 서비스가 사용될 수 있습니다. 이 경우 접수 내용은 메일 전송과 회신 목적 범위에서만 처리됩니다.</p><h2>6. 이용자 권리</h2><p>이용자는 본인의 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다. 요청은 문의 양식 또는 버그 접수 양식을 통해 접수할 수 있습니다.</p><h2>7. 안전성 확보 조치</h2><p>접수 정보는 접근 권한을 제한하고, 오류 대응 목적에 필요한 범위에서만 확인합니다. 민감한 계좌 비밀번호, API Secret, 인증 파일 원본은 문의 또는 버그 접수 내용에 포함하지 않는 것을 권장합니다.</p><h2>8. 문의</h2><p>개인정보 관련 문의는 <a href="contact.html">문의</a> 또는 <a href="bug-report.html">버그접수</a> 페이지를 통해 접수합니다.</p></div></section>`,
  }),

  "terms.html": layout({
    file: "terms.html",
    title: "이용약관",
    description: "Alpha Viper System 이용약관",
    sub: true,
    body: `${pageHead("Terms", "이용약관", "서비스 이용 조건과 투자 유의사항을 안내합니다.")}
<section class="section"><div class="wrap legalbox"><h2>1. 목적</h2><p>본 약관은 Alpha Viper System의 제품 소개, 도입 문의, 설치 지원, 라이선스 제공 및 고객지원 이용 조건을 정합니다.</p><h2>2. 서비스 성격</h2><p>본 제품은 투자 정보 확인과 자동화된 투자 운영을 보조하는 소프트웨어입니다. 특정 금융상품의 수익을 보장하거나 사용자의 투자 판단을 대신하지 않습니다.</p><h2>3. 사용자 책임</h2><p>사용자는 실전투자 실행 전 계좌, 주문 조건, 투자 비중, 손절/익절 기준을 직접 확인한 뒤 이용합니다. 투자 판단과 결과에 대한 책임은 사용자에게 있습니다.</p><h2>4. 라이선스</h2><p>라이선스 제공 범위, 사용 기간, 지원 범위는 개별 도입 안내와 계약 조건에 따릅니다.</p><h2>5. 문의</h2><p>문의는 제품 문의 양식을 통해 접수합니다.</p></div></section>`,
  }),
};

for (const [file, html] of Object.entries(pages)) {
  fs.writeFileSync(path.join(root, file), html, "utf8");
}

fs.writeFileSync(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.keys(pages).map((file) => `  <url><loc>/${file}</loc></url>`).join("\n")}
</urlset>
`, "utf8");

console.log(`Generated ${Object.keys(pages).length} pages.`);
