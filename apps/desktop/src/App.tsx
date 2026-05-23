import {
  DEFAULT_RECENT_HISTORY_LIMIT,
  HISTORY_RETENTION_DAYS,
  INLINE_FILE_MAX_BYTES
} from "@sync-tool/shared";

export default function App() {
  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        margin: "0 auto",
        maxWidth: 760,
        padding: 24
      }}
    >
      <h1>sync-tool</h1>
      <p>Desktop clipboard panel bootstrap.</p>

      <section>
        <h2>Status</h2>
        <ul>
          <li>Server: disconnected</li>
          <li>Recent merged history limit: {DEFAULT_RECENT_HISTORY_LIMIT}</li>
          <li>Server retention: {HISTORY_RETENTION_DAYS} days</li>
          <li>Inline file storage: up to {INLINE_FILE_MAX_BYTES / (1024 * 1024)} MB</li>
        </ul>
      </section>

      <section>
        <h2>Planned Actions</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button">Publish Selected Record</button>
          <button type="button">Fetch Recent Records</button>
        </div>
      </section>

      <section>
        <h2>Recent Clipboard</h2>
        <p>No records yet. This panel will later merge local and remote history.</p>
      </section>
    </main>
  );
}

