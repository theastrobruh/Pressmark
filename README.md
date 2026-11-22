<div align="center">

<a href="https://theastrobruh.github.io/Pressmark/">
  <img src="assets/readme/pressmark-logo.svg" alt="Pressmark — Batch Watermark Studio" width="540"/>
</a>

<br/>

> **Batch watermark, resize, rename & convert your photos, GIFs and videos — entirely in the browser. No uploads. No backend. No tracking.**

[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)](https://github.com/theastrobruh/Pressmark/actions)
[![GitHub Pages](https://img.shields.io/badge/Live%20on-GitHub%20Pages-222?logo=github&logoColor=white)](https://theastrobruh.github.io/Pressmark/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](#-built-with)
[![Version](https://img.shields.io/badge/Version-v1.0.0-6366f1)](#)
[![License](https://img.shields.io/badge/License-MIT-22c55e)](#-license)
[![Ko-fi](https://img.shields.io/badge/Support-Ko--fi-FF5E5B?logo=ko-fi&logoColor=white)](https://ko-fi.com/theastrobruh)

<br/>

[**🖼️ Open Pressmark**](https://theastrobruh.github.io/Pressmark/) · [**🃏 Try CardGram**](https://theastrobruh.github.io/CardGram/) · [**☕ Support the Project**](https://ko-fi.com/theastrobruh)

</div>

---

## 🤖 Meet the Team — AI-Powered Development

Pressmark is built by **[theAstroBruh](https://github.com/theastrobruh)** (Creative Director & CEO) alongside **three AI agents** that act as a real dev crew:

| | Agent | Role | Personality |
|---|---|---|---|
| 🔷 | **Gemini** | Lead Engineer & Architect | The meticulous one. Designs the Canvas rendering pipeline, catches edge cases, obsesses over pixel accuracy. |
| 🔶 | **DeepSeek** | Senior Developer & UX Strategist | The sharp executive. Cuts through complexity, ships the export engine fast, keeps the UI intuitive. |
| ⬜ | **MiMo** | Junior Dev & QA Intern | The everyday dev. Runs the checks, hunts down format bugs, learns something new every sprint. |

> *Every feature, every pixel, every line of code — crafted through human vision + AI collaboration.*

---

## ✨ What is Pressmark?

A **fully client-side** creative studio for photographers, designers, and content creators. Drop your images, GIFs, or videos, design your watermark layer by layer, configure output format and social resize presets, then export — individually or as a batch ZIP. The Canvas API does all the work locally. Nothing leaves your machine.

---

## 🆕 What's in v1.0.0

| | Feature | Details |
|---|---|---|
| 🎨 | **Multi-layer watermarks** | Stack text, image placeholder and badge layers independently |
| 📐 | **Social resize presets** | Instagram, Reels/TikTok, YouTube, X, LinkedIn, OpenGraph, Web hero |
| 🔄 | **Format conversion** | JPEG, PNG, WebP — or keep the original |
| 📛 | **Bulk rename engine** | Pattern tokens, counters, prefix/suffix, case transforms |
| 💾 | **Preset system** | Save, import and export your full watermark setups as JSON |
| 🧩 | **Badge layers** | Exif bar, copyright ring and other decorative stamp styles |
| ⚡ | **Sync / per-item mode** | One watermark for all files, or a unique setup per image |
| 📦 | **ZIP batch export** | Download all watermarked files in a single archive |
| 🌙 | **Dark studio UI** | Polished zero-eyestrain interface, no light theme toggle needed |

---

## 🎴 Two Workspaces, One Studio

### 🖼️ Watermark Inspector — Layer-by-Layer Control

<table>
<tr>
<td width="50%">

#### ✍️ Text Layers
- **17 Google Fonts** — Sans, Serif, Display, Script and Mono categories
- **Full typography control** — weight, italic, letter-spacing, color
- **Shadow & stroke** — independent blur, color and width controls
- **Backdrop box** — pill or rectangle fill behind the text, with radius and opacity

#### 🧩 Badge Layers
- **Exif Bar** — cinematic metadata strip across the bottom
- **Copyright Ring** — circular stamp perfect for portfolio images
- **Custom copy** — primary and secondary text fields per badge

</td>
<td width="50%">

#### 🗺️ Placement Modes
- **Single** — precise XY position on the canvas
- **Tiled** — full-image diagonal repeat grid with spacing and angle control
- **Corners** — four-corner simultaneous stamp
- **Custom Area** — restrict any mode to a user-drawn safe zone

#### 🔧 Global Controls
- **Scale, Rotation, Opacity** — per-layer with live preview
- **Blend Mode** — standard Canvas compositing modes
- **Visibility toggle** — non-destructive layer hiding
- **Layer duplication** — clone and offset in one click

</td>
</tr>
</table>

### 📐 Resize & Format Panel — Output Ready for Every Platform

<table>
<tr>
<td width="50%">

**📱 Social Presets** — Tap a platform and the canvas snaps to the exact pixel dimensions your post needs. All presets use Cover, Contain or Max-width fitting so your image is never distorted.

| Preset | Dimensions | Fit |
|---|---|---|
| Instagram Square | 1080 × 1080 | Cover |
| Instagram Portrait | 1080 × 1350 | Cover |
| Reels / TikTok / Stories | 1080 × 1920 | Cover |
| X / Landscape | 1600 × 900 | Cover |
| YouTube Thumbnail | 1280 × 720 | Cover |
| LinkedIn / OpenGraph | 1200 × 628 | Cover |
| Web Hero Downscale | 1920w max | Max-width |
| Web Card / Blog Thumb | 800w max | Max-width |

</td>
<td width="50%">

**🔄 Format & Quality** — Export the whole queue to a different format without touching the originals.

- **JPEG** — Adjustable quality slider + fill color for transparent sources
- **PNG** — Lossless with full alpha support
- **WebP** — Best compression for the web
- **Original** — Pass-through; keeps every file in its native format

**🔒 Aspect Lock** — Enable to keep proportions when typing custom dimensions.

**🎨 Background fill** — Set the letterbox / canvas color for Contain mode.

</td>
</tr>
</table>

---

## 💾 More Features

| Category | Details |
|---|---|
| 🎭 **Built-in Presets** | *Subtle Corner Signature*, *Diagonal Client Proof*, *Editorial Serif Mark*, *Dual Corner Protection* |
| 💿 **Custom Presets** | Save any layer stack + resize + format config under a name; export/import as JSON |
| 📛 **Rename Tokens** | `{name}`, `{n}`, `{ext}`, `{w}`, `{h}`, `{preset}` — combine freely in any pattern |
| 🔁 **Last Placed** | Restore the exact watermark configuration from your previous session in one click |
| 🗑️ **Sample Media** | Three bundled editorial photos let you test the studio before uploading anything |
| 🔒 **Offline-First** | Runs from `file://` or any static host — no backend, no API keys, no tracking |
| 🧠 **LocalStorage** | Presets and last-placed state persist across sessions with no account required |

---

## 🗺️ Roadmap

| Phase | Status | What's Coming |
|---|---|---|
| **Watermark Engine** | ✅ Done | Text, badge, placement modes, blend, shadow, stroke, box |
| **Batch Queue** | ✅ Done | Multi-file queue, sync/per-item toggle, sample media |
| **Resize & Format** | ✅ Done | Social presets, custom dimensions, JPEG/PNG/WebP |
| **Bulk Rename** | ✅ Done | Pattern tokens, counter, prefix/suffix, case transforms |
| **Preset System** | ✅ Done | Save, import, export, delete, last-placed restore |
| **Image Watermark Layer** | 🔧 Active | Upload a logo PNG and stamp it like a text layer |
| **Video Export** | 🚧 Planned | Frame-by-frame watermarking for MP4/WebM |
| **Custom Badge Designer** | ✨ Future | Build your own badge shapes in-app |
| **Keyboard Shortcuts** | ✨ Future | Power-user shortcut panel |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|:---:|:---|
| `W` | Switch to Watermark tab |
| `R` | Switch to Resize & Format tab |
| `N` | Switch to Bulk Rename tab |
| `E` | Switch to Export tab |
| `Del` | Remove active layer (when inspector is focused) |

---

## 🚀 Get Started

### Online (Recommended)

👉 **[Open Pressmark](https://theastrobruh.github.io/Pressmark/)** — Drop your images → Design your watermark → Export.

### Local Development

```bash
git clone https://github.com/theastrobruh/Pressmark.git
cd Pressmark
```

| Method | Command |
|---|---|
| 🫙 Bun | `bun install` → `bun run dev` |
| 📦 npm | `npm install` → `npm run dev` |

Then open [http://localhost:3000](http://localhost:3000).

---

## 🏗️ Build

```bash
# Local / AI Studio build
bun run build

# GitHub Pages build (sets /Pressmark/ base path automatically)
bun run build:gh-pages
```

Output lands in `dist/`. Preview with `bun run preview`.

---

## 🗂️ Project Structure

```
Pressmark/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions → GitHub Pages
├── public/
│   └── 404.html                    # SPA fallback for GitHub Pages routing
├── assets/
│   └── readme/                     # Logo and banner art for this README
├── src/
│   ├── assets/
│   │   └── images/                 # Bundled editorial sample photos
│   ├── components/
│   │   ├── BatchExportWorkspace.tsx # Batch ZIP export UI + progress
│   │   ├── BulkRenameWorkspace.tsx  # Pattern-based rename preview
│   │   ├── InteractiveStage.tsx     # Live canvas preview with drag handles
│   │   ├── MediaQueueSidebar.tsx    # File queue, upload, sync toggle
│   │   ├── ResizeFormatPanel.tsx    # Social presets + format controls
│   │   ├── TopBar.tsx               # Tab navigation + quick export
│   │   └── WatermarkInspector.tsx   # Layer stack, typography, badge controls
│   ├── constants/
│   │   └── presets.ts              # Built-in presets, font list, sample media
│   ├── types/
│   │   └── studio.ts               # Shared TypeScript interfaces
│   ├── utils/
│   │   ├── canvasRenderer.ts        # Core Canvas API rendering engine
│   │   ├── mediaExporter.ts         # ZIP builder + single-file download helpers
│   │   └── storage.ts               # LocalStorage persistence for presets
│   ├── App.tsx                      # Root component + all state orchestration
│   ├── index.css                    # Tailwind base + custom global styles
│   └── main.tsx                     # React entry point
├── index.html                       # App shell + font preloads
├── vite.config.ts                   # Build config — detects GITHUB_PAGES env
├── tsconfig.json
└── package.json
```

---

## 🛠️ Built With

| Tech | Purpose |
|---|---|
| **[React 19](https://react.dev/)** | Component model and state |
| **[TypeScript 7](https://www.typescriptlang.org/)** | Type safety across the whole codebase |
| **[Tailwind CSS 4](https://tailwindcss.com/)** | Utility-first dark-studio styling |
| **[Vite 8](https://vite.dev/)** | Dev server, HMR and optimized build |
| **HTML5 Canvas API** | Frame-by-frame watermark rendering |
| **[gifuct-js](https://github.com/matt-way/gifuct-js)** | GIF frame decoding |
| **[gifenc](https://github.com/mattdesl/gifenc)** | GIF re-encoding after watermark |
| **[JSZip](https://stuk.github.io/jszip/)** | In-browser ZIP bundling |
| **[Motion](https://motion.dev/)** | UI micro-animations |
| **[Lucide React](https://lucide.dev/)** | Icon set |
| **Gemini + DeepSeek + MiMo** | AI-assisted development crew |

---

## ⚙️ GitHub Pages Deployment

The repo ships with a ready-to-use GitHub Actions workflow. To activate it on your fork:

1. Go to your repo → **Settings → Pages**
2. Under **Source**, select **GitHub Actions**
3. Push to `main` — the workflow builds and deploys automatically

Your live URL will be:
```
https://<your-username>.github.io/Pressmark/
```

> `vite.config.ts` reads `GITHUB_PAGES=true` from the CI environment to set the correct `/Pressmark/` base path automatically. Local dev always runs from `/`.

---

## ☕ Support Pressmark

Pressmark is **free, open-source, and built in the open.** If it saves you time, protects your work, or just makes your creative flow smoother — consider fueling the next feature:

<div align="center">

[![Ko-fi](https://img.shields.io/badge/☕%20Buy%20us%20a%20Coffee-Ko--fi-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/theastrobruh)

*Every coffee helps theAstroBruh (and the AI crew 🤖) ship the next update faster.*

</div>

---

## 📄 License

MIT © 2026 — Free to use, modify, and share. Just don't strip the attribution from your watermarked photos. 😄

---

<div align="center">

*Made with ♥ by theAstroBruh + Gemini + DeepSeek + MiMo*

</div>
