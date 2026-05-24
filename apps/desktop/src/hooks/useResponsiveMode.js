import { useEffect, useState } from "react";
const MOBILE_BREAKPOINT = 880;
function getMode(width) {
    return width < MOBILE_BREAKPOINT ? "mobile" : "desktop";
}
export function useResponsiveMode() {
    const [mode, setMode] = useState(() => getMode(window.innerWidth));
    useEffect(() => {
        function handleResize() {
            setMode(getMode(window.innerWidth));
        }
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    return mode;
}
