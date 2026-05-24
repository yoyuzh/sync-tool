const MODIFIER_LABELS: Record<string, string> = {
  Alt: "Alt",
  Control: "Control",
  Command: "Command",
  Shift: "Shift"
};

const SPECIAL_KEYS: Record<string, string> = {
  " ": "Space",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  ArrowUp: "Up",
  Delete: "Delete",
  Backspace: "Backspace",
  Enter: "Enter",
  Escape: "Esc",
  Tab: "Tab"
};

export interface ShortcutKeyEventLike {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  key: string;
}

export function acceleratorFromKeyEvent(event: ShortcutKeyEventLike): string | null {
  const key = normalizeKey(event.key);
  if (!key || isModifierKey(key)) {
    return null;
  }

  const parts: string[] = [];
  if (event.ctrlKey) {
    parts.push(MODIFIER_LABELS.Control);
  }
  if (event.altKey) {
    parts.push(MODIFIER_LABELS.Alt);
  }
  if (event.metaKey) {
    parts.push(MODIFIER_LABELS.Command);
  }
  if (event.shiftKey) {
    parts.push(MODIFIER_LABELS.Shift);
  }

  parts.push(key);
  return parts.join("+");
}

function normalizeKey(key: string): string | null {
  if (SPECIAL_KEYS[key]) {
    return SPECIAL_KEYS[key];
  }

  if (/^F\d{1,2}$/.test(key)) {
    return key;
  }

  if (key.length === 1) {
    return key.toUpperCase();
  }

  return null;
}

function isModifierKey(key: string): boolean {
  return key === "Alt" || key === "Control" || key === "Command" || key === "Shift";
}
