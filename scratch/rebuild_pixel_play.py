from PIL import Image, ImageFilter
from pathlib import Path
base = Path(r"C:\Users\manpr\Documents\Codex\2026-05-08\i-want-to-build-an-ai")
src = base / 'public' / 'images' / 'hdfc-pixel-play-card-face.webp'
out = base / 'public' / 'images' / 'hdfc-pixel-play.webp'
img = Image.open(src).convert('RGBA')
img = img.resize((380, 234), Image.Resampling.LANCZOS)
canvas = Image.new('RGBA', (620, 363), (244, 238, 230, 255))
shadow = Image.new('RGBA', img.size, (0, 0, 0, 95)).filter(ImageFilter.GaussianBlur(12))
left = (620 - img.width) // 2
top = (363 - img.height) // 2
canvas.alpha_composite(shadow, (left + 10, top + 14))
canvas.alpha_composite(img, (left, top))
canvas.save(out, format='WEBP', quality=92)
print('rebuilt')
