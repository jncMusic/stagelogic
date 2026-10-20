# K2 로고 최종 파일 만들기: 글자를 도형(path)으로 바꿔 어느 컴퓨터에서도 똑같이 보이게
# 실행: pip install fonttools && python3 design/logo/tools/build.py   (저장소 맨 위에서)
# 글꼴(Outfit 600, Cormorant Garamond 600 · 이탤릭 500)은 처음 한 번 구글 폰트에서 받아 design/logo/tools/fonts/ 에 둔다.
import os, re, urllib.request
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
HERE = os.path.dirname(os.path.abspath(__file__))
F = os.path.join(HERE, 'fonts') + '/'
OUT = os.path.join(HERE, '..', '..', '..', 'assets', 'brand') + '/'
FONTS = {'f1.ttf': 'Outfit:wght@600', 'f2.ttf': 'Cormorant+Garamond:wght@600', 'f3.ttf': 'Cormorant+Garamond:ital,wght@1,500'}
os.makedirs(F, exist_ok=True)
for name, q in FONTS.items():
    if os.path.exists(F + name): continue
    css = urllib.request.urlopen(urllib.request.Request(f'https://fonts.googleapis.com/css2?family={q}', headers={'User-Agent': 'Mozilla/4.0'})).read().decode()
    urllib.request.urlretrieve(re.search(r'url\((https://[^)]+)\)', css).group(1), F + name)
INK, GOLD, CREAM, WINE, WINE_D, WHITE = '#14151c', '#c9a24a', '#faf9f6', '#8e2433', '#e0939d', '#ffffff'

def text_paths(font_file, s, size, x0, base, track=0.0):
    f = TTFont(font_file); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm
    sc = size / upm; x = x0; out = []
    for ch in s:
        g = cmap[ord(ch)]; pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (sc, 0, 0, -sc, x, base)))
        out.append(pen.getCommands()); x += gs[g].width * sc + track * size
    return ' '.join(out), x - track * size

def cap_height(font_file):
    f = TTFont(font_file); return f['OS/2'].sCapHeight / f['head'].unitsPerEm

def mark(w, a):
    return (f'<path d="M20 18 8 32l12 14M44 18l12 14-12 14" fill="none" stroke="{w}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<path d="M37 12 27 48" fill="none" stroke="{a}" stroke-width="5.5" stroke-linecap="round"/>'
            f'<rect x="14" y="53" width="36" height="4" rx="2" fill="{a}"/>')

def svg(w, h, body, title='StageLogic'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.1f} {h}" width="{w:.1f}" height="{h}" role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'

def save(name, s): open(OUT + name, 'w').write(s)

# 심볼만
save('stagelogic-mark.svg', svg(64, 64, mark(WINE, GOLD)))
save('stagelogic-mark-dark.svg', svg(64, 64, mark(WINE_D, GOLD)))
save('stagelogic-mark-black.svg', svg(64, 64, mark(INK, INK)))
save('stagelogic-mark-white.svg', svg(64, 64, mark(WHITE, WHITE)))
# 아이콘 (버건디 바탕, 둥근 네모) — 파비콘 · 앱 아이콘
icon_body = f'<rect width="64" height="64" rx="14" fill="{WINE}"/><g transform="translate(5.12 4.6) scale(.84)">{mark(CREAM, GOLD)}</g>'
save('stagelogic-icon.svg', svg(64, 64, icon_body))

# 메인: 넓은 대문자 STAGELOGIC (Outfit 600, 자간 .13em)
def lockup_caps(stage_c, logic_c, w, a):
    size = 24; ch = cap_height(F + 'f1.ttf') * size; base = 32 + ch / 2
    p1, x1 = text_paths(F + 'f1.ttf', 'STAGE', size, 82, base, .13)
    p2, x2 = text_paths(F + 'f1.ttf', 'LOGIC', size, x1 + .13 * size, base, .13)
    return svg(x2 + 4, 64, mark(w, a) + f'<path d="{p1}" fill="{stage_c}"/><path d="{p2}" fill="{logic_c}"/>', 'StageLogic 스테이지로직')
save('stagelogic-logo.svg', lockup_caps(INK, WINE, WINE, GOLD))
save('stagelogic-logo-dark.svg', lockup_caps(WHITE, GOLD, WINE_D, GOLD))
# 보조: 세리프 StageLogic (Cormorant 600 + Logic 이탤릭 500)
def lockup_serif(stage_c, logic_c, w, a):
    size = 46; ch = cap_height(F + 'f2.ttf') * size; base = 32 + ch / 2
    p1, x1 = text_paths(F + 'f2.ttf', 'Stage', size, 80, base)
    p2, x2 = text_paths(F + 'f3.ttf', 'Logic', size, x1 + 1, base)
    return svg(x2 + 4, 64, mark(w, a) + f'<path d="{p1}" fill="{stage_c}"/><path d="{p2}" fill="{logic_c}"/>', 'StageLogic 스테이지로직')
save('stagelogic-logo-serif.svg', lockup_serif(INK, WINE, WINE, GOLD))
save('stagelogic-logo-serif-dark.svg', lockup_serif(CREAM, GOLD, WINE_D, GOLD))
print(sorted(os.listdir(OUT)))
