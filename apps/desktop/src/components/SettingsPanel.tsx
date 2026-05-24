import { useEffect, useState, type MouseEvent } from "react";
import type { DesktopSettings, ShortcutRegistrationStatus } from "../types/syncToolApi";

interface SettingsPanelProps {
  open: boolean;
  settings: DesktopSettings | null;
  shortcutStatus: ShortcutRegistrationStatus | null;
  connectionState: string;
  onUpdateSettings: (patch: Partial<DesktopSettings>) => Promise<void>;
  onClose: () => void;
}

export function SettingsPanel({
  open,
  settings,
  shortcutStatus,
  connectionState,
  onUpdateSettings,
  onClose
}: SettingsPanelProps) {
  const [serverUrl, setServerUrl] = useState(settings?.serverUrl ?? "");
  const [publishShortcut, setPublishShortcut] = useState(settings?.globalShortcutPublish ?? "");
  const [openShortcut, setOpenShortcut] = useState(settings?.globalShortcutOpen ?? "");
  const [pasteLatestOnlineShortcut, setPasteLatestOnlineShortcut] = useState(
    settings?.globalShortcutPasteLatestOnline ?? ""
  );

  useEffect(() => {
    setServerUrl(settings?.serverUrl ?? "");
  }, [settings?.serverUrl]);

  useEffect(() => {
    setPublishShortcut(settings?.globalShortcutPublish ?? "");
    setOpenShortcut(settings?.globalShortcutOpen ?? "");
    setPasteLatestOnlineShortcut(settings?.globalShortcutPasteLatestOnline ?? "");
  }, [
    settings?.globalShortcutOpen,
    settings?.globalShortcutPasteLatestOnline,
    settings?.globalShortcutPublish
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  async function saveServerUrl() {
    await onUpdateSettings({ serverUrl: serverUrl.trim() });
  }

  async function saveShortcuts() {
    await onUpdateSettings({
      globalShortcutPublish: publishShortcut.trim(),
      globalShortcutOpen: openShortcut.trim(),
      globalShortcutPasteLatestOnline: pasteLatestOnlineShortcut.trim()
    });
  }

  function stopPanelClick(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  return (
    <div
      className={open ? "overlay-shell is-open no-drag" : "overlay-shell no-drag"}
      aria-hidden={!open}
      onClick={onClose}
    >
      <aside
        className={open ? "settings-panel is-open no-drag" : "settings-panel no-drag"}
        onClick={stopPanelClick}
      >
        <div className="overlay-header">
          <div>
            <div className="overlay-eyebrow">PREFERENCES</div>
            <h2>桌面端设置</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="关闭">
            X
          </button>
        </div>

        <div className="settings-list">
          <section className="settings-card">
            <h3>连接与服务</h3>
            <label className="settings-field">
              <span>服务端地址</span>
              <input
                value={serverUrl}
                onChange={(event) => setServerUrl(event.target.value)}
                placeholder="http://127.0.0.1:8787"
              />
            </label>
            <button type="button" className="primary-button settings-save" onClick={saveServerUrl}>
              保存服务器
            </button>
            <div className="settings-row">
              <span>当前连接状态</span>
              <span className="status-indicator">{connectionState}</span>
            </div>
            <div className="settings-row">
              <span>剪贴板轮询</span>
              <span className={settings?.clipboardPollingEnabled === false ? "toggle-off" : "toggle-on"}>
                {settings?.clipboardPollingEnabled === false ? "已禁用" : "运行中"}
              </span>
            </div>
            <div className="settings-row">
              <span>复制验证码后打开窗口</span>
              <button
                type="button"
                className="icon-button"
                onClick={() =>
                  void onUpdateSettings({
                    openWindowAfterCopyVerificationCode: !settings?.openWindowAfterCopyVerificationCode
                  })
                }
              >
                <span
                  className={
                    settings?.openWindowAfterCopyVerificationCode === true ? "toggle-on" : "toggle-off"
                  }
                >
                  {settings?.openWindowAfterCopyVerificationCode === true ? "已开启" : "已关闭"}
                </span>
              </button>
            </div>
          </section>

          <section className="settings-card">
            <h3>快捷键</h3>
            <label className="settings-field">
              <span>发送当前剪贴板</span>
              <input
                value={publishShortcut}
                onChange={(event) => setPublishShortcut(event.target.value)}
                placeholder="Control+Command+C"
              />
            </label>
            <ShortcutStateView state={shortcutStatus?.publish} />

            <label className="settings-field">
              <span>打开面板</span>
              <input
                value={openShortcut}
                onChange={(event) => setOpenShortcut(event.target.value)}
                placeholder="Control+Command+V"
              />
            </label>
            <ShortcutStateView state={shortcutStatus?.open} />

            <label className="settings-field">
              <span>粘贴最近线上内容</span>
              <input
                value={pasteLatestOnlineShortcut}
                onChange={(event) => setPasteLatestOnlineShortcut(event.target.value)}
                placeholder="Command+Shift+V"
              />
            </label>
            <ShortcutStateView state={shortcutStatus?.pasteLatestOnline} />

            <button type="button" className="primary-button settings-save" onClick={saveShortcuts}>
              保存快捷键
            </button>
          </section>

          <div className="settings-footer">
            ClipBridge Desktop v1.0.0
          </div>
        </div>
      </aside>
    </div>
  );
}

function ShortcutStateView({ state }: { state?: ShortcutRegistrationStatus["open"] }) {
  if (!state?.accelerator) {
    return <div className="shortcut-state shortcut-state--muted">未设置</div>;
  }

  if (state.conflict) {
    return <div className="shortcut-state shortcut-state--danger">冲突或已被系统占用</div>;
  }

  return <div className="shortcut-state shortcut-state--ok">可用</div>;
}
