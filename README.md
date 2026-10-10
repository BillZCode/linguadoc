# LinguaDoc — Universal Document Translator

> **Translate Documents. Preserve Every Detail.**
> A cross-platform, structure-preserving universal document translation application designed for digital literature, light novels, academic texts, and business documents across desktop, laptop, tablet, and mobile.

---

## 📖 Overview

Standard document translation tools often extract raw text, run it through a translator, and dump it into an unstructured file. This ruins chapter flow, breaks table formatting, strips inline illustrations, and displaces dialogues.

**LinguaDoc** solves this with a **Structure-Preserving Translation Pipeline**:
1. Documents are decomposed into an internal Abstract Syntax Tree (**DocumentTree**) with ordered structural blocks.
2. Every heading, paragraph, dialogue, table cell, inline illustration, caption, ruby annotation, and page break receives a locked sequence index and a stable ID (`#node_xxx`).
3. Only translatable textual content is translated. Technical IDs, URLs, formula syntax (`=SUM`), code blocks, and binary image assets are protected.
4. Translated content is injected back into the exact original DOM/AST positions.
5. A comprehensive **Structural Verification Audit** verifies that 100% of blocks and media remain in place before export.

---

## 🌟 Key Features

- **Novel & Digital Book Optimization (EPUB 2 / 3)**:
  - Preserves spine reading order, chapter breaks, Table of Contents (`toc.ncx` / `nav.xhtml`).
  - Keeps illustrations in their exact positions between paragraphs.
  - Preserves Japanese ruby annotations (`<ruby><rb>漢字</rb><rt>かんじ</rt></ruby>`) and dialogue quotation brackets (`「...」`).
  - Supports **Bilingual Output Mode**: original text followed by translated text directly in the e-book.
- **Office & Document Suite**:
  - **DOCX**: Preserves run-level styles (bold, italic, colors), tables, headings, and embedded images.
  - **PDF**: PyMuPDF-powered text bounding box in-place redaction and auto-fitting text insertion.
  - **Markdown**: Frontmatter, tables, and code blocks (` ```python `) strictly protected from translation.
  - **Spreadsheets (XLSX, CSV)**: Formula-safe (`=A1*B1` untouched), numerical cells untouched; translates only human text labels.
  - **Subtitles (SRT, VTT)**: Exact cue sequence and millisecond timestamps (`00:01:23,456 --> 00:01:25,789`) preserved.
  - **Data (JSON, XML)**: Keys, tags, attributes, and hierarchy preserved; only string values translated.
- **Provider-Based Translation Architecture**:
  - **Google Gemini API**: Native `gemini-2.5-flash` / `gemini-1.5-flash` with structured JSON output and placeholder protection.
  - **Anthropic Claude API**: Claude 3.5 Sonnet / Haiku integration.
  - **OpenAI / DeepSeek / Ollama**: Compatible chat completion endpoint for local/self-hosted or cloud LLMs.
  - **Transparent DEMO Mode**: Realistic contextual simulation with real lexical transformations, custom glossaries, tone variation, and explicit `[DEMO MOCK]` tagging.
- **Modern Anthropic-Inspired UI/UX**:
  - Editorial typography (Newsreader serif + Plus Jakarta Sans).
  - Warm stone light mode & obsidian dark mode.
  - Dual-Pane Side-by-Side Document Reader with synchronized scrolling, block highlight links, and inline illustrations.
  - **Graphify AST Inspector**: Visual hierarchical tree showing Document -> Chapters -> Structural Blocks with sequence IDs.
  - **PWA Ready**: Installable to desktop, iOS, and Android home screens.

---

## 🏗️ 10-Stage Structure-Preserving Translation Pipeline

| Stage | Name | Description |
|---|---|---|
| **1** | **File Security & MIME Validation** | Checks magic bytes, validates against ZIP bombs and path traversal attacks. |
| **2** | **Structure Extraction** | Parses internal document DOM, spine, XML packages, and media assets. |
| **3** | **IR Tree Construction** | Builds unified `DocumentTree` with typed nodes (`Heading`, `Paragraph`, `Dialogue`, `Image`, `Table`). |
| **4** | **Stable Block Indexing** | Assigns deterministic `sequence_index` and unique UUIDs (`#node_xxx`). |
| **5** | **Semantic Chunking** | Groups blocks into context-aware translation batches with chapter boundaries. |
| **6** | **Order-Preserving Translation** | Translates text via selected engine while strictly protecting code, formulas, and URLs. |
| **7** | **Position Re-injection** | Re-injects translated text into exact original node positions. |
| **8** | **Document Reconstruction** | Rebuilds the target file format (or bilingual output) with valid stylesheets and packaging. |
| **9** | **Structural Audit** | Compares source vs target block count, asset retention, and sequence order. |
| **10** | **Preview & Export** | Side-by-side verification and downloadable output with structural audit report. |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.12+** (managed via `uv` or standard Python virtual environment)
- **Node.js 20+** and **npm**

### 1. Setting Up the Backend
```bash
cd scratch/linguadoc/backend

# Create virtual environment with uv or python3
uv venv .venv --python 3.12

# Install dependencies
uv pip install --python .venv/bin/python \
  fastapi "uvicorn[standard]" pydantic python-multipart \
  python-docx ebooklib beautifulsoup4 lxml pymupdf \
  python-pptx openpyxl httpx pytest reportlab pillow google-genai

# Run automated test suite
PYTHONPATH=. .venv/bin/pytest tests/ -v

# Start FastAPI server
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

### 2. Setting Up the Frontend
```bash
cd scratch/linguadoc/frontend

# Install dependencies
npm install

# Start development server
npm run dev -- --host 127.0.0.1 --port 5173
```

Open your browser at **`http://localhost:5173`** (atau **`http://127.0.0.1:8000`** dalam mode produksi mandiri).

---

## 📱 & 🖥️ Peluncuran & Distribusi Multi-Platform (Windows, Linux, Mobile)

LinguaDoc siap digunakan secara instan di berbagai sistem operasi:

### 1. 🪟 Windows Desktop
- **1-Click Launcher**: Cukup klik dua kali berkas **`run-windows.bat`**.
- **Instalasi PWA**: Buka `http://127.0.0.1:8000` di Edge/Chrome, klik ikon *Install App* di address bar.
- **Kompilasi Installer .exe**: Jalankan `npm run build:win` di folder `electron/`.

### 2. 🐧 Linux Desktop
- **1-Click Launcher**: Jalankan `./run-linux.sh`. Skrip otomatis mendaftarkan LinguaDoc ke menu desktop Linux (`.desktop` application shortcut).
- **Kompilasi .AppImage / .deb**: Jalankan `npm run build:linux` di folder `electron/`.

### 3. 🤖 Android & 🍏 iOS (Mobile)
- **Instalasi PWA Instan (Tanpa APK)**: Buka LinguaDoc di Chrome Android atau Safari iOS, tekan menu lalu pilih **"Tambahkan ke Layar Utama" / "Install App"**.
- **Native Android Studio Project**: Jalankan `./package-mobile.sh` untuk sinkronisasi Capacitor ke folder `frontend/android/`.

> 📖 **Panduan Lengkap:** Lihat [DISTRIBUTION_GUIDE.md](file:///home/sabbil/.gemini/antigravity-ide/scratch/linguadoc/DISTRIBUTION_GUIDE.md) untuk detail langkah demi langkah.


---

## 🧪 Automated Testing

LinguaDoc includes comprehensive automated tests covering all core document formats:
```bash
cd scratch/linguadoc/backend
PYTHONPATH=. .venv/bin/pytest tests/ -v
```

Tests included:
- `test_epub_structure_preservation`: Validates Japanese light novel with 2 chapters, 2 illustrations, ruby annotations, and dialogue tags.
- `test_docx_structure_preservation`: Validates Word documents with formatted runs, headings, and tables.
- `test_markdown_preservation`: Validates code block protection and table cell preservation.
- `test_subtitle_preservation`: Validates timestamp synchronicity and cue numbering.
- `test_pdf_processor`: Validates PDF page extraction and text block replacement.
- `test_xlsx_formula_protection`: Validates spreadsheet formula (`=B2*C2`) and numerical value protection.
- `test_security_validation`: Verifies rejection of corrupted files and directory traversal hazards.

---

## 🔒 Security & Privacy

1. **Path Traversal & ZIP Bomb Protection**: All archives are verified for compression ratios (`< 100x`) and total uncompressed size (`< 500 MB`). Malicious relative paths (`../`) are rejected.
2. **Local Credential Storage**: AI API keys are stored exclusively in the user's browser session / localStorage and sent directly in HTTP authorization headers. They are never committed or logged.
3. **No Training on User Data**: In DEMO mode and private API modes, documents are never collected for AI model training.
4. **Temporary File Lifecycle**: Temporary files are stored in `backend/storage/` and automatically deleted upon job removal.

---

## 📁 Recommended Workspace Directory

For the best experience in your IDE, set your active workspace to:
```
/home/sabbil/.gemini/antigravity-ide/scratch/linguadoc
```
