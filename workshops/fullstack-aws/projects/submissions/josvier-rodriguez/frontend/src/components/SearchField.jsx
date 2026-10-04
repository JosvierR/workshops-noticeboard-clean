import { Search, X } from "lucide-react";

export default function SearchField({
  value,
  onChange,
  autoFocus = false,
  className = "",
}) {
  return (
    <label className={`search-field ${className}`.trim()}>
      <Search aria-hidden="true" size={17} strokeWidth={1.8} />
      <span className="sr-only">Search notices</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search notices"
        autoFocus={autoFocus}
      />
      {value ? (
        <button
          type="button"
          className="search-clear"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <X aria-hidden="true" size={15} />
        </button>
      ) : null}
    </label>
  );
}
