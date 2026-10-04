from PIL import Image

img = Image.open("/home/z/my-project/download/preview/anim-14-mobile.png")
w, h = img.size  # 390 x 844
# Bottom stats area: stats band sits near the bottom of the hero on mobile.
# Crop the lower third where the stats band is, full width, upscale 3x.
crop = img.crop((0, int(h * 0.62), w, h))
crop = crop.resize((crop.width * 3, crop.height * 3), Image.LANCZOS)
crop.save("/home/z/my-project/download/preview/anim-15-mobile-stats.png")
print("saved", crop.size)
