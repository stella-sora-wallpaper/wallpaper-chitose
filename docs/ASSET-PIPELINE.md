# Asset Pipeline

Asset processing is executed by the central Pipeline using its pinned Toolkit version. Do not add repository-local download, transformation, build, validation, or packaging scripts.

The project declares resource requirements in `wallpaper.manifest.json`, including provider identity, model tiers, voice locales, expected resource counts, build settings, distribution requirements, and package naming.

The managed lifecycle is:

```text
resource acquisition
  -> resource preparation
  -> build
  -> distribution validation
  -> browser acceptance
  -> Wallpaper Engine acceptance
  -> package
```

Pipeline records source provenance, hashes, generated tiers, build artifacts, acceptance evidence, and package checksums. Source and licensing records for this trial are maintained in the repository's GitHub Issues; prepared assets remain project content.
