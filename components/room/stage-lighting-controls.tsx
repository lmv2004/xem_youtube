"use client";
import { useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/locale-provider";
import {
  normalizeStageLighting,
  stageLightingStyle,
  type StageLighting,
} from "@/lib/stage-lighting";

export function StageLightingRig() {
  return (
    <div className="concert-rig" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="concert-fixture">
          <i className={`concert-beam concert-beam-${i}`} />
        </span>
      ))}
    </div>
  );
}
const OPTIONS = {
  type: [
    ["beams", "Tia quét"],
    ["spots", "Đèn rọi"],
    ["wash", "Phủ sáng"],
  ],
  palette: [
    ["violet", "Tím · Xanh ngọc"],
    ["sunset", "Hoàng hôn"],
    ["ocean", "Đại dương"],
    ["forest", "Xanh lá"],
    ["rainbow", "Đa sắc"],
  ],
  motion: [
    ["static", "Tĩnh"],
    ["slow", "Chậm"],
    ["medium", "Vừa"],
    ["fast", "Nhanh"],
  ],
  pulse: [
    ["off", "Không chớp"],
    ["slow", "Chớp chậm"],
    ["medium", "Chớp vừa"],
    ["fast", "Chớp nhanh"],
  ],
} as const;
const LABELS = {
  type: "Kiểu đèn",
  palette: "Bảng màu",
  motion: "Tốc độ quét",
  pulse: "Nhịp chớp",
} as const;
export function StageLightingControls({
  value,
  onSave,
}: {
  value?: StageLighting;
  onSave: (value: StageLighting) => Promise<boolean>;
}) {
  const t = useTranslations();
  const id = useId();
  const current = useMemo(() => normalizeStageLighting(value), [value]);
  const [draft, setDraft] = useState(current);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (!dirty && !saving) setDraft(current);
  }, [current, dirty, saving]);
  function change<K extends keyof StageLighting>(
    key: K,
    value: StageLighting[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setStatus("");
  }
  return (
    <form
      className="space-y-3 rounded-xl border border-border bg-muted/20 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (saving || !dirty) return;
        setSaving(true);
        setStatus("");
        try {
          if (await onSave(draft)) {
            setDirty(false);
            setStatus(t("Đã cập nhật ánh sáng"));
          } else setStatus(t("Không lưu được ánh sáng. Hãy thử lại."));
        } catch {
          setStatus(t("Không lưu được ánh sáng. Hãy thử lại."));
        } finally {
          setSaving(false);
        }
      }}
    >
      <div>
        <h3 className="text-sm font-semibold">{t("Ánh sáng sân khấu")}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("Xem thử bên dưới. Bấm Áp dụng để cập nhật cho cả phòng.")}
        </p>
      </div>
      <div
        className="stage-light-surface relative isolate h-32 overflow-hidden rounded-lg bg-[#0b0c13]"
        data-light-type={draft.type}
        data-light-motion={draft.motion}
        data-light-pulse={draft.pulse}
        style={stageLightingStyle(draft) as CSSProperties}
      >
        <StageLightingRig />
        <div className="concert-backdrop" aria-hidden="true" />
        <span className="absolute bottom-2 left-3 text-[10px] text-slate-400">
          {t("Xem trước")}
        </span>
      </div>
      <fieldset
        disabled={saving}
        className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2"
      >
        {(Object.keys(OPTIONS) as (keyof typeof OPTIONS)[]).map((key) => (
          <label
            key={key}
            htmlFor={`${id}-${key}`}
            className="min-w-0 space-y-1.5 text-xs font-medium"
          >
            <span>{t(LABELS[key])}</span>
            <select
              id={`${id}-${key}`}
              aria-label={t(LABELS[key])}
              value={draft[key]}
              onChange={(e) =>
                change(key, e.target.value as StageLighting[typeof key])
              }
              className="h-11 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm"
            >
              {OPTIONS[key].map(([v, label]) => (
                <option key={v} value={v}>
                  {t(label)}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label
          htmlFor={`${id}-brightness`}
          className="col-span-full space-y-1 text-xs font-medium"
        >
          <span>
            {t("Độ sáng")} · {draft.brightness}%
          </span>
          <input
            id={`${id}-brightness`}
            type="range"
            min="20"
            max="100"
            step="5"
            value={draft.brightness}
            onChange={(e) => change("brightness", Number(e.target.value))}
            aria-valuetext={`${draft.brightness}%`}
            className="block h-11 w-full accent-primary"
          />
        </label>
      </fieldset>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("Chế độ giảm chuyển động trên thiết bị sẽ luôn dùng ánh sáng tĩnh.")}
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={saving || !dirty}
          onClick={() => {
            setDraft(current);
            setDirty(false);
            setStatus("");
          }}
        >
          {t("Hủy thay đổi")}
        </Button>
        <Button type="submit" size="sm" disabled={saving || !dirty}>
          {saving && (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          )}
          {t(saving ? "Đang lưu…" : "Áp dụng")}
        </Button>
      </div>
      {status && (
        <p role="status" className="text-xs text-muted-foreground">
          {status}
        </p>
      )}
    </form>
  );
}
