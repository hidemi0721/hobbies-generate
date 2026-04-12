"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { resizeImage } from "@/lib/resizeImage";

const API_HEADERS = { "Content-Type": "application/json" };

type PromptFields = { shot: string; pose: string; hands: string; background: string };
type Generation = {
  id: string; prompt: string;
  original_image_url: string | null;
  generated_images_urls: string[];
  created_at: string;
};

const FIELD_LABELS: { key: keyof PromptFields; label: string; placeholder: string }[] = [
  { key: "shot",       label: "ショット・画角",   placeholder: "例：全身・正面・ローアングル" },
  { key: "pose",       label: "ポーズ・体の向き", placeholder: "例：体は右向き、膝を抱えて体育座り" },
  { key: "hands",      label: "手・視線",         placeholder: "例：視線は下、両手で膝を抱える" },
  { key: "background", label: "背景・環境",        placeholder: "例：室内、左にベッド、後方に窓" },
];
const EMPTY_FIELDS: PromptFields = { shot: "", pose: "", hands: "", background: "" };

export default function SketchGenPage() {
  const [fields,        setFields]        = useState<PromptFields>(EMPTY_FIELDS);
  const [previewUrl,    setPreviewUrl]    = useState<string | null>(null);
  const [analyzing,     setAnalyzing]     = useState(false);
  const [generating,    setGenerating]    = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [arrangingField,setArrangingField]= useState<keyof PromptFields | null>(null);
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
  const [count,         setCount]         = useState(4);
  const [imageSize,     setImageSize]     = useState("1024x1024");
  const [dragOver,      setDragOver]      = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [imageBase64,   setImageBase64]   = useState<string | null>(null);
  const [imageMediaType,setImageMediaType]= useState("image/jpeg");
  const [history,       setHistory]       = useState<Generation[]>([]);
  const [historyLoading,setHistoryLoading]= useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateField = (key: keyof PromptFields, value: string) =>
    setFields((f) => ({ ...f, [key]: value }));

  const combinedPrompt = FIELD_LABELS.map(({ key, label }) =>
    fields[key] ? `${label}：${fields[key]}` : ""
  ).filter(Boolean).join("。");

  const hasPrompt = Object.values(fields).some((v) => v.trim());

  const loadHistory = useCallback(async () => {
    try {
      const res  = await fetch("/api/generations");
      const data = await res.json();
      if (data.generations) setHistory(data.generations);
    } catch { /* ignore */ } finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const analyzeImage = useCallback(async (file: File) => {
    setAnalyzing(true); setError(null);
    setPreviewUrl(URL.createObjectURL(file));
    setFields(EMPTY_FIELDS);
    try {
      const { base64, mediaType } = await resizeImage(file);
      setImageBase64(base64); setImageMediaType(mediaType);
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像の読み込みに失敗しました");
      setPreviewUrl(null); setAnalyzing(false); return;
    }
    try {
      const fd = new FormData(); fd.append("image", file);
      const res  = await fetch("/api/analyze-image", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      if (data.fields) setFields({ ...EMPTY_FIELDS, ...data.fields });
    } catch (e) { setError(e instanceof Error ? e.message : "Unexpected error"); }
    finally { setAnalyzing(false); }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) analyzeImage(file);
  }, [analyzeImage]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) analyzeImage(file);
  }, [analyzeImage]);

  const handleGenerate = async () => {
    if (!hasPrompt) return;
    setGenerating(true); setError(null); setGeneratedUrls([]);
    try {
      const res  = await fetch("/api/generate-multi", {
        method: "POST", headers: API_HEADERS,
        body: JSON.stringify({ prompt: combinedPrompt, fields, count, imageBase64, imageMediaType, imageSize }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      if (data.urls?.length > 0) {
        setGeneratedUrls(data.urls);
        setSaving(true);
        fetch("/api/save-generation", {
          method: "POST", headers: API_HEADERS,
          body: JSON.stringify({ prompt: combinedPrompt, imageBase64, imageMediaType, generatedUrls: data.urls }),
        }).then(r=>r.json()).then(saved=>{
          if (saved.error) setError(`保存エラー: ${saved.error}`);
          else { if (saved.urls) setGeneratedUrls(saved.urls); loadHistory(); }
        }).finally(()=>setSaving(false));
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Unexpected error"); }
    finally { setGenerating(false); }
  };

  const handleArrangeField = async (targetField: keyof PromptFields) => {
    setArrangingField(targetField); setError(null);
    try {
      const res  = await fetch("/api/arrange-prompt", {
        method: "POST", headers: API_HEADERS,
        body: JSON.stringify({ fields, targetField }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      if (data.field && data.value !== undefined) setFields((f) => ({ ...f, [data.field]: data.value }));
    } catch (e) { setError(e instanceof Error ? e.message : "Unexpected error"); }
    finally { setArrangingField(null); }
  };

  const aspectClass =
    imageSize === "1024x1536" || imageSize === "768x1344" ? "aspect-[2/3]" :
    imageSize === "1536x1024" || imageSize === "1344x768" ? "aspect-[3/2]" : "aspect-square";

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">Sketch Generator</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 sm:mb-8 text-sm">
          Upload an image → edit prompt → generate rough sketch variations
        </p>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
            <span className="font-bold shrink-0">Error:</span>
            <span className="break-all flex-1">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto shrink-0 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Upload + Fields */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8 items-start">
          {/* Drop zone */}
          <div
            className={`w-full sm:w-56 sm:flex-shrink-0 h-48 sm:h-56 rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 ${
              dragOver
                ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400 bg-gray-50 dark:bg-gray-900"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <div className="relative w-full h-full rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Uploaded" className="w-full h-full object-cover" />
                {analyzing && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center flex-col gap-2">
                    <Spinner />
                    <span className="text-xs text-white">解析中...</span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <UploadIcon />
                <span className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">
                  ドラッグ＆ドロップ<br />またはクリック
                </span>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Structured fields */}
          <div className="flex-1 w-full flex flex-col gap-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI解析プロンプト</span>
            {FIELD_LABELS.map(({ key, label, placeholder }) => (
              <div key={key} className="flex items-start gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500 w-20 sm:w-24 pt-2 shrink-0 text-right">{label}</span>
                <input
                  type="text" value={fields[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  placeholder={analyzing ? "解析中..." : placeholder}
                  disabled={analyzing}
                  className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                />
                <button
                  onClick={() => handleArrangeField(key)}
                  disabled={analyzing || arrangingField !== null}
                  title="AIにアレンジ"
                  className="mt-1 p-1.5 rounded-lg text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-purple-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {arrangingField === key ? <Spinner small color="text-purple-600" /> : <WandIcon />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Count + Size + Generate */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-wrap">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
            <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">生成枚数</span>
            <div className="flex gap-1">
              {[1,2,3,4,5].map((n) => (
                <button key={n} onClick={() => setCount(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${count===n?"bg-indigo-600 text-white":"text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
            <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">縦横比</span>
            <div className="flex gap-1 flex-wrap">
              {[{label:"1:1",value:"1024x1024"},{label:"3:4",value:"1024x1536"},{label:"4:3",value:"1536x1024"},{label:"9:16",value:"768x1344"},{label:"16:9",value:"1344x768"}].map(s=>(
                <button key={s.value} onClick={()=>setImageSize(s.value)}
                  className={`px-2.5 h-9 rounded-lg text-xs font-semibold transition-colors ${imageSize===s.value?"bg-indigo-600 text-white":"text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleGenerate} disabled={!hasPrompt||generating}
            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-base transition-colors flex items-center justify-center gap-3 text-white">
            {generating ? <><Spinner />{count}枚生成中...</> : `ラフスケッチを${count}枚生成`}
          </button>
        </div>

        {/* Skeleton */}
        {generating && (
          <div className={`grid gap-4 mb-8 sm:mb-12 ${count===1?"grid-cols-1 max-w-md mx-auto":"grid-cols-2"}`}>
            {[...Array(count)].map((_,i)=>(
              <div key={i} className={`rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse ${aspectClass}`} />
            ))}
          </div>
        )}

        {/* Results */}
        {generatedUrls.length > 0 && (
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">生成結果</h2>
              {saving && (
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Spinner small color="text-gray-400" />保存中...
                </span>
              )}
            </div>
            <div className={`grid gap-4 ${generatedUrls.length===1?"grid-cols-1 max-w-md mx-auto":"grid-cols-2"}`}>
              {generatedUrls.map((url,i)=>(
                <div key={i} className={`relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 group ${aspectClass}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Generated ${i+1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-xs text-white px-2 py-1 rounded">
                    開く
                  </a>
                  <span className="absolute top-2 left-2 bg-black/60 text-xs text-gray-300 px-2 py-0.5 rounded">#{i+1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-6 sm:pt-8">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">過去のスケッチ履歴</h2>
          {historyLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Spinner small color="text-gray-400" />読み込み中...
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400">まだ履歴がありません</p>
          ) : (
            <div className="flex flex-col gap-6 sm:gap-8">
              {history.map((gen)=>(
                <div key={gen.id} className="flex gap-3 sm:gap-4 items-start">
                  <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    {gen.original_image_url
                      ? <img src={gen.original_image_url} alt="original" className="w-full h-full object-cover" />  // eslint-disable-line @next/next/no-img-element
                      : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">なし</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-1 truncate">{gen.prompt||"—"}</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600 mb-2">
                      {new Date(gen.created_at).toLocaleString("ja-JP",{dateStyle:"short",timeStyle:"short"})}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {gen.generated_images_urls.map((url,i)=>(
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="block w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 transition-colors flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`gen-${i}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner({ small, color="text-white" }: { small?: boolean; color?: string }) {
  return (
    <svg className={`${small?"h-3 w-3":"h-4 w-4"} animate-spin ${color}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg className="h-10 w-10 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}
function WandIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}
