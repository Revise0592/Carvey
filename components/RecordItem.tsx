/**
 * One row in a record list (maintenance, repairs, MOTs, reminders, fuel, to-buy).
 * Layout is handled in CSS grid: on desktop actions sit at the end of the row; on mobile
 * the badge and value share the first line, the title gets full width, and the actions
 * share a footer line with the attachment controls.
 */
export function RecordItem({
  tag,
  title,
  meta,
  value,
  actions,
  attachments
}: {
  tag?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  value?: React.ReactNode;
  actions?: React.ReactNode;
  attachments?: React.ReactNode;
}) {
  return (
    <div className={["record-entry", attachments ? "has-attachments" : null, value === undefined || value === null ? "no-value" : null].filter(Boolean).join(" ")}>
      <div className="record-row">
        {tag ? <div className="record-row-tag">{tag}</div> : null}
        <div className="record-row-content">
          <strong>{title}</strong>
          {meta ? <p className="record-row-meta">{meta}</p> : null}
        </div>
        {value !== undefined && value !== null ? <strong className="record-row-value">{value}</strong> : null}
      </div>
      {actions ? <div className="record-row-actions">{actions}</div> : null}
      {attachments ? <div className="record-row-attachments">{attachments}</div> : null}
    </div>
  );
}
