import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function NotificationStack({ items, onCopyVerificationCode }) {
    if (items.length === 0) {
        return null;
    }
    return (_jsx("div", { className: "notification-stack", "aria-live": "polite", children: items.map((item) => (_jsxs("article", { className: "notification-card", children: [_jsx("div", { className: "notification-card__icon", "aria-hidden": "true", children: "IN" }), _jsxs("div", { children: [_jsx("div", { className: "notification-card__title", children: item.title }), _jsx("div", { className: "notification-card__body", children: item.body }), item.verificationCode ? (_jsx("button", { type: "button", className: "notification-card__action", onClick: () => onCopyVerificationCode(item.verificationCode), children: "\u590D\u5236\u9A8C\u8BC1\u7801" })) : null] })] }, item.id))) }));
}
