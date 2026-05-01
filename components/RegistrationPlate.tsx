export function RegistrationPlate({ value, className }: { value: string; className?: string }) {
  const classes = ["reg", className].filter(Boolean).join(" ");
  return (
    <span className={classes} aria-label={`Registration ${value}`}>
      {formatRegistration(value)}
    </span>
  );
}

function formatRegistration(value: string) {
  const compact = value.toUpperCase().replace(/\s+/g, "");
  if (/^[A-Z]{2}\d{2}[A-Z]{3}$/.test(compact)) {
    return `${compact.slice(0, 4)} ${compact.slice(4)}`;
  }
  return value.toUpperCase();
}
