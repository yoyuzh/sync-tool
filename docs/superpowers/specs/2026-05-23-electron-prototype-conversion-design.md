# Electron Prototype Conversion Design

## Summary

Convert the prototype HTML files under `原型/` into the production-facing renderer framework for `apps/desktop/src/`.

The resulting Electron renderer should no longer be a static bootstrap placeholder. It should become a responsive React UI shell that:

- renders the desktop prototype as the wide layout
- renders the mobile prototype as the narrow layout
- shares one component system across both layouts
- keeps all logic inside the Electron renderer app rather than inside prototype files

This work is limited to the frontend renderer framework. It does not include backend wiring, clipboard integration, or native mobile packaging.

## Goals

- transform the current single-file bootstrap UI into a reusable React frontend structure
- preserve the visual language of the prototypes, including theme variables, card states, and panel feel
- support both desktop and mobile prototype layouts inside Electron through responsive rendering
- make future server and clipboard integration straightforward by separating display data from view components
- keep the implementation aligned with the repository boundary where `apps/desktop/src/` is the production UI and `原型/` remains reference-only

## Non-Goals

- do not move production logic into `原型/`
- do not keep CDN Tailwind or static HTML script dependencies in the production renderer
- do not add backend API calls, WebSocket wiring, or persistence in this pass
- do not build a separate Android app or mobile packaging target
- do not implement a router unless the renderer needs local view switching for overlays

## Source Prototypes

The design references these prototype files:

- `原型/clipbridge-desktop.html` for wide desktop layout
- `原型/mobile-android.html` for narrow mobile layout
- `原型/clipbridge-android.html` as a duplicate mobile reference
- `原型/index.css` for theme variables and baseline utility intent

The mobile prototypes are treated as product UI references, not as literal device-frame mockups. The Electron renderer will use the mobile layout patterns without preserving the phone shell or Android navigation chrome.

## Product Decision

### Responsive Strategy

Use one React renderer app with responsive mode switching based on window width.

- wide windows render the desktop-oriented layout
- narrow windows render the mobile-oriented layout
- both modes consume the same record data and interaction state

This avoids maintaining two disconnected frontends and better matches the long-term product direction where Electron should support different window sizes gracefully.

### Component Strategy

Use one shared component system with mode-aware presentation.

- shared semantic components own content meaning and state
- desktop presentation emphasizes spacious layout, hover actions, and richer toolbars
- mobile presentation emphasizes compact cards, sticky search/filter controls, and touch-friendly actions

This keeps future data wiring focused on handlers and state replacement rather than UI rewrites.

## UI Architecture

### App Shell

`App` becomes the orchestration layer for:

- responsive mode detection
- demo record data composition
- filter, range, drawer, and settings state
- top-level overlays such as notifications and detail panels

The shell also owns the background treatment and layout frame so the desktop layout still feels like a popup panel while the mobile layout feels like a compact app surface.

### Major View Blocks

The renderer will be decomposed into the following blocks:

- `Shell`
- `Header`
- `HistoryToolbar`
- `HistoryFilters`
- `HistoryList`
- `NotificationStack`
- `DetailDrawer`
- `SettingsPanel`

#### Shell

Provides the outer viewport, theme variables, and responsive spacing rules.

#### Header

Shows brand identity, connected-device status, and settings access.

#### HistoryToolbar

Contains:

- search input
- recent-history range selector
- primary publish action

On mobile, this section compresses into a sticky stacked layout and the primary action may also surface as a floating action button.

#### HistoryFilters

Uses tabs on desktop and chips on mobile.

Supported filters:

- all
- local
- synced
- files
- images
- failed

#### HistoryList

Renders one shared record collection with mode-specific card layouts.

Supported example record states include:

- local text
- synced image
- metadata-only large file
- failed transfer

#### NotificationStack

Shows prototype-style transient notification previews in the renderer layer for demo purposes.

#### DetailDrawer

Shows a fuller record preview with metadata and available actions.

#### SettingsPanel

Provides a static frontend shell for future desktop settings without requiring backend integration in this pass.

## State Model

The renderer should replace hardcoded JSX text blocks with structured frontend state.

Initial top-level state:

- `viewMode`: `desktop | mobile`
- `activeFilter`: `all | local | synced | files | images | failed`
- `historyRange`: `1 | 3 | 7 | 15`
- `searchQuery`: `string`
- `selectedRecordId`: `string | null`
- `isSettingsOpen`: `boolean`
- `notifications`: notification preview entries
- `records`: clipboard history records used by all layouts

This state remains local to the renderer for now. Later phases can hydrate it from clipboard watchers, server history, or realtime pushes.

## Data Shape

The renderer will introduce demo-oriented frontend records rather than embedding prototype strings directly inside components.

Each record should expose enough information to cover all prototype cards:

- `id`
- `kind`
- `title`
- `previewText`
- `previewImageUrl`
- `sourceDeviceName`
- `sourceDeviceType`
- `timestampLabel`
- `status`
- `statusTone`
- `sizeLabel`
- `metadataOnly`
- `primaryActionLabel`
- `secondaryActions`

This shape may wrap or extend shared package types later, but this pass should optimize for clean UI rendering first.

## File Organization

Target structure inside `apps/desktop/src/`:

- `App.tsx`
- `main.tsx`
- `styles.css`
- `components/Header.tsx`
- `components/HistoryToolbar.tsx`
- `components/HistoryFilters.tsx`
- `components/HistoryList.tsx`
- `components/RecordCard.tsx`
- `components/StatusBadge.tsx`
- `components/NotificationStack.tsx`
- `components/DetailDrawer.tsx`
- `components/SettingsPanel.tsx`
- `data/mockRecords.ts`
- `hooks/useResponsiveMode.ts`
- optional `types/ui.ts` if local renderer types need separation

The structure should stay intentionally small. Only create files that improve clarity and do not fragment simple logic excessively.

## Styling Strategy

Use normal app-managed CSS rather than prototype CDN tooling.

Styling requirements:

- preserve prototype theme tokens using CSS custom properties
- preserve light and dark theme behavior
- preserve a deliberate desktop-panel look for wide mode
- preserve compact touch-friendly spacing for narrow mode
- preserve subtle animation for notification entry, drawer transitions, and hover/focus states

Avoid:

- importing Tailwind via CDN
- depending on runtime icon script injection
- copying prototype utility classes blindly into production markup

If icon support is needed, use a normal package dependency that works inside the existing Vite app.

## Interaction Model

This pass includes frontend-only interactions:

- typing in search updates local filter state
- selecting a range updates local state
- switching filters updates visible records
- selecting "view details" opens the detail drawer
- selecting settings opens the settings panel
- notification preview renders in the shell
- mobile floating action button mirrors the desktop publish action affordance

These actions may use placeholder handlers, but they should feel like a coherent app skeleton rather than static mockup markup.

## Accessibility and UX Expectations

- interactive controls must remain keyboard reachable
- buttons and inputs should use native semantic elements
- contrast should remain acceptable in both light and dark themes
- mobile mode should avoid hover-only affordances for essential actions
- desktop drag regions must not swallow interactive controls

## Implementation Boundaries

This design intentionally avoids:

- changes to `apps/desktop/electron/`
- changes to `apps/server/`
- changes to `packages/shared/` unless a tiny shared UI-safe constant becomes necessary

The deliverable is a stronger renderer framework, not a feature-complete product flow.

## Verification

At minimum run:

```bash
rtk pnpm --filter @sync-tool/desktop typecheck
rtk pnpm --filter @sync-tool/desktop build
rtk pnpm typecheck
rtk pnpm build
```

Success means:

- the desktop package typechecks
- the desktop package builds
- root workspace checks still pass
- the renderer structure now reflects the desktop and mobile prototypes through responsive React UI

## Risks and Mitigations

### Risk: Over-copying static prototype markup

Mitigation:

- convert repeated visual patterns into reusable components early
- keep record content in data files instead of hardcoded repeated JSX blocks

### Risk: Mobile mode feels like a demo shell rather than product UI

Mitigation:

- remove the device frame and Android nav chrome
- translate the prototype into a true narrow app layout

### Risk: Too much file splitting for an early-stage UI

Mitigation:

- create only the components needed to separate responsibilities clearly
- keep simple leaf rendering together where additional files would not add value

## Acceptance Criteria

- `apps/desktop/src/` no longer consists of only a placeholder `App.tsx`
- the renderer adapts between desktop and mobile layouts based on width
- the renderer visually reflects the key structures from the prototype files
- the renderer uses shared local state and reusable components rather than copied static HTML pages
- the prototypes remain untouched as reference artifacts
