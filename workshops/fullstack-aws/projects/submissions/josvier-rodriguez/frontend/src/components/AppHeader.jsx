import { useState } from "react";
import { Command, Plus, Search, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { getMotionTransition, motionTokens } from "../utils/motion";
import SearchField from "./SearchField";

export default function AppHeader({
  searchQuery,
  onSearchChange,
  onCreate,
  onOpenCommand,
}) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  return (
    <motion.header
      className="app-header"
      initial={reducedMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={getMotionTransition(reducedMotion, {
        duration: motionTokens.slow,
        ease: motionTokens.ease,
      })}
    >
      <div className="header-inner">
        <a className="brand" href="#overview" aria-label="NoticeBoard overview">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>NoticeBoard</span>
        </a>

        <nav className="primary-nav" aria-label="Primary navigation">
          <a href="#overview">Overview</a>
          <a href="#notices">Notices</a>
        </nav>

        <div className="header-actions">
          <SearchField
            className="header-search"
            value={searchQuery}
            onChange={onSearchChange}
          />
          <button
            className="command-trigger"
            type="button"
            onClick={onOpenCommand}
            aria-label="Open command palette"
          >
            <Command aria-hidden="true" size={16} />
            <span>Commands</span>
            <kbd>⌘K</kbd>
          </button>
          <button className="primary-button header-create" type="button" onClick={onCreate}>
            <Plus aria-hidden="true" size={17} />
            <span>New notice</span>
          </button>
          <button
            className="icon-button mobile-search-trigger"
            type="button"
            onClick={() => setMobileSearchOpen((open) => !open)}
            aria-label={mobileSearchOpen ? "Close search" : "Search notices"}
            aria-expanded={mobileSearchOpen}
          >
            {mobileSearchOpen ? <X size={19} /> : <Search size={19} />}
          </button>
          <button
            className="icon-button mobile-command-trigger"
            type="button"
            onClick={onOpenCommand}
            aria-label="Open command palette"
          >
            <Command size={19} />
          </button>
          <button
            className="icon-button mobile-create-trigger"
            type="button"
            onClick={onCreate}
            aria-label="Create a notice"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {mobileSearchOpen ? (
        <div className="mobile-search-row">
          <SearchField
            value={searchQuery}
            onChange={onSearchChange}
            autoFocus
          />
        </div>
      ) : null}
    </motion.header>
  );
}
