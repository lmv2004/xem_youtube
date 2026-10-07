import test from "node:test";
import assert from "node:assert/strict";
import { resolveLocale } from "./locale";
import { translate } from "./i18n";
import messages from "./translations.json";

test("explicit language overrides browser and country, invalid cookies do not", () => {
  assert.equal(resolveLocale("te", "vi-VN,en;q=0.8", "VN"), "te");
  assert.equal(resolveLocale("invalid", "en-GB", "VN"), "en");
});
test("browser language negotiation respects region, quality and exclusions", () => {
  assert.equal(
    resolveLocale(null, "en-US;q=0.5, te-IN;q=0.9, vi;q=0", "VN"),
    "te",
  );
  assert.equal(resolveLocale(null, "fr-FR,vi-VN;q=0.8,en;q=0.7", "FR"), "vi");
  assert.equal(resolveLocale(null, "en;q=0,te;q=0.8", "US"), "te");
});
test("country is only a fallback; India does not imply Telugu", () => {
  assert.equal(resolveLocale(null, null, "VN"), "vi");
  assert.equal(resolveLocale(null, null, "IN"), "en");
  assert.equal(resolveLocale(null, "te-IN", "US"), "te");
  assert.equal(resolveLocale(null, "en;q=NaN,vi;q=0.5", null), "vi");
  assert.equal(resolveLocale(null, null, null), "en");
});
test("all translations preserve placeholders and contain both languages", () => {
  const tokens = (s: string) =>
    [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const [key, value] of Object.entries(messages)) {
    for (const lang of ["en", "te"] as const) {
      assert.ok(value[lang].trim(), `${key}: ${lang}`);
      assert.deepEqual(tokens(value[lang]), tokens(key), `${key}: ${lang}`);
    }
  }
  assert.equal(
    translate("en", "Đưa {p0} lên", { p0: "My video" }),
    "Move My video up",
  );
  assert.equal(
    translate("vi", "Đưa {p0} lên", { p0: "My video" }),
    "Đưa My video lên",
  );
  assert.equal(translate("te", "Ngôn ngữ"), "భాష");
  assert.equal(translate("te", "User supplied title"), "User supplied title");
});
