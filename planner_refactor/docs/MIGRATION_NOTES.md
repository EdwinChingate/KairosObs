# Migration Notes

- Runtime behavior is intended to match the original `Kairos.md` monolith. All parsing rules, ID ranges (desktop vs. mobile), and file naming conventions are preserved.
- Styles are now injected directly by the DataviewJS block (`ui/ui_shared/baseStyles`). If you previously relied on external snippets for these class names, the bundled script provides them inline.
- All file reads/writes now flow through the `io/files` facade; custom scripts hooking into the old globals should call into the new modules instead.

No other user-facing changes are expected. If you notice differences, capture them here so downstream vault automation can be updated.
