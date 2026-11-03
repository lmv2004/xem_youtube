"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { VideoItem } from "@/lib/types";
export function RoomRelatedVideos({ code, videoId, onPick, disabled }: {
    code: string;
    videoId: string;
    onPick: (video: VideoItem) => unknown;
    disabled: boolean;
}) {
    const t = useTranslations();
    const [items, setItems] = useState<VideoItem[]>([]);
    const [state, setState] = useState("loading");
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setState("loading");
        setItems([]);
        fetch("/api/rooms/" + encodeURIComponent(code) + "/related", { signal: controller.signal }).then(async (response) => { if (!response.ok)
            throw Error(); return response.json(); }).then(data => { if (controller.signal.aborted)
            return; if (data.videoId !== videoId) {
            setState("error");
            return;
        } setItems(data.items); setState("ready"); }).catch(() => { if (!controller.signal.aborted)
            setState("error"); });
        return () => controller.abort();
    }, [code, videoId, retry]);
    return <section className="space-y-3" aria-label={t("Video liên quan")}><h2 className="font-semibold">{t("Video liên quan")}</h2>
 {state === "loading" ? <div role="status"><span className="sr-only">{t("Đang tải đề xuất...")}</span><div aria-hidden="true" className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="aspect-video rounded-xl"/>)}</div></div> : state === "error" ? <Button variant="outline" onClick={() => setRetry(v => v + 1)}>{t("Thử lại")}</Button> : !items.length ? <p className="text-sm text-muted-foreground">{t("Chưa có video gợi ý.")}</p> : <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">{items.filter(item => item.id !== videoId).map(item => <button key={item.id} type="button" disabled={disabled} onClick={() => onPick(item)} className="min-w-0 text-left disabled:opacity-60"><Image src={item.thumbnail} alt="" width={320} height={180} sizes="(max-width: 640px) 45vw, 240px" className="aspect-video w-full rounded-xl object-cover"/><span className="mt-2 line-clamp-2 text-sm font-medium">{item.title}</span><span className="block truncate text-xs text-muted-foreground">{item.channel}</span></button>)}</div>}</section>;
}
