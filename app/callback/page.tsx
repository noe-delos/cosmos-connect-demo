"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function CallbackPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (code && state) {
      // Send message to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "oauth-callback",
            code,
            state,
          },
          window.location.origin
        );
      }
    }
  }, [searchParams]);

  return <></>;
}
