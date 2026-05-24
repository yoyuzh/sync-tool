# Electron Prototype Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the prototype HTML references in `原型/` into a responsive React renderer framework inside `apps/desktop/src/` that switches between desktop and mobile layouts based on width.

**Architecture:** Replace the current single-file placeholder with a small renderer component system. Shared record data, filters, overlays, and responsive mode detection will live in the renderer, while desktop and mobile layouts will be different presentations of the same state.

**Tech Stack:** Electron renderer, React 19, TypeScript, Vite, CSS custom properties

---

### Task 1: Create the renderer UI structure and local types

**Files:**
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/src/types/ui.ts`
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/src/data/mockRecords.ts`
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/src/hooks/useResponsiveMode.ts`

- [x] **Step 1: Add local renderer types**

Create `apps/desktop/src/types/ui.ts` with renderer-facing types for filters, notifications, and record cards:

```ts
export type ViewMode = "desktop" | "mobile";

export type HistoryFilter = "all" | "local" | "synced" | "files" | "images" | "failed";

export type HistoryRange = 1 | 3 | 7 | 15;

export type DeviceType = "desktop" | "android" | "ios";

export type RecordStatus =
  | "local-only"
  | "synced"
  | "metadata-only"
  | "transfer-pending"
  | "download-ready"
  | "failed";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "accent";

export interface RecordAction {
  id: string;
  label: string;
}

export interface UiRecord {
  id: string;
  kind: "text" | "image" | "document";
  title: string;
  previewText?: string;
  previewImageUrl?: string;
  fileName?: string;
  sizeLabel?: string;
  sourceDeviceName: string;
  sourceDeviceType: DeviceType;
  timestampLabel: string;
  filterTags: HistoryFilter[];
  status: RecordStatus;
  statusTone: StatusTone;
  statusLabel: string;
  metadataOnly?: boolean;
  primaryActionLabel: string;
  secondaryActions: RecordAction[];
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
}
```

- [x] **Step 2: Seed shared mock records**

Create `apps/desktop/src/data/mockRecords.ts` with one array that covers the prototype states:

```ts
import type { NotificationItem, UiRecord } from "../types/ui";

export const mockRecords: UiRecord[] = [
  {
    id: "record-local-text",
    kind: "text",
    title: "环境变量片段",
    previewText: 'const serverUrl = "wss://clipbridge.local:8080";',
    sourceDeviceName: "MacBook Pro",
    sourceDeviceType: "desktop",
    timestampLabel: "刚刚",
    filterTags: ["all", "local"],
    status: "local-only",
    statusTone: "neutral",
    statusLabel: "仅本地",
    primaryActionLabel: "发布",
    secondaryActions: [
      { id: "details", label: "查看详情" },
      { id: "pin", label: "固定" }
    ]
  }
];

export const mockNotifications: NotificationItem[] = [
  {
    id: "notification-remote-text",
    title: "收到远程文本",
    body: '"git clone https://..." 来自 Windows Desktop'
  }
];
```

Expand the array so it also includes a synced image card, a metadata-only large file card, a failed transfer card, and a mobile-friendly download-ready example.

- [x] **Step 3: Add responsive mode hook**

Create `apps/desktop/src/hooks/useResponsiveMode.ts`:

```ts
import { useEffect, useState } from "react";
import type { ViewMode } from "../types/ui";

const MOBILE_BREAKPOINT = 880;

function getMode(width: number): ViewMode {
  return width < MOBILE_BREAKPOINT ? "mobile" : "desktop";
}

export function useResponsiveMode(): ViewMode {
  const [mode, setMode] = useState<ViewMode>(() => getMode(window.innerWidth));

  useEffect(() => {
    function handleResize() {
      setMode(getMode(window.innerWidth));
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return mode;
}
```

- [x] **Step 4: Verify new files compile conceptually**

Run: `rtk pnpm --filter @sync-tool/desktop typecheck`

Expected: typecheck still fails until the next tasks are wired, but there should be no syntax errors in the new files once imports become reachable.

### Task 2: Replace the placeholder renderer with composable React components

**Files:**
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/src/components/Header.tsx`
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/src/components/HistoryToolbar.tsx`
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/src/components/HistoryFilters.tsx`
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/src/components/HistoryList.tsx`
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/src/components/RecordCard.tsx`
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/src/components/StatusBadge.tsx`
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/src/components/NotificationStack.tsx`
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/src/components/DetailDrawer.tsx`
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/src/components/SettingsPanel.tsx`
- Modify: `/Users/mac/Documents/kdeConnect/apps/desktop/src/App.tsx`

- [x] **Step 1: Add a status badge component**

Create `apps/desktop/src/components/StatusBadge.tsx`:

```tsx
import type { StatusTone } from "../types/ui";

interface StatusBadgeProps {
  icon: string;
  label: string;
  tone: StatusTone;
}

export function StatusBadge({ icon, label, tone }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${tone}`}>
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </span>
  );
}
```

- [x] **Step 2: Add list and card building blocks**

Create `RecordCard.tsx` and `HistoryList.tsx` so records render in desktop or mobile density based on `viewMode`.

Use a `HistoryList` signature like:

```tsx
interface HistoryListProps {
  records: UiRecord[];
  viewMode: ViewMode;
  onOpenDetails: (recordId: string) => void;
}
```

Use a `RecordCard` signature like:

```tsx
interface RecordCardProps {
  record: UiRecord;
  viewMode: ViewMode;
  onOpenDetails: (recordId: string) => void;
}
```

Desktop cards should expose hover actions. Mobile cards should keep primary actions always visible.

- [x] **Step 3: Add header and toolbar components**

Create `Header.tsx`, `HistoryToolbar.tsx`, and `HistoryFilters.tsx` with props for local state:

```tsx
interface HeaderProps {
  onlineCount: number;
  onOpenSettings: () => void;
}
```

```tsx
interface HistoryToolbarProps {
  viewMode: ViewMode;
  searchQuery: string;
  historyRange: HistoryRange;
  onSearchChange: (value: string) => void;
  onRangeChange: (value: HistoryRange) => void;
  onPublish: () => void;
}
```

```tsx
interface HistoryFiltersProps {
  viewMode: ViewMode;
  activeFilter: HistoryFilter;
  onFilterChange: (filter: HistoryFilter) => void;
}
```

- [x] **Step 4: Add overlay components**

Create `NotificationStack.tsx`, `DetailDrawer.tsx`, and `SettingsPanel.tsx`.

Use these prop shapes:

```tsx
interface NotificationStackProps {
  items: NotificationItem[];
}
```

```tsx
interface DetailDrawerProps {
  record: UiRecord | null;
  open: boolean;
  onClose: () => void;
}
```

```tsx
interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}
```

- [x] **Step 5: Rebuild `App.tsx` around shared state**

Replace `App.tsx` with an app shell that:

- reads `viewMode` from `useResponsiveMode`
- seeds records and notifications from `mockRecords`
- tracks `activeFilter`, `historyRange`, `searchQuery`, `selectedRecordId`, and `isSettingsOpen`
- filters records by query and active filter
- renders desktop layout for `desktop`
- renders narrow product layout for `mobile`
- keeps the mobile floating publish button visible only in `mobile`

Core app shape:

```tsx
const filteredRecords = records.filter((record) => {
  const matchesFilter = activeFilter === "all" || record.filterTags.includes(activeFilter);
  const haystack = `${record.title} ${record.previewText ?? ""} ${record.sourceDeviceName}`.toLowerCase();
  const matchesSearch = haystack.includes(searchQuery.toLowerCase());
  return matchesFilter && matchesSearch;
});
```

- [x] **Step 6: Run typecheck after wiring components**

Run: `rtk pnpm --filter @sync-tool/desktop typecheck`

Expected: PASS

### Task 3: Add app-managed styling for responsive desktop and mobile modes

**Files:**
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/src/styles.css`
- Modify: `/Users/mac/Documents/kdeConnect/apps/desktop/src/main.tsx`
- Modify: `/Users/mac/Documents/kdeConnect/apps/desktop/index.html`

- [x] **Step 1: Import the shared stylesheet**

Update `apps/desktop/src/main.tsx`:

```tsx
import "./styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
```

- [x] **Step 2: Set document metadata for the renderer**

Update `apps/desktop/index.html` so the page title better reflects the product:

```html
<title>ClipBridge</title>
```

- [x] **Step 3: Add theme, layout, and component styles**

Create `apps/desktop/src/styles.css` with:

- theme variables from the prototypes
- light and dark color tokens
- desktop window shell styling
- mobile compact layout styling
- filter tabs and chips
- card media, status badge, drawer, settings panel, and notification animations
- `drag-region` and `no-drag` helpers for Electron-safe interactions

The stylesheet should also define breakpoint behavior around `880px`.

- [x] **Step 4: Run renderer build**

Run: `rtk pnpm --filter @sync-tool/desktop build`

Expected: PASS and renderer assets emit successfully.

### Task 4: Run root verification and audit against the spec

**Files:**
- Modify: `/Users/mac/Documents/kdeConnect/docs/superpowers/plans/2026-05-23-electron-prototype-conversion.md`

- [x] **Step 1: Run root typecheck**

Run: `rtk pnpm typecheck`

Expected: PASS

- [x] **Step 2: Run root build**

Run: `rtk pnpm build`

Expected: PASS

- [x] **Step 3: Review the completed renderer against the spec**

Check that the implementation now proves:

- desktop and mobile layouts both exist in `apps/desktop/src/`
- layout switches by width
- filters, search, settings, notifications, and detail drawer are present
- prototype files remain reference-only

- [x] **Step 4: Mark the plan complete**

Update this plan file’s task checkboxes as done after implementation and verification complete.
