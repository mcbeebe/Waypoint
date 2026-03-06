# gas-mvp — Claude Code Instructions

> See parent `../CLAUDE.md` for full project context. This file covers gas-mvp specifics.

## What This Is

Google Apps Script web app — the active Waypoint MVP. Two files:
- **Code.gs** (~2,900 lines) — Backend: AI engine, user management, Google Sheets CRUD, KB seeding
- **Index.html** (~6,957 lines) — Frontend: full SPA with chat UI, onboarding, dashboards, i18n

## Critical Editing Rules

These files are large. **Always use targeted edits with 3 lines of context.** Never rewrite entire files.

## Code Patterns

### Backend (Code.gs)
- Private functions: trailing underscore (`callClaude_()`, `extractJson_()`)
- Public functions (frontend-callable): no underscore (`askWaypoint()`, `saveUser()`)
- API key: `PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY')`
- AI model: `claude-opus-4-6` via `UrlFetchApp.fetch()`
- Data: Google Sheets tabs — Users, ActionLog, Sessions, KnowledgeBase, Prompts, InteractionLog, DraftLog, ChatSessions, ChatMessages, QATests

### Frontend (Index.html)
- Screen navigation: `showScreen('screen-id')` / `navTo('screen-id')`
- Backend calls: `google.script.run.withSuccessHandler(fn).withFailureHandler(fn).backendFunction(args)`
- State: client-side `state` object with `saveState()` / `restoreSession()`
- Translations: `t('key')` — supports en, es, vi
- Accessibility: WCAG AA focus indicators, ARIA labels, 44px touch targets, skip links

### Screen IDs
`screen-landing`, `screen-onboard`, `screen-journey`, `screen-home`, `screen-dashboard`, `screen-profile`, `screen-agencies`, `screen-email`, `screen-reimburse`, `screen-chat`

## Sprint Tracking

12 sprints completed (WP-001 → WP-030). Next: Sprint 13 / WP-031+.

Commit format: `Sprint N: Description (WP-XXX, WP-YYY)`

## Deployment

Manual copy-paste to Google Apps Script editor (no clasp configured). No build step.

## No External Dependencies

Pure HTML5/CSS3/JS + Google Apps Script APIs + Anthropic Claude API.
