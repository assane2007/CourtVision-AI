# T3 - Split video-player-screen.tsx into smaller components

## Summary
Refactored `src/components/screens/video-player-screen.tsx` (924 lines → **518 lines**, 44% reduction) by extracting 1 custom hook and 3 sub-components.

## Changes

### New files created in `src/components/video/`:

| File | Lines | Purpose |
|------|-------|---------|
| `use-video-player.ts` | 213 | Custom hook: player state, video event handlers, keyboard shortcuts, A-B loop logic, highlight montage playback |
| `annotation-canvas.tsx` | 234 | Canvas overlay component: all drawing state, mouse/touch handlers, annotation rendering effect (freehand, line, arrow, circle, text) |
| `share-panel.tsx` | 77 | Share tab: copy link, share to feed, delete video button |
| `video-info-card.tsx` | 31 | Video metadata card: title, description, views, duration, file size, format, date |

### What was NOT changed:
- All functionality and visual behavior preserved exactly
- All API calls unchanged
- All state management logic unchanged
- All existing comments and i18n strings preserved
- All pre-existing sub-components (video-controls, highlight-manager, annotation-panel, export-manager) untouched

### Refactoring approach:
- Used destructured return from `useVideoPlayer` hook (not object access) to satisfy React lint rules for ref access during render
- `AnnotationCanvas` manages its own internal drawing state (`isDrawing`, `drawingPoints`, `drawStart`) while receiving shared state (`annotationTool`, `annotationColor`) as props
- `SharePanel` accepts typed mutation objects matching existing patterns in sibling components

## Lint result
✅ 0 errors, 4 warnings (all pre-existing in test files, unrelated to this change)