"""Add the published ASCENT case without rebuilding unrelated site pages."""
from pathlib import Path
import re, shutil

root=Path(__file__).resolve().parents[1]
game='https://www.roblox.com/ko/games/129680677535166/ASCENT'
media=Path(r'C:\temp\Phoenix\work\RobloxPhoenixObby\v11\output\media')
shutil.copy2(media/'ASCENT-Chaos-Multiverse-thumbnail.png',root/'assets/company/ascent-cover.png')
card='''<article id="ascent"><div class="project-image blue"><a href="/ascent"><img src="/assets/company/ascent-cover.png" alt="ASCENT 혼돈의 멀티버스 대표 소개 이미지" loading="lazy"></a></div><h3>함께 오르는, 새로운 세계</h3><p>ASCENT · Roblox에서 공개한 자체 멀티플레이 타워 게임. 세 타워, 훈련과 성장, 피닉스 비행, 아이템 수집과 로벅스 상점을 연결했습니다.</p><a class="text-link" href="/ascent">게임과 개발 사례 보기 ↗</a></article>'''
for name in ['index.html','projects.html']:
    path=root/name
    text=path.read_text(encoding='utf-8')
    if 'id="ascent"' not in text:
        assert text.count('<div class="project-grid">')==1,name
        text=text.replace('<div class="project-grid">','<div class="project-grid">'+card,1)
    path.write_text(text,encoding='utf-8')
generator=root/'tools/build-company.py'
text=generator.read_text(encoding='utf-8')
start=text.index('def projects():');end=text.index('\ndef ',start+1)
part=text[start:end]
if 'id="ascent"' not in part:
    part=part.replace('<div class="project-grid">','<div class="project-grid">'+card,1)
    generator.write_text(text[:start]+part+text[end:],encoding='utf-8')

body='''<section class="ascent-hero"><div class="container ascent-hero-grid"><div><span class="eyebrow">DKBLOSSOM ORIGINAL · ROBLOX</span><h1>ASCENT<small>혼돈의 멀티버스</small></h1><p>혼자 시작해도, 같은 세계에서 만나다.<br>키보드·태엽공장·폭풍을 넘어 더 높이 오르는 멀티플레이 타워 모험.</p><div class="actions"><a class="button gold" href="GAME" target="_blank" rel="noopener noreferrer">Roblox에서 플레이 ↗</a><a class="button ghost" href="#experience">게임 살펴보기 ↓</a></div><p class="ascent-note">Roblox 공개 게임 · 현재 만 16세 이상 이용 가능</p></div><figure><img src="/assets/company/ascent-cover.png" alt="용암과 키보드 길을 담은 ASCENT 대표 소개 이미지" width="1672" height="941"><figcaption>게임 대표 소개 이미지</figcaption></figure></div></section>
<section class="section" id="experience"><div class="container"><span class="eyebrow">CLIMB · GROW · COLLECT</span><h2>오를수록, 할 일이 많아집니다.</h2><p class="section-intro">타워를 오르고, 로비에서 성장하고, 정상에서 보상을 모으는 흐름. 다른 플레이어와 같은 공간에서 모험합니다.</p><div class="ascent-numbers"><div><b>3</b><span>메인 타워</span></div><div><b>448</b><span>한 사이클의 단계</span></div><div><b>53</b><span>무기·코일 아이템</span></div></div><div class="ascent-worlds"><article><span>01 / KEYBOARD</span><h3>키보드 타워</h3><p>실제 키 모양의 발판과 눌림 반응. 거대한 키보드 위를 오르는 코스입니다.</p></article><article><span>02 / CLOCKWORK</span><h3>태엽공장</h3><p>기계와 공장을 테마로 이어지는 길. 발판과 장애물을 넘어 정상에 도전합니다.</p></article><article><span>03 / STORM</span><h3>폭풍 타워</h3><p>바람과 번개를 테마로 한 타워. 다음 발판을 확인하고 도약합니다.</p></article></div></div></section>
<section class="section dark-section"><div class="container"><span class="eyebrow">MORE THAN A CLIMB</span><h2>타워 밖에서도 이어지는 모험.</h2><div class="ascent-features"><article><b>훈련과 성장</b><p>달리기·역기·검술·줄넘기로 캐릭터를 훈련하고 능력을 키웁니다.</p></article><article><b>피닉스 비행</b><p>캐릭터 성장과 연결된 피닉스. 비행과 화염 능력으로 모험을 더합니다.</p></article><article><b>나만의 보상</b><p>타워 정상에서 개인 보상 상자를 열고 아이템을 수집합니다.</p></article><article><b>전투와 휴식</b><p>다른 유저와 겨루고, 공격 불가 구역에서는 안전하게 쉬어갑니다.</p></article><article><b>개인 보관함</b><p>획득한 무기와 코일을 보관하고, 원하는 아이템을 장착합니다.</p></article><article><b>로벅스 상점</b><p>무기 50종과 코일 3종. 선택한 상품은 Roblox 구매 확인창을 통해 구매합니다.</p></article></div></div></section>
<section class="section"><div class="container ascent-case"><div><span class="eyebrow">IN-HOUSE DEVELOPMENT CASE</span><h2>기획에서 공개까지,<br>하나의 게임으로.</h2><p>DK블라썸의 자체 개발 프로젝트입니다. Roblox Studio와 Luau로 맵, 멀티플레이 서버, 성장·보상, 개인 보관함과 상점 UI를 구성하고 공개했습니다.</p><div class="tags"><span>Roblox Studio</span><span>Luau</span><span>멀티플레이</span><span>게임 UI</span><span>아이템 저장</span><span>구매 연동</span></div></div><div class="ascent-case-panel"><h3>플레이 안내</h3><p>WASD 이동 · SPACE 점프<br>M 메뉴 · B 개인 보관함<br>Q 조준 · 클릭/G 공격<br>F 피닉스 · X 불 공격</p><p>게임 내 아이템 구매는 선택 사항입니다.<br>업데이트에 따라 화면과 구성이 달라질 수 있습니다.</p><a class="text-link" href="GAME" target="_blank" rel="noopener noreferrer">공개 게임으로 이동 ↗</a></div></div></section>
<section class="contact-banner"><div class="container"><div><span class="eyebrow">LET’S BUILD THE NEXT EXPERIENCE</span><h2>다음 게임 아이디어가 있으신가요?</h2><p>만들고 싶은 게임과 필요한 기능을 알려주세요.<br>목적과 구현 범위부터 함께 정리합니다.</p></div><a class="button" href="/contact">개발 상담하기 ↗</a></div></section>'''.replace('GAME',game)
template=(root/'projects.html').read_text(encoding='utf-8')
page=re.sub(r'<main id="main">.*?</main>','<main id="main">'+body+'</main>',template,flags=re.S)
page=re.sub(r'<title>.*?</title>','<title>ASCENT · Roblox 멀티플레이 타워 게임 | DK블라썸</title>',page)
page=page.replace('https://www.alphavipertrading.com/projects','https://www.alphavipertrading.com/ascent')
page=page.replace('DK블라썸의 자체 Android 앱 구현 화면과 AI 활용 교육를 확인하세요.','ASCENT 혼돈의 멀티버스. DK블라썸이 개발·공개한 Roblox 멀티플레이 타워 게임을 만나보세요.')
page=page.replace('content="개발·교육 사례 | DKBLOSSOM"','content="ASCENT · 혼돈의 멀티버스 | DKBLOSSOM"')
page=page.replace('https://www.alphavipertrading.com/assets/company/blossom_hero.png','https://www.alphavipertrading.com/assets/company/ascent-cover.png')
page=page.replace('</head>','<link rel="stylesheet" href="/assets/css/ascent.css"></head>')
(root/'ascent.html').write_text(page,encoding='utf-8')
print('ASCENT case page and two portfolio cards generated; unrelated pages unchanged.')
