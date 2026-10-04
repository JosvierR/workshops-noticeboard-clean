import { useEffect } from "react";

export default function useKeyboardShortcut(key, callback, options = {}) {
  const { metaOrCtrl = false, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return undefined;

    function handleKeyDown(event) {
      const matchesModifier = !metaOrCtrl || event.metaKey || event.ctrlKey;
      if (matchesModifier && event.key.toLowerCase() === key.toLowerCase()) {
        event.preventDefault();
        callback(event);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [callback, enabled, key, metaOrCtrl]);
}
