"use client";

import { useRef, useState, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

const CDN = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

export type FFmpegStatus = "idle" | "loading" | "ready" | "error";

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [status, setStatus]   = useState<FFmpegStatus>("idle");
  const [progress, setProgress] = useState(0);

  const load = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current; // 既にロード済み
    setStatus("loading");
    setProgress(0);
    try {
      const ffmpeg = new FFmpeg();

      ffmpeg.on("progress", ({ progress: p }) => {
        setProgress(Math.round(p * 100));
      });

      await ffmpeg.load({
        coreURL:   await toBlobURL(`${CDN}/ffmpeg-core.js`,   "text/javascript"),
        wasmURL:   await toBlobURL(`${CDN}/ffmpeg-core.wasm`, "application/wasm"),
      });

      ffmpegRef.current = ffmpeg;
      setStatus("ready");
      return ffmpeg;
    } catch (e) {
      console.error("[useFFmpeg] load failed:", e);
      setStatus("error");
      throw e;
    }
  }, []);

  return {
    ffmpeg:   ffmpegRef.current,
    status,
    progress,
    isLoading: status === "loading",
    isReady:   status === "ready",
    load,
  };
}
