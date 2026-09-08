# ba-memorial-lobby-wallpaper-template

English | [简体中文](README.zh-CN.md)

A GitHub template repository for Blue Archive memorial-lobby-style Wallpaper
Engine web wallpapers. It mirrors the structure of `wallpaper-hare-camping` and
separates "character-specific content" from the shared runtime/toolchain:

- **ba-memorial-lobby-wallpaper-runtime**: the shared runtime framework — Spine
  rendering, interactions, dialogues, audio, settings, logging, and the debug
  panel.
- **This template**: a thin wallpaper project skeleton that keeps only
  character assets, content definitions, Wallpaper Engine metadata, and project
  documentation.

## Quick Start

1. Create a new repository from this one with GitHub's **Use this template**.
2. After cloning, read [docs/CREATING-A-PROJECT.md](docs/CREATING-A-PROJECT.md)
   and replace the placeholders in `src/config.ts`, `public/project.json`, and
   other files per the checklist.
3. Put the original model, audio, and BGM into `local-assets/original/` and
   generate the checksum manifest:

   ```powershell
   npm install
   npm run generate:checksums
   ```

4. Develop and build locally:

   ```powershell
   npm run dev        # prepare assets and start the Vite dev server
   npm run build      # prepare assets, typecheck, build, and validate dist/
   npm run package:offline  # build a deterministic offline ZIP
   ```

5. Before publishing, complete the real Chrome behavior tests and the
   Wallpaper Engine window tests described in
   [docs/CREATING-A-PROJECT.md](docs/CREATING-A-PROJECT.md) under "Verification
   Gates".

> The template repository itself (without character assets) can run
> `npm run check` (typecheck, regression tests, structure validation), but
> `npm run build` requires real assets in `local-assets/original/`.

## Placeholders to Replace

When creating a character project, replace the following with real content:

| Location | Content |
| --- | --- |
| `PROJECT` in `src/config.ts` | project id, slug, title, version label |
| `MODEL` in `src/config.ts` | model paths, animations/bones/hit parameters, design viewport |
| `BGM` / `DIALOGUES` in `src/config.ts` | BGM file and dialogue/subtitle content |
| `public/project.json` | title, description, preview, rating, and tags |
| `public/preview.gif` | generated 256×256 animated preview image (created during acceptance) |
| `public/THIRD-PARTY-NOTICES.txt` | provenance and license records for the real assets |
| `public/OFFLINE-README.txt` | version number and installation notes |
| `research/PROVENANCE.md` | provenance and hashes for every binary asset |

See [docs/STRUCTURE.md](docs/STRUCTURE.md) for details.

## npm Commands

| Command | Purpose | Requires character assets |
| --- | --- | --- |
| `npm run typecheck` | TypeScript type check | No |
| `npm test` | display layout, subtitle, settings contract, log bridge regression tests | No |
| `npm run validate:structure` | template/project structure validation | No |
| `npm run check` | combined entry point for the three above | No |
| `npm run generate:checksums` / `verify:checksums` | generate/verify the asset SHA-256 manifest | Yes |
| `npm run prepare:assets` | validate and copy model/audio/BGM/Spine runtime into `public/` | Yes |
| `npm run dev` | prepare assets and start the dev server | Yes |
| `npm run build` | prepare assets, typecheck, build, and validate `dist/` | Yes |
| `npm run package:offline` | build a deterministic offline ZIP with manifest validation | Yes |
| `npm run inspect:spine` | export animation/bone/event report from the `.skel` | Yes |
| `npm run generate:model-textures` | generate 4K/8K texture tiers with Real-CUGAN | Yes (optional) |

## Updating the Model

The runtime and toolchain are released through npm versions; template changes
only affect new projects. See [docs/UPGRADING.md](docs/UPGRADING.md) for
dependency upgrades and migrations.

## Verification Gates

Before any functional change is deployed to a Wallpaper Engine project
directory, you must:

1. Run end-to-end behavior tests in a user-opened external Chrome and check
   the console for errors;
2. Test pointer interaction, property callbacks, and pause/resume in a real
   Wallpaper Engine window;
3. Only then copy or sync the build artifacts.

Browser-side `?debug=1`, `?testWeInterfaces`, etc. are pre-checks only and
cannot replace a real Wallpaper Engine window test. See
[docs/ASSET-PIPELINE.md](docs/ASSET-PIPELINE.md) for asset preparation and
release workflows.

## Copyright Notice

Wallpapers created from this template bundle Blue Archive game assets
(characters, artwork, voices, music, subtitle text). Those assets belong to
their respective rights holders, including NEXON Games Co., Ltd., Yostar, and
other Blue Archive rightsholders. Character projects must keep this notice
(with the rights holders listed above) in their README and distribution
descriptions, and must state that the project and its assets are provided for
informational and educational purposes only. Fan projects are unofficial and
not affiliated with, sponsored by, or endorsed by those companies.
