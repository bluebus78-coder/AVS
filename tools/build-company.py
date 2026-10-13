"""DKBLOSSOM company website. Run from this site's root. Existing product binaries stay untouched."""
from pathlib import Path
import json, re, html, urllib.parse, csv

ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'assets/company/content.json').read_text(encoding='utf-8-sig'))
E=html.escape
BASE='https://www.alphavipertrading.com'
ASSET='/assets/company/'
keys={'phoenix.ai.iot':'home','avs.EnglishCard':'english','dkblossom.sound.note':'sorinote','com.dkblossom.publicfacilityai':'public','mobile.location.tracker':'location','com.alphavipertrading.masilpick':'market','phoenix.bunin.tester':'burnin','lotto.bands.release':'lotto','com.avs.aaa':'avs','dkblossom.matgo':'matgo'}
groups={'home':'생활','location':'생활','market':'생활','public':'생활','english':'학습','sorinote':'도구','burnin':'도구','lotto':'취미','matgo':'취미','avs':'투자'}

def nav(active=''):
    links=[('/about','회사 소개','about'),('/services','사업 영역','services'),('/product','서비스 제품','product'),('/projects','개발·교육 사례','projects')]
    return '<a class="skip" href="#main">본문으로 이동</a><header class="site-header"><div class="container header-inner"><a class="company-brand" href="/" aria-label="DK블라썸 홈"><img src="/assets/company/company_symbol.png" alt="DK블라썸 회사 심벌" width="52" height="52"><span><strong>DKBLOSSOM</strong><small>디케이 블라썸</small></span></a><button class="menu-toggle" type="button" data-menu aria-expanded="false" aria-controls="company-nav" aria-label="메뉴 열기">메뉴</button><nav class="company-nav" id="company-nav" data-nav aria-label="주요 메뉴">'+''.join(f'<a href="{u}"'+(' class="active" aria-current="page"' if active==a else '')+f'>{t}</a>' for u,t,a in links)+'<a class="nav-cta" href="/contact">상담 문의 ↗</a></nav></div></header>'

def footer():
    return '''<footer class="site-footer"><div class="container footer-grid"><div class="footer-brand"><strong>DKBLOSSOM</strong><p>아이디어를 만들고, 가능성을 넓히다.<br>앱·웹·홈페이지 제작 · AI 활용 교육</p></div><div><h3>COMPANY</h3><a href="/about">회사 소개</a><a href="/services">사업 영역</a><a href="/product">서비스 제품</a><a href="/contact">상담 문의</a></div><div><h3>SUPPORT</h3><a href="/download">AVS 다운로드</a><a href="/install">AVS 설치 안내</a><a href="/bug-report">오류·기술지원 접수</a><a href="/privacy">개인정보처리방침</a><a href="/terms">AVS 이용약관</a></div></div><div class="container footer-base"><span>© DKBLOSSOM. All rights reserved.</span><span>회사 · 개발 · 교육 · 자체 서비스</span></div></footer>'''

def page(name,title,description,body,active=''):
    canonical=BASE+('/' if name=='index' else '/'+name)
    schema={'@context':'https://schema.org','@type':'Organization','name':'DK블라썸','alternateName':'DKBLOSSOM','url':BASE,'logo':BASE+'/assets/company/company_symbol.png','description':DATA['brand']['company_intro']}
    text=f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{E(title)} | DK블라썸</title><meta name="description" content="{E(description,quote=True)}"><link rel="canonical" href="{canonical}"><meta property="og:title" content="{E(title,quote=True)} | DKBLOSSOM"><meta property="og:description" content="{E(description,quote=True)}"><meta property="og:type" content="website"><meta property="og:url" content="{canonical}"><meta property="og:image" content="{BASE}/assets/company/blossom_hero.png"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#06131e"><link rel="icon" href="/assets/company/company_symbol.png"><link rel="stylesheet" href="/assets/css/company.css?v=20261013"><script type="application/ld+json">{json.dumps(schema,ensure_ascii=False)}</script></head><body class="company-body">{nav(active)}<main id="main">{body}</main>{footer()}<script src="/assets/js/main.js"></script><script src="/assets/js/company.js"></script></body></html>'''
    (ROOT/f'{name}.html').write_text(text,encoding='utf-8')

def pagehead(kicker,title,desc):
    return f'<section class="page-hero"><div class="container"><span class="eyebrow">{kicker}</span><h1>{title}</h1><p>{desc}</p></div></section>'

def banner():
    return '<section class="contact-banner"><div class="container"><div><span class="eyebrow">LET’S MAKE IT REAL</span><h2>다음 아이디어는, 무엇인가요?</h2><p>만들고 싶은 서비스 또는 배우고 싶은 AI 활용 방법을 알려주세요.<br>목적과 필요한 기능부터 함께 정리합니다.</p></div><a class="button" href="/contact">상담 시작하기 <span aria-hidden="true">↗</span></a></div></section>'

def services():
    s='<div class="service-list">'
    for i,a in enumerate(DATA['services'],1):
        s+=f'<article class="service-card"><span class="number">0{i} / {E(a["short"])}</span><h3>{E(a["title"])}</h3><p>{E(a["body"])}</p><ul>'+''.join(f'<li>{E(t)}</li>' for t in a['items'])+f'</ul><a class="text-link" href="/services#service-{i}">지원 범위 보기 <span aria-hidden="true">↗</span></a></article>'
    return s+'</div><div class="support-band"><b>기존 서비스도 함께 살핍니다.</b><p>앱·프로그램 개선, 필요한 기능 연동, 업무 자동화와 유지보수는 소스와 권한, 작업 범위를 확인한 후 상담합니다.</p></div>'

def avs_feature():
    return '''<section class="section dark-section"><div class="container featured"><div><span class="eyebrow">OUR PRODUCT / 투자 운영 소프트웨어</span><h2>Alpha Viper System<small>DK블라썸이 개발하는 AVS 제품</small></h2><p>종목 후보, 포트폴리오, 주문계획과 거래 기록을 하나의 흐름으로 확인하는 투자 운영 소프트웨어입니다.</p><div class="tags"><span>웹 기반 PC 운영 화면</span><span>AVS MOBILE PRO</span><span>주문·체결 기록</span></div><div class="actions"><a class="button gold" href="/avs">AVS 제품 알아보기 ↗</a><a class="button ghost" href="/download">다운로드</a></div><p class="risk-note">투자 판단과 실행 관리를 보조하는 제품입니다. 투자에는 원금 손실 위험이 있으며 특정 수익을 보장하지 않습니다.</p></div><div class="featured-visual"><figure><img src="/assets/images/feature-schedule-routine.png" alt="AVS 웹 기반 PC 제품 예약 운용 화면" loading="lazy"><figcaption>AVS 제품 예약 운용 화면 · 화면 구성은 버전에 따라 달라질 수 있습니다.</figcaption></figure></div></div><div class="container app-intro"><div><h3>생활 속에서도 만나는 DK블라썸</h3><p>학습, 스마트홈, 지역 생활, 생산성까지.</p><a class="text-link" href="/product">전체 앱 살펴보기 ↗</a></div><div class="icon-ribbon">'''+''.join(f'<a href="/product#{keys[a["package"]]}" title="{E(a["display_name"],quote=True)}"><img src="{ASSET}{keys[a["package"]]}_icon.png" alt="{E(a["display_name"],quote=True)}" loading="lazy" width="42" height="42"></a>' for a in DATA['apps'])+'</div></div></section>'

def projects():
    return '''<div class="project-grid"><article><div class="project-image blue"><img src="/assets/company/english_study.png" alt="잉글리쉬카드 실제 영어단어 학습 화면" loading="lazy"></div><h3>반복 학습을 간편하게</h3><p>잉글리쉬카드 · 단어 카드, 발음 듣기, 검색과 즐겨찾기 복습을 연결한 자체 Android 앱입니다.</p><a class="text-link" href="/product#english">앱 자세히 보기 ↗</a></article><article><div class="project-image pink"><img src="/assets/company/home_screen.png" alt="AI Home Control 실제 스마트홈 씬 화면" loading="lazy"></div><h3>생활의 제어를 한곳에</h3><p>AI Home Control · 조명·난방·취침 씬을 관리하고 Home Assistant와 연결하는 자체 스마트홈 앱입니다.</p><a class="text-link" href="/product#home">앱 자세히 보기 ↗</a></article><article><div class="project-image education-visual" aria-label="AI 활용 교육"><span class="education-kicker">EXPLORE · LEARN · CREATE</span><strong>AI<br>LEARNING<span>배우고, 활용하고, 확장하다.</span></strong></div><h3>AI 활용 교육</h3><p>다양한 AI 도구와 프로그램의 사용법을 목적과 학습 수준에 맞춰 익히는 활용 교육입니다.</p><a class="text-link" href="/services#service-3">교육 범위 보기 ↗</a></article></div>'''

def process():
    details=['사용 목적, 필요한 기능과 참고 자료를 확인합니다.','제작 또는 교육의 범위, 일정과 비용을 협의합니다.','합의한 내용으로 구현 또는 실습을 진행합니다.','결과를 확인하고 필요한 후속 안내를 정리합니다.']
    return '<div class="process">'+''.join(f'<div><b>0{i+1}</b><h3>{E(t)}</h3><p>{details[i]}</p></div>' for i,t in enumerate(DATA['process']))+'</div>'

home='''<section class="hero"><img class="hero-art" src="/assets/company/blossom_hero.png" alt="어둠 속에서 빛을 따라 피어나는 꽃" fetchpriority="high"><div class="container"><div class="hero-content"><span class="eyebrow">IDEAS IN BLOOM · DKBLOSSOM</span><h1>생각을 현실로.<br><em>기술을 가능성으로.</em></h1><p>앱과 웹을 만들고, AI를 활용하는 방법을 나눕니다.<br>DK블라썸과 함께 아이디어의 다음 장을 여세요.</p><div class="actions"><a class="button gold" href="/contact">제작·교육 상담하기 <span aria-hidden="true">↗</span></a><a class="button ghost" href="/product">서비스 제품 보기</a></div></div></div><span class="hero-caption">FROM AN IDEA TO A BLOSSOM</span></section><div class="service-strip"><div class="container"><span>ANDROID APP DEVELOPMENT</span><span>WEB &amp; HOMEPAGE</span><span>AI UTILIZATION EDUCATION</span><span>SOFTWARE SUPPORT</span></div></div>'''
home+='<section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">WHAT WE DO</span><h2>만드는 기술.<br>활용하는 경험.</h2></div><p>사업에 필요한 서비스부터 일상에서 쓰는 앱,<br>직접 익히는 AI까지 목적에 맞게 연결합니다.</p></div>'+services()+'</div></section>'+avs_feature()
home+='<section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">BUILT &amp; PRACTICED</span><h2>실제로 만들고,<br>직접 사용하는 경험.</h2></div><p>자체 앱의 구현 화면과 AI 활용 교육을<br>개발·교육 상담의 출발점으로 활용합니다.</p></div>'+projects()+'</div></section>'
home+='<section class="section" style="padding-top:0"><div class="container about-block"><div class="about-symbol"><img src="/assets/company/company_symbol.png" alt="DK블라썸 심벌" loading="lazy"></div><div><span class="eyebrow">ABOUT DKBLOSSOM</span><h2>아이디어가 피어날 수 있도록.</h2><p>'+E(DATA['brand']['company_intro'])+'</p><a class="text-link" href="/about">회사 소개 더 보기 ↗</a>'+process()+'</div></div></section>'+banner()
page('index','앱·웹·홈페이지 제작과 AI 활용 교육',DATA['brand']['company_intro'],home)

page('about','회사 소개','DK블라썸은 앱, 웹과 홈페이지 제작 및 AI 활용 교육을 제공합니다.',pagehead('ABOUT DKBLOSSOM','아이디어가 피어나는 곳,<br>DK블라썸.',E(DATA['brand']['company_intro']))+'<section class="section"><div class="container about-block" style="border:0;padding-top:0"><div class="about-symbol"><img src="/assets/company/company_symbol.png" alt="DK블라썸 심벌"></div><div><span class="eyebrow">OUR APPROACH</span><h2>필요한 것을 이해하고,<br>사용할 수 있게 만듭니다.</h2><p>화면을 만드는 일과 실제로 활용하는 일은 이어져 있습니다. DK블라썸은 제작 목표와 사용 흐름을 먼저 정리하고, 합의한 기능을 구현하며 사용 방법과 결과를 함께 확인합니다.</p><p>사업과 일상에서 필요한 기능을 구체화하고, 사용하기 쉬운 서비스로 구현합니다. 제작 이후에도 활용 방법과 개선 과제를 함께 살피며 고객의 다음 단계를 지원합니다.</p></div></div><div class="container" style="margin-top:60px"><span class="eyebrow">WORKING TOGETHER</span><h2>진행 과정도 명확하게.</h2>'+process()+'</div></section>'+banner(),'about')

details=''
for i,s in enumerate(DATA['services'],1):
    details+=f'<article class="service-detail" id="service-{i}"><div><span class="eyebrow">0{i} / {E(s["short"])}</span><h2>{E(s["title"])}</h2></div><div><p>{E(s["body"])}</p><ul>'+''.join('<li>'+E(t)+'</li>' for t in s['items'])+'</ul>'
    if i==3: details+='<div class="education-note"><b>교육 기준</b><br>2시간 × 1회 100,000원 · 부가세 별도 · 최소 3회<br>교육 내용과 준비 환경을 상담하며, 야간·주말 조건은 별도 협의합니다.</div>'
    details+='<a class="text-link" href="/contact">이 분야 상담하기 ↗</a></div></article>'
details+='<article class="service-detail"><div><span class="eyebrow">04 / SOFTWARE SUPPORT</span><h2>기능 연동·개선<br>유지보수</h2></div><div><p>기존 앱과 프로그램의 개선, 데이터 연동과 업무 자동화는 접근 권한과 소스, 사용 환경을 확인한 뒤 지원 범위를 정합니다.</p><ul><li>기존 기능의 불편·오류 확인</li><li>승인된 시스템·API 연동 상담</li><li>반복 업무와 운영 기능 개선 상담</li></ul><p>작업 범위 밖의 추가 요청은 비용과 일정에 대한 협의 후 진행합니다.</p><a class="text-link" href="/contact">개선할 내용 보내기 ↗</a></div></article>'
page('services','사업 영역','Android 앱, 웹·홈페이지 제작, AI 활용 교육, 기능 연동과 유지보수를 상담하세요.',pagehead('WHAT WE DO','제작부터 활용까지,<br>목적에 맞는 지원.','필요한 기능과 배우고 싶은 내용을 먼저 확인합니다. 작업 범위·비용·일정은 상담 후 합의합니다.')+'<section class="section"><div class="container">'+details+'</div></section>'+banner(),'services')

links=[]
cards=''
for a in DATA['apps']:
    k=keys[a['package']]; g=groups[k]
    ref=urllib.parse.urlencode({'utm_source':'dkblossom_website','utm_medium':'owned','utm_campaign':'company_products','utm_content':k})
    url=a['store_url']+'&referrer='+urllib.parse.quote(ref,safe='')
    links.append({'app':a['display_name'],'package':a['package'],'channel':'company_website','url':url})
    cards+=f'<article class="app-card" id="{k}" data-app-group="{g}"><div class="app-card-header"><img src="{ASSET}{k}_icon.png" alt="{E(a["display_name"])} 아이콘" loading="lazy" width="62" height="62"><div><small>{E(a["category"])}</small><h3>{E(a["display_name"])}</h3></div></div><p>{E(a["benefit"])}</p><ul>'+''.join('<li>'+E(f)+'</li>' for f in a['features'])+f'</ul><p class="app-note">{E(a["use_note"])}</p><div class="app-card-actions"><a href="{E(url,quote=True)}" target="_blank" rel="noopener">Google Play 보기 ↗</a><button type="button" class="screen-button" data-screen="{ASSET}{k}_screen.png" data-title="{E(a["display_name"],quote=True)}">실제 화면 보기</button></div></article>'
modal='<dialog class="screen-modal" data-screen-modal aria-labelledby="screen-title"><div class="modal-top"><h3 id="screen-title"></h3><button type="button" class="modal-close" data-close-screen aria-label="화면 닫기">×</button></div><img data-screen-image alt=""><p>실제 앱 화면 · 기능과 화면 구성은 버전·기기 환경에 따라 달라질 수 있습니다.</p></dialog>'
catalog=pagehead('OUR PRODUCTS','DK블라썸의 서비스 제품.','AVS 웹 기반 PC 제품과 Android 앱을 만나보세요. 관심 있는 분야를 고르고 실제 화면과 Google Play 등록정보를 확인하실 수 있습니다.')+avs_feature().replace('href="/product">전체 앱 살펴보기','href="#apps">전체 앱 살펴보기')+'<section class="section" id="apps"><div class="container"><span class="eyebrow">ANDROID COLLECTION</span><h2>생활 속, 손안의 서비스.</h2><div class="app-filters" aria-label="앱 분야 필터">'+''.join(f'<button class="filter" type="button" data-filter="{g}" aria-pressed="{str(g=="전체").lower()}">{g}</button>' for g in ['전체','생활','학습','도구','취미','투자'])+f'</div><p class="app-count" data-app-count aria-live="polite">전체 {len(DATA["apps"])}개 앱</p><div class="app-grid">'+cards+'</div></div></section>'+modal+banner()
page('product','서비스 제품 · AVS와 자체 앱','DK블라썸의 AVS 웹 기반 투자 운영 제품 및 생활·학습·스마트홈·생산성 Android 앱을 소개합니다.',catalog,'product')
page('projects','개발·교육 사례','DK블라썸의 자체 Android 앱 구현 화면과 AI 활용 교육를 확인하세요.',pagehead('BUILT & PRACTICED','실제 구현으로 보여드리는 경험.','자체 개발 앱과 AI 활용 교육을 소개합니다. 기능과 활용 목적을 중심으로 상담에 필요한 내용을 확인하세요.')+'<section class="section"><div class="container">'+projects()+'<div class="support-band"><b>더 많은 자체 앱</b><p>위치 공유, 중고거래, 음성 기록, 화면 점검 등 여러 분야의 구현 화면을 서비스 제품에서 살펴보실 수 있습니다.</p><a class="text-link" href="/product">전체 보기 ↗</a></div></div></section>'+banner(),'projects')

contact=pagehead('CONTACT','만들고 싶은 것.<br>배우고 싶은 것.','어떤 문제를 해결하고 싶은지 알려주세요. 목적, 범위와 준비 환경을 먼저 확인한 후 제작·교육 상담을 진행합니다.')+'''<section class="section"><div class="container inquiry-layout"><div><span class="eyebrow">START WITH YOUR IDEA</span><h2>첫 문의에는<br>이 정도면 충분합니다.</h2><ul><li>작업 또는 교육의 목적</li><li>필요한 기능 · 배우고 싶은 내용</li><li>참고 홈페이지 · 화면 · 자료</li><li>희망 일정과 예산 범위</li></ul><p>확정 견적과 일정은 내용을 확인한 뒤 협의합니다. 계정 비밀번호나 인증키 등 민감한 정보는 보내지 마세요.</p><div class="platform-links"><a href="https://kmong.com/gig/803919" target="_blank" rel="noopener">크몽에서 앱 제작 상담 <span>↗</span></a><a href="https://kmong.com/gig/817049" target="_blank" rel="noopener">크몽에서 홈페이지 제작 상담 <span>↗</span></a><a href="/bug-report">기존 제품의 오류·기술지원 접수 <span>↗</span></a></div></div><form class="contact-form" data-contact><div class="field"><label for="purpose">상담 분야</label><select id="purpose" name="purpose"><option>앱 제작·개선</option><option>웹·홈페이지 제작</option><option>AI 활용 교육</option><option>프로그램 연동·유지보수</option><option>AVS 제품 문의</option><option>자체 앱 이용 문의</option><option>기타</option></select></div><div class="field"><label for="name">성함 또는 문의자명 *</label><input id="name" name="name" required maxlength="100" autocomplete="name"></div><div class="field"><label for="contact">회신받을 이메일 또는 연락처 *</label><input id="contact" name="contact" required maxlength="200" autocomplete="email"></div><div class="field"><label for="message">문의 내용 *</label><textarea id="message" name="message" required maxlength="3500" placeholder="목적 / 필요한 기능 / 참고 자료 / 희망 일정 / 예산을 편하게 적어주세요."></textarea></div><div class="field"><label for="attachments">참고 파일 (선택)</label><input id="attachments" type="file" name="attachments" accept=".zip,.log,.txt,.json,.csv,.png,.jpg,.jpeg,.webp" multiple><small>최대 3개 · 전체 3MB 이하 · 이미지, ZIP, TXT, JSON, CSV, LOG</small></div><label class="consent"><input type="checkbox" name="consent" required><span><a href="/privacy" target="_blank" rel="noopener"><u>개인정보 수집·이용 안내</u></a>를 확인했으며 문의 응대 목적의 처리에 동의합니다. *</span></label><button class="button" type="submit">상담 내용 보내기 ↗</button><p class="contact-status" data-contact-status role="status" aria-live="polite"></p></form></div><div class="container faq"><details><summary>아직 기능과 범위가 정해지지 않았는데 상담할 수 있나요?</summary><p>만들고 싶은 결과와 참고 자료를 알려주시면 필요한 기능과 우선순위를 정리하는 것부터 상담합니다.</p></details><details><summary>교육은 어떻게 진행하나요?</summary><p>AI 활용 목적과 학습 수준, PC 환경을 확인하고 실습 범위를 정합니다. 기본 기준은 2시간 1회 100,000원, 부가세 별도, 최소 3회입니다. 일정과 진행 방식은 상담 후 합의합니다.</p></details><details><summary>기존 앱이나 프로그램의 개선도 가능한가요?</summary><p>소스 제공 여부, 접근 권한, 기존 환경과 변경 내용을 확인한 후 가능한 작업 범위를 안내합니다.</p></details></div></section>'''
page('contact','제작·교육 상담 문의','앱·웹·홈페이지 제작, AI 활용 교육, 프로그램 개선과 AVS 제품 문의를 보내주세요.',contact)

avs=pagehead('PRODUCT / ALPHA VIPER SYSTEM','AVS, DK블라썸의<br>투자 운영 소프트웨어.','웹 기반 PC 운영 화면과 AVS MOBILE PRO로 종목 후보, 포트폴리오, 주문계획 및 거래 기록을 확인합니다.')+'''<section class="section"><div class="container avs-detail"><div><span class="eyebrow">WEB-BASED PC PRODUCT</span><h2>운영 흐름을<br>한 화면에 연결합니다.</h2><p>AVS 웹 기반 화면은 PC 제품의 운영 인터페이스입니다. 설치와 계좌·API 연결 등 사용 환경을 확인한 뒤 이용합니다.</p><ul><li>종목 후보와 데이터 상태 확인</li><li>포트폴리오와 현금·목표비중 관리</li><li>주문계획·체결·오류 기록 확인</li><li>운용모드·예약 및 리스크 기준 설정</li></ul><div class="actions"><a class="button" href="/download">설치파일·매뉴얼</a><a class="button outline" href="/contact">AVS 제품 문의</a></div><p class="risk-note">투자에는 원금 손실 위험이 있습니다. 연결 상태와 주문 조건을 직접 확인해야 하며 수익이나 체결 결과를 보장하지 않습니다.</p></div><div><img src="/assets/images/feature-schedule-routine.png" alt="AVS PC 제품 예약 운용 화면" loading="lazy"></div></div><div class="container avs-links"><a href="/features">AVS 핵심 기능</a><a href="/workflow">AVS 운영 흐름</a><a href="/dashboard">AVS 화면 구성</a><a href="/security">AVS 보안·리스크</a><a href="/install">AVS 설치 안내</a></div></section><section class="section dark-section"><div class="container featured"><div><span class="eyebrow">ANDROID PRODUCT</span><h2>AVS MOBILE PRO<small>모바일에서 확인하는 투자 운영</small></h2><p>계좌와 자산, 후보 종목, 주문 및 자동매매 상태를 Android 화면에서 확인합니다. 직접 설치와 Google Play 배포 정보는 각각의 안내에서 확인해 주세요.</p><div class="actions"><a class="button gold" href="https://play.google.com/store/apps/details?id=com.avs.aaa&referrer=utm_source%3Ddkblossom_website%26utm_medium%3Downed%26utm_campaign%3Davs_product" target="_blank" rel="noopener">Google Play ↗</a><a class="button ghost" href="/download">직접 설치 안내</a></div></div><div class="featured-visual"><img src="/assets/company/avs_screen.png" alt="AVS MOBILE PRO 실제 앱 화면" loading="lazy" style="max-height:480px"></div></div></section>'''+banner()
page('avs','AVS 웹·PC 제품과 AVS MOBILE PRO','AVS는 DK블라썸이 개발하는 웹 기반 PC·Android 투자 운영 소프트웨어 제품입니다.',avs,'product')

# Give retained product/support pages the company shell, preserving their main content and links.
legacy=['features','workflow','dashboard','security','download','install','bug-report','privacy','terms']
sub=[('/avs','제품 소개'),('/features','핵심 기능'),('/workflow','운영 흐름'),('/dashboard','화면 구성'),('/security','보안·리스크'),('/download','다운로드'),('/install','설치 안내')]
for name in legacy:
    p=ROOT/f'{name}.html'; t=(ROOT/'tools/company-legacy'/f'{name}.html').read_text(encoding='utf-8-sig')
    t=re.sub(r'<header\b.*?</header>',nav('product' if name in legacy[:6] else ''),t,flags=re.S)
    t=re.sub(r'<footer\b.*?</footer>',footer(),t,flags=re.S)
    t=t.replace('class="subpage"','class="subpage legacy-body"')
    t=re.sub(r'<title>(.*?)\| Alpha Viper System</title>',r'<title>\1| DK블라썸 · AVS</title>',t)
    t=re.sub(r'<link rel="icon"[^>]+>','<link rel="icon" href="/assets/company/company_symbol.png">',t)
    if 'company.css' not in t: t=t.replace('</head>','<link rel="stylesheet" href="/assets/css/company.css?v=20261013">\n</head>')
    if 'company.js' not in t: t=t.replace('</body>','<script src="/assets/js/company.js"></script></body>')
    if name not in ('privacy','terms','bug-report'):
        sn='<div class="avs-subnav"><div class="container" style="display:flex;flex-wrap:wrap;gap:20px">'+''.join(f'<a href="{u}"'+(' class="active"' if u=='/'+name else '')+f'>{s}</a>' for u,s in sub)+'</div></div><div class="container avs-breadcrumb"><a href="/product">서비스 제품</a> / <a href="/avs">AVS</a> / '+dict(sub).get('/'+name,name)+'</div>'
        t=t.replace('<main class="sub">',sn+'<main class="sub" id="main">')
    else: t=t.replace('<main class="sub">','<main class="sub" id="main">')
    if name=='privacy':
        t=t.replace('Alpha Viper System은 제품 문의 응대, 도입 검토, 설치 안내, 오류 확인, 고객지원, 접수 이력 관리','DK블라썸은 앱·웹·홈페이지 제작 및 교육 상담, 제품 문의 응대, 설치 안내, 오류 확인, 고객지원, 접수 이력 관리')
    p.write_text(t,encoding='utf-8')

with (ROOT/'assets/company/channel-links.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=['app','package','channel','url']);w.writeheader();w.writerows(links)
urls=['','about','services','product','projects','contact','avs']+legacy
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{BASE}/{u}</loc></url>' for u in urls)+'</urlset>',encoding='utf-8')
print(json.dumps({'company_pages':7,'retained_support_pages':len(legacy),'app_products':len(DATA['apps'])},ensure_ascii=False))


