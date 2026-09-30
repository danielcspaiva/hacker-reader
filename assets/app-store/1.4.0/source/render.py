#!/usr/bin/env python3
"""Compose App Store marketing images: caption + CSS device frame + raw simulator capture.

Usage: render.py spec.json OUT_DIR [id,id,...]
spec.json: {"targets": [{"name", "width", "height"}],
            "shots": [{"id", "raw", "raw_split"?, "theme": light|dark, "headline", "accent"?, "subline"}]}
"""
import json
import subprocess
import sys
import tempfile
import time
from html import escape
from pathlib import Path

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

THEMES = {
    "light": {"bg": "#F4F0EC", "wash": "rgba(255,122,24,0.10)", "fg": "#1F1B16", "muted": "#6A645A", "accent": "#A84700",
              "shadow": "rgba(60,45,20,0.22)"},
    "dark": {"bg": "#17130F", "wash": "rgba(255,122,24,0.15)", "fg": "#F3EDE3", "muted": "#A9A194", "accent": "#FF8F3D",
             "shadow": "rgba(0,0,0,0.6)"},
}

# iPhone 17 Pro Max raw capture geometry, in raw pixels.
RAW_W, RAW_H = 1320, 2868
SCREEN_CORNER = 186
BEZEL = 40
RIM = 9
ISLAND = (378, 111, 36)  # width, height, top


def html_for(shot, target):
    t = THEMES[shot["theme"]]
    W, H = target["width"], target["height"]
    device_top = H * 0.205
    screen_w = W * 0.80
    scale = screen_w / RAW_W
    screen_h = RAW_H * scale
    bezel, rim, corner = BEZEL * scale, RIM * scale, SCREEN_CORNER * scale
    outer_w = screen_w + 2 * (bezel + rim)
    outer_h = screen_h + 2 * (bezel + rim)
    left = (W - outer_w) / 2
    iw, ih, iy = (v * scale for v in ISLAND)

    headline = escape(shot["headline"])
    accent = shot.get("accent")
    if accent and escape(accent) in headline:
        headline = headline.replace(escape(accent), f'<span class="accent">{escape(accent)}</span>', 1)
    headline = headline.replace("|", "<br>")
    subline = escape(shot.get("subline", "")).replace("|", "<br>")

    rim_bg = (
        "linear-gradient(150deg,#FFA766 0%,#FF7A18 30%,#D25F0C 58%,#F99045 100%)"
        if shot["theme"] == "light"
        else "linear-gradient(150deg,#7C6D5E 0%,#453B32 40%,#2A241F 65%,#6A5D50 100%)"
    )
    raw = Path(shot["raw"]).resolve().as_uri()
    split = ""
    if shot.get("raw_split"):
        split = f'<img class="split" src="{Path(shot["raw_split"]).resolve().as_uri()}"><div class="seam"></div>'

    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
html,body {{ width:{W}px; height:{H}px; overflow:hidden; }}
body {{ background:{t['bg']}; position:relative; font-family:-apple-system,'SF Pro Display',system-ui,sans-serif; -webkit-font-smoothing:antialiased; }}
.wash {{ position:absolute; inset:0; background:radial-gradient(ellipse {W * 1.2}px {H * 0.6}px at 50% {H * 0.68}px, {t['wash']}, transparent 72%); }}
.cap {{ position:absolute; top:0; left:{W * 0.07}px; right:{W * 0.07}px; height:{device_top}px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding-top:{H * 0.012}px; }}
h1 {{ font-size:{W * 0.092}px; line-height:1.04; font-weight:700; letter-spacing:-0.025em; color:{t['fg']}; white-space:nowrap; }}
.accent {{ color:{t['accent']}; }}
p {{ margin-top:{W * 0.026}px; font-size:{W * 0.0385}px; line-height:1.28; font-weight:500; color:{t['muted']}; letter-spacing:-0.008em; white-space:nowrap; }}
.frame {{ position:absolute; left:{left}px; top:{device_top}px; width:{outer_w}px; height:{outer_h}px; border-radius:{corner + bezel + rim}px; background:{rim_bg}; padding:{rim}px;
  box-shadow: 0 {H * 0.014}px {H * 0.035}px {t['shadow']}; }}
.bezel {{ width:100%; height:100%; border-radius:{corner + bezel}px; background:#0A0908; padding:{bezel}px; }}
.screen {{ position:relative; width:{screen_w}px; height:{screen_h}px; border-radius:{corner}px; overflow:hidden; background:#000; }}
.screen img {{ position:absolute; inset:0; width:100%; height:100%; display:block; }}
.screen img.split {{ clip-path: polygon(64% 0, 100% 0, 100% 100%, 36% 100%); }}
.seam {{ position:absolute; inset:0; background:#FF7A18; clip-path: polygon(63.6% 0, 64.4% 0, 36.4% 100%, 35.6% 100%); }}
.island {{ position:absolute; background:#000; width:{iw}px; height:{ih}px; top:{iy}px; left:{(screen_w - iw) / 2}px; border-radius:{ih / 2}px; z-index:2; }}
</style></head><body>
<div class="wash"></div>
<div class="cap"><h1>{headline}</h1>{f'<p>{subline}</p>' if subline else ''}</div>
<div class="frame"><div class="bezel"><div class="screen"><img src="{raw}">{split}<div class="island"></div></div></div></div>
</body></html>"""


def render(shot, target, out_dir, index):
    html = html_for(shot, target)
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, dir=out_dir) as f:
        f.write(html)
        page = f.name
    out = Path(out_dir) / target["name"] / f"{index:02d}-{shot['id']}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        out.unlink()
    proc = subprocess.Popen(
        [
            CHROME,
            "--headless",
            "--user-data-dir=/tmp/hn-asc/chrome-profile",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-background-networking",
            "--disable-sync",
            "--disable-gpu",
            "--hide-scrollbars",
            "--allow-file-access-from-files",
            "--force-device-scale-factor=1",
            f"--window-size={target['width']},{target['height']}",
            f"--screenshot={out}",
            "--virtual-time-budget=3000",
            Path(page).as_uri(),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    # Chrome writes the PNG but does not always exit; wait for a stable file, then stop it.
    last = -1
    for _ in range(600):
        time.sleep(0.1)
        if out.exists():
            size = out.stat().st_size
            if size > 0 and size == last:
                break
            last = size
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
    Path(page).unlink()
    if not out.exists():
        raise RuntimeError(f"no screenshot for {out}")
    return out


def main():
    spec = json.loads(Path(sys.argv[1]).read_text())
    out_dir = sys.argv[2]
    only = sys.argv[3].split(",") if len(sys.argv) > 3 else None
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    for target in spec["targets"]:
        for i, shot in enumerate(spec["shots"], 1):
            if only and shot["id"] not in only:
                continue
            print(render(shot, target, out_dir, i))


if __name__ == "__main__":
    main()
