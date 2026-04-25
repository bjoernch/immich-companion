"""Generate Chrome Web Store promotional images.

Produces:
  promo-tile-440x280.png    — small promo tile (required)
  promo-marquee-1400x560.png — marquee promo tile (optional)
  screenshot-template-1280x800.png — empty template; fill with real screenshots
"""

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
ICON_PATH = os.path.normpath(os.path.join(ROOT, "..", "icons", "icon-128.png"))

INDIGO = (66, 80, 175)
VIOLET = (138, 76, 226)
TEXT = (255, 255, 255)
TEXT_DIM = (220, 222, 240)


def gradient_bg(w, h, top, bot):
    img = Image.new("RGB", (w, h), top)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(top[0] * (1 - t) + bot[0] * t)
        g = int(top[1] * (1 - t) + bot[1] * t)
        b = int(top[2] * (1 - t) + bot[2] * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    return img


def load_font(size):
    candidates = [
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                pass
    return ImageFont.load_default()


def soft_glow(size, color, radius):
    """Returns a square RGBA glow image."""
    s = size
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((0, 0, s, s), fill=color)
    return img.filter(ImageFilter.GaussianBlur(radius))


def fit_font(draw, text, max_width, start_size, min_size=12):
    """Find the largest font size that fits `text` into `max_width` px."""
    size = start_size
    while size > min_size:
        f = load_font(size)
        bbox = draw.textbbox((0, 0), text, font=f)
        if bbox[2] - bbox[0] <= max_width:
            return f, size
        size -= 2
    return load_font(min_size), min_size


def promo(width, height, title, subtitle, icon_size, title_size, subtitle_size):
    img = gradient_bg(width, height, INDIGO, VIOLET)
    img = img.convert("RGBA")
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))

    glow1 = soft_glow(int(width * 0.6), (255, 255, 255, 60), int(width * 0.08))
    overlay.paste(glow1, (-int(width * 0.1), -int(height * 0.3)), glow1)
    glow2 = soft_glow(int(width * 0.4), (170, 100, 255, 90), int(width * 0.06))
    overlay.paste(glow2, (int(width * 0.7), int(height * 0.5)), glow2)
    img = Image.alpha_composite(img, overlay)

    # Icon
    icon = Image.open(ICON_PATH).convert("RGBA")
    icon = icon.resize((icon_size, icon_size), Image.LANCZOS)
    pad = int(width * 0.05)
    icon_y = (height - icon_size) // 2
    img.alpha_composite(icon, (pad, icon_y))

    d = ImageDraw.Draw(img)
    text_x = pad + icon_size + int(width * 0.035)
    text_max_w = width - text_x - pad

    title_font, _ = fit_font(d, title, text_max_w, title_size)
    subtitle_font, _ = fit_font(d, subtitle, text_max_w, subtitle_size)

    title_bbox = d.textbbox((0, 0), title, font=title_font)
    subtitle_bbox = d.textbbox((0, 0), subtitle, font=subtitle_font)
    title_h = title_bbox[3] - title_bbox[1]
    subtitle_h = subtitle_bbox[3] - subtitle_bbox[1]
    gap = int(height * 0.04)
    block_h = title_h + gap + subtitle_h
    block_y = (height - block_h) // 2 - title_bbox[1]  # compensate for font ascent

    d.text((text_x, block_y), title, font=title_font, fill=TEXT)
    d.text((text_x, block_y + title_h + gap), subtitle,
           font=subtitle_font, fill=TEXT_DIM)

    return img.convert("RGB")


def screenshot_template(w=1280, h=800):
    img = gradient_bg(w, h, (16, 19, 28), (28, 32, 48))
    img = img.convert("RGBA")
    d = ImageDraw.Draw(img)

    label_font = load_font(36)
    note_font = load_font(20)

    title = "Replace this with a real screenshot"
    note = "1280 × 800 — capture the popup, options page, new tab, or save toast in action"

    tb = d.textbbox((0, 0), title, font=label_font)
    nb = d.textbbox((0, 0), note, font=note_font)
    d.text(((w - (tb[2] - tb[0])) // 2, h // 2 - 40), title, font=label_font, fill=(220, 222, 240))
    d.text(((w - (nb[2] - nb[0])) // 2, h // 2 + 16), note, font=note_font, fill=(140, 148, 170))

    return img.convert("RGB")


def main():
    promo_small = promo(
        440, 280,
        title="Immich Companion",
        subtitle="Save the web to your library",
        icon_size=140, title_size=30, subtitle_size=14,
    )
    promo_small.save(os.path.join(ROOT, "promo-tile-440x280.png"))
    print("wrote promo-tile-440x280.png")

    promo_marq = promo(
        1400, 560,
        title="Immich Companion",
        subtitle="Save, share and search your self-hosted Immich",
        icon_size=320, title_size=92, subtitle_size=36,
    )
    promo_marq.save(os.path.join(ROOT, "promo-marquee-1400x560.png"))
    print("wrote promo-marquee-1400x560.png")

    template = screenshot_template()
    template.save(os.path.join(ROOT, "screenshot-template-1280x800.png"))
    print("wrote screenshot-template-1280x800.png")


if __name__ == "__main__":
    main()
