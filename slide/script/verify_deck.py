import re
import os
import pptx

with open('slide/index.html', encoding='utf-8') as f:
    html = f.read()

# In HTML, let's find all slide titles or slide comments
html_titles = re.findall(r'<h1 class="slide-title">([^<]+)</h1>', html)
print(f"HTML slide-title count: {len(html_titles)}")
for idx, title in enumerate(html_titles):
    print(f"  HTML Slide {idx+1}: {title.strip()}")

# Also check hero / title slide in HTML
hero_titles = re.findall(r'<h1 class="hero-title">([^<]+)</h1>', html)
print(f"HTML hero-title count: {len(hero_titles)}")
for h in hero_titles:
    print(f"  Hero Title: {h.strip()}")

# Total HTML slides
all_slides = re.findall(r'<section class="slide', html)
print(f"\nTotal <section class=\"slide\": {len(all_slides)}")

prs = pptx.Presentation('slide/superapp_presentation_updated.pptx')
print(f"\nPPTX Total slides: {len(prs.slides)}")
for idx, s in enumerate(prs.slides):
    slide_title = ""
    for shp in s.shapes:
        if shp.has_text_frame:
            for p in shp.text_frame.paragraphs:
                text = p.text.strip()
                if p.runs and p.runs[0].font.size and p.runs[0].font.size.pt >= 18:
                    slide_title = text
                    break
            if slide_title:
                break
    print(f"  PPTX Slide {idx+1}: {slide_title}")
