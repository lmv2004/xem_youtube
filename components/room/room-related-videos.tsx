"use client";
import { ListPlus, Loader2, Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { VideoItem } from "@/lib/types";
export function RoomRelatedVideos({ code, videoId, onPick, onEnqueue, disabled, enqueueDisabled }: {
    code: string;
    videoId: string;
    onPick: (video: VideoItem) => unknown;
    disabled: boolean;
    enqueueDisabled: boolean;
    onEnqueue: (video: VideoItem) => Promise<boolean>;
}) {
    const t = useTranslations();
    const inFlight = useRef(new Set<string>());
    const [pending, setPending] = useState<string[]>([]);
    async function enqueue(item: VideoItem) {
        if (inFlight.current.has(item.id)) return;
        inFlight.current.add(item.id);
        setPending([...inFlight.current]);
        try { await onEnqueue(item); }
        finally {
            inFlight.current.delete(item.id);
            setPending([...inFlight.current]);
        }
    }
    const [items, setItems] = useState<VideoItem[]>([]);
    const [state, setState] = useState("loading");
    const [retry, setRetry] = useState(0);
    const [offset, setOffset] = useState(0);
    const [nextOffset, setNextOffset] = useState<number | null>(null);
    const sentinel = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (state !== "ready" || nextOffset === null || !sentinel.current) return;
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) setOffset(nextOffset);
        }, { rootMargin: "200px" });
        observer.observe(sentinel.current);
        return () => observer.disconnect();
    }, [state, nextOffset]);
    useEffect(() => {
        const controller = new AbortController();
        setState("loading");
        if (offset === 0) setItems([]);
        fetch("/api/rooms/" + encodeURIComponent(code) + "/related?offset=" + offset, { signal: controller.signal }).then(async (response) => { if (!response.ok)
            throw Error(); return response.json(); }).then(data => { if (controller.signal.aborted)
            return; if (data.videoId !== videoId) {
            setState("error");
            return;
        } setItems(previous => {
            const base = offset === 0 ? [] : previous;
            const ids = new Set(base.map(item => item.id));
            return [...base, ...data.items.filter((item: VideoItem) => item.id !== videoId && !ids.has(item.id))];
        }); setNextOffset(data.nextOffset ?? null); setState("ready"); }).catch(() => { if (!controller.signal.aborted)
            setState("error"); });
        return () => controller.abort();
    }, [code, videoId, retry, offset]);
    return <section className="space-y-3" aria-label={t("Video liên quan")}><h2 className="font-semibold">{t("Video liên quan")}</h2>
 {state === "loading" && !items.length ? <div role="status"><span className="sr-only">{t("Đang tải đề xuất...")}</span><div aria-hidden="true" className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="aspect-video rounded-xl"/>)}</div></div> : state === "error" && !items.length ? <Button variant="outline" onClick={() => setRetry(v => v + 1)}>{t("Thử lại")}</Button> : !items.length ? <p className="text-sm text-muted-foreground">{t("Chưa có video gợi ý.")}</p> : <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-3">{items.filter(item => item.id !== videoId).map(item => <article key={item.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
    <Image src={item.thumbnail} alt="" width={640} height={360} sizes="(max-width: 540px) 100vw, (max-width: 1023px) 50vw, 360px" className="aspect-video w-full object-cover"/>
    <div className="flex flex-1 flex-col gap-2 p-2.5">
        <h3 className="line-clamp-2 text-sm font-medium" title={item.title}>{item.title}</h3>
        <p className="truncate text-xs text-muted-foreground">{item.channel}</p>
        <div className="mt-auto flex items-center gap-1 pt-1">
            <Button variant="secondary" className="min-h-11 min-w-0 flex-1 gap-1 px-2 text-xs" disabled={enqueueDisabled || pending.includes(item.id)} aria-label={t("Thêm vào hàng đợi") + ": " + item.title} onClick={() => void enqueue(item)}>
                {pending.includes(item.id) ? <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin"/> : <ListPlus aria-hidden="true" className="h-4 w-4 shrink-0"/>}
                <span className="whitespace-normal">{t("Thêm vào hàng đợi")}</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" disabled={disabled} title={t("Phát ngay")} aria-label={t("Phát ngay") + ": " + item.title} onClick={() => onPick(item)}><Play aria-hidden="true" className="h-4 w-4"/></Button>
        </div>
    </div>
</article>)}</div>}
    <div ref={sentinel} className="flex justify-center" aria-live="polite">
        {items.length > 0 && (state === "loading" ? <span className="text-sm text-muted-foreground">{t("Đang tải đề xuất...")}</span> : state === "error" ? <Button variant="outline" onClick={() => setRetry(value => value + 1)}>{t("Thử lại")}</Button> : nextOffset !== null ? <Button variant="outline" onClick={() => setOffset(nextOffset)}>{t("Tải thêm video")}</Button> : null)}
    </div>
    </section>;
}
