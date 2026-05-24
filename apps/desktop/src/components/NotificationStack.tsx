import type { NotificationItem } from "../types/ui";

interface NotificationStackProps {
  items: NotificationItem[];
  onCopyVerificationCode: (code: string) => void;
}

export function NotificationStack({ items, onCopyVerificationCode }: NotificationStackProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="notification-stack" aria-live="polite">
      {items.map((item) => (
        <article key={item.id} className="notification-card">
          <div className="notification-card__icon" aria-hidden="true">
            IN
          </div>
          <div>
            <div className="notification-card__title">{item.title}</div>
            <div className="notification-card__body">{item.body}</div>
            {item.verificationCode ? (
              <button
                type="button"
                className="notification-card__action"
                onClick={() => onCopyVerificationCode(item.verificationCode!)}
              >
                复制验证码
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
