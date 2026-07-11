# Generates public/og-card.png (1200x630 social share card) and
# public/apple-touch-icon.png (180x180 home-screen icon).
# One-time assets; rerun after a branding change:  python scripts/og-card.py
# Downloads brand fonts (Google Fonts repo) and the WPR logo at build time; nothing ships at runtime.
# Ball art is generic — no team marks (see the trademark note in README).
import io
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OG_OUT = ROOT / "public" / "og-card.png"
ICON_OUT = ROOT / "public" / "apple-touch-icon.png"

GREEN = (0, 71, 27)          # Bucks "Good Land Green"
GREEN_DEEP = (0, 52, 20)
CREAM = (238, 225, 198)      # Bucks cream
CREAM_DEEP = (217, 202, 168)
MUTED = (203, 204, 184)      # soft sage for subtext on green

FRAUNCES = "https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf"
PUBLIC_SANS = "https://raw.githubusercontent.com/google/fonts/main/ofl/publicsans/PublicSans%5Bwght%5D.ttf"
WPR_LOGO = "https://wausaupilotandreview.com/wp-content/uploads/2024/04/WausauPilotandReviewLogo.png"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as r:
        return r.read()


def font(data, size, weight=None):
    f = ImageFont.truetype(io.BytesIO(data), size)
    if weight is not None:
        try:
            axes = [weight if a.axis == "wght" else a.default for a in f.get_variation_axes()]
            f.set_variation_by_axes(axes)
        except Exception:
            pass
    return f


def basketball(img, cx, cy, r, seam):
    """A cream basketball with green seams. Generic art, no team marks."""
    d = ImageDraw.Draw(img)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CREAM, outline=CREAM_DEEP, width=max(3, r // 40))
    d.line([cx, cy - r + seam, cx, cy + r - seam], fill=GREEN, width=seam)
    d.line([cx - r + seam, cy, cx + r - seam, cy], fill=GREEN, width=seam)
    # Side seams: arcs of circles displaced left/right of the ball.
    off = round(r * 1.15)
    ar = round(r * 1.05)
    d.arc([cx - off - ar, cy - ar, cx - off + ar, cy + ar], start=-52, end=52, fill=GREEN, width=seam)
    d.arc([cx + off - ar, cy - ar, cx + off + ar, cy + ar], start=128, end=232, fill=GREEN, width=seam)


def og_card(fraunces, public_sans, logo):
    img = Image.new("RGB", (1200, 630), GREEN)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 1200, 10], fill=CREAM)

    basketball(img, 985, 330, 175, 12)
    d = ImageDraw.Draw(img)

    kicker = font(public_sans, 26, weight=700)
    d.text((80, 96), "W A U S A U   P I L O T   &   R E V I E W", font=kicker, fill=CREAM)

    head = font(fraunces, 78, weight=600)
    d.text((76, 162), "The Bucks,", font=head, fill="white")
    d.text((76, 254), "by the numbers", font=head, fill="white")

    sub = font(public_sans, 29, weight=400)
    d.text((80, 396), "Live scores & standings · the season race chart ·", font=sub, fill=MUTED)
    d.text((80, 438), "schedule & team leaders — updated all season long", font=sub, fill=MUTED)

    # WPR logo on a white chip, bottom-left.
    logo_w = 300
    logo_h = round(logo.height * logo_w / logo.width)
    logo = logo.resize((logo_w, logo_h), Image.LANCZOS)
    pad = 16
    chip = Image.new("RGBA", (logo_w + pad * 2, logo_h + pad * 2), (255, 255, 255, 255))
    mask = Image.new("L", chip.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, chip.width, chip.height], radius=12, fill=255)
    img.paste(chip, (78, 630 - chip.height - 52), mask)
    img.paste(logo, (78 + pad, 630 - chip.height - 52 + pad), logo)

    img.save(OG_OUT, "PNG")
    print(f"wrote {OG_OUT} ({OG_OUT.stat().st_size // 1024} KB)")


def touch_icon():
    # Render at 4x and downsample for smooth seams at 180px.
    big = Image.new("RGB", (720, 720), GREEN)
    ImageDraw.Draw(big).rectangle([0, 0, 720, 14], fill=GREEN)  # solid field, Apple rounds the corners
    basketball(big, 360, 360, 240, 20)
    icon = big.resize((180, 180), Image.LANCZOS)
    icon.save(ICON_OUT, "PNG")
    print(f"wrote {ICON_OUT} ({ICON_OUT.stat().st_size // 1024} KB)")


def main():
    fraunces = fetch(FRAUNCES)
    public_sans = fetch(PUBLIC_SANS)
    logo = Image.open(io.BytesIO(fetch(WPR_LOGO))).convert("RGBA")
    OG_OUT.parent.mkdir(exist_ok=True)
    og_card(fraunces, public_sans, logo)
    touch_icon()


if __name__ == "__main__":
    main()
