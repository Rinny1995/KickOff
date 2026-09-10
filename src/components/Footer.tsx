import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto flex justify-center gap-4 px-4 py-6 text-xs text-navy-muted">
      <Link href="/impressum" className="hover:text-subtitle">
        Impressum
      </Link>
      <Link href="/datenschutz" className="hover:text-subtitle">
        Datenschutz
      </Link>
    </footer>
  );
}
