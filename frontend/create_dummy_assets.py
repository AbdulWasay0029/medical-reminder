import os

img_dir = "assets/images"
os.makedirs(img_dir, exist_ok=True)

png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0bIDAT\x08\x99c\xf8\x0f\x04\x00\x09\xfb\x03\xfd\xe3U\xf2\x9c\x00\x00\x00\x00IEND\xaeB`\x82'

files = [
    "icon.png",
    "adaptive-icon.png",
    "favicon.png",
    "splash-icon.png",
    "notification-icon.png"
]

for file in files:
    with open(os.path.join(img_dir, file), "wb") as f:
        f.write(png_data)

print("Images created safely!")
