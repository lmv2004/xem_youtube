"use client";
import { useEffect, useState } from "react";

/** Focus plus recent activity is only a proxy for attention, never gaze tracking. */
export function useChatAttention() {
  const [attentive, setAttentive] = useState(false);
  useEffect(() => {
    let lastActivity = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      const remaining = 60_000 - (Date.now() - lastActivity);
      setAttentive(!document.hidden && document.hasFocus() && remaining > 0);
      if (remaining > 0) timer = setTimeout(update, remaining + 1);
    };
    const activity = () => { lastActivity = Date.now(); update(); };
    const focus = () => { if (!document.hidden && document.hasFocus()) activity(); else update(); };
    const move = () => { if (Date.now() - lastActivity > 1000) activity(); };
    window.addEventListener("focus", focus);
    window.addEventListener("blur", update);
    document.addEventListener("visibilitychange", focus);
    window.addEventListener("pointerdown", activity, true);
    window.addEventListener("keydown", activity, true);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("wheel", activity, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    update();
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", update);
      document.removeEventListener("visibilitychange", focus);
      window.removeEventListener("pointerdown", activity, true);
      window.removeEventListener("keydown", activity, true);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("wheel", activity);
      window.removeEventListener("touchmove", move);
    };
  }, []);
  return attentive;
}
