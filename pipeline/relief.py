"""
The map's painted relief: Natural Earth I with Shaded Relief, Water and Drainages
(NE1_HR_LC_SR_W_DR, version 2.0.0, public domain), cut to the Bible world and
re-projected to Web Mercator so it lines up exactly with the map's coastline and places.

    python3 pipeline/relief.py <path to NE1_HR_LC_SR_W_DR.zip or its unpacked .tif>

The download is pinned below by its sha256; anything else is refused. Output, committed:
    data/raw/relief/bible-world.jpg   the image (about 3 MB)
    data/raw/relief/bible-world.json  its bounds, source and checksums
Needs Pillow and NumPy. Nothing is drawn or edited by hand.
"""
import hashlib, json, math, os, sys, zipfile, io

from PIL import Image
import numpy as np

SOURCE = {
    "name": "Natural Earth I with Shaded Relief, Water, and Drainages (high resolution)",
    "url": "https://naciscdn.org/naturalearth/10m/raster/NE1_HR_LC_SR_W_DR.zip",
    "version": "2.0.0",
    "sha256": "8841d08155415f0556462846dcb845a4ccb8f12390b0e0ba36ffde55efadeb56",
    "licence": "Public domain (Natural Earth terms of use)",
}
# The Bible world: Rome and Greece in the west to Persia in the east, Anatolia to Arabia.
WEST, EAST, SOUTH, NORTH = 8.0, 62.0, 12.0, 46.0
PX_PER_DEG = 60  # the source has one pixel per arc-minute
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "raw", "relief")


def load(path):
    Image.MAX_IMAGE_PIXELS = None
    if path.endswith(".zip"):
        digest = hashlib.sha256(open(path, "rb").read()).hexdigest()
        if digest != SOURCE["sha256"]:
            sys.exit(f"sha256 mismatch: expected {SOURCE['sha256']}, got {digest}")
        with zipfile.ZipFile(path) as z:
            return Image.open(io.BytesIO(z.read("NE1_HR_LC_SR_W_DR.tif")))
    return Image.open(path)


def merc(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def main(path):
    img = load(path)
    # The source covers 180°W..180°E, 90°N..90°S in plate carrée.
    x0, x1 = round((WEST + 180) * PX_PER_DEG), round((EAST + 180) * PX_PER_DEG)
    y0, y1 = round((90 - NORTH) * PX_PER_DEG), round((90 - SOUTH) * PX_PER_DEG)
    src = np.asarray(img.crop((x0, y0, x1, y1)).convert("RGB"), dtype=np.float32)
    w = x1 - x0
    # Web Mercator stretches rows towards the poles; resample each row from its latitude.
    ym, yM = merc(SOUTH), merc(NORTH)
    h = round((yM - ym) / math.radians(EAST - WEST) * w)
    rows = np.empty((h, w, 3), dtype=np.float32)
    for r in range(h):
        y = yM - (r + 0.5) / h * (yM - ym)
        lat = math.degrees(2 * math.atan(math.exp(y)) - math.pi / 2)
        f = (NORTH - lat) * PX_PER_DEG - 0.5
        i = min(max(int(math.floor(f)), 0), src.shape[0] - 2)
        t = min(max(f - i, 0.0), 1.0)
        rows[r] = src[i] * (1 - t) + src[i + 1] * t
    out = Image.fromarray(np.clip(rows + 0.5, 0, 255).astype(np.uint8))
    os.makedirs(OUT, exist_ok=True)
    jpg = os.path.join(OUT, "bible-world.jpg")
    out.save(jpg, "JPEG", quality=82, optimize=True, progressive=True)
    meta = {
        "source": SOURCE,
        "bounds": [[SOUTH, WEST], [NORTH, EAST]],
        "size": [w, h],
        "projection": "Web Mercator (EPSG:3857), resampled row by row from the source's plate carrée",
        "sha256": hashlib.sha256(open(jpg, "rb").read()).hexdigest(),
    }
    json.dump(meta, open(os.path.join(OUT, "bible-world.json"), "w"), indent=1)
    print(f"wrote {jpg} {w}x{h} {os.path.getsize(jpg) // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1])
