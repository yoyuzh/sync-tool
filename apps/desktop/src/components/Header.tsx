interface HeaderProps {
  onlineCount: number;
  connectionLabel: string;
  onOpenSettings: () => void;
}

export function Header({ onlineCount, connectionLabel, onOpenSettings }: HeaderProps) {
  return (
    <header className="app-header drag-region">
      <div className="brand-lockup">
        <div className="brand-mark no-drag" aria-hidden="true" title="ClipBridge">
          CB
        </div>
        <div className="brand-info">
          <h1 className="brand-title">ClipBridge</h1>
          <div className="presence-row">
            <span className="presence-dot" />
            <span>{connectionLabel} · {onlineCount} 台设备在线</span>
          </div>
        </div>
      </div>

      <button type="button" className="icon-button no-drag" onClick={onOpenSettings} title="设置">
        S
      </button>
    </header>
  );
}

