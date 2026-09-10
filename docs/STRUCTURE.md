# Project Structure

This repository is a content repository managed by the wallpaper Pipeline.

```text
src/                       Character definition and application entry
public/                    Wallpaper Engine metadata and prepared runtime assets
GitHub Issues              Research and resource provenance records
wallpaper.manifest.json    Declarative Pipeline project contract
package.json               Runtime application dependency only
tsconfig.json              Editor-facing TypeScript configuration
```

The repository intentionally contains no `scripts/`, `vite.config.ts`, Toolkit dependency, build tool dependency, or lifecycle npm scripts.

- Runtime owns wallpaper behavior.
- The project owns character content, assets, metadata, localization, and explicit extensions.
- Pipeline owns lifecycle orchestration, toolchain versions, evidence, and registry updates.
- Toolkit is loaded only by Pipeline and implements resource preparation, build, validation, and packaging.
