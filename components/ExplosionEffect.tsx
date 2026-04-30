export function ExplosionEffect({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="explosion-overlay" aria-hidden="true">
      <div className="explosion-burst">
        <span />
        <span />
        <span />
      </div>
      <div className="explosion-flash" />
      <div className="explosion-smoke">
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>
      <div className="explosion-debris">
        {Array.from({ length: 18 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  );
}
