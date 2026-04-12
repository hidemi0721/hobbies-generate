"use client";

import { useState, useRef, useCallback } from "react";
import { resizeImage } from "@/lib/resizeImage";

type Analysis = { artStyle:string; face:string; hair:string; skinTone:string; outfit:string; accessories:string; shadingStyle:string };
type Result = { urls: string[]; analysis: Analysis; prompt: string };

export default function PoseChangerPage() {
  const [charBase64,  setCharBase64]  = useState<string | null>(null);
  const [charMediaType,setCharMediaType]=useState("image/jpeg");
  const [charPreview, setCharPreview] = useState<string | null>(null);
  const [refBase64,   setRefBase64]   = useState<string | null>(null);
  const [refMediaType,setRefMediaType]= useState("image/jpeg");
  const [refPreview,  setRefPreview]  = useState<string | null>(null);
  const [poseText,    setPoseText]    = useState("");
  const [count,       setCount]       = useState(2);
  const [generating,  setGenerating]  = useState(false);
  const [result,      setResult]      = useState<Result | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [showDetail,  setShowDetail]  = useState(false);
  const [charDrag,    setCharDrag]    = useState(false);
  const [refDrag,     setRefDrag]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const charInputRef = useRef<HTMLInputElement>(null);
  const refInputRef  = useRef<HTMLInputElement>(null);

  const loadImage = useCallback((
    file: File,
    setBase64: (v: string) => void,
    setMediaType: (v: string) => void,
    setPreview: (v: string) => void
  ) => {
    if (!file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    setBase64("");
    resizeImage(file)
      .then(({ base64, mediaType }) => {
        setBase64(base64);
        setMediaType(mediaType);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "画像の読み込みに失敗しました");
      });
  }, []);

  const handleGenerate = async () => {
    if (!charBase64 || !poseText.trim()) return;
    setGenerating(true); setError(null); setResult(null);
    try {
      const res  = await fetch("/api/pose-changer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterBase64:charBase64, characterMediaType:charMediaType, poseText, poseRefBase64:refBase64??undefined, poseRefMediaType:refMediaType, count }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Unexpected error"); }
    finally { setGenerating(false); }
  };

  const saveToLibrary = async (urls: string[]) => {
    if (!urls[0]) return;
    setSaving(true); setSaved(false);
    try {
      await fetch("/api/library/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "pose", title: poseText.slice(0, 60) || "Pose Change", imageUrl: urls[0], extraUrls: urls.slice(1), metadata: { poseText } }),
      });
      setSaved(true);
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const dropProps = (
    drag: boolean, setDrag: (v:boolean)=>void,
    setB64: (v:string)=>void, setMt: (v:string)=>void, setPv: (v:string)=>void
  ) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDrag(true); },
    onDragLeave: () => setDrag(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault(); setDrag(false);
      const f = e.dataTransfer.files[0]; if (f) loadImage(f, setB64, setMt, setPv);
    },
  });

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 tracking-tight">Pose Changer</h1>
        <p className="text-gray-400 dark:text-gray-500 mb-6 sm:mb-8 text-sm">
          キャラクター画像をアップロードし、新しいポーズで再生成します
        </p>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
            <span className="font-bold shrink-0">Error:</span>
            <span className="break-all flex-1">{error}</span>
            <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Upload row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Character image */}
          <div className="flex flex-col gap-2 flex-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              キャラクター画像 <span className="text-red-400">*</span>
            </span>
            <div
              {...dropProps(charDrag,setCharDrag,setCharBase64,setCharMediaType,setCharPreview)}
              onClick={() => charInputRef.current?.click()}
              className={`h-44 sm:h-52 rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden flex items-center justify-center ${
                charDrag
                  ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
            >
              {charPreview
                ? <img src={charPreview} alt="character" className="w-full h-full object-contain" /> // eslint-disable-line @next/next/no-img-element
                : <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-600">
                    <UploadIcon /><span className="text-xs text-center">イラスト or 写真<br />をドロップ</span>
                  </div>
              }
              <input ref={charInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e)=>{ const f=e.target.files?.[0]; if(f) loadImage(f,setCharBase64,setCharMediaType,setCharPreview); }} />
            </div>
          </div>

          {/* Pose reference */}
          <div className="flex flex-col gap-2 flex-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              ポーズ参考画像 <span className="text-gray-300 dark:text-gray-600">（任意）</span>
            </span>
            <div
              {...dropProps(refDrag,setRefDrag,setRefBase64,setRefMediaType,setRefPreview)}
              onClick={() => refInputRef.current?.click()}
              className={`h-44 sm:h-52 rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden flex items-center justify-center ${
                refDrag
                  ? "border-purple-400 bg-purple-50 dark:bg-purple-950/30"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
            >
              {refPreview
                ? <div className="relative w-full h-full group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={refPreview} alt="pose ref" className="w-full h-full object-contain" />
                    <button
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      onClick={(e)=>{ e.stopPropagation(); setRefBase64(null); setRefPreview(null); }}
                    >✕</button>
                  </div>
                : <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-600">
                    <UploadIcon /><span className="text-xs text-center">参考ポーズ画像<br />をドロップ</span>
                  </div>
              }
              <input ref={refInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e)=>{ const f=e.target.files?.[0]; if(f) loadImage(f,setRefBase64,setRefMediaType,setRefPreview); }} />
            </div>
          </div>
        </div>

        {/* Pose + count + generate */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8 p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ポーズ指示</span>
            <textarea
              value={poseText} onChange={(e) => setPoseText(e.target.value)}
              placeholder="例：両手を広げてジャンプしているポーズ、座って膝を抱えているポーズ..."
              rows={3}
              className="resize-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">生成枚数</span>
              <div className="flex gap-1">
                {[1,2,3,4].map(n=>(
                  <button key={n} onClick={()=>setCount(n)}
                    className={`w-10 h-10 rounded-lg text-sm font-semibold transition-colors ${count===n?"bg-indigo-600 text-white":"text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleGenerate} disabled={!charBase64||!poseText.trim()||generating}
              className="flex-1 w-full sm:w-auto py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed font-semibold text-sm transition-colors flex items-center justify-center gap-2 text-white">
              {generating ? <><Spinner />解析・生成中（少々お待ちください）...</> : "ポーズ変更して生成"}
            </button>
          </div>
        </div>

        {/* Skeletons */}
        {generating && (
          <div className={`grid gap-4 mb-8 ${count===1?"grid-cols-1 max-w-sm mx-auto":"grid-cols-2"}`}>
            {Array.from({length:count}).map((_,i)=>(
              <div key={i} className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        )}

        {/* Results */}
        {result && result.urls.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200">生成結果</h2>
              <button onClick={() => saveToLibrary(result.urls)} disabled={saving}
                className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${saved ? "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400" : "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950"}`}>
                {saving ? "保存中..." : saved ? "✓ 保存済み" : "📚 ライブラリに保存"}
              </button>
            </div>
            <div className={`grid gap-4 ${result.urls.length===1?"grid-cols-1 max-w-sm mx-auto":"grid-cols-2"}`}>
              {result.urls.map((url,i)=>(
                <div key={i} className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 group aspect-square shadow">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Result ${i+1}`} className="w-full h-full object-cover" />
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-xs text-white px-2 py-1 rounded">
                    開く ↗
                  </a>
                  <span className="absolute top-2 left-2 bg-black/50 text-xs text-white px-2 py-0.5 rounded">#{i+1}</span>
                </div>
              ))}
            </div>

            {/* Detail toggle */}
            <div className="mt-4">
              <button onClick={()=>setShowDetail(v=>!v)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                {showDetail ? "▲ 詳細を隠す" : "▼ 解析・プロンプト詳細を見る"}
              </button>
              {showDetail && (
                <div className="mt-3 flex flex-col gap-3">
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">キャラクター解析結果</p>
                    <div className="flex flex-col gap-1">
                      {Object.entries(result.analysis).map(([k,v])=>v&&(
                        <p key={k} className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-gray-500 dark:text-gray-500">{k}:</span> {v}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">生成プロンプト</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{result.prompt}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}
