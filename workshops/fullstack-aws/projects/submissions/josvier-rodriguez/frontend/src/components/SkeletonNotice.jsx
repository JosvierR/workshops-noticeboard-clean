export default function SkeletonNotice() {
  return (
    <div className="skeleton-notice" aria-hidden="true">
      <div className="skeleton-line skeleton-meta" />
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line" />
      <div className="skeleton-line skeleton-short" />
    </div>
  );
}
