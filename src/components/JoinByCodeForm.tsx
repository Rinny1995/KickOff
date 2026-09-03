"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinByCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) router.push(`/join/${encodeURIComponent(code.trim())}`);
      }}
      className="flex gap-2"
    >
      <input
        type="text"
        placeholder="Einladungscode"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="flex-1 rounded-lg border border-navy-muted/30 px-3 py-2 text-sm text-card-text focus:border-play-blue focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-lg bg-play-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        Beitreten
      </button>
    </form>
  );
}
