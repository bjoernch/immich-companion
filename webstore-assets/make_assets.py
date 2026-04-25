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


def scatter_photo_icons(canvas, count, color, alpha):
    """Draw a few translucent photo-frame outlines around the canvas edges."""
    import random
    rng = random.Random(42)  # deterministic
    w, h = canvas.size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    margin_x = int(w * 0.06)
    margin_y = int(h * 0.06)
    placed = []
    for _ in range(count):
        size = rng.randint(int(min(w, h) * 0.06), int(min(w, h) * 0.10))
        x = rng.randint(margin_x, w - size - margin_x)
        y = rng.randint(margin_y, h - size - margin_y)
        # Avoid the centre block where the title sits
        cx, cy = w / 2, h / 2
        if abs(x + size / 2 - cx) < w * 0.30 and abs(y + size / 2 - cy) < h * 0.34:
            continue
        rot = rng.uniform(-18, 18)
        # Draw a small rounded rectangle "photo" with a tiny mountain inside
        ph = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        pd = ImageDraw.Draw(ph)
        r = max(2, size // 8)
        pd.rounded_rectangle((0, 0, size - 1, size - 1), radius=r,
                             outline=color + (alpha,), width=max(1, size // 18))
        # tiny mountain
        pd.polygon([
            (size * 0.15, size * 0.8),
            (size * 0.45, size * 0.45),
            (size * 0.75, size * 0.8),
        ], fill=color + (max(20, alpha - 60),))
        # tiny sun
        pd.ellipse((size * 0.65, size * 0.18, size * 0.85, size * 0.38),
                   fill=color + (max(20, alpha - 60),))
        ph = ph.rotate(rot, resample=Image.BICUBIC, expand=False)
        layer.alpha_composite(ph, (x, y))
        placed.append((x, y, size))
    return Image.alpha_composite(canvas, layer)


def promo_centered(width, height, title, subtitle, icon_size,
                   title_size, subtitle_size, scatter_count=10):
    """Centered hero layout — icon, big title, tagline, scattered photo icons."""
    img = gradient_bg(width, height, INDIGO, VIOLET)
    img = img.convert("RGBA")

    # Atmospheric glows
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    g1 = soft_glow(int(width * 0.7), (255, 255, 255, 40), int(width * 0.10))
    overlay.paste(g1, (-int(width * 0.15), -int(height * 0.4)), g1)
    g2 = soft_glow(int(width * 0.5), (170, 100, 255, 90), int(width * 0.07))
    overlay.paste(g2, (int(width * 0.55), int(height * 0.45)), g2)
    img = Image.alpha_composite(img, overlay)

    # Scattered photo-frame icons
    img = scatter_photo_icons(img, scatter_count, (255, 255, 255), 90)

    # Centre block: icon, title, subtitle stacked vertically
    icon = Image.open(ICON_PATH).convert("RGBA").resize((icon_size, icon_size), Image.LANCZOS)
    d = ImageDraw.Draw(img)

    title_font = load_font(title_size)
    subtitle_font = load_font(subtitle_size)

    title_bbox = d.textbbox((0, 0), title, font=title_font)
    subtitle_bbox = d.textbbox((0, 0), subtitle, font=subtitle_font)
    title_w = title_bbox[2] - title_bbox[0]
    title_h = title_bbox[3] - title_bbox[1]
    subtitle_w = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_h = subtitle_bbox[3] - subtitle_bbox[1]

    gap_icon = int(height * 0.04)
    gap_title = int(height * 0.025)
    block_h = icon_size + gap_icon + title_h + gap_title + subtitle_h

    icon_y = (height - block_h) // 2
    title_y = icon_y + icon_size + gap_icon - title_bbox[1]
    subtitle_y = title_y + title_h + gap_title

    img.alpha_composite(icon, ((width - icon_size) // 2, icon_y))

    d.text(((width - title_w) // 2 - title_bbox[0], title_y),
           title, font=title_font, fill=TEXT)
    d.text(((width - subtitle_w) // 2 - subtitle_bbox[0], subtitle_y),
           subtitle, font=subtitle_font, fill=TEXT_DIM)

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
    # Small promo tile — centered hero design, photo-frame scatter
    promo_small = promo_centered(
        440, 280,
        title="Immich Companion",
        subtitle="Save the web to your Immich library",
        icon_size=80, title_size=30, subtitle_size=14, scatter_count=10,
    )
    promo_small.save(os.path.join(ROOT, "promo-tile-440x280.png"))
    print("wrote promo-tile-440x280.png")

    # Marquee — same centered style at larger scale
    promo_marq = promo_centered(
        1400, 560,
        title="Immich Companion",
        subtitle="Save, share, and search your self-hosted Immich library",
        icon_size=180, title_size=84, subtitle_size=32, scatter_count=20,
    )
    promo_marq.save(os.path.join(ROOT, "promo-marquee-1400x560.png"))
    print("wrote promo-marquee-1400x560.png")

    # Wide repo banner for the README header (16:5 aspect)
    banner = promo_centered(
        1280, 400,
        title="Immich Companion",
        subtitle="A browser companion for your self-hosted Immich",
        icon_size=110, title_size=64, subtitle_size=24, scatter_count=14,
    )
    banner.save(os.path.join(ROOT, "banner-1280x400.png"))
    print("wrote banner-1280x400.png")

    template = screenshot_template()
    template.save(os.path.join(ROOT, "screenshot-template-1280x800.png"))
    print("wrote screenshot-template-1280x800.png")


if __name__ == "__main__":
    main()
