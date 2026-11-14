import os
from PIL import Image, ImageDraw, ImageFont

def create_clipmaster_icon(output_path: str):
    size = 256
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rectangle background: dark obsidian / charcoal (#0d0d12)
    # with smooth glowing purple border
    pad = 12
    radius = 56
    bg_color = (13, 13, 18, 255)
    border_color = (168, 85, 247, 255)  # purple-500
    glow_color = (147, 51, 234, 180)    # purple-600

    # Draw outer glow
    draw.rounded_rectangle(
        [pad - 4, pad - 4, size - pad + 4, size - pad + 4],
        radius=radius + 4,
        outline=glow_color,
        width=4
    )

    # Draw main background
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=radius,
        fill=bg_color,
        outline=border_color,
        width=6
    )

    # Draw stylized scissors / play emblem
    # 1. Scissor finger rings (left side)
    ring_color = (216, 180, 254, 255)  # purple-300
    blade_color = (255, 255, 255, 255)  # pure white
    accent_purple = (168, 85, 247, 255)

    # Top ring
    draw.ellipse([54, 60, 96, 102], outline=ring_color, width=7)
    # Bottom ring
    draw.ellipse([54, 154, 96, 196], outline=ring_color, width=7)

    # Scissor blades crossing at center (128, 128)
    draw.line([(88, 88), (128, 128)], fill=ring_color, width=8)
    draw.line([(88, 168), (128, 128)], fill=ring_color, width=8)

    # Hinge rivet
    draw.ellipse([120, 120, 136, 136], fill=accent_purple, outline=blade_color, width=2)

    # Blades extending towards right
    draw.line([(128, 128), (196, 76)], fill=blade_color, width=8)
    draw.line([(128, 128), (196, 180)], fill=blade_color, width=8)

    # Center Play triangle inside blade opening
    play_points = [(150, 114), (174, 128), (150, 142)]
    draw.polygon(play_points, fill=accent_purple)

    # "AI" badge at bottom right
    draw.rounded_rectangle([152, 180, 216, 214], radius=10, fill=(38, 18, 64, 255), outline=accent_purple, width=3)
    draw.text((164, 184), "AI", fill=(245, 245, 255, 255))

    # Save as .ico with multiple standard Windows sizes
    sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    img.save(output_path, format="ICO", sizes=sizes)
    print(f"Icon successfully generated at {output_path}")

if __name__ == "__main__":
    out = os.path.abspath("C:/Users/adeye/.gemini/antigravity/scratch/clipmaster-ai/clipmaster.ico")
    create_clipmaster_icon(out)
