import subprocess
import os

html_path = os.path.abspath('slide/assets/test_render.html')
png_path = os.path.abspath('slide/assets/test_render.png')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write('''<!DOCTYPE html>
<html>
<head>
<style>
  body { margin: 0; background: #080C09; color: #F8D161; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; }
  h1 { font-size: 48px; border: 2px solid #F8D161; padding: 20px 40px; border-radius: 8px; }
</style>
</head>
<body>
  <h1>TEST ARCHITECTURE RENDER</h1>
</body>
</html>''')

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
cmd = [
    chrome_path,
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    f'--screenshot={png_path}',
    '--window-size=1920,1080',
    f'file:///{html_path.replace(os.sep, "/")}'
]

res = subprocess.run(cmd, capture_output=True, text=True)
print("Return code:", res.returncode)
print("PNG exists:", os.path.exists(png_path), "Size:", os.path.getsize(png_path) if os.path.exists(png_path) else 0)

if os.path.exists(html_path):
    os.remove(html_path)
if os.path.exists(png_path):
    os.remove(png_path)
