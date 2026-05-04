"""Generate Immich-Companion icons.

Inspired by Immich's branding: deep indigo → violet gradient on a rounded
square, with a stacked photo motif in the foreground. This says "photo
library" instantly and stays in the Immich color family without copying
their actual logo mark.
"""

from PIL import Image, ImageDraw, ImageFilter
import os

OUT = os.path.dirname(os.path.abspath(__file__))

# Immich-leaning palette
INDIGO = (66, 80, 175)        # ~ #4250af
VIOLET_DEEP = (110, 60, 200)  # ~ #6e3cc8
VIOLET = (138, 76, 226)       # ~ #8a4ce2
SUN = (255, 192, 90)
SUN_GLOW = (255, 220, 140)


def gradient_bg(size, top, bot):
    img = Image.new("RGB", (size, size), top)
    px = img.load()
    for y in range(size):
        t = y / max(1, size - 1)
        r = int(top[0] * (1 - t) + bot[0] * t)
        g = int(top[1] * (1 - t) + bot[1] * t)
        b = int(top[2] * (1 - t) + bot[2] * t)
        for x in range(size):
            px[x, y] = (r, g, b)
    return img


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return m


def rotated_card(size, x0, y0, x1, y1, radius, fill, rotation_deg=0, draw_fn=None):
    """Render a rounded card on its own transparent layer, optionally rotate it
    around its own center, and return the layer (same size as canvas).
    `draw_fn(draw, x0, y0, x1, y1)` can be used to paint inner detail."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")
    d.rounded_rectangle((x0, y0, x1, y1), radius=radius, fill=fill)
    if draw_fn:
        draw_fn(d, x0, y0, x1, y1)
    if rotation_deg:
        cx = (x0 + x1) / 2
        cy = (y0 + y1) / 2
        layer = layer.rotate(rotation_deg, center=(cx, cy), resample=Image.BICUBIC)
    return layer


def paint_landscape(d, x0, y0, x1, y1):
    """Paint a small sun + mountains inside the front card."""
    w = x1 - x0
    h = y1 - y0
    # Sun
    sun_r = w * 0.10
    sun_x = x0 + w * 0.30
    sun_y = y0 + h * 0.35
    d.ellipse(
        (sun_x - sun_r, sun_y - sun_r, sun_x + sun_r, sun_y + sun_r),
        fill=SUN + (255,),
    )
    # Big mountain
    d.polygon([
        (x0 + w * 0.12, y0 + h * 0.92),
        (x0 + w * 0.50, y0 + h * 0.40),
        (x0 + w * 0.78, y0 + h * 0.92),
    ], fill=INDIGO + (255,))
    # Smaller mountain
    d.polygon([
        (x0 + w * 0.55, y0 + h * 0.92),
        (x0 + w * 0.78, y0 + h * 0.55),
        (x0 + w * 0.97, y0 + h * 0.92),
    ], fill=VIOLET + (220,))


def make_icon(size: int, rounded: bool = True) -> Image.Image:
    s = size * 4  # supersample for AA
    out = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    # Gradient background — rounded corners for normal extension icons,
    # full square for the publisher / trader profile icon (no alpha allowed).
    bg = gradient_bg(s, INDIGO, VIOLET)
    if rounded:
        out.paste(bg, (0, 0), rounded_mask(s, int(s * 0.22)))
    else:
        out.paste(bg, (0, 0))

    # Optional inner glow / vignette for depth
    glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse(
        (-s * 0.25, -s * 0.25, s * 0.85, s * 0.85),
        fill=(255, 255, 255, 36),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(s * 0.08))
    out = Image.alpha_composite(out, glow)

    cx, cy = s / 2, s / 2
    card_w = s * 0.52
    card_h = s * 0.44
    radius = max(2, int(s * 0.045))

    # Back card — tilted left, semi-transparent
    bx0 = cx - card_w / 2 - s * 0.06
    by0 = cy - card_h / 2 - s * 0.04
    out = Image.alpha_composite(
        out,
        rotated_card(s, bx0, by0, bx0 + card_w, by0 + card_h, radius,
                     (255, 255, 255, 110), rotation_deg=-12),
    )

    # Middle card — slight right tilt, more opaque
    mx0 = cx - card_w / 2 + s * 0.01
    my0 = cy - card_h / 2 + s * 0.01
    out = Image.alpha_composite(
        out,
        rotated_card(s, mx0, my0, mx0 + card_w, my0 + card_h, radius,
                     (255, 255, 255, 180), rotation_deg=4),
    )

    # Front card — fully opaque, contains a tiny landscape (sun + mountains)
    fx0 = cx - card_w / 2 + s * 0.06
    fy0 = cy - card_h / 2 + s * 0.06

    # Soft shadow under front card
    shadow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(
        (fx0 + s * 0.012, fy0 + s * 0.018, fx0 + card_w + s * 0.012, fy0 + card_h + s * 0.018),
        radius=radius, fill=(0, 0, 0, 90),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(s * 0.014))
    out = Image.alpha_composite(out, shadow)

    # At the smallest size, the inner landscape renders as noise — keep the
    # front card clean. At 48+ paint the landscape.
    draw_inner = paint_landscape if size >= 48 else None
    out = Image.alpha_composite(
        out,
        rotated_card(s, fx0, fy0, fx0 + card_w, fy0 + card_h, radius,
                     (255, 255, 255, 255), rotation_deg=10,
                     draw_fn=draw_inner),
    )

    return out.resize((size, size), Image.LANCZOS)


for size in (16, 48, 128):
    img = make_icon(size)
    img.save(os.path.join(OUT, f"icon-{size}.png"))
    print(f"wrote icon-{size}.png")

# Publisher / trader-symbol variant for the Web Store dashboard:
# 128x128 RGB (no alpha), full-square gradient (no rounded corners since
# alpha can't render the transparent corner area).
TRADER = make_icon(128, rounded=False).convert("RGB")
TRADER_OUT = os.path.normpath(os.path.join(OUT, "..", "webstore-assets", "developer-icon-128x128.png"))
TRADER.save(TRADER_OUT)
print(f"wrote {os.path.relpath(TRADER_OUT, os.path.dirname(OUT))}")
