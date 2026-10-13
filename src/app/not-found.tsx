import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty-state">
      <h1>Este futuro todavía no está escrito.</h1>
      <Link href="/">Volver a Forecast League</Link>
    </main>
  );
}
