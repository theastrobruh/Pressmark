<div align="center">

<!-- Animated SVG logo — cosmic stamp & pressmark core -->
<a href="https://theastrobruh.github.io/Pressmark/">
  <img src="public/assets/readme/pressmark-logo.svg" alt="Pressmark — Browser-Native Watermark, Background Removal & Media Studio" width="460"/>
</a>

<br/>

> **Fast, 100% client-side media preparation studio for creators and web developers. Add customizable watermarks to photos, animated GIFs, and videos, remove backgrounds with pixel-level control, resize for social platforms, convert formats (`PNG`, `JPEG`, `WebP`), bulk rename, and export as ZIP — without uploading a single byte.**

[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)](https://github.com/theastrobruh/Pressmark/actions)
[![GitHub Pages](https://img.shields.io/badge/Live%20on-GitHub%20Pages-222?logo=github&logoColor=white)](https://theastrobruh.github.io/Pressmark/)
[![React 19](https://img.shields.io/badge/React%2019-v19.0.1-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-v8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Version](https://img.shields.io/badge/Version-v0.5.0-00E5FF)](#)
[![Ko-fi](https://img.shields.io/badge/Support-Ko--fi-FF5E5B?logo=ko-fi&logoColor=white)](https://ko-fi.com/theastrobruh)

<br/>

[**🎨 Open Pressmark**](https://theastrobruh.github.io/Pressmark/) · [**🚀 the.astro.os**](https://theastrobruh.github.io/the.astro.os/) · [**📷 Astro.Studio**](https://theastrobruh.github.io/Astro.Studio/) · [**🎴 CardGram**](https://theastrobruh.github.io/CardGram/) · [**☕ Support the Project**](https://ko-fi.com/theastrobruh)

</div>

---

## ✨ One Ecosystem: theAstroBruh Universe

**Pressmark** is part of the creative web-app ecosystem built by **[theAstroBruh](https://github.com/theastrobruh)**, sharing the same engineering philosophy: fast, private, browser-native creative tools with zero heavy backends or external servers.

```
                          ┌───────────────────────────┐
                          │   theAstroBruh Universe   │
                          └─────────────┬─────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
  the.astro.os                    Astro.Studio                      Pressmark
  Web Desktop OS              Photo & Color Studio          Watermark & Media Studio
```

---

## 🛠️ Key Features

| | Module | Details |
|---|---|---|
| 💧 | **Watermarking (Images, GIFs & Videos)** | Text handles, custom image/SVG logos, studio EXIF/copyright badges, tiled diagonal proofs, dual-corner stamps, 17 curated fonts, saved presets, and **Last Placed** one-click recall. |
| ✂️ | **Precision Background Removal** | Edge-seeded flood fill, global chroma key, light/dark luminance modes, **Tolerance**, **Edge Choke/Expand** (`-10px` to `+10px`), **Despill**, **Eyedropper**, and **Erase / Restore Brush**. |
| 📐 | **Resize & Format Conversion** | Social media and web presets (Instagram, X, YouTube, LinkedIn/OpenGraph, Max-Width Web) with batch **PNG**, **JPEG**, and **WebP** conversion and live file-size savings. |
| 🏷️ | **Bulk Renaming & Batch ZIP** | Dynamic token patterns (`{name}`, `{n}`, `{preset}`, `{dim}`, `{year}`, `{date}`), find/replace, case transforms, frame-accurate GIFs, WebM videos, and single-click `.zip` export. |
| 🔒 | **100% Local & Private** | All image decoding, canvas compositing, GIF re-encoding, video capture, background removal, and ZIP packaging execute locally in your browser. |

---

## 💻 Local Development

Requirements: **Node.js 20+** (Node 22 recommended) and `npm`.

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Run TypeScript typecheck and build for production
npm run lint
npm run build
```

---

## 🚀 GitHub Pages Deployment

This repository ships ready for automated CI and static deployment with zero backend dependencies:

1. Push the project to your GitHub repository on `main`.
2. Open **Settings → Pages** and select **Source: GitHub Actions**.
3. Every `push` to `main` runs `npm run lint` and `npm run build`, publishing `dist/` to `https://<username>.github.io/Pressmark/`.
