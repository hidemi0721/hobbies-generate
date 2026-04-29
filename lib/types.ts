export type MusicSongInput = {
  title: string;
  artist: string;
  extraContext?: string;
};

export type MusicProposal = {
  title: string;
  concept: string;
  structure: string;
  tempoMood: string;
  instruments: string;
};

export type MusicItem = {
  id: string;
  type: "music";
  createdAt: string;
  tags?: string[];
  songInput: MusicSongInput;
  atmosphereDescription: string;
  genreHints: string[];
  proposals: MusicProposal[];
};

export type ArtComposition = {
  compositionDescription: string;
  elements: string[];
  lighting: string;
  mood: string;
  imagePrompt: string;
};

export type ArtItem = {
  id: string;
  type: "art";
  createdAt: string;
  tags?: string[];
  prompt: string;
  imageUrl?: string;
  revisedPrompt?: string;
  composition?: ArtComposition;
};

// ---- 描画スクリプト ----
export type DrawingScript = {
  id: string;
  type: "drawing-script";
  createdAt: string;
  tags?: string[];
  sourceImageName?: string; // 画像から生成した場合
  sourcePrompt?: string;    // テキストから生成した場合
  subject: string;
  poseAndAction: string;
  composition: string;
  background: string;
  lineStyle: string;
  detailNotes: string;
  generationPrompt: string; // 画像生成用英語プロンプト
  generatedImages?: string[]; // 生成済み線画URL
};

// ---- 音楽スクリプト ----
export type MusicScript = {
  id: string;
  type: "music-script";
  createdAt: string;
  tags?: string[];
  sourceTitle: string;
  sourceArtist: string;
  atmosphereDescription: string;
  genreHints: string[];
  bpm: string;
  key: string;
  timeSignature: string;
  structure: string;
  chordProgression: string;
  melodyOutline: string;
  instrumentation: string;
  sunoPrompt: string; // Suno/Udio用英語プロンプト
};

// ---- SNS ----
export type SnsPlatform = "twitter" | "instagram" | "youtube" | "bluesky";
export type SnsStatus = "draft" | "scheduled" | "posted";

export type SnsItem = {
  id: string;
  platform: SnsPlatform;
  status: SnsStatus;
  content: string;
  createdAt: string;
  scheduledAt?: string;
  postedAt?: string;
  linkedItemId?: string;
  tags?: string[];
};

export type StoredItem = MusicItem | ArtItem | DrawingScript | MusicScript;

export type ItemFilter = {
  type?: "music" | "art" | "drawing-script" | "music-script";
  search?: string;
  tags?: string[];
  sortBy?: "createdAt" | "type";
  sortDir?: "asc" | "desc";
};
