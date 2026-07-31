"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Link2, ArrowRight, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { GradientMesh } from "@/components/site/gradient-mesh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { extractYouTubeId } from "@/lib/youtube-url";
import { toast } from "@/hooks/use-toast";

const EXAMPLES = [
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://youtu.be/dQw4w9WgXcQ",
  "https://www.youtube.com/shorts/abcDEF12345",
  "dQw4w9WgXcQ",
];

export default function WatchInputPage() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const submit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const id = extractYouTubeId(value);
      if (!id) {
        toast({
          variant: "destructive",
          title: "Không nhận diện được link YouTube",
          description: "Hãy dán link đầy đủ (youtube.com/watch?v=... hoặc youtu.be/...).",
        });
        return;
      }
      router.push(`/watch/${id}`);
    },
    [router, value],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <GradientMesh />
      <SiteHeader />
      <main className="container flex-1 py-10">
        <Card className="mx-auto max-w-2xl">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <header className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-accent ring-1 ring-accent/20">
                <Sparkles className="h-3 w-3" />
                Xem nhanh
              </span>
              <h1 className="font-display text-2xl sm:text-3xl">Dán link YouTube để xem trên web</h1>
              <p className="text-sm text-muted-foreground">
                Hữu ích khi tìm kiếm không ra đúng video bạn cần. Hỗ trợ link
                thường, link rút gọn, Shorts, hoặc chỉ mã video (11 ký tự).
              </p>
            </header>

            <form onSubmit={submit} className="space-y-3">
              <label htmlFor="youtube-url" className="sr-only">
                Link YouTube
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="youtube-url"
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    autoFocus
                    spellCheck={false}
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="h-11 pl-9"
                    maxLength={2048}
                  />
                </div>
                <Button type="submit" size="lg" className="h-11 gap-1.5 px-5">
                  Xem
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Ví dụ hợp lệ
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setValue(example)}
                    className="rounded-full border border-ink/15 bg-panel px-3 py-1.5 text-xs text-ink transition hover:border-accent hover:text-accent"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Hoặc dùng thanh tìm kiếm chủ đề ở{" "}
              <Link href="/" className="text-accent underline-offset-2 hover:underline">
                trang chủ
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
