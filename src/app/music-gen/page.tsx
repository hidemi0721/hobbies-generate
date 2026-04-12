"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { openAppLink } from "@/lib/appLink";
import { useFFmpeg } from "@/hooks/useFFmpeg";

// ─── 型定義 ───────────────────────────────────────
type Phase2Result = { imageUrl: string; videoUrl: string | null };
type ImgSource    = "generated" | "custom";

const uid = () => Math.random().toString(36).slice(2, 9);

// ─── DNA Builder 定数 ─────────────────────────────
const DNA_LS_KEY = "nostalgi_core_dna_v1";

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

// ─── テロップ生成 ──────────────────────────────────
function parseLyricLines(lyrics: string): string[] {
  return lyrics.split("\n").map(l=>l.trim()).filter(l=>l&&!/^\[.*\]$/.test(l));
}

// ─── FFmpeg で波形付き動画を生成 ──────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateVideoWithFFmpeg(
  ff: import("@ffmpeg/ffmpeg").FFmpeg,
  imgSrc: { type: "url"; url: string } | { type: "file"; file: File },
  audioFile: File,
  onProgress: (p: number) => void
): Promise<string> {
  onProgress(0);

  // ── 画像データ取得 ──────────────────────────────
  let imageBytes: Uint8Array;
  if (imgSrc.type === "url") {
    // COEP 環境では直接 fetch 不可のためプロキシ経由
    const res = await fetch(
      `/api/music-gen/proxy-image?url=${encodeURIComponent(imgSrc.url)}`
    );
    if (!res.ok) throw new Error("画像の取得に失敗しました（proxy）");
    imageBytes = new Uint8Array(await res.arrayBuffer());
  } else {
    imageBytes = new Uint8Array(await imgSrc.file.arrayBuffer());
  }

  // ── 音声データ取得 ──────────────────────────────
  const audioBytes = new Uint8Array(await audioFile.arrayBuffer());
  const audioExt   = (audioFile.name.split(".").pop() ?? "mp3").toLowerCase();
  const audioIn    = `input.${audioExt}`;

  // ── 仮想 FS に書き込み ──────────────────────────
  await ff.writeFile("input.png", imageBytes);
  await ff.writeFile(audioIn, audioBytes);

  // ── エンコード進捗リスナー ──────────────────────
  const onProg = ({ progress: p }: { progress: number }) =>
    onProgress(Math.round(Math.min(p, 1) * 100));
  ff.on("progress", onProg);

  try {
    // ── FFmpeg 実行 ──────────────────────────────
    // 画像を 1024x1024 にスケール→波形を下部に overlay
    await ff.exec([
      "-loop",  "1",     "-i", "input.png",
      "-i",     audioIn,
      "-filter_complex",
      // 画像を正方形に収めてパディング
      "[0:v]scale=1024:1024:force_original_aspect_ratio=decrease," +
      "pad=1024:1024:(ow-iw)/2:(oh-ih)/2:black[bg];" +
      // 音声波形（1024x200、インジゴ系グラデーション）
      "[1:a]showwaves=s=1024x200:mode=cline:colors=0x6366f1|0xa78bfa:scale=sqrt[waves];" +
      // 波形を画像下部に重ねる（y=824 → 1024-200=824）
      "[bg][waves]overlay=0:824",
      "-c:v",   "libx264",
      "-c:a",   "aac",
      "-pix_fmt", "yuv420p",  // モバイル互換
      "-crf",   "28",          // 品質（数値大＝軽量）
      "-b:a",   "128k",
      "-shortest",             // 音声が終わったら終了
      "output.mp4",
    ]);
  } finally {
    ff.off("progress", onProg);
  }

  // ── 結果読み出し ────────────────────────────────
  const data = await ff.readFile("output.mp4");
  const blob = new Blob(
    [data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer)],
    { type: "video/mp4" }
  );
  if (blob.size < 1000) throw new Error("動画の生成に失敗しました（出力が空です）");

  // ── 仮想 FS クリーンアップ ──────────────────────
  try { await ff.deleteFile("input.png"); } catch {}
  try { await ff.deleteFile(audioIn);     } catch {}
  try { await ff.deleteFile("output.mp4"); } catch {}

  onProgress(100);
  return URL.createObjectURL(blob);
}

// ─── (旧 canvas ベース実装は削除済み) ─────────────
async function createVideoBlob(
  imageUrl: string, audioUrl: string, lyricLines: string[],
  onProgress: (msg: string) => void
): Promise<Blob> {
  // canvas.captureStream / MediaRecorder は iOS Safari 非対応
  const testCanvas = document.createElement("canvas");
  if (typeof (testCanvas as HTMLCanvasElement & { captureStream?: () => MediaStream }).captureStream !== "function"
      || typeof window.MediaRecorder === "undefined") {
    throw new Error("お使いのブラウザは動画生成に対応していません。PCのChromeまたはFirefoxをご利用ください。");
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const audio = new Audio(audioUrl);
      if (!audioUrl.startsWith("blob:")) audio.crossOrigin = "anonymous";
      audio.onloadedmetadata = () => {
        const duration = audio.duration;
        if (!duration || !isFinite(duration)) {
          reject(new Error("音声の長さを取得できませんでした。別のファイルを試してください。")); return;
        }
        onProgress("録画準備中...");
        try {
          // ─── AudioContext はビジュアライザーのみに使用（録画ストリームには含めない）
          // これにより autoplay ブロック / AudioContext suspended の影響を受けず
          // canvas ストリームだけで確実に録画できる
          const freqData = new Uint8Array(64);
          let analyser: AnalyserNode | null = null;
          try {
            const audioCtx = new AudioContext();
            const source   = audioCtx.createMediaElementSource(audio);
            const an       = audioCtx.createAnalyser();
            an.fftSize = 128;
            analyser = an;
            source.connect(an); an.connect(audioCtx.destination);
            audioCtx.resume().catch(() => {});
          } catch { /* AudioContext 失敗は無視 — ビジュアライザーなしで続行 */ }

          // canvas ストリームのみで録画（audio を含めると mobile で空 blob になる）
          const canvasStream = canvas.captureStream(24);
          const mimeType = ["video/webm;codecs=vp8","video/webm","video/mp4",""].find(
            t => t === "" || MediaRecorder.isTypeSupported(t)
          ) ?? "";

          const recorder = new MediaRecorder(canvasStream, mimeType ? { mimeType } : {});
          const chunks: BlobPart[] = [];
          let finished = false;
          let animFrame = 0;

          const resolveBlob = () => {
            cancelAnimationFrame(animFrame);
            const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "video/webm" });
            if (blob.size < 1000) {
              reject(new Error("動画データの生成に失敗しました。このブラウザ・デバイスは非対応の可能性があります。"));
            } else {
              resolve(blob);
            }
          };

          const finish = () => {
            if (finished) return;
            finished = true;
            try { recorder.state !== "inactive" && recorder.stop(); } catch {}
            resolveBlob();
          };

          recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
          recorder.onstop = () => {
            if (finished) return;
            finished = true;
            resolveBlob();
          };
          recorder.start(500); // 500ms ごとにデータを収集

          // 音声再生（ビジュアライザー用。失敗しても続行）
          audio.play().catch(() => {});

          const startTime = Date.now();
          const BAR_COUNT = 64, BAR_GAP = 3;
          const BAR_W = (1024 - BAR_GAP * (BAR_COUNT + 1)) / BAR_COUNT;
          const VIZ_BOTTOM = 960, VIZ_MAX_H = 160;

          const tick = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            onProgress(`動画生成中... ${Math.min(Math.floor(elapsed / duration * 100), 99)}%`);

            ctx.drawImage(img, 0, 0, 1024, 1024);

            // ビジュアライザー描画
            if (analyser) {
              analyser.getByteFrequencyData(freqData);
            } else {
              // AudioContext なしの場合はサイン波ダミーアニメーション
              for (let i = 0; i < freqData.length; i++) {
                freqData[i] = Math.max(0, Math.sin(elapsed * 3 + i * 0.3) * 80 + 80) | 0;
              }
            }

            const bg = ctx.createLinearGradient(0, 750, 0, 1024);
            bg.addColorStop(0, "rgba(0,0,0,0)"); bg.addColorStop(.4, "rgba(0,0,0,.55)"); bg.addColorStop(1, "rgba(0,0,0,.8)");
            ctx.fillStyle = bg; ctx.fillRect(0, 750, 1024, 274);

            const step = Math.max(1, Math.floor(freqData.length / BAR_COUNT));
            for (let i = 0; i < BAR_COUNT; i++) {
              const barH = Math.max(freqData[Math.min(i * step, freqData.length - 1)] / 255 * VIZ_MAX_H, 2);
              const x = BAR_GAP + i * (BAR_W + BAR_GAP), y = VIZ_BOTTOM - barH;
              const g = ctx.createLinearGradient(0, VIZ_BOTTOM, 0, y);
              g.addColorStop(0, "rgba(99,102,241,.85)"); g.addColorStop(.6, "rgba(167,139,250,.9)"); g.addColorStop(1, "rgba(255,255,255,.95)");
              ctx.fillStyle = g;
              ctx.beginPath();
              const r = Math.min(3, BAR_W / 2);
              ctx.moveTo(x + r, y); ctx.lineTo(x + BAR_W - r, y);
              ctx.quadraticCurveTo(x + BAR_W, y, x + BAR_W, y + r);
              ctx.lineTo(x + BAR_W, VIZ_BOTTOM); ctx.lineTo(x, VIZ_BOTTOM); ctx.lineTo(x, y + r);
              ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.fill();
            }

            if (lyricLines.length > 0) {
              const line = lyricLines[Math.min(Math.floor(elapsed / duration * lyricLines.length), lyricLines.length - 1)];
              ctx.font = "bold 36px 'Hiragino Sans','Noto Sans JP',sans-serif";
              ctx.textAlign = "center"; ctx.shadowColor = "rgba(0,0,0,.9)"; ctx.shadowBlur = 10;
              ctx.fillStyle = "white"; ctx.fillText(line, 512, 1000); ctx.shadowBlur = 0;
            }

            if (elapsed < duration) {
              animFrame = requestAnimationFrame(tick);
            } else {
              // 録画終了
              audio.pause();
              try { recorder.requestData(); } catch {}
              setTimeout(() => {
                try { recorder.stop(); } catch { finish(); }
                setTimeout(finish, 5000); // onstop が来ない場合の最終フォールバック
              }, 600); // 最後の ondataavailable を待つ
            }
          };

          animFrame = requestAnimationFrame(tick);

          // 曲全体のタイムアウト（duration + 15秒）
          setTimeout(() => finish(), (duration + 15) * 1000);

        } catch(e) { reject(e); }
      };
      audio.onerror = () => reject(new Error("音声の読み込みに失敗しました"));
      audio.load();
    };
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.src = imageUrl;
  });
}

// ─── Phase 1: NOSTALGI-CORE DNA BUILDER ─────────────
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
        // マイグレーション: priority フィールドがない古いデータに対応
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
    const p = buildPrompt(dna);
    await navigator.clipboard.writeText(p);
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

        {/* 大型モードスイッチ */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => switchMode("dynamic")}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold tracking-wider border transition-all ${
              dna.mode === "dynamic"
                ? "bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-900/40"
                : "bg-transparent border-gray-300 dark:border-white/10 text-gray-400 dark:text-white/30 hover:border-gray-400 dark:hover:border-white/20"
            }`}
          >
            動 Dynamic
          </button>
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
          >
            静 Static
          </button>
        </div>
      </div>

      {/* ── Fixed Core ── */}
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] tracking-[0.2em] text-gray-400 dark:text-white/25 uppercase">Fixed Core</span>
          {/* Vocal Toggle */}
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

          {/* BPM input (rhythm のみ) */}
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

          {/* タグ */}
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

          {/* タグ追加 */}
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

// ─── メインページ ─────────────────────────────────
function MusicGenContent() {
  const searchParams = useSearchParams();
  const { status: ffStatus, encodeProgress, setEncodeProgress, load: loadFFmpeg } = useFFmpeg();

  // Phase 1
  const [builtPrompt, setBuiltPrompt] = useState("");
  const [phase1Done,  setPhase1Done]  = useState(false);

  // Phase 2 inputs
  const [audioFile,  setAudioFile]  = useState<File | null>(null);
  const [title,      setTitle]      = useState("");
  const [theme,      setTheme]      = useState("");
  const [lyrics,     setLyrics]     = useState("");
  const [audioDrag,  setAudioDrag]  = useState(false);
  const audioObjRef = useRef<string | null>(null);

  // Phase 2 画像ソース
  const [imgSource,     setImgSource]     = useState<ImgSource>("generated");
  const [customImgFile, setCustomImgFile] = useState<File | null>(null);
  const [customImgUrl,  setCustomImgUrl]  = useState<string | null>(null);
  const [imgDrag,       setImgDrag]       = useState(false);

  // Phase 2 result
  const [phase2Result, setPhase2Result] = useState<Phase2Result | null>(null);
  const [step2Loading, setStep2Loading] = useState(false);
  const [step2Status,  setStep2Status]  = useState("");

  // Phase 3
  const [ytConnected,   setYtConnected]   = useState(false);
  const [scConnected,   setScConnected]   = useState(false);
  const [privacy,       setPrivacy]       = useState("unlisted");
  const [ytLoading,     setYtLoading]     = useState(false);
  const [scLoading,     setScLoading]     = useState(false);
  const [youtubeUrl,    setYoutubeUrl]    = useState<string | null>(null);
  const [soundcloudUrl, setSoundcloudUrl] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (audioObjRef.current) URL.revokeObjectURL(audioObjRef.current);
    if (customImgUrl) URL.revokeObjectURL(customImgUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchParams.get("youtube_connected") === "1") setYtConnected(true);
    if (searchParams.get("sc_connected") === "1") setScConnected(true);
    const err = searchParams.get("youtube_error") ?? searchParams.get("sc_error");
    if (err) setError(`認証エラー: ${err}`);
  }, [searchParams]);

  // Phase 1 完了時にテーマを自動セット
  const proceedToPhase2 = () => {
    setPhase1Done(true);
    if (!theme) setTheme(builtPrompt);
  };

  // 音声ファイルをセット
  const applyAudio = useCallback((file: File) => {
    if (audioObjRef.current) URL.revokeObjectURL(audioObjRef.current);
    audioObjRef.current = URL.createObjectURL(file);
    setAudioFile(file);
  }, []);

  const onAudioDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setAudioDrag(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const isAudio = f.type.startsWith("audio/") || ["mp3","wav","m4a","aac","ogg","flac"].includes(ext);
    if (isAudio) applyAudio(f);
  }, [applyAudio]);

  const applyCustomImg = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (customImgUrl) URL.revokeObjectURL(customImgUrl);
    setCustomImgUrl(URL.createObjectURL(file));
    setCustomImgFile(file);
  }, [customImgUrl]);

  // Phase 2: 画像 + FFmpeg 動画生成
  const runPhase2 = async () => {
    if (!audioFile || !title.trim()) return;
    if (imgSource === "custom" && !customImgFile) {
      setError("カスタム画像を選択してください"); return;
    }
    setStep2Loading(true); setError(null); setPhase2Result(null); setEncodeProgress(0);
    try {
      // ── Step 1: 画像を準備 ──────────────────────
      let imageUrl: string;
      if (imgSource === "generated") {
        setStep2Status("DALL-E 3 でジャケット画像を生成中...");
        const iRes  = await fetch("/api/music-gen/image", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_prompt: theme || builtPrompt || title, title }),
        });
        const iData = await iRes.json();
        if (iData.error) throw new Error(iData.error);
        imageUrl = iData.url;
      } else {
        imageUrl = customImgUrl!; // カスタム画像のプレビュー URL（表示用）
      }

      // ── Step 2: FFmpeg をロード ──────────────────
      setStep2Status("FFmpeg をロード中...");
      const ff = await loadFFmpeg();

      // ── Step 3: FFmpeg で動画生成 ────────────────
      const imgSrcArg = imgSource === "generated"
        ? { type: "url"  as const, url: imageUrl }
        : { type: "file" as const, file: customImgFile! };

      const videoUrl = await generateVideoWithFFmpeg(
        ff, imgSrcArg, audioFile,
        (p) => {
          setEncodeProgress(p);
          setStep2Status(p < 100 ? `FFmpeg エンコード中... ${p}%` : "✅ 動画生成完了");
        }
      );

      setPhase2Result({ imageUrl, videoUrl });
      setStep2Status("✅ 動画生成完了");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setStep2Status("");
    } finally { setStep2Loading(false); }
  };

  // Phase 3: YouTube
  const runYouTube = async () => {
    if (!phase2Result?.videoUrl) return;
    setYtLoading(true); setError(null);
    try {
      const videoBlob = await fetch(phase2Result.videoUrl).then(r => r.blob());
      const form = new FormData();
      form.append("video", videoBlob, "music.mp4");
      form.append("title", title); form.append("description", theme); form.append("privacy", privacy);
      const data = await fetch("/api/music-gen/youtube/upload",{method:"POST",body:form}).then(r=>r.json());
      if (data.error) throw new Error(data.error);
      setYoutubeUrl(data.url);
    } catch(e) { setError(e instanceof Error ? e.message : "エラーが発生しました"); }
    finally { setYtLoading(false); }
  };

  // Phase 3: SoundCloud
  const runSoundCloud = async () => {
    if (!audioFile) return;
    setScLoading(true); setError(null);
    try {
      const form = new FormData();
      form.append("audio", audioFile, audioFile.name);
      form.append("title", title); form.append("description", theme);
      if (phase2Result?.imageUrl) {
        const r = await fetch(phase2Result.imageUrl);
        form.append("artwork", await r.blob(), "artwork.png");
      }
      const data = await fetch("/api/music-gen/soundcloud/upload",{method:"POST",body:form}).then(r=>r.json());
      if (data.error) throw new Error(data.error);
      setSoundcloudUrl(data.url);
    } catch(e) { setError(e instanceof Error ? e.message : "エラーが発生しました"); }
    finally { setScLoading(false); }
  };

  const phase2Done = !!phase2Result;
  const canGenerate = !!audioFile && !!title.trim();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 tracking-tight">Music Generator</h1>
        <p className="text-gray-400 dark:text-gray-500 mb-6 sm:mb-8 text-sm">Sunoプロンプトを組み立てて、生成した音楽から動画を作成・配信</p>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm flex gap-2">
            <span className="font-bold shrink-0">Error:</span>
            <span className="flex-1 break-all">{error}</span>
            <button onClick={()=>setError(null)} className="shrink-0 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* ── Phase 1: DNA Builder ── */}
        <Section num={1} title="NOSTALGI-CORE DNA BUILDER">
          <SunoPromptBuilder onPromptChange={setBuiltPrompt} />
          <div className="mt-4 flex items-center justify-between gap-4">
            <button onClick={() => openAppLink("https://suno.com")}
              className="text-xs text-indigo-600 font-semibold hover:underline text-left">
              → Suno.com で音楽を生成してダウンロード
            </button>
            <button onClick={proceedToPhase2}
              className="shrink-0 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors">
              Phase 2 へ進む →
            </button>
          </div>
          {phase1Done && (
            <p className="mt-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">
              ✅ Phase 2 のテーマに「{builtPrompt.slice(0,60)}{builtPrompt.length>60?"...":""}」をセットしました
            </p>
          )}
        </Section>

        {/* ── Phase 2: 音楽アップロード & 動画生成 ── */}
        <Section num={2} title="音楽をアップロード & 動画生成" locked={!phase1Done}>
          <div className="flex flex-col gap-4">
            {/* 音声ドロップゾーン */}
            <div
              onDragOver={e=>{e.preventDefault();setAudioDrag(true);}}
              onDragLeave={()=>setAudioDrag(false)}
              onDrop={onAudioDrop}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 sm:p-7 text-center transition-colors ${
                audioDrag?"border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30":"border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600"}`}
            >
              <span className="text-2xl">🎵</span>
              {audioFile
                ? <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{audioFile.name}</p>
                : <p className="text-sm text-gray-400 dark:text-gray-500">Sunoでダウンロードした音声をドロップ</p>
              }
              <label className="cursor-pointer rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 transition-colors">
                ファイルを選択
                <input type="file" accept="audio/*" className="hidden"
                  onChange={e=>{const f=e.target.files?.[0];if(f)applyAudio(f);}} />
              </label>
              <p className="text-xs text-gray-300 dark:text-gray-600">MP3 / WAV / M4A 対応</p>
            </div>

            {audioFile && audioObjRef.current && (
              <audio controls src={audioObjRef.current} className="w-full" />
            )}

            {/* メタデータ */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">タイトル <span className="text-red-400">*</span></label>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="楽曲のタイトル"
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">テーマ / イメージ（ジャケット生成に使用）</label>
              <textarea value={theme} onChange={e=>setTheme(e.target.value)} rows={2}
                placeholder="Phase 1 のプロンプトが自動入力されます"
                className="w-full resize-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">歌詞（動画テロップ用・任意）</label>
              <textarea value={lyrics} onChange={e=>setLyrics(e.target.value)} rows={4}
                placeholder={"[Verse]\n夜が来るたびに...\n\n[Chorus]\n輝く星よ..."}
                className="w-full resize-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
            </div>

            {/* ── 画像ソース選択 ── */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">動画に使用する画像</p>
              <div className="flex gap-3">
                {(["generated", "custom"] as ImgSource[]).map(src => (
                  <button key={src} onClick={() => setImgSource(src)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      imgSource === src
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                    }`}>
                    {src === "generated" ? "🎨 AI生成（DALL-E 3）" : "📁 カスタムアップロード"}
                  </button>
                ))}
              </div>

              {imgSource === "custom" && (
                <div
                  onDragOver={e => { e.preventDefault(); setImgDrag(true); }}
                  onDragLeave={() => setImgDrag(false)}
                  onDrop={e => { e.preventDefault(); setImgDrag(false); const f = e.dataTransfer.files[0]; if (f) applyCustomImg(f); }}
                  className={`relative flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-colors cursor-pointer ${
                    imgDrag ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30" : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                  onClick={() => document.getElementById("custom-img-input")?.click()}
                >
                  {customImgUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={customImgUrl} alt="custom" className="w-32 h-32 object-cover rounded-lg" />
                    : <><span className="text-2xl">🖼</span><p className="text-xs text-gray-400">画像をドロップ またはクリックして選択</p></>
                  }
                  <input id="custom-img-input" type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) applyCustomImg(f); }} />
                </div>
              )}
            </div>

            {/* ── FFmpeg ステータス ── */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 dark:text-gray-500">FFmpeg:</span>
              {ffStatus === "idle"    && <button onClick={loadFFmpeg} className="text-indigo-500 hover:underline font-semibold">事前ロード</button>}
              {ffStatus === "loading" && <span className="flex items-center gap-1 text-amber-500"><Spinner color="text-amber-500" />Loading...</span>}
              {ffStatus === "ready"   && <span className="text-emerald-500 font-semibold">✓ Ready</span>}
              {ffStatus === "error"   && <span className="text-red-500">✗ 失敗（CDN に接続できません）</span>}
              <span className="text-gray-300 dark:text-gray-700 ml-auto">生成ボタンを押すと自動でロードされます</span>
            </div>

            <button
              onClick={runPhase2}
              disabled={!canGenerate || step2Loading || (imgSource === "custom" && !customImgFile)}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
              {step2Loading ? <><Spinner />生成中...</> : "▶ 画像・動画を生成"}
            </button>

            {/* ── 進捗バー ── */}
            {step2Loading && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{step2Status}</span>
                  {encodeProgress > 0 && <span>{encodeProgress}%</span>}
                </div>
                {encodeProgress > 0 && (
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${encodeProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            {!step2Loading && step2Status && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{step2Status}</p>
            )}

            {phase2Result && (
              <div className="flex flex-col gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={phase2Result.imageUrl} alt="jacket" className="w-full max-w-xs rounded-xl shadow mx-auto" />
                {phase2Result.videoUrl && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">生成された動画（音声付き MP4）</p>
                    <video controls className="w-full rounded-xl" src={phase2Result.videoUrl} />
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* ── Phase 3: 配信 ── */}
        <Section num={3} title="配信" locked={!phase2Done}>
          <div className="flex flex-col gap-6">

            {/* ダウンロード */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">ダウンロード</p>
              <div className="flex flex-wrap gap-2">
                {audioFile && audioObjRef.current && (
                  <a href={audioObjRef.current} download={audioFile.name}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    🎵 音声
                  </a>
                )}
                {phase2Result?.imageUrl && (
                  <a href={phase2Result.imageUrl} download="jacket.png"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    🖼 ジャケット
                  </a>
                )}
                {phase2Result?.videoUrl && (
                  <a href={phase2Result.videoUrl} download="music_video.mp4"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    🎬 動画 (MP4)
                  </a>
                )}
              </div>
            </div>

            {/* YouTube */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">YouTube</p>
              {!ytConnected ? (
                <a href="/api/music-gen/youtube/auth"
                  className="block w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm text-center transition-colors">
                  Google アカウントと接続する
                </a>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {["unlisted（未公開リンク）","private（非公開）","public（公開）"].map(v=>{
                      const val=v.split("（")[0];
                      return (
                        <button key={val} onClick={()=>setPrivacy(val)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${privacy===val?"bg-gray-900 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                          {v}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={runYouTube} disabled={!phase2Result?.videoUrl||ytLoading}
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
                    {ytLoading?<><Spinner/>アップロード中...</>:"▶ YouTube にアップロード"}
                  </button>
                </div>
              )}
              {youtubeUrl && (
                <div className="mt-2 p-3 rounded-xl bg-green-50 border border-green-200">
                  <p className="text-xs font-semibold text-green-700 mb-1">✅ YouTube アップロード完了</p>
                  <a href={youtubeUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline break-all">{youtubeUrl}</a>
                </div>
              )}
            </div>

            {/* SoundCloud */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">SoundCloud</p>
              {!scConnected ? (
                <a href="/api/music-gen/soundcloud/auth"
                  className="block w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-semibold text-sm text-center transition-colors">
                  SoundCloud アカウントと接続する
                </a>
              ) : (
                <button onClick={runSoundCloud} disabled={!audioFile||scLoading}
                  className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
                  {scLoading?<><Spinner/>アップロード中...</>:"▶ SoundCloud にアップロード"}
                </button>
              )}
              {soundcloudUrl && (
                <div className="mt-2 p-3 rounded-xl bg-green-50 border border-green-200">
                  <p className="text-xs font-semibold text-green-700 mb-1">✅ SoundCloud アップロード完了</p>
                  <a href={soundcloudUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline break-all">{soundcloudUrl}</a>
                </div>
              )}
            </div>

            {/* 音楽ストア配信 */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">音楽ストア配信</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                Apple Music・Spotify・Amazon Music 等への配信は Frekul 経由で行います。
                ダウンロードした音声とジャケット画像をそのまま使用できます。
              </p>
              <div className="flex flex-col gap-2">
                {DISTRIBUTORS.map(d=>(
                  <ExternalLink key={d.name} name={d.name} desc={d.desc} href={d.href} />
                ))}
              </div>
            </div>

            {/* フリー素材配信 */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">フリー素材として配信</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                いずれも手動申請フォームのみ（API 非公開）。ダウンロードした音声ファイルで申請できます。
              </p>
              <div className="flex flex-col gap-2">
                {FREE_SERVICES.map(s=>(
                  <ExternalLink key={s.name} name={s.name} desc={s.desc} href={s.href} />
                ))}
              </div>
            </div>

          </div>
        </Section>

        {/* リセット */}
        <button
          onClick={()=>{
            setPhase1Done(false); setPhase2Result(null); setYoutubeUrl(null); setSoundcloudUrl(null);
            setAudioFile(null); setTitle(""); setTheme(""); setLyrics(""); setError(null); setStep2Status("");
          }}
          className="w-full mt-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
          🔄 リセット
        </button>
      </div>
    </div>
  );
}

// ─── 配信サービス定数 ─────────────────────────────
const DISTRIBUTORS = [
  { name:"Frekul", desc:"Apple Music・Spotify・Amazon Music 等に一括配信。国内アーティスト向け日本語サービス", href:"https://frekul.com/" },
];
const FREE_SERVICES = [
  { name:"DOVA-SYNDROME", desc:"動画・ゲーム向けフリーBGMサイト。申請フォームで審査あり", href:"https://dova-s.jp/make/" },
  { name:"魔王魂", desc:"フリー素材として多くのクリエイターに利用される老舗サービス", href:"https://maou.audio/form/" },
  { name:"Pixabay Music", desc:"英語圏中心のCC0フリー音楽プラットフォーム", href:"https://pixabay.com/music/upload/" },
];

// ─── 共通 UI ─────────────────────────────────────
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

function Section({ num, title, children, locked=false, dark=false }: {
  num:number; title:string; children:React.ReactNode; locked?:boolean; dark?:boolean;
}) {
  return (
    <div className={`mb-4 rounded-2xl border transition-colors ${
      locked ? "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-50"
      : dark  ? "border-gray-800 bg-gray-950"
      : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
    }`}>
      <div className={`flex items-center gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 ${dark?"border-b border-white/[0.06]":"border-b border-gray-100 dark:border-gray-800"}`}>
        <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{num}</span>
        <h2 className={`text-base font-semibold ${dark?"text-white":"text-gray-800 dark:text-white"}`}>{title}</h2>
        {locked && <span className="text-xs text-gray-400 ml-auto hidden sm:block">前のフェーズを完了してください</span>}
      </div>
      <div className="px-4 sm:px-5 pb-4 sm:pb-5">{children}</div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
}

export default function MusicGenPage() {
  return <Suspense><MusicGenContent /></Suspense>;
}
