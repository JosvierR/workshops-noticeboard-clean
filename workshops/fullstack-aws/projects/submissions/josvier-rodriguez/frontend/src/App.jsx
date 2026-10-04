import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  ListFilter,
  Pin,
  Plus,
  RefreshCw,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import {
  createNotice,
  deleteNotice,
  getNotices,
  updateNotice,
} from "./api/notices";
import AppHeader from "./components/AppHeader";
import CommandPalette from "./components/CommandPalette";
import ConfirmDialog from "./components/ConfirmDialog";
import EmptyState from "./components/EmptyState";
import NoticeComposer from "./components/NoticeComposer";
import NoticeFilters from "./components/NoticeFilters";
import OverviewStats from "./components/OverviewStats";
import SkeletonNotice from "./components/SkeletonNotice";
import Toast from "./components/Toast";
import TrainingPulse from "./components/TrainingPulse";
import useKeyboardShortcut from "./hooks/useKeyboardShortcut";
import { getTimeGreeting } from "./utils/dates";
import { getMotionTransition, motionTokens } from "./utils/motion";
import {
  getNoticePriority,
  getPulseCounts,
  isAttentionPriority,
  isDueThisWeek,
  PRIORITY,
  sortNotices,
} from "./utils/noticePriority";

function normalizeNotices(value) {
  if (!Array.isArray(value)) return [];
  return value.map((notice) => ({ ...notice, pinned: Boolean(notice.pinned) }));
}

export default function App() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [error, setError] = useState("");
  const [composer, setComposer] = useState({ open: false, notice: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cohortFilter, setCohortFilter] = useState("all");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const deferredSearch = useDeferredValue(searchQuery);
  const reducedMotion = useReducedMotion();

  const showToast = useCallback((message, type = "success") => {
    setToast({ id: `${Date.now()}-${message}`, message, type });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(
      () => setToast(null),
      toast.type === "error" ? 5200 : 3000,
    );
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadNotices = useCallback(async (initial = false) => {
    setError("");
    if (initial) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await getNotices();
      setNotices(normalizeNotices(data));
    } catch (requestError) {
      const message = requestError.message || "Unable to load notices.";
      setError(message);
      if (!initial) showToast("Couldn’t refresh notices", "error");
    } finally {
      if (initial) setLoading(false);
      else setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadNotices(true);
  }, [loadNotices]);

  const openCreate = useCallback(() => {
    setComposer({ open: true, notice: null });
  }, []);

  const openEdit = useCallback((notice) => {
    setComposer({ open: true, notice });
  }, []);

  const closeComposer = useCallback(() => {
    if (!mutationBusy) setComposer({ open: false, notice: null });
  }, [mutationBusy]);

  const showAll = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setCohortFilter("all");
    window.setTimeout(() => document.querySelector("#notices")?.scrollIntoView({ behavior: "smooth" }), 0);
  }, []);

  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
  useKeyboardShortcut("k", openCommandPalette, { metaOrCtrl: true });

  async function saveNotice(payload) {
    setMutationBusy(true);
    setError("");

    try {
      if (composer.notice) {
        const updated = await updateNotice(composer.notice._id, payload);
        setNotices((current) =>
          current.map((notice) =>
            notice._id === composer.notice._id
              ? { ...notice, ...updated, pinned: Boolean(updated.pinned) }
              : notice,
          ),
        );
        showToast("Changes saved");
      } else {
        const created = await createNotice(payload);
        setNotices((current) => [
          { ...created, pinned: Boolean(created.pinned) },
          ...current,
        ]);
        showToast("Notice published");
      }

      setComposer({ open: false, notice: null });
    } catch (requestError) {
      setError(requestError.message || "Unable to save the notice.");
      showToast("Couldn’t save the notice", "error");
      throw requestError;
    } finally {
      setMutationBusy(false);
    }
  }

  const togglePin = useCallback(async (notice) => {
    setMutationBusy(true);
    setError("");
    const pinned = !notice.pinned;

    try {
      const updated = await updateNotice(notice._id, { pinned });
      setNotices((current) =>
        current.map((item) =>
          item._id === notice._id
            ? { ...item, ...updated, pinned: Boolean(updated.pinned) }
            : item,
        ),
      );
      showToast(pinned ? "Notice pinned" : "Notice unpinned");
    } catch (requestError) {
      setError(requestError.message || "Unable to update the notice.");
      showToast("Couldn’t update the notice", "error");
    } finally {
      setMutationBusy(false);
    }
  }, [showToast]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setMutationBusy(true);
    setError("");

    try {
      await deleteNotice(deleteTarget._id);
      setNotices((current) => current.filter((notice) => notice._id !== deleteTarget._id));
      setDeleteTarget(null);
      showToast("Notice deleted");
    } catch (requestError) {
      setError(requestError.message || "Unable to delete the notice.");
      showToast("Couldn’t delete the notice", "error");
    } finally {
      setMutationBusy(false);
    }
  }

  const prioritizedNotices = useMemo(() => sortNotices(notices), [notices]);
  const pulseCounts = useMemo(() => getPulseCounts(notices), [notices]);
  const cohorts = useMemo(
    () => [...new Set(notices.map((notice) => notice.cohort).filter(Boolean))].sort(),
    [notices],
  );

  const stats = useMemo(() => {
    const active = notices.filter(
      (notice) => getNoticePriority(notice) !== PRIORITY.OVERDUE,
    ).length;
    return {
      active,
      attention: pulseCounts.attention,
      cohorts: cohorts.length,
      pinned: pulseCounts.pinned,
    };
  }, [cohorts.length, notices, pulseCounts.attention, pulseCounts.pinned]);

  const filteredNotices = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return prioritizedNotices.filter((notice) => {
      const matchesSearch =
        !query ||
        [notice.title, notice.content, notice.cohort]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      const matchesCohort = cohortFilter === "all" || notice.cohort === cohortFilter;
      const priority = getNoticePriority(notice);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "attention" && isAttentionPriority(priority)) ||
        (statusFilter === "week" && isDueThisWeek(notice)) ||
        (statusFilter === "pinned" && notice.pinned);

      return matchesSearch && matchesCohort && matchesStatus;
    });
  }, [cohortFilter, deferredSearch, prioritizedNotices, statusFilter]);

  const filteredPulseCounts = useMemo(
    () => getPulseCounts(filteredNotices),
    [filteredNotices],
  );

  const commands = useMemo(
    () => [
      {
        id: "create",
        label: "Create a notice",
        description: "Open the composer",
        icon: Plus,
        keywords: "new publish",
        onSelect: openCreate,
      },
      {
        id: "all",
        label: "Show all",
        description: "Clear search and filters",
        icon: ListFilter,
        onSelect: showAll,
      },
      {
        id: "attention",
        label: "Needs attention",
        description: "Overdue, today, and soon",
        icon: Clock3,
        onSelect: () => setStatusFilter("attention"),
      },
      {
        id: "week",
        label: "Due this week",
        description: "Today through the next 7 days",
        icon: CalendarDays,
        onSelect: () => setStatusFilter("week"),
      },
      {
        id: "pinned",
        label: "Pinned",
        description: "Show pinned updates",
        icon: Pin,
        onSelect: () => setStatusFilter("pinned"),
      },
      {
        id: "refresh",
        label: "Refresh notices",
        description: "Get the latest board",
        icon: RefreshCw,
        onSelect: () => loadNotices(false),
      },
    ],
    [loadNotices, openCreate, showAll],
  );

  const hasSearch = Boolean(deferredSearch.trim());
  const hasFilter = statusFilter !== "all" || cohortFilter !== "all";
  const emptyType = notices.length === 0 ? "data" : hasSearch ? "search" : "filter";
  const emptyAction =
    emptyType === "data"
      ? openCreate
      : emptyType === "search"
        ? () => setSearchQuery("")
        : showAll;

  const cardHandlers = useMemo(
    () => ({ onEdit: openEdit, onDelete: setDeleteTarget, onTogglePin: togglePin }),
    [openEdit, togglePin],
  );

  return (
    <div className="app-shell">
      <AppHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreate={openCreate}
        onOpenCommand={openCommandPalette}
      />

      <main className="main-content">
        <motion.section
          id="overview"
          className="overview"
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getMotionTransition(reducedMotion, {
            duration: motionTokens.slow,
            delay: 0.08,
            ease: motionTokens.ease,
          })}
        >
          <div className="overview-copy">
            <p className="greeting">{getTimeGreeting()}</p>
            <h1>Know what your cohorts need next.</h1>
            <p>Important updates, deadlines, and training communication in one place.</p>
          </div>
          <OverviewStats stats={stats} />
        </motion.section>

        {error ? (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => loadNotices(notices.length === 0)}>
              Try again
            </button>
          </div>
        ) : null}

        <section id="notices" className="notices-workspace" aria-label="Notices workspace">
          <div className="workspace-heading">
            <div>
              <p className="context-label">Operational feed</p>
              <h2>Everything important, in one place.</h2>
            </div>
            {(hasSearch || hasFilter) && !loading ? (
              <p className="result-count">
                {filteredNotices.length} {filteredNotices.length === 1 ? "notice" : "notices"}
              </p>
            ) : null}
          </div>

          <NoticeFilters
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            cohortFilter={cohortFilter}
            onCohortChange={setCohortFilter}
            cohorts={cohorts}
            onRefresh={() => loadNotices(false)}
            refreshing={refreshing}
          />

          {loading ? (
            <div className="skeleton-grid" role="status" aria-label="Loading notices">
              <SkeletonNotice />
              <SkeletonNotice />
              <SkeletonNotice />
            </div>
          ) : filteredNotices.length ? (
            <TrainingPulse
              notices={filteredNotices}
              counts={filteredPulseCounts}
              busy={mutationBusy}
              handlers={cardHandlers}
            />
          ) : (
            <EmptyState type={emptyType} onAction={emptyAction} />
          )}
        </section>
      </main>

      <footer className="app-footer">
        <span>NoticeBoard · Training Pulse</span>
        <span>Deployed with GitHub Actions</span>
      </footer>

      <button className="mobile-fab" type="button" onClick={openCreate} aria-label="Create a notice">
        <Plus aria-hidden="true" size={22} />
        <span>New</span>
      </button>

      <NoticeComposer
        open={composer.open}
        notice={composer.notice}
        busy={mutationBusy}
        onClose={closeComposer}
        onSubmit={saveNotice}
      />
      <ConfirmDialog
        notice={deleteTarget}
        busy={mutationBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      <CommandPalette
        open={commandPaletteOpen}
        commands={commands}
        notices={notices}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectNotice={openEdit}
      />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
