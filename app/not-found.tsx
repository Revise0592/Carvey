import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>Not found</h1>
        <p>That page or vehicle is not available.</p>
        <Link className="primary-button" href="/garage">Back to garage</Link>
      </section>
    </main>
  );
}
