# Pressmark — `BETA v.0.5.0`

**by: [theAstroBruh](https://github.com/theastrobruh)**

Pressmark is a fast, 100% client-side media preparation studio for creators and web developers. Add customizable watermarks to photos, animated GIFs, and videos, remove backgrounds with pixel-level slider control, resize for social platforms, convert formats (`PNG`, `JPEG`, `WebP`), bulk rename files, and export everything as a ZIP — without uploading a single byte to external servers.

---

## What You Can Do

- **Watermarking (Images, GIFs & Videos)**
  - Text handles (defaults to `@Pressmark_webapp` bottom-center at `77%` opacity), custom image/SVG logos, studio EXIF/copyright badges, tiled diagonal proofs, dual-corner stamps, and clipped custom safe areas.
  - 17 curated typography options across Sans, Serif, Display, Script, and Mono with category filters and live font previews.
  - Save custom presets, import/export preset JSON packs, and recall your **Last Placed** watermark setup in one click.
  - Full Undo / Redo (`Ctrl/Cmd + Z`, `Ctrl/Cmd + Shift + Z`) and keyboard arrow-key nudging.

- **Precision Background Removal**
  - Edge-seeded flood fill, global chroma key, and light/dark luminance modes.
  - Fine-grained sliders for **Tolerance**, **Edge Choke / Expand** (`-10px` to `+10px`), **Edge Softness**, **Edge Contrast**, **Color Despill**, and **Subject Detail Guard**.
  - Interactive stage **Eyedropper**, **Auto-Sample Border**, **Erase / Restore Brush**, mask inversion, and checkerboard/contrast preview backdrops.

- **Resize & Format Conversion**
  - Social media and web presets (Instagram Square/Portrait/Stories, X, YouTube, LinkedIn/OpenGraph, Max-Width Web).
  - Convert batches between **PNG**, **JPEG**, and **WebP** with real-time estimated output file-size savings.

- **Bulk Renaming & Batch Export**
  - Dynamic naming patterns using tokens (`{name}`, `{n}`, `{preset}`, `{dim}`, `{year}`, `{date}`) plus find/replace and case transforms.
  - Export individual assets, frame-accurate animated GIFs, watermarked WebM videos, or an entire batch packaged into a single `.zip` archive.

---

## Local Development

Requirements: **Node.js 20+** (Node 22 recommended) and `npm`.

```bash
# 1. Install dependencies
npm install

# 2. Start the development server (http://localhost:3000)
npm run dev
```

### Verification & Production Build

```bash
# Run TypeScript typecheck
npm run lint

# Build static production bundle into ./dist
npm run build

# Preview production build locally
npm run preview
```

---

## Running on GitHub via GitHub Actions

This repository ships ready for automated CI and static deployment with zero backend dependencies:

1. **Continuous Integration** (`.github/workflows/ci.yml`)
   - Automatically runs `npm run lint` and `npm run build` on every push or pull request to `main` / `master`.

2. **GitHub Pages Deployment** (`.github/workflows/deploy-pages.yml`)
   - Push this project to your GitHub repository.
   - Open **Settings → Pages** in your GitHub repository.
   - Under **Build and deployment → Source**, choose **GitHub Actions**.
   - Trigger the workflow (or push to `main`) — `vite.config.ts` uses `base: './'` and bundled static imports so all fonts, media, and scripts resolve cleanly on any `https://<username>.github.io/<repo>/` URL.

---

## Privacy

All image decoding, canvas compositing, GIF re-encoding, video capture, background removal, and ZIP packaging execute locally inside your browser. Your media never leaves your device.

---

## Links

- GitHub: [github.com/theastrobruh](https://github.com/theastrobruh)
- Web OS: [the.astro.os](https://theastrobruh.github.io/the.astro.os/)
- Support on Ko-fi: [ko-fi.com/theastrobruh](https://ko-fi.com/theastrobruh)
