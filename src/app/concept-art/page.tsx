"use client";

import { useState, useRef, useCallback } from "react";
import { resizeImage } from "@/lib/resizeImage";

type LayerResult = { key: string; label: string; url: string | null };
type Selections = { lighting: string; colorTone: string; atmosphere: string };

const LIGHTING_OPTIONS   = [{ value:"overcast",label:"日中・曇天" },{ value:"golden",label:"黄金時間帯" },{ value:"night",label:"夜景・灯り" },{ value:"dusk",label:"薄暮・夕暮れ" }];
const COLOR_OPTIONS      = [{ value:"neutral",label:"ニュートラル" },{ value:"warm",label:"ウォーム・琥珀" },{ value:"cool",label:"クール・ティール" },{ value:"mono",label:"モノクローム" }];
const ATMOSPHERE_OPTIONS = [{ value:"silent",label:"静寂・神秘的" },{ value:"mist",label:"霧・霞" },{ value:"rain",label:"雨・濡れた路面" },{ value:"neon",label:"ネオン・都市光" }];

function OptionGroup({ label, options, value, onChange }: {
  label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button key={opt.value} onClick={() => onChange(value === opt.value ? "" : opt.value)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              value === opt.value
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ConceptArtPage() {
  const [imageBase64,    setImageBase64]    = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState("image/jpeg");
  const [previewUrl,     setPreviewUrl]     = useState<string | null>(null);
  const [selections,     setSelections]     = useState<Selections>({ lighting:"", colorTone:"", atmosphere:"" });
  const [dragOver,       setDragOver]       = useState(false);
  const [generating,     setGenerating]     = useState(false);
  const [generatingLayers,setGeneratingLayers]=useState(false);
  const [result,         setResult]         = useState<string | null>(null);
  const [layers,         setLayers]         = useState<LayerResult[] | null>(null);
  const [error,          setError]          = useState<string | null>(null);
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveToLibrary = async (imageUrl: string, extraUrls: string[] = []) => {
    setSaving(true); setSaved(false);
    try {
      const label = [selections.lighting, selections.colorTone, selections.atmosphere].filter(Boolean).join(" · ");
      await fetch("/api/library/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "concept-art", title: label || "Cinematic Style", imageUrl, extraUrls, metadata: selections }),
      });
      setSaved(true);
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null); setLayers(null); setError(null);
    setImageBase64(null);
    resizeImage(file)
      .then(({ base64, mediaType }) => {
        setImageBase64(base64);
        setImageMediaType(mediaType);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "画像の読み込みに失敗しました");
        setPreviewUrl(null);
      });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0]; if (file) loadFile(file);
  }, [loadFile]);

  const post = async (mode: "single" | "layers") => {
    if (!imageBase64) return;
    const setter = mode === "layers" ? setGeneratingLayers : setGenerating;
    setter(true); setError(null);
    if (mode === "single") setResult(null); else setLayers(null);
    try {
      const res  = await fetch("/api/concept-art", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, imageMediaType, selections, mode }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      if (mode === "single") setResult(data.url); else setLayers(data.layers);
    } catch (e) { setError(e instanceof Error ? e.message : "Unexpected error"); }
    finally { setter(false); }
  };

  const isWorking = generating || generatingLayers;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 tracking-tight">Cinematic Photo Styler</h1>
        <p className="text-gray-400 dark:text-gray-500 mb-6 sm:mb-8 text-sm">
          写真をシネマティックな日本の雰囲気にスタイライズします
        </p>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
            <span className="font-bold shrink-0">Error:</span>
            <span className="break-all flex-1">{error}</span>
            <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Upload */}
        <div
          className={`w-full h-44 sm:h-52 rounded-2xl border-2 border-dashed transition-colors cursor-pointer flex items-center justify-center mb-6 overflow-hidden relative ${
            dragOver
              ? "border-gray-500 bg-gray-50 dark:bg-gray-800"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Uploaded" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-600">
              <UploadIcon />
              <span className="text-sm">写真をドラッグ＆ドロップ またはクリックして選択</span>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
        </div>

        {/* Option selectors */}
        <div className="flex flex-col gap-4 sm:gap-5 mb-6 sm:mb-8 p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <OptionGroup label="光と時間帯" options={LIGHTING_OPTIONS}   value={selections.lighting}   onChange={(v)=>setSelections(s=>({...s,lighting:v}))} />
          <OptionGroup label="色調"       options={COLOR_OPTIONS}      value={selections.colorTone}  onChange={(v)=>setSelections(s=>({...s,colorTone:v}))} />
          <OptionGroup label="雰囲気"     options={ATMOSPHERE_OPTIONS} value={selections.atmosphere} onChange={(v)=>setSelections(s=>({...s,atmosphere:v}))} />
        </div>

        {/* Generate buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8">
          <button onClick={() => post("single")} disabled={!imageBase64||isWorking}
            className="flex-1 py-3 rounded-xl bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed font-semibold text-sm transition-colors flex items-center justify-center gap-2 text-white dark:text-gray-900">
            {generating ? <><Spinner color="text-white dark:text-gray-900" />生成中...</> : "スタイライズ生成"}
          </button>
          <button onClick={() => post("layers")} disabled={!imageBase64||isWorking}
            className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed font-semibold text-sm transition-colors flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300">
            {generatingLayers ? <><Spinner color="text-gray-700 dark:text-gray-300" />生成中...</> : "レイヤー分け生成"}
          </button>
        </div>

        {/* Single skeleton */}
        {generating && !result && (
          <div className="w-full aspect-square max-w-2xl mx-auto rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse mb-8" />
        )}

        {/* Single result */}
        {result && (
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200">生成結果</h2>
              <a href={result} target="_blank" rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:underline">開く ↗</a>
              <button onClick={() => saveToLibrary(result)} disabled={saving}
                className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${saved ? "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400" : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950"}`}>
                {saving ? "保存中..." : saved ? "✓ 保存済み" : "📚 ライブラリに保存"}
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden max-w-2xl mx-auto shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result} alt="Styled" className="w-full" />
            </div>
          </div>
        )}

        {/* Layer skeletons */}
        {generatingLayers && !layers && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
            {["近景","中景","遠景"].map(l=>(
              <div key={l} className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-400 text-center">{l}</span>
                <div className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Layer results */}
        {layers && (
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200">レイヤー分け結果</h2>
              <button
                onClick={() => {
                  const urls = layers.map(l => l.url).filter(Boolean) as string[];
                  if (urls[0]) saveToLibrary(urls[0], urls.slice(1));
                }}
                disabled={saving}
                className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${saved ? "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400" : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950"}`}>
                {saving ? "保存中..." : saved ? "✓ 保存済み" : "📚 ライブラリに保存"}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {layers.map(layer=>(
                <div key={layer.key} className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center">{layer.label}</span>
                  <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-square shadow">
                    {layer.url
                      ? <img src={layer.url} alt={layer.label} className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                      : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">失敗</div>
                    }
                  </div>
                  {layer.url && (
                    <a href={layer.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:underline text-center">開く ↗</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner({ color="text-white" }: { color?: string }) {
  return (
    <svg className={`h-4 w-4 animate-spin ${color}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}
