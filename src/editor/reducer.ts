import { DEFAULT_REGION_STYLE, createDefaultDocument } from "../domain/defaults";
import type {
  CanvasBackground,
  EditorDocument,
  EditorTool,
  Point,
  TextRegion,
} from "../domain/types";

const MAX_HISTORY_LENGTH = 50;

export interface EditorState {
  document: EditorDocument;
  history: EditorDocument[];
  selectedRegionId?: string;
  tool: EditorTool;
  draftPath: Point[];
  nextRegionDefaults: Omit<TextRegion, "id" | "points">;
  notice?: string;
}

export type EditorAction =
  | { type: "project/hydrate"; document: EditorDocument; history: EditorDocument[] }
  | { type: "background/set"; background: CanvasBackground }
  | { type: "history/undo" }
  | { type: "region/add"; region: TextRegion }
  | { type: "region/delete-selected" }
  | { type: "region/update"; patch: Partial<TextRegion> }
  | { type: "region/move-node"; nodeIndex: number; point: Point }
  | { type: "defaults/update"; patch: Partial<Omit<TextRegion, "id" | "points">> }
  | { type: "selection/set"; regionId?: string }
  | { type: "tool/set"; tool: EditorTool }
  | { type: "draft/set"; points: Point[] }
  | { type: "notice/set"; notice?: string };

function commitDocument(
  state: EditorState,
  document: EditorDocument,
): EditorState {
  return {
    ...state,
    document,
    history: [...state.history, state.document].slice(-MAX_HISTORY_LENGTH),
  };
}

function hasSelectedRegion(state: EditorState): boolean {
  return state.document.regions.some(({ id }) => id === state.selectedRegionId);
}

export function createEditorState(
  document: EditorDocument = createDefaultDocument(),
): EditorState {
  return {
    document,
    history: [],
    tool: "draw",
    draftPath: [],
    nextRegionDefaults: { ...DEFAULT_REGION_STYLE },
  };
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case "project/hydrate":
      return {
        ...state,
        document: action.document,
        history: action.history.slice(-MAX_HISTORY_LENGTH),
        selectedRegionId: undefined,
        draftPath: [],
      };
    case "background/set":
      return commitDocument(state, {
        ...state.document,
        background: { ...action.background },
      });
    case "history/undo": {
      const document = state.history.at(-1);
      if (document === undefined) {
        return state;
      }

      const nextState = {
        ...state,
        document,
        history: state.history.slice(0, -1),
        draftPath: [],
      };
      return hasSelectedRegion(nextState)
        ? nextState
        : { ...nextState, selectedRegionId: undefined };
    }
    case "region/add":
      return {
        ...commitDocument(state, {
          ...state.document,
          regions: [...state.document.regions, action.region],
        }),
        selectedRegionId: action.region.id,
        draftPath: [],
      };
    case "region/delete-selected":
      if (!hasSelectedRegion(state)) {
        return state;
      }
      return {
        ...commitDocument(state, {
          ...state.document,
          regions: state.document.regions.filter(
            ({ id }) => id !== state.selectedRegionId,
          ),
        }),
        selectedRegionId: undefined,
      };
    case "region/update":
      if (!hasSelectedRegion(state)) {
        return state;
      }
      return commitDocument(state, {
        ...state.document,
        regions: state.document.regions.map((region) => (
          region.id === state.selectedRegionId
            ? { ...region, ...action.patch }
            : region
        )),
      });
    case "region/move-node":
      {
        const selectedRegion = state.document.regions.find(
          ({ id }) => id === state.selectedRegionId,
        );
        if (
          selectedRegion === undefined
          || !Number.isInteger(action.nodeIndex)
          || action.nodeIndex < 0
          || action.nodeIndex >= selectedRegion.points.length
          || !Number.isFinite(action.point.x)
          || !Number.isFinite(action.point.y)
        ) {
          return state;
        }
      }
      return commitDocument(state, {
        ...state.document,
        regions: state.document.regions.map((region) => {
          if (region.id !== state.selectedRegionId) {
            return region;
          }

          return {
            ...region,
            points: region.points.map((point, index) => (
              index === action.nodeIndex ? { ...action.point } : point
            )),
          };
        }),
      });
    case "defaults/update":
      return {
        ...state,
        nextRegionDefaults: { ...state.nextRegionDefaults, ...action.patch },
      };
    case "selection/set":
      return { ...state, selectedRegionId: action.regionId };
    case "tool/set":
      return { ...state, tool: action.tool, draftPath: [] };
    case "draft/set":
      return {
        ...state,
        draftPath: action.points.map((point) => ({ ...point })),
      };
    case "notice/set":
      return { ...state, notice: action.notice };
  }
}
