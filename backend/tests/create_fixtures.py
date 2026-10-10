"""
Generate test fixtures for LinguaDoc test suite.
Creates realistic EPUB, DOCX, Markdown, and SRT files with complex structural elements.
"""

import os
import zipfile
import docx
from PIL import Image, ImageDraw

FIXTURES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")
os.makedirs(FIXTURES_DIR, exist_ok=True)


def create_sample_image(path: str, text: str, color=(79, 70, 229)):
    """Creates a sample test PNG image with text label."""
    img = Image.new("RGB", (400, 250), color=color)
    draw = ImageDraw.Draw(img)
    draw.rectangle([10, 10, 390, 240], outline=(255, 255, 255), width=2)
    draw.text((40, 110), text, fill=(255, 255, 255))
    img.save(path, format="PNG")


def create_sample_epub(output_path: str):
    """
    Creates a valid Japanese light novel EPUB containing:
    - Chapter 1 with Paragraphs, Illustration A, Caption A, Dialogue, Illustration B, Paragraph
    - Chapter 2
    - Ruby annotations
    - Spine and manifest order
    """
    img_a_path = os.path.join(FIXTURES_DIR, "illus_a.png")
    img_b_path = os.path.join(FIXTURES_DIR, "illus_b.png")
    create_sample_image(img_a_path, "ILLUSTRATION A: Castle Gate", color=(59, 130, 246))
    create_sample_image(img_b_path, "ILLUSTRATION B: Hero & Dragon", color=(239, 68, 68))
    
    with open(img_a_path, "rb") as f:
        img_a_bytes = f.read()
    with open(img_b_path, "rb") as f:
        img_b_bytes = f.read()
        
    ch1_html = """<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>第一章 旅立ち</title></head>
<body>
  <h1>第一章 旅立ちの朝</h1>
  <p>冷たい風が城塞の城壁を吹き抜けていた。</p>
  <figure>
    <img src="../images/illus_a.png" alt="城門の風景" />
    <figcaption>図1.1 朝霧に煙る城門</figcaption>
  </figure>
  <p>「準備はできたか、<ruby><rb>勇者</rb><rt>ゆうしゃ</rt></ruby>よ」と老騎士が尋ねた。</p>
  <figure>
    <img src="../images/illus_b.png" alt="ドラゴンとの対峙" />
    <figcaption>図1.2 古代の守護竜</figcaption>
  </figure>
  <p>彼らは静かに頷き、遥かなる荒野へと歩みを進めた。</p>
</body>
</html>"""

    ch2_html = """<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>第二章 運命の出会い</title></head>
<body>
  <h1>第二章 運命の出会い</h1>
  <p>森の奥深くで、青い瞳の少女が彼らを待っていた。</p>
  <p>「この先には危険が満ちています」彼女は警告した。</p>
</body>
</html>"""

    content_opf = """<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>異世界の冒険録</dc:title>
    <dc:creator>山田 太郎</dc:creator>
    <dc:language>ja</dc:language>
    <dc:identifier id="BookId">urn:uuid:12345678-abcd-ef01-2345-6789abcdef01</dc:identifier>
  </metadata>
  <manifest>
    <item id="ch1" href="text/ch1.xhtml" media-type="application/xhtml+xml" />
    <item id="ch2" href="text/ch2.xhtml" media-type="application/xhtml+xml" />
    <item id="img_a" href="images/illus_a.png" media-type="image/png" />
    <item id="img_b" href="images/illus_b.png" media-type="image/png" />
  </manifest>
  <spine>
    <itemref idref="ch1" />
    <itemref idref="ch2" />
  </spine>
</package>"""

    container_xml = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>"""

    with zipfile.ZipFile(output_path, "w") as z:
        # mimetype must be first uncompressed
        z.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        z.writestr("META-INF/container.xml", container_xml)
        z.writestr("OEBPS/content.opf", content_opf)
        z.writestr("OEBPS/text/ch1.xhtml", ch1_html)
        z.writestr("OEBPS/text/ch2.xhtml", ch2_html)
        z.writestr("OEBPS/images/illus_a.png", img_a_bytes)
        z.writestr("OEBPS/images/illus_b.png", img_b_bytes)


def create_sample_docx(output_path: str):
    """Creates a sample DOCX with paragraphs, headings, formatting runs, and tables."""
    doc = docx.Document()
    doc.add_heading("Technical Specification: Universal Translator", level=1)
    
    p1 = doc.add_paragraph()
    r1 = p1.add_run("This document defines the ")
    r2 = p1.add_run("core pipeline architecture")
    r2.bold = True
    r3 = p1.add_run(" for LinguaDoc.")
    
    doc.add_paragraph("「We must guarantee zero data loss,」 said the lead architect.")
    
    # Add a table
    table = doc.add_table(rows=3, cols=2)
    table.rows[0].cells[0].text = "Component"
    table.rows[0].cells[1].text = "Responsibility"
    table.rows[1].cells[0].text = "DocumentTree"
    table.rows[1].cells[1].text = "Preserves structural element order"
    table.rows[2].cells[0].text = "Validator"
    table.rows[2].cells[1].text = "Verifies block fidelity and diffs"
    
    doc.save(output_path)


def create_sample_markdown(output_path: str):
    """Creates a sample Markdown document with codeblocks and tables."""
    content = """---
title: Project Documentation
author: LinguaDoc Team
---

# Architecture Overview

This is an introductory paragraph explaining the universal document translation engine.

```python
# Untranslatable code block
def calculate_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
```

## Preserved Features

| Feature | Status |
| --- | --- |
| EPUB Spine | Supported |
| DOCX Tables | Supported |

![System Architecture](https://example.com/arch.png)

> 「Structure preservation is paramount!」
"""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)


def create_sample_srt(output_path: str):
    """Creates a sample SRT subtitle file."""
    content = """1
00:00:01,500 --> 00:00:04,200
Halo, selamat datang di LinguaDoc.

2
00:00:05,000 --> 00:00:08,500
Sistem ini mempertahankan struktur dan urutan dokumen Anda.

3
00:00:09,100 --> 00:00:12,000
Nikmati hasil terjemahan berkualitas tinggi!
"""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)


if __name__ == "__main__":
    epub_path = os.path.join(FIXTURES_DIR, "sample_light_novel.epub")
    docx_path = os.path.join(FIXTURES_DIR, "sample_spec.docx")
    md_path = os.path.join(FIXTURES_DIR, "sample_readme.md")
    srt_path = os.path.join(FIXTURES_DIR, "sample_subs.srt")
    
    create_sample_epub(epub_path)
    create_sample_docx(docx_path)
    create_sample_markdown(md_path)
    create_sample_srt(srt_path)
    print("Test fixtures generated successfully in:", FIXTURES_DIR)
