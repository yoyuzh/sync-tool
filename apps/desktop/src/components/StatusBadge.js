import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function StatusBadge({ icon, label, tone }) {
    return (_jsxs("span", { className: `status-badge status-badge--${tone}`, children: [_jsx("span", { "aria-hidden": "true", className: "status-badge__icon", children: icon }), _jsx("span", { children: label })] }));
}
