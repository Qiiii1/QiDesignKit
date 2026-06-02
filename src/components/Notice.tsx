export function Notice({ message }: { message?: string }) {
  return (
    <div aria-live="polite" className={`notice${message ? " notice--visible" : ""}`}>
      {message}
    </div>
  );
}
