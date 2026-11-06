"use client";

/** Running summary: a fixed bar under the thumb on phones, a sticky column on desktop. */
export default function Summary({
  rows,
  cta,
  disabled,
  onClick,
  emptyText,
}: {
  rows: { label: string; value: string | null }[];
  cta: string;
  disabled: boolean;
  onClick: () => void;
  emptyText: string;
}) {
  const filled = rows.filter((r) => r.value);
  return (
    <aside className="summary" aria-label="Your booking">
      <h2 className="display">Your booking</h2>
      <div className="summary-text">
        {filled.length ? (
          <>
            <strong>{filled[0].value}</strong>
            {filled[1] && <span>{filled[1].value}</span>}
          </>
        ) : (
          <span>{emptyText}</span>
        )}
      </div>
      <dl className="summary-rows">
        {rows.map((r) => (
          <div key={r.label}>
            <dt>{r.label}</dt>
            <dd>{r.value ?? "Not chosen yet"}</dd>
          </div>
        ))}
      </dl>
      <button className="btn" disabled={disabled} onClick={onClick}>
        {cta}
      </button>
    </aside>
  );
}
