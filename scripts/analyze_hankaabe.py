import json, re
from html.parser import HTMLParser

with open('/home/z/my-project/scripts/hankaabe_home.json') as f:
    data = json.load(f)
d = data.get('data', data)
html = d.get('html', '')

# 1. Extract text content structure (headings hierarchy)
print("=" * 70)
print("1. HEADING STRUCTURE (h1, h2, h3, h4)")
print("=" * 70)
for m in re.finditer(r'<(h[1-4])[^>]*>(.*?)</\1>', html, re.S):
    text = re.sub(r'<[^>]+>', ' ', m.group(2))
    text = re.sub(r'\s+', ' ', text).strip()
    if text:
        print(f"[{m.group(1).upper()}] {text[:120]}")

print()
print("=" * 70)
print("2. NAVIGATION LINKS")
print("=" * 70)
seen = set()
for m in re.finditer(r'<a[^>]*href="([^"#]*)"[^>]*>(.*?)</a>', html, re.S):
    href, inner = m.group(1), m.group(2)
    text = re.sub(r'<[^>]+>', ' ', inner)
    text = re.sub(r'\s+', ' ', text).strip()
    key = (href, text[:40])
    if text and key not in seen and not href.startswith(('tel:', 'mailto:')):
        seen.add(key)
        print(f"  {href}  ->  {text[:60]}")

print()
print("=" * 70)
print("3. BUTTONS / CTAs")
print("=" * 70)
seen = set()
for m in re.finditer(r'<button[^>]*>(.*?)</button>', html, re.S):
    text = re.sub(r'<[^>]+>', ' ', m.group(1))
    text = re.sub(r'\s+', ' ', text).strip()
    if text and text not in seen:
        seen.add(text)
        print(f"  [BUTTON] {text[:80]}")

print()
print("=" * 70)
print("4. COLOR PALETTE (from inline styles + tailwind classes)")
print("=" * 70)
colors = re.findall(r'#[0-9a-fA-F]{6}\b', html)
from collections import Counter
for c, n in Counter([c.lower() for c in colors]).most_common(25):
    print(f"  {c}: {n}x")
print()
print("  Tailwind color classes:")
tclasses = re.findall(r'(?:bg|text|border|from|to|via)-(?:\[[#0-9a-fA-F]+\]|[a-z]+-[0-9]+)', html)
for c, n in Counter(tclasses).most_common(40):
    print(f"  {c}: {n}x")

print()
print("=" * 70)
print("5. SECTIONS (section tags + ids)")
print("=" * 70)
for m in re.finditer(r'<(section|footer|header|nav)[^>]*>', html):
    tag = re.sub(r'\s+', ' ', m.group(0))[:150]
    print(f"  {tag}")

print()
print("=" * 70)
print("6. ANIMATIONS / EFFECTS (framer-motion, transitions, etc)")
print("=" * 70)
print("  framer-motion:", len(re.findall(r'data-framer|motion', html)))
print("  transition classes:", len(re.findall(r'transition', html)))
print("  animate classes:", Counter(re.findall(r'animate-[a-z-]+', html)).most_common(10))
print("  keyframes/style blocks:", len(re.findall(r'<style', html)))

print()
print("=" * 70)
print("7. IMAGES")
print("=" * 70)
imgs = re.findall(r'<img[^>]*src="([^"]+)"[^>]*>', html)
for i in imgs[:30]:
    print(f"  {i[:120]}")
print(f"  Total <img>: {len(imgs)}")

print()
print("=" * 70)
print("8. FONT FAMILIES")
print("=" * 70)
print(" ", set(re.findall(r'font-family:[^;"]+', html)))
print("  Google fonts links:", re.findall(r'fonts\.googleapis\.com[^"]+', html)[:3])

print()
print("=" * 70)
print("9. PLAIN TEXT (first 6000 chars)")
print("=" * 70)
# strip scripts/styles
body = re.sub(r'<script[^>]*>.*?</script>', ' ', html, flags=re.S)
body = re.sub(r'<style[^>]*>.*?</style>', ' ', body, flags=re.S)
body = re.sub(r'<svg[^>]*>.*?</svg>', ' ', body, flags=re.S)
text = re.sub(r'<[^>]+>', '\n', body)
text = re.sub(r'\n\s*\n+', '\n', text)
print(text[:6000])
