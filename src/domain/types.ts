export type WritingMode = "horizontal" | "vertical";
export type EditorTool = "select" | "draw";
export type PoetrySource = "library" | "custom";

export interface Point { x: number; y: number; }
export interface CanvasBackground { kind: "solid"; width: number; height: number; color: string; }

export interface TextRegion {
  id: string;
  points: Point[];
  poetrySource: PoetrySource;
  poemId?: string;
  text: string;
  writingMode: WritingMode;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineSpacing: number;
  letterSpacing: number;
  padding: number;
  maxWords: number;
  color: string;
  fillColor: string;
  repeatFill: boolean;
  contourColor: string;
  contourWidth: number;
}

export interface EditorDocument {
  background: CanvasBackground;
  regions: TextRegion[];
  showContours: boolean;
}
