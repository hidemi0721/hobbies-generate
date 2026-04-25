"use client";

import { useState, useEffect } from "react";
import { openAppLink } from "@/lib/appLink";

// ─── DNA Builder 定数 ─────────────────────────────
const DNA_LS_KEY = "nostalgi_core_dna_v1";

const uid = () => Math.random().toString(36).slice(2, 9);

type DnaTag  = { id: string; text: string; selected: boolean };
type DnaMode = "dynamic" | "static";
type DnaCatKey = "genre" | "inst" | "atm" | "rhythm";

const FIXED_VOCAL = "Transparent breathy female vocals, whispery, fragile";
const FIXED_WORLD = "Nostalgic, lonely, melancholic";

const MODE_PRIORITY: Record<DnaMode, string[]> = {
  dynamic: ["Progressive House", "Complextro", "Kawaii Future Bass", "Technical Rock/Guitar"],
  static:  ["Ambient", "Minimalist Electronica", "Decadent Lofi", "Mechanical sounds"],
};

const INIT_GENRE: Record<DnaMode, string[]> = {
  dynamic: ["iMeiden-style", "Electro House", "Math Rock"],
  static:  ["NieR-style", "Chillhop", "Glitch"],
};
const INIT_INST: Record<DnaMode, string[]> = {
  dynamic: ["Technical Distorted Guitar", "808 Bass", "Arpeggio Synths"],
  static:  ["Felt Piano", "Environmental Noise", "Acoustic Guitar"],
};
const INIT_ATM: Record<DnaMode, string[]> = {
  dynamic: ["Cinematic Atmosphere", "Analog Warmth", "Drive", "Electric Crackle", "Euphoric"],
  static:  ["Cinematic Atmosphere", "Vinyl Crackle", "Deep Reverb", "Bittersweet", "Fragile"],
};
const INIT_RHYTHM = ["Swing", "Double-time"];

type DnaState = {
  mode: DnaMode;
  vocalOn: boolean;
  bpm: string;
  priority: Record<DnaMode, DnaTag[]>;
  genre: DnaTag[];
  inst: DnaTag[];
  atm: DnaTag[];
  rhythm: DnaTag[];
};

function makeTags(texts: string[], sel = false): DnaTag[] {
  return texts.map(t => ({ id: uid(), text: t, selected: sel }));
}

function initDna(mode: DnaMode): DnaState {
  return { mode, vocalOn: true, bpm: "",
    priority: {
      dynamic: makeTags(MODE_PRIORITY.dynamic, true),
      static:  makeTags(MODE_PRIORITY.static, true),
    },
    genre:  makeTags(INIT_GENRE[mode]),
    inst:   makeTags(INIT_INST[mode]),
    atm:    makeTags(INIT_ATM[mode]),
    rhythm: makeTags(INIT_RHYTHM),
  };
}

function buildPrompt(s: DnaState): string {
  const parts: string[] = [];
  if (s.vocalOn) parts.push(FIXED_VOCAL);
  parts.push(FIXED_WORLD);
  s.priority[s.mode].filter(t => t.selected).forEach(t => parts.push(t.text));
  [...s.genre, ...s.inst, ...s.atm, ...s.rhythm]
    .filter(t => t.selected).forEach(t => parts.push(t.text));
  if (s.bpm.trim()) parts.push(`${s.bpm.trim()} BPM`);
  if (!s.vocalOn) parts.push("Instrumental");
  return parts.join(", ");
}

// ─── DNA Builder コンポーネント ────────────────────
function SunoPromptBuilder({ onPromptChange }: { onPromptChange: (p: string) => void }) {
  const [dna,           setDna]           = useState<DnaState | null>(null);
  const [inputs,        setInputs]        = useState<Record<DnaCatKey, string>>({ genre:"", inst:"", atm:"", rhythm:"" });
  const [priorityInput, setPriorityInput] = useState("");
  const [copied,        setCopied]        = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DNA_LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DnaState;
        if (!parsed.priority) {
          parsed.priority = {
            dynamic: makeTags(MODE_PRIORITY.dynamic, true),
            static:  makeTags(MODE_PRIORITY.static, true),
          };
        }
        setDna(parsed);
      } else {
        setDna(initDna("dynamic"));
      }
    } catch { setDna(initDna("dynamic")); }
  }, []);

  useEffect(() => {
    if (!dna) return;
    try { localStorage.setItem(DNA_LS_KEY, JSON.stringify(dna)); } catch {}
    onPromptChange(buildPrompt(dna));
  }, [dna, onPromptChange]);

  const switchMode = (m: DnaMode) => setDna(p => p && p.mode !== m
    ? { ...p, mode: m, genre: makeTags(INIT_GENRE[m]), inst: makeTags(INIT_INST[m]), atm: makeTags(INIT_ATM[m]) }
    : p
  );

  const togglePriority = (id: string) =>
    setDna(p => p ? { ...p, priority: { ...p.priority, [p.mode]: p.priority[p.mode].map(t => t.id === id ? { ...t, selected: !t.selected } : t) } } : p);

  const delPriority = (id: string) =>
    setDna(p => p ? { ...p, priority: { ...p.priority, [p.mode]: p.priority[p.mode].filter(t => t.id !== id) } } : p);

  const addPriority = () => {
    const text = priorityInput.trim();
    if (!text) return;
    setDna(p => p ? { ...p, priority: { ...p.priority, [p.mode]: [...p.priority[p.mode], { id: uid(), text, selected: true }] } } : p);
    setPriorityInput("");
  };

  const toggleTag = (cat: DnaCatKey, id: string) =>
    setDna(p => p ? { ...p, [cat]: p[cat].map(t => t.id === id ? { ...t, selected: !t.selected } : t) } : p);

  const delTag = (cat: DnaCatKey, id: string) =>
    setDna(p => p ? { ...p, [cat]: p[cat].filter(t => t.id !== id) } : p);

  const addTag = (cat: DnaCatKey) => {
    const text = inputs[cat].trim();
    if (!text) return;
    setDna(p => p ? { ...p, [cat]: [...p[cat], { id: uid(), text, selected: true }] } : p);
    setInputs(p => ({ ...p, [cat]: "" }));
  };

  const copy = async () => {
    if (!dna) return;
    await navigator.clipboard.writeText(buildPrompt(dna));
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  if (!dna) return null;

  const prompt = buildPrompt(dna);

  const CAT_CONFIG: { key: DnaCatKey; label: string }[] = [
    { key: "genre",  label: "GENRE FUSION" },
    { key: "inst",   label: "INSTRUMENTATION" },
    { key: "atm",    label: "ATMOSPHERE / TEXTURE" },
    { key: "rhythm", label: "RHYTHM MODIFIER" },
  ];

  return (
    <div className="font-mono flex flex-col gap-4 rounded-2xl bg-gray-100 dark:bg-[#080810] p-4 sm:p-6 border border-gray-200 dark:border-white/[0.06]">

      {/* ── ヘッダー & モードトグル ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 pb-4 border-b border-gray-200 dark:border-white/[0.06]">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] tracking-[0.25em] text-gray-400 dark:text-white/25 uppercase mb-0.5">Suno Style Prompt</p>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            NOSTALGI-CORE DNA BUILDER
          </h2>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => switchMode("dynamic")}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold tracking-wider border transition-all ${
              dna.mode === "dynamic"
                ? "bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-900/40"
                : "bg-transparent border-gray-300 dark:border-white/10 text-gray-400 dark:text-white/30 hover:border-gray-400 dark:hover:border-white/20"
            }`}
          >動 Dynamic</button>
          <div className="relative w-14 h-7 shrink-0" onClick={() => switchMode(dna.mode === "dynamic" ? "static" : "dynamic")}>
            <div className={`absolute inset-0 rounded-full transition-colors cursor-pointer ${dna.mode === "dynamic" ? "bg-orange-500" : "bg-cyan-500"}`} />
            <div className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all cursor-pointer ${dna.mode === "dynamic" ? "left-1" : "left-8"}`} />
          </div>
          <button
            onClick={() => switchMode("static")}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold tracking-wider border transition-all ${
              dna.mode === "static"
                ? "bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-900/40"
                : "bg-transparent border-gray-300 dark:border-white/10 text-gray-400 dark:text-white/30 hover:border-gray-400 dark:hover:border-white/20"
            }`}
          >静 Static</button>
        </div>
      </div>

      {/* ── Fixed Core ── */}
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] tracking-[0.2em] text-gray-400 dark:text-white/25 uppercase">Fixed Core</span>
          <button
            onClick={() => setDna(p => p ? { ...p, vocalOn: !p.vocalOn } : p)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold tracking-wider transition-all ${
              dna.vocalOn
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400"
                : "bg-gray-100 dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.06] text-gray-400 dark:text-white/25"
            }`}
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${dna.vocalOn ? "bg-emerald-500" : "bg-gray-400 dark:bg-white/20"}`} />
            VOCAL {dna.vocalOn ? "ON" : "OFF"}
          </button>
        </div>
        <div className="flex flex-col gap-1.5 text-xs leading-relaxed">
          <p className={`transition-opacity ${dna.vocalOn ? "text-gray-700 dark:text-white/70" : "text-gray-300 dark:text-white/20 line-through"}`}>
            <span className="text-gray-400 dark:text-white/25 mr-1.5">VOC</span>{FIXED_VOCAL}
          </p>
          <p className="text-gray-700 dark:text-white/70">
            <span className="text-gray-400 dark:text-white/25 mr-1.5">ATM</span>{FIXED_WORLD}
          </p>
          {!dna.vocalOn && (
            <p className="text-amber-600 dark:text-amber-400">
              <span className="text-gray-400 dark:text-white/25 mr-1.5">INJ</span>Instrumental
            </p>
          )}
        </div>
      </div>

      {/* ── Mode Priority ── */}
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[10px] tracking-[0.2em] text-gray-400 dark:text-white/25 uppercase">Mode Priority</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${dna.mode === "dynamic" ? "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400" : "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400"}`}>
            {dna.mode === "dynamic" ? "動" : "静"}
          </span>
          <span className="text-[10px] text-gray-300 dark:text-white/15 ml-auto">モード別に独立保存</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {dna.priority[dna.mode].map(tag => (
            <div key={tag.id} className="relative flex items-center">
              <button
                onClick={() => togglePriority(tag.id)}
                className={`pl-2.5 pr-6 py-1 rounded-lg text-xs border transition-all select-none ${
                  tag.selected
                    ? dna.mode === "dynamic"
                      ? "bg-orange-500 border-orange-400 text-white shadow-sm"
                      : "bg-cyan-500 border-cyan-400 text-white shadow-sm"
                    : "bg-gray-100 dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.07] text-gray-500 dark:text-white/40 hover:border-gray-300 dark:hover:border-white/15 hover:text-gray-700 dark:hover:text-white/70"
                }`}
              >{tag.text}</button>
              <button
                onClick={() => delPriority(tag.id)}
                className="absolute right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/20 hover:bg-red-500 text-white text-[9px] font-bold leading-none transition-colors"
              >×</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={priorityInput}
            onChange={e => setPriorityInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addPriority()}
            placeholder="+ add priority tag..."
            className="flex-1 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-white/15 focus:outline-none focus:border-orange-500 dark:focus:border-cyan-500"
          />
          <button
            onClick={addPriority}
            disabled={!priorityInput.trim()}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.08] disabled:opacity-30 text-gray-500 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/60 text-xs font-semibold transition-colors"
          >ADD</button>
        </div>
      </div>

      {/* ── カテゴリー群 ── */}
      {CAT_CONFIG.map(({ key, label }) => (
        <div key={key} className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-3 sm:p-4">
          <span className="text-[10px] tracking-[0.2em] text-gray-400 dark:text-white/25 uppercase block mb-2.5">{label}</span>
          {key === "rhythm" && (
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs text-gray-400 dark:text-white/25">BPM</span>
              <input
                type="number" min={1} max={300}
                value={dna.bpm}
                onChange={e => setDna(p => p ? { ...p, bpm: e.target.value } : p)}
                placeholder="170"
                className="w-20 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] rounded-lg px-2.5 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-white/20 focus:outline-none focus:border-indigo-500 tabular-nums"
              />
              {dna.bpm && (
                <span className={`text-xs font-bold ${dna.mode === "dynamic" ? "text-orange-600 dark:text-orange-400" : "text-cyan-600 dark:text-cyan-400"}`}>{dna.bpm} BPM</span>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {dna[key].map(tag => (
              <div key={tag.id} className="relative flex items-center">
                <button
                  onClick={() => toggleTag(key, tag.id)}
                  className={`pl-3 pr-7 py-1.5 rounded-lg text-xs font-medium border transition-all select-none ${
                    tag.selected
                      ? dna.mode === "dynamic"
                        ? "bg-orange-500 border-orange-400 text-white shadow-sm"
                        : "bg-cyan-500 border-cyan-400 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.07] text-gray-500 dark:text-white/40 hover:border-gray-300 dark:hover:border-white/15 hover:text-gray-700 dark:hover:text-white/70"
                  }`}
                >{tag.text}</button>
                <button
                  onClick={() => delTag(key, tag.id)}
                  className="absolute right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/20 hover:bg-red-500 text-white text-[9px] font-bold leading-none transition-colors"
                >×</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={inputs[key]}
              onChange={e => setInputs(p => ({ ...p, [key]: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && addTag(key)}
              placeholder="+ add tag..."
              className="flex-1 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-white/15 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => addTag(key)}
              disabled={!inputs[key].trim()}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.08] disabled:opacity-30 text-gray-500 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/60 text-xs font-semibold transition-colors"
            >ADD</button>
          </div>
        </div>
      ))}

      {/* ── プロンプト出力 ── */}
      <div className={`rounded-xl border p-3 sm:p-4 ${
        dna.mode === "dynamic"
          ? "border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/20"
          : "border-cyan-200 dark:border-cyan-900/50 bg-cyan-50 dark:bg-cyan-950/20"
      }`}>
        <div className="flex items-center justify-between mb-2.5">
          <span className={`text-[10px] tracking-[0.2em] uppercase ${dna.mode === "dynamic" ? "text-orange-400 dark:text-orange-400/70" : "text-cyan-400 dark:text-cyan-400/70"}`}>Generated Prompt</span>
          <div className="flex gap-2">
            <button onClick={() => openAppLink("https://suno.com")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                dna.mode === "dynamic"
                  ? "text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-700/50 hover:bg-orange-100 dark:hover:bg-orange-900/40"
                  : "text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-700/50 hover:bg-cyan-100 dark:hover:bg-cyan-900/40"
              }`}>
              SUNO ↗
            </button>
            <button onClick={copy}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors min-w-[72px] text-center ${
                copied
                  ? "bg-emerald-500 text-white border border-emerald-400"
                  : dna.mode === "dynamic"
                    ? "bg-orange-500 hover:bg-orange-400 text-white border border-orange-400"
                    : "bg-cyan-500 hover:bg-cyan-400 text-white border border-cyan-400"
              }`}
            >{copied ? "✓ COPIED" : "COPY"}</button>
          </div>
        </div>
        <p className={`text-xs leading-relaxed break-all ${dna.mode === "dynamic" ? "text-gray-600 dark:text-orange-200/60" : "text-gray-600 dark:text-cyan-200/60"}`}>
          {prompt || <span className="italic text-gray-300 dark:text-white/15">Fixed core + mode priority は常に含まれます。タグを追加でさらにカスタマイズ...</span>}
        </p>
      </div>
    </div>
  );
}

// ─── 配信サービス定数 ─────────────────────────────
const DISTRIBUTORS = [
  { name: "Frekul", desc: "Apple Music・Spotify・Amazon Music 等に一括配信。国内アーティスト向け日本語サービス", href: "https://frekul.com/" },
];
const FREE_SERVICES = [
  { name: "DOVA-SYNDROME", desc: "動画・ゲーム向けフリーBGMサイト。申請フォームで審査あり", href: "https://dova-s.jp/make/" },
  { name: "魔王魂",        desc: "フリー素材として多くのクリエイターに利用される老舗サービス", href: "https://maou.audio/form/" },
  { name: "Pixabay Music", desc: "英語圏中心のCC0フリー音楽プラットフォーム", href: "https://pixabay.com/music/upload/" },
];

function ExternalLink({ name, desc, href }: { name: string; desc: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
      <div>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{name}</span>
        <p className="text-xs text-gray-400 dark:text-gray-500">{desc}</p>
      </div>
      <svg className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

// ─── メインページ ─────────────────────────────────
export default function MusicGenPage() {
  const [builtPrompt, setBuiltPrompt] = useState("");

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 tracking-tight">Music Generator</h1>
        <p className="text-gray-400 dark:text-gray-500 mb-6 sm:mb-8 text-sm">Sunoプロンプトを組み立てて音楽を生成</p>

        {/* ── Phase 1: DNA Builder ── */}
        <div className="mb-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-gray-100 dark:border-gray-800">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">NOSTALGI-CORE DNA BUILDER</h2>
          </div>
          <div className="px-4 sm:px-5 pb-4 sm:pb-5">
            <SunoPromptBuilder onPromptChange={setBuiltPrompt} />
            <div className="mt-4">
              <button onClick={() => openAppLink("https://suno.com")}
                className="text-xs text-indigo-600 font-semibold hover:underline">
                → Suno.com で音楽を生成してダウンロード
              </button>
            </div>
            {builtPrompt && (
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                プロンプトをコピーして Suno に貼り付けてください
              </p>
            )}
          </div>
        </div>

        {/* ── 配信 ── */}
        <div className="mb-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-gray-100 dark:border-gray-800">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">配信</h2>
          </div>
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 flex flex-col gap-6 pt-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">音楽ストア配信</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                Apple Music・Spotify・Amazon Music 等への配信は Frekul 経由で行います。
              </p>
              <div className="flex flex-col gap-2">
                {DISTRIBUTORS.map(d => <ExternalLink key={d.name} {...d} />)}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">フリー素材として配信</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                いずれも手動申請フォームのみ（API 非公開）。ダウンロードした音声ファイルで申請できます。
              </p>
              <div className="flex flex-col gap-2">
                {FREE_SERVICES.map(s => <ExternalLink key={s.name} {...s} />)}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
