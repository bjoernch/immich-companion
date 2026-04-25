"""Generate Chrome Web Store screenshots — 1280x800, RGB (no alpha).

Mockups, not literal browser captures. They show the extension's UIs
populated with synthetic but plausible photo content so the Web Store
listing has illustrative visuals before you take real screenshots.
"""

import os
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.dirname(os.path.abspath(__file__))
ICON_PATH = os.path.normpath(os.path.join(OUT, "..", "icons", "icon-128.png"))

W, H = 1280, 800

# Extension palette
INDIGO = (66, 80, 175)
VIOLET = (138, 76, 226)
ACCENT = (124, 140, 255)
ACCENT_STRONG = (91, 108, 255)
BG = (11, 13, 18)
PANEL = (20, 24, 33)
PANEL_2 = (28, 33, 48)
PANEL_3 = (35, 42, 60)
BORDER = (38, 43, 58)
TEXT = (232, 234, 240)
MUTED = (139, 147, 166)
OK = (74, 222, 128)


def font(size):
    for p in (
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                pass
    return ImageFont.load_default()


# --- Synthetic photos -------------------------------------------------------

PALETTES = [
    [(255, 140, 80), (220, 80, 120), (80, 60, 140)],     # sunset
    [(40, 80, 60), (90, 140, 100), (180, 200, 150)],     # forest
    [(40, 120, 180), (80, 180, 200), (180, 220, 230)],   # ocean
    [(60, 50, 80), (200, 100, 120), (250, 200, 180)],    # dusk
    [(100, 80, 60), (180, 140, 100), (240, 220, 180)],   # desert
    [(50, 60, 100), (150, 180, 220), (240, 250, 255)],   # snow
    [(180, 80, 60), (240, 180, 80), (250, 230, 180)],    # autumn
    [(20, 30, 60), (60, 80, 140), (180, 160, 200)],      # night
    [(200, 60, 100), (255, 130, 180), (255, 220, 230)],  # blossom
    [(80, 100, 60), (140, 170, 100), (220, 230, 180)],   # meadow
]


def fake_photo(w, h, seed=0, with_silhouette=True):
    rng = random.Random(seed)
    pal = PALETTES[seed % len(PALETTES)]
    img = Image.new("RGB", (w, h), pal[0])
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        if t < 0.55:
            t2 = t / 0.55
            c0, c1 = pal[0], pal[1]
        else:
            t2 = (t - 0.55) / 0.45
            c0, c1 = pal[1], pal[2]
        r = int(c0[0] * (1 - t2) + c1[0] * t2)
        g = int(c0[1] * (1 - t2) + c1[1] * t2)
        b = int(c0[2] * (1 - t2) + c1[2] * t2)
        for x in range(w):
            px[x, y] = (r, g, b)

    d = ImageDraw.Draw(img)
    if rng.random() < 0.55:
        sun_x = int(w * (0.2 + rng.random() * 0.6))
        sun_y = int(h * (0.18 + rng.random() * 0.18))
        sun_r = int(min(w, h) * (0.05 + rng.random() * 0.04))
        sun_color = tuple(min(255, int(c * 1.3)) for c in pal[1])
        d.ellipse((sun_x - sun_r, sun_y - sun_r, sun_x + sun_r, sun_y + sun_r),
                  fill=sun_color)

    if with_silhouette:
        sil = tuple(max(0, int(c * 0.32)) for c in pal[2])
        pts = [(0, h)]
        x = 0
        base_y = int(h * (0.45 + rng.random() * 0.15))
        while x < w:
            x += rng.randint(int(w * 0.06), int(w * 0.18))
            y = base_y + rng.randint(int(-h * 0.14), int(h * 0.06))
            pts.append((min(x, w), max(0, y)))
        pts.append((w, h))
        d.polygon(pts, fill=sil)

    return img


def rounded_paste(canvas, im, xy, radius):
    """Paste im onto canvas at xy with rounded corners."""
    w, h = im.size
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255)
    canvas.paste(im, xy, mask)


def rounded_rect(draw, xy, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


# --- Screenshot 1: New tab page --------------------------------------------

def shot_newtab():
    bg_photo = fake_photo(W, H, seed=2)  # ocean
    canvas = Image.blend(bg_photo, Image.new("RGB", (W, H), (0, 0, 0)), 0.42)
    d = ImageDraw.Draw(canvas)

    # Clock
    d.text((48, 36), "14:32", font=font(82), fill=(248, 248, 252))

    # Date / meta (right)
    d.text((W - 48, 50), "Saturday, April 25", font=font(18),
           fill=(230, 232, 240), anchor="rt")
    d.text((W - 48, 80), "Photo from April 11, 2024 · Bern, Switzerland",
           font=font(13), fill=(220, 222, 234), anchor="rt")
    d.text((W - 48, 100), "Open in Immich →", font=font(13),
           fill=(200, 210, 240), anchor="rt")

    # On this day bar
    bar_x, bar_y, bar_w, bar_h = 40, H - 230, W - 80, 180
    bar_layer = Image.new("RGBA", (bar_w, bar_h), (0, 0, 0, 130))
    bar_canvas = Image.new("RGB", (bar_w, bar_h))
    bar_canvas.paste(canvas.crop((bar_x, bar_y, bar_x + bar_w, bar_y + bar_h)))
    bar_canvas = Image.blend(bar_canvas, Image.new("RGB", (bar_w, bar_h), (0, 0, 0)), 0.55)
    rounded_paste(canvas, bar_canvas, (bar_x, bar_y), 14)
    d.rounded_rectangle((bar_x, bar_y, bar_x + bar_w, bar_y + bar_h),
                        radius=14, outline=(70, 70, 90), width=1)

    d.text((bar_x + 18, bar_y + 14), "ON THIS DAY",
           font=font(11), fill=(220, 222, 235))

    # Thumbnails
    t_size = 116
    t_y = bar_y + 36
    t_x = bar_x + 18
    seeds = [11, 23, 7, 14, 5, 19, 31, 4, 26, 8, 17, 3]
    years = [1, 2, 2, 3, 4, 5, 6, 7, 7, 8, 9, 10]
    for i, (s, yrs) in enumerate(zip(seeds, years)):
        if t_x + t_size > bar_x + bar_w - 18:
            break
        thumb = fake_photo(t_size, t_size, seed=s)
        rounded_paste(canvas, thumb, (t_x, t_y), 8)
        # year badge
        d.rounded_rectangle((t_x + 6, t_y + t_size - 22, t_x + 36, t_y + t_size - 6),
                            radius=4, fill=(0, 0, 0))
        d.text((t_x + 12, t_y + t_size - 19), f"{yrs}y",
               font=font(11), fill=(255, 255, 255))
        t_x += t_size + 10

    return canvas


# --- Screenshot 2: Popup with search results --------------------------------

def shot_popup():
    # Subtle gradient backdrop
    canvas = Image.new("RGB", (W, H), BG)
    px = canvas.load()
    for y in range(H):
        t = y / H
        c = (
            int(BG[0] + (PANEL[0] - BG[0]) * t * 0.6),
            int(BG[1] + (PANEL[1] - BG[1]) * t * 0.6),
            int(BG[2] + (PANEL[2] - BG[2]) * t * 0.6),
        )
        for x in range(W):
            px[x, y] = c

    d = ImageDraw.Draw(canvas)

    # Caption text on the left
    d.text((80, 240), "Search your library",
           font=font(48), fill=TEXT)
    d.text((80, 308), "from any tab",
           font=font(48), fill=ACCENT)
    d.text((80, 392), "Smart CLIP search returns results that match",
           font=font(20), fill=MUTED)
    d.text((80, 422), 'natural-language queries like "red sunset"',
           font=font(20), fill=MUTED)
    d.text((80, 452), 'or "cat at night."', font=font(20), fill=MUTED)

    d.text((80, 528), "⌘ + Shift + L", font=font(15), fill=ACCENT)
    d.text((200, 528), "opens the popup", font=font(15), fill=MUTED)

    # Popup mock on the right
    pop_w, pop_h = 460, 560
    pop_x = W - pop_w - 80
    pop_y = 120

    # Drop shadow
    shadow = Image.new("RGBA", (pop_w + 60, pop_h + 60), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((30, 30, pop_w + 30, pop_h + 30), radius=18, fill=(0, 0, 0, 120))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    canvas.paste(shadow, (pop_x - 30, pop_y - 30), shadow)

    pop = Image.new("RGB", (pop_w, pop_h), BG)
    pd = ImageDraw.Draw(pop)
    pd.rounded_rectangle((0, 0, pop_w - 1, pop_h - 1), radius=14, outline=BORDER, width=1)
    rounded_paste(canvas, pop, (pop_x, pop_y), 14)
    d2 = ImageDraw.Draw(canvas)

    # Tabs
    tabs_y = pop_y + 14
    tabs = [("Search", True), ("Recent", False), ("Upload", False)]
    tx = pop_x + 14
    for label, active in tabs:
        bbox = d2.textbbox((tx, tabs_y), label, font=font(13))
        w_lbl = bbox[2] - bbox[0]
        d2.text((tx, tabs_y), label, font=font(13),
                fill=TEXT if active else MUTED)
        if active:
            d2.line((tx - 2, tabs_y + 26, tx + w_lbl + 2, tabs_y + 26),
                    fill=ACCENT, width=2)
        tx += w_lbl + 28
    d2.line((pop_x + 12, tabs_y + 32, pop_x + pop_w - 12, tabs_y + 32),
            fill=BORDER, width=1)

    # Search input
    inp_y = tabs_y + 50
    rounded_rect(d2, (pop_x + 14, inp_y, pop_x + pop_w - 60, inp_y + 38),
                 radius=8, outline=ACCENT, width=2, fill=PANEL_2)
    d2.text((pop_x + 26, inp_y + 11), "red sunset", font=font(14), fill=TEXT)
    rounded_rect(d2, (pop_x + pop_w - 50, inp_y, pop_x + pop_w - 14, inp_y + 38),
                 radius=8, fill=PANEL_2)
    d2.text((pop_x + pop_w - 32, inp_y + 11), "↗", font=font(14), fill=TEXT, anchor="mm")

    # Masonry results — 2 columns
    grid_y = inp_y + 56
    col_w = (pop_w - 14 * 2 - 6) // 2
    heights_l = [180, 130, 100]
    heights_r = [120, 160, 130]
    seeds_l = [0, 4, 7]
    seeds_r = [3, 6, 9]
    y1 = grid_y
    for h, s in zip(heights_l, seeds_l):
        ph = fake_photo(col_w, h, seed=s)
        rounded_paste(canvas, ph, (pop_x + 14, y1), 8)
        y1 += h + 6
    y2 = grid_y
    for h, s in zip(heights_r, seeds_r):
        ph = fake_photo(col_w, h, seed=s)
        rounded_paste(canvas, ph, (pop_x + 14 + col_w + 6, y2), 8)
        y2 += h + 6

    # Footer
    d2.line((pop_x, pop_y + pop_h - 38, pop_x + pop_w, pop_y + pop_h - 38),
            fill=BORDER, width=1)
    d2.text((pop_x + 14, pop_y + pop_h - 26), "12 results",
            font=font(12), fill=MUTED)
    d2.text((pop_x + pop_w - 14, pop_y + pop_h - 26), "Settings",
            font=font(12), fill=MUTED, anchor="rt")

    return canvas


# --- Screenshot 3: Google integration ---------------------------------------

def shot_google():
    canvas = Image.new("RGB", (W, H), (32, 33, 36))  # google dark grey
    d = ImageDraw.Draw(canvas)

    # Top "browser chrome" strip
    d.rectangle((0, 0, W, 60), fill=(48, 49, 52))
    # URL bar
    rounded_rect(d, (180, 14, W - 220, 46), radius=20, fill=(32, 33, 36))
    d.text((196, 22), "https://www.google.com/search?q=red+sunset",
           font=font(14), fill=(220, 222, 230))

    # Google header
    d.text((180, 96), "Google", font=font(28), fill=(232, 234, 237))
    rounded_rect(d, (290, 90, 880, 130), radius=20, outline=(60, 64, 68),
                 width=1, fill=(48, 49, 52))
    d.text((310, 100), "red sunset", font=font(16), fill=(220, 222, 230))

    # Tabs
    tabs = ["All", "Images", "Videos", "Shopping", "News", "More"]
    tx = 180
    for i, t in enumerate(tabs):
        bbox = d.textbbox((tx, 154), t, font=font(13))
        d.text((tx, 154), t, font=font(13),
               fill=(232, 234, 237) if i == 0 else (170, 170, 175))
        if i == 0:
            d.line((tx - 4, 178, bbox[2] + 4, 178), fill=(138, 180, 248), width=2)
        tx += (bbox[2] - bbox[0]) + 24

    # ----- Immich card -----
    card_x, card_y, card_w, card_h = 180, 200, 720, 200
    rounded_rect(d, (card_x, card_y, card_x + card_w, card_y + card_h),
                 radius=12, fill=(31, 31, 31), outline=(60, 64, 68), width=1)

    # Header
    icon = Image.open(ICON_PATH).convert("RGB").resize((22, 22), Image.LANCZOS)
    rounded_paste(canvas, icon, (card_x + 16, card_y + 16), 5)
    d.text((card_x + 46, card_y + 18), "From your Immich library",
           font=font(13), fill=(232, 234, 237))
    # Count badge
    badge_x = card_x + 240
    rounded_rect(d, (badge_x, card_y + 18, badge_x + 78, card_y + 38),
                 radius=999, fill=(48, 56, 96))
    d.text((badge_x + 39, card_y + 27), "8 matches",
           font=font(11), fill=(150, 175, 255), anchor="mm")
    # View all
    d.text((card_x + card_w - 16, card_y + 18), "View all in Immich →",
           font=font(13), fill=(138, 180, 248), anchor="rt")

    # Thumbnails
    t_size = 110
    t_y = card_y + 56
    t_x = card_x + 16
    for s in [0, 3, 6, 4, 9, 7]:
        if t_x + t_size > card_x + card_w - 16:
            break
        ph = fake_photo(t_size, t_size, seed=s)
        rounded_paste(canvas, ph, (t_x, t_y), 8)
        t_x += t_size + 8

    # ----- Fake Google results below -----
    gy = card_y + card_h + 30
    for i in range(3):
        d.text((card_x, gy), "example.com › photos › sunsets",
               font=font(12), fill=(170, 170, 175))
        d.text((card_x, gy + 18),
               "Beautiful red sunset photos — collection from around the world",
               font=font(18), fill=(138, 180, 248))
        d.text((card_x, gy + 50),
               "Discover stunning red sunset photographs taken by photographers",
               font=font(13), fill=(200, 200, 205))
        d.text((card_x, gy + 70),
               "across every continent. Galleries, prints, and tips.",
               font=font(13), fill=(200, 200, 205))
        gy += 130

    return canvas


# --- Screenshot 4: Save toast on a webpage ----------------------------------

def shot_save_toast():
    # Fake "webpage" backdrop with a hero image and some article text
    canvas = Image.new("RGB", (W, H), (245, 246, 250))
    d = ImageDraw.Draw(canvas)

    # Top bar
    d.rectangle((0, 0, W, 60), fill=(255, 255, 255))
    d.line((0, 60, W, 60), fill=(220, 222, 230), width=1)
    d.ellipse((24, 22, 36, 34), fill=(220, 222, 230))
    d.ellipse((44, 22, 56, 34), fill=(220, 222, 230))
    d.ellipse((64, 22, 76, 34), fill=(220, 222, 230))
    rounded_rect(d, (110, 16, W - 240, 44), radius=14, fill=(245, 246, 250))
    d.text((124, 24), "https://travel-blog.example/best-of-iceland",
           font=font(13), fill=(120, 124, 132))

    # Hero photo
    hero = fake_photo(W - 240, 360, seed=0)
    rounded_paste(canvas, hero, (120, 100), 12)

    # Article text
    ty = 480
    d.text((120, ty), "Iceland in spring", font=font(36), fill=(20, 24, 33))
    d.text((120, ty + 56),
           "From geothermal pools to cathedral-sized waterfalls, here are the",
           font=font(16), fill=(80, 84, 96))
    d.text((120, ty + 80),
           "ten places we couldn't stop photographing.",
           font=font(16), fill=(80, 84, 96))
    d.text((120, ty + 124),
           "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
           font=font(14), fill=(120, 124, 136))
    d.text((120, ty + 148),
           "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
           font=font(14), fill=(120, 124, 136))

    # ----- Toast top-right -----
    toast_w, toast_h = 360, 96
    tx = W - toast_w - 32
    ty = 92
    # Shadow
    shadow = Image.new("RGBA", (toast_w + 60, toast_h + 60), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((30, 30, toast_w + 30, toast_h + 30),
                         radius=14, fill=(0, 0, 0, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    canvas.paste(shadow, (tx - 30, ty - 30), shadow)

    rounded_rect(d, (tx, ty, tx + toast_w, ty + toast_h),
                 radius=12, fill=(20, 22, 30))
    # Left accent
    d.rectangle((tx, ty, tx + 4, ty + toast_h), fill=OK)
    # Icon circle
    d.ellipse((tx + 18, ty + 18, tx + 42, ty + 42), fill=(74, 222, 128, 70))
    d.text((tx + 30, ty + 30), "✓", font=font(13), fill=OK, anchor="mm")
    # Text
    d.text((tx + 56, ty + 16), "Saved to Immich",
           font=font(14), fill=(255, 255, 255))
    d.text((tx + 56, ty + 38), "iceland-waterfall.jpg · added to album",
           font=font(12), fill=(190, 195, 210))
    # Action buttons
    rounded_rect(d, (tx + 56, ty + 60, tx + 110, ty + 82),
                 radius=6, fill=(38, 42, 56))
    d.text((tx + 83, ty + 71), "Open", font=font(11), fill=TEXT, anchor="mm")
    rounded_rect(d, (tx + 116, ty + 60, tx + 196, ty + 82),
                 radius=6, fill=(38, 42, 56))
    d.text((tx + 156, ty + 71), "Copy link", font=font(11), fill=TEXT, anchor="mm")
    # Close
    d.text((tx + toast_w - 16, ty + 16), "×",
           font=font(18), fill=(150, 155, 170), anchor="rt")

    return canvas


# --- Screenshot 5: Options page --------------------------------------------

def shot_options():
    canvas = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(canvas)

    # Soft gradient blobs
    glow = Image.new("RGB", (W, H), BG)
    gd = ImageDraw.Draw(glow)
    gd.ellipse((-200, -200, 700, 500), fill=(28, 32, 56))
    gd.ellipse((W - 600, H - 400, W + 200, H + 200), fill=(36, 28, 52))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    canvas = Image.blend(canvas, glow, 0.6)
    d = ImageDraw.Draw(canvas)

    # Layout: sidebar + content
    side_w = 260
    side_x = (W - 1100) // 2
    cont_x = side_x + side_w
    cont_w = 1100 - side_w

    # Sidebar
    rounded_rect(d, (side_x, 60, side_x + side_w, H - 60),
                 radius=14, fill=PANEL, outline=BORDER, width=1)

    # Brand
    icon = Image.open(ICON_PATH).convert("RGB").resize((36, 36), Image.LANCZOS)
    rounded_paste(canvas, icon, (side_x + 22, 84), 8)
    d.text((side_x + 70, 86), "Immich Companion",
           font=font(14), fill=TEXT)
    d.text((side_x + 70, 106), "v0.3.0", font=font(11), fill=MUTED)

    d.line((side_x + 14, 138, side_x + side_w - 14, 138),
           fill=BORDER, width=1)

    # Nav
    items = [("Connection", True), ("Save to Immich", False),
             ("New Tab", False), ("Search & Share", False),
             ("Features", False), ("About", False)]
    ny = 156
    for label, active in items:
        if active:
            rounded_rect(d, (side_x + 14, ny, side_x + side_w - 14, ny + 38),
                         radius=8, fill=(36, 44, 70))
        # bullet
        d.ellipse((side_x + 26, ny + 16, side_x + 32, ny + 22),
                  fill=ACCENT if active else BORDER)
        d.text((side_x + 44, ny + 11), label,
               font=font(13), fill=TEXT if active else MUTED)
        ny += 44

    # Connection status pill at bottom
    d.line((side_x + 14, H - 110, side_x + side_w - 14, H - 110),
           fill=BORDER, width=1)
    d.ellipse((side_x + 24, H - 92, side_x + 32, H - 84), fill=OK)
    d.text((side_x + 40, H - 92), "Connected · you@home",
           font=font(12), fill=OK)

    # Content
    d.text((cont_x + 40, 96), "Connection", font=font(28), fill=TEXT)
    d.text((cont_x + 40, 134),
           "Point the extension at your Immich server.",
           font=font(14), fill=MUTED)

    # Two inputs
    in1_x = cont_x + 40
    in1_y = 200
    in1_w = (cont_w - 100) // 2
    d.text((in1_x, in1_y), "Server URL", font=font(13), fill=TEXT)
    rounded_rect(d, (in1_x, in1_y + 24, in1_x + in1_w, in1_y + 64),
                 radius=8, fill=PANEL_2, outline=BORDER, width=1)
    d.text((in1_x + 14, in1_y + 36),
           "https://immich.example.com", font=font(14), fill=TEXT)

    in2_x = in1_x + in1_w + 20
    d.text((in2_x, in1_y), "API key", font=font(13), fill=TEXT)
    rounded_rect(d, (in2_x, in1_y + 24, in2_x + in1_w, in1_y + 64),
                 radius=8, fill=PANEL_2, outline=BORDER, width=1)
    d.text((in2_x + 14, in1_y + 36),
           "••••••••••••••••••••••",
           font=font(14), fill=TEXT)

    # Buttons
    btn_x = in1_x
    btn_y = in1_y + 100
    rounded_rect(d, (btn_x, btn_y, btn_x + 90, btn_y + 38),
                 radius=8, fill=ACCENT_STRONG)
    d.text((btn_x + 45, btn_y + 19), "Save",
           font=font(13), fill=(255, 255, 255), anchor="mm")
    rounded_rect(d, (btn_x + 100, btn_y, btn_x + 220, btn_y + 38),
                 radius=8, fill=PANEL_2, outline=BORDER, width=1)
    d.text((btn_x + 160, btn_y + 19), "Test connection",
           font=font(13), fill=TEXT, anchor="mm")
    d.text((btn_x + 234, btn_y + 19), "Connected ✓",
           font=font(13), fill=OK)

    # Stats / heading further down
    d.text((cont_x + 40, btn_y + 100),
           "Save 1.2k photos to your library this month?",
           font=font(20), fill=TEXT)
    d.text((cont_x + 40, btn_y + 132),
           "Right-click any image and select “Save to Immich”.",
           font=font(14), fill=MUTED)

    return canvas


# ---------------------------------------------------------------------------

def save_rgb(im, path):
    if im.mode != "RGB":
        im = im.convert("RGB")
    im.save(path, format="PNG")
    print(f"wrote {os.path.basename(path)} ({im.size[0]}x{im.size[1]}, {im.mode})")


def main():
    save_rgb(shot_newtab(), os.path.join(OUT, "screenshot-1-newtab.png"))
    save_rgb(shot_popup(), os.path.join(OUT, "screenshot-2-popup-search.png"))
    save_rgb(shot_google(), os.path.join(OUT, "screenshot-3-google-card.png"))
    save_rgb(shot_save_toast(), os.path.join(OUT, "screenshot-4-save-toast.png"))
    save_rgb(shot_options(), os.path.join(OUT, "screenshot-5-options.png"))


if __name__ == "__main__":
    main()
