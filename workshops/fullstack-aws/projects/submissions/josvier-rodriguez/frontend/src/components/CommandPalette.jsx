import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Search } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { getMotionTransition, motionTokens } from "../utils/motion";

export default function CommandPalette({ open, commands, notices, onClose, onSelectNotice }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const reducedMotion = useReducedMotion();

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchingCommands = commands
      .filter((command) => {
        if (!normalizedQuery) return true;
        return `${command.label} ${command.keywords || ""}`
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .map((command) => ({ type: "command", ...command }));

    if (!normalizedQuery) return matchingCommands;

    const matchingNotices = notices
      .filter((notice) =>
        [notice.title, notice.content, notice.cohort]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery)),
      )
      .slice(0, 6)
      .map((notice) => ({
        id: notice._id,
        type: "notice",
        label: notice.title,
        description: notice.cohort || "All cohorts",
        notice,
      }));

    return [...matchingCommands, ...matchingNotices];
  }, [commands, notices, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIndex(0);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    setSelectedIndex((current) => Math.min(current, Math.max(results.length - 1, 0)));
  }, [results.length]);

  function choose(item) {
    if (!item) return;
    onClose();
    if (item.type === "notice") onSelectNotice(item.notice);
    else item.onSelect();
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % Math.max(results.length, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex(
        (current) => (current - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1),
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[selectedIndex]);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="overlay-backdrop command-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={getMotionTransition(reducedMotion, { duration: motionTokens.normal })}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) onClose();
          }}
        >
          <motion.section
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -6 }}
            transition={getMotionTransition(reducedMotion, motionTokens.spring)}
          >
            <label className="command-search">
              <Search aria-hidden="true" size={19} />
              <span className="sr-only">Search commands and notices</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search notices or type a command…"
                autoComplete="off"
              />
              <kbd>Esc</kbd>
            </label>

            <div className="command-results" role="listbox" aria-label="Results">
              {results.length ? (
                results.map((item, index) => {
                  const Icon = item.icon || FileText;
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      role="option"
                      aria-selected={selectedIndex === index}
                      className={selectedIndex === index ? "command-item is-selected" : "command-item"}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => choose(item)}
                    >
                      <span className="command-item-icon" aria-hidden="true">
                        <Icon size={17} />
                      </span>
                      <span>
                        <strong>{item.label}</strong>
                        {item.description ? <small>{item.description}</small> : null}
                      </span>
                      {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
                    </button>
                  );
                })
              ) : (
                <p className="command-empty">No matching commands or notices.</p>
              )}
            </div>
            <footer className="command-footer">
              <span><kbd>↑↓</kbd> Navigate</span>
              <span><kbd>↵</kbd> Select</span>
            </footer>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
