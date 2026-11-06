"""Turn the supplied character sheet into 8-frame transparent animation rows."""

from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/characters_source.png"
OUTPUT = ROOT / "src/assets/characters_atlas.png"
CELL_W, CELL_H = 180, 160
X_CUTS = [0, 155, 285, 420, 545, 675, 810, 975, 1122]
Y_CUTS = [0, 130, 230, 345, 455, 580, 695, 805, 910, 998, 1130, 1402]
CENTERS = [90, 223, 354, 487, 620, 752, 887, 1028]
FEET = [108, 207, 324, 434, 560, 670, 782, 885, 989, 1100, 1300]

sheet = Image.open(SOURCE).convert("RGB")
if sheet.size != (1122, 1402):
    raise ValueError(f"Unexpected character sheet size: {sheet.size}")

# The sheet has a nearly uniform dark backdrop; its subtle gradient is within 4 RGB levels.
red, green, blue = ImageChops.difference(sheet, Image.new("RGB", sheet.size, (31, 36, 43))).split()
distance = ImageChops.lighter(ImageChops.lighter(red, green), blue)
alpha = distance.point([max(0, min(255, round((value - 4) * 255 / 9))) for value in range(256)])
sheet.putalpha(alpha)

atlas = Image.new("RGBA", (CELL_W * 8, CELL_H * 11))
for row, foot in enumerate(FEET):
    for col, center in enumerate(CENTERS):
        left = max(X_CUTS[col], center - CELL_W // 2)
        right = min(X_CUTS[col + 1], center + CELL_W // 2)
        top = max(Y_CUTS[row], foot - CELL_H + 10)
        bottom = min(Y_CUTS[row + 1], foot + 10)
        frame = sheet.crop((left, top, right, bottom))
        if not frame.getchannel("A").getbbox():
            raise ValueError(f"Empty character frame at row {row}, column {col}")
        atlas.alpha_composite(frame, (col * CELL_W + CELL_W // 2 + left - center,
                                      row * CELL_H + CELL_H - 10 + top - foot))

atlas.save(OUTPUT, optimize=True)
print(f"Saved {OUTPUT} ({atlas.width} x {atlas.height})")
