"use client";

import { useState, useEffect } from "react";

export function InviteLink({ inviteCode }: { inviteCode: string }) {
  const [link, setLink] = useState(`/join/${inviteCode}`);

  useEffect(() => {
    setLink(`${window.location.origin}/join/${inviteCode}`);
  }, [inviteCode]);

  return (
    <p className="mt-3 rounded-lg bg-field-yellow-bg px-3 py-2 text-xs text-field-yellow-dark">
      Einladungslink: {link}
    </p>
  );
}
