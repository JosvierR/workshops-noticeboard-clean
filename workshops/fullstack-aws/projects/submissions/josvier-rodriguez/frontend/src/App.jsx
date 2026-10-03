import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createNotice,
  deleteNotice,
  getNotices,
  updateNotice,
} from "./api/notices";
import NoticeCard from "./components/NoticeCard";
import NoticeForm from "./components/NoticeForm";

export default function App() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);

  const loadNotices = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      const data = await getNotices();
      setNotices(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load notices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const stats = useMemo(() => {
    const active = notices.filter((notice) => {
      if (!notice.dueDate) return true;
      return new Date(`${notice.dueDate}T23:59:59`) >= new Date();
    }).length;

    const cohorts = new Set(
      notices.map((notice) => notice.cohort).filter(Boolean),
    ).size;

    return { total: notices.length, active, cohorts };
  }, [notices]);

  async function saveNotice(payload) {
    setMutationBusy(true);
    setError("");

    try {
      if (editing) {
        await updateNotice(editing._id, payload);
        setEditing(null);
      } else {
        await createNotice(payload);
      }

      await loadNotices();
    } catch (requestError) {
      setError(requestError.message || "Unable to save the notice.");
      throw requestError;
    } finally {
      setMutationBusy(false);
    }
  }

  async function removeNotice(notice) {
    const confirmed = window.confirm(
      `Delete "${notice.title}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setMutationBusy(true);
    setError("");

    try {
      await deleteNotice(notice._id);

      if (editing?._id === notice._id) {
        setEditing(null);
      }

      await loadNotices();
    } catch (requestError) {
      setError(requestError.message || "Unable to delete the notice.");
    } finally {
      setMutationBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark">NB</div>
        <div>
          <strong>NoticeBoard</strong>
          <span>Training operations</span>
        </div>
      </header>

      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">Training manager workspace</p>
            <h1>Keep every trainee aligned.</h1>
            <p className="hero-copy">
              Publish cohort updates, track what is active, and keep training
              communication in one clear place.
            </p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span>Total notices</span>
              <strong>{stats.total}</strong>
            </div>
            <div className="stat-card">
              <span>Active</span>
              <strong>{stats.active}</strong>
            </div>
            <div className="stat-card">
              <span>Cohorts</span>
              <strong>{stats.cohorts}</strong>
            </div>
          </div>
        </section>

        {error ? (
          <div className="alert" role="alert">
            <span>{error}</span>
            <button type="button" onClick={loadNotices}>
              Retry
            </button>
          </div>
        ) : null}

        <section className="workspace">
          <NoticeForm
            notice={editing}
            busy={mutationBusy}
            onCancel={() => setEditing(null)}
            onSubmit={saveNotice}
          />

          <div className="notice-list-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Live board</p>
                <h2>Recent notices</h2>
              </div>

              <button
                className="text-button"
                type="button"
                onClick={loadNotices}
                disabled={loading || mutationBusy}
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="empty-state">
                <div className="spinner" />
                <p>Loading notices...</p>
              </div>
            ) : notices.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">+</span>
                <h3>No notices yet</h3>
                <p>Create the first announcement for your trainees.</p>
              </div>
            ) : (
              <div className="notice-list">
                {notices.map((notice) => (
                  <NoticeCard
                    key={notice._id}
                    notice={notice}
                    busy={mutationBusy}
                    onDelete={removeNotice}
                    onEdit={setEditing}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <footer className="deploy-note">Deployed with GitHub Actions</footer>
    </div>
  );
}
