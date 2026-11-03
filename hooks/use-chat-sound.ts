"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createChatSoundGate, normalizeChatVolume, loadChatSound, playChatTone } from "@/lib/chat-sound";
const VOLUME_KEY = "xemphim:chat-sound-volume";
const STORAGE_KEY = "xemphim:chat-sound";

export function useChatSound(unread: number) {
  const [enabled, setEnabled] = useState(true);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [volume, setVolume] = useState(70);
  const volumeRef = useRef(70);
  const enabledRef = useRef(true);
  const contextRef = useRef<AudioContext | null>(null);
  const gate = useRef(createChatSoundGate());
  const activate = useCallback((preview = false) => {
    try {
      const context = contextRef.current ?? new AudioContext();
      contextRef.current = context;
      context.onstatechange = () => {
        if (contextRef.current === context) setReady(context.state === "running");
      };
      setReady(context.state === "running");
      void Promise.all([context.resume(), loadChatSound(context)]).then(async () => {
        if (contextRef.current !== context || !enabledRef.current) return;
        setReady(context.state === "running");
        setFailed(context.state !== "running");
        if (preview && context.state === "running") await playChatTone(context, volumeRef.current, () => contextRef.current === context && enabledRef.current);
      }).catch(() => { if (contextRef.current === context) setFailed(true); });
    } catch { setFailed(true); }
  }, []);
  useEffect(() => {
    try {
      const savedVolume = localStorage.getItem(VOLUME_KEY);
      volumeRef.current = savedVolume === null ? 70 : normalizeChatVolume(Number(savedVolume));
      setVolume(volumeRef.current);
      const saved = localStorage.getItem(STORAGE_KEY);
      const initialEnabled = saved === null ? true : saved === "true";
      enabledRef.current = initialEnabled;
      setEnabled(initialEnabled);
      if (initialEnabled) activate();
    } catch { /* Storage is optional. */ }
    const unlock = () => {
      if (enabledRef.current && contextRef.current?.state !== "running") activate();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === VOLUME_KEY) {
        volumeRef.current = event.newValue === null ? 70 : normalizeChatVolume(Number(event.newValue));
        setVolume(volumeRef.current);
        return;
      }
      if (event.key !== STORAGE_KEY) return;
      enabledRef.current = event.newValue === "true";
      setEnabled(enabledRef.current);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("storage", storage);
      const context = contextRef.current;
      contextRef.current = null;
      if (context) { context.onstatechange = null; void context.close().catch(() => {}); }
    };
  }, [activate]);
  useEffect(() => {
    const context = contextRef.current;
    if (!gate.current(unread, enabled && context?.state === "running", performance.now())) return;
    if (context) void playChatTone(context, volumeRef.current, () => contextRef.current === context && enabledRef.current)
      .catch(() => { if (contextRef.current === context) setFailed(true); });
  }, [unread, enabled]);
  const toggle = () => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    setFailed(false);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* Optional. */ }
    if (next) activate(true);
  };
  const changeVolume = (value: number) => {
    const next = normalizeChatVolume(value);
    volumeRef.current = next;
    setVolume(next);
    try { localStorage.setItem(VOLUME_KEY, String(next)); } catch { /* Optional. */ }
  };
  return { enabled, failed, ready, toggle, volume, changeVolume, preview: () => activate(true) };
}
