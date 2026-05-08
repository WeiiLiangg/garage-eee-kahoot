export default function StatusBanner({ tone = "info", children }) {
  if (!children) {
    return null;
  }

  return <div className={`status-banner ${tone}`}>{children}</div>;
}
