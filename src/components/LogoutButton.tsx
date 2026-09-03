"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="rounded-lg bg-navy-dark px-3 py-1.5 text-sm text-white hover:bg-black/30"
    >
      Abmelden
    </button>
  );
}
