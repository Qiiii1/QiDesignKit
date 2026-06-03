import { useEffect, useReducer, useState } from "react";
import { exportDocumentPng } from "../canvas/exportPng";
import {
  createDefaultDocument,
  createDefaultRegion,
} from "../domain/defaults";
import type { Point, TextRegion } from "../domain/types";
import { createEditorState, editorReducer } from "../editor/reducer";
import { loadProject, saveProject } from "../storage/projectStore";
import { EditorCanvas } from "./EditorCanvas";
import { Inspector } from "./Inspector";
import { Notice } from "./Notice";
import { ToolRail } from "./ToolRail";
import { TopBar } from "./TopBar";

const AUTOSAVE_DELAY = 300;

interface TextWorkspaceProps {
  onBack: () => void;
}

export function TextWorkspace({ onBack }: TextWorkspaceProps) {
  const [state, dispatch] = useReducer(
    editorReducer,
    undefined,
    () => createEditorState(createDefaultDocument()),
  );
  const [initialized, setInitialized] = useState(false);
  const selectedRegion = state.document.regions.find(
    ({ id }) => id === state.selectedRegionId,
  );

  useEffect(() => {
    let active = true;
    loadProject()
      .then((project) => {
        if (active && project !== undefined) {
          dispatch({ type: "project/hydrate", ...project });
        }
      })
      .catch(() => {
        if (active) {
          dispatch({
            type: "notice/set",
            notice: "自动保存不可用，本次编辑仍可继续。",
          });
        }
      })
      .finally(() => {
        if (active) {
          setInitialized(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    const timeout = window.setTimeout(() => {
      saveProject({
        document: state.document,
        history: state.history,
      }).catch(() => dispatch({
        type: "notice/set",
        notice: "自动保存不可用，本次编辑仍可继续。",
      }));
    }, AUTOSAVE_DELAY);

    return () => window.clearTimeout(timeout);
  }, [initialized, state.document, state.history]);

  const patchSettings = (
    patch: Partial<Omit<TextRegion, "id" | "points">>,
  ) => {
    dispatch(selectedRegion === undefined
      ? { type: "defaults/update", patch }
      : { type: "region/update", patch });
  };
  const addRegion = (points: Point[]) => {
    dispatch({
      type: "region/add",
      region: createDefaultRegion(points, state.nextRegionDefaults),
    });
  };
  const exportPng = () => {
    exportDocumentPng(state.document).catch(() => dispatch({
      type: "notice/set",
      notice: "导出失败，请重试。",
    }));
  };

  return (
    <main className="app-shell">
      <TopBar
        background={state.document.background}
        canUndo={state.history.length > 0}
        onBack={onBack}
        onBackgroundChange={(background) => dispatch({
          type: "background/set",
          background,
        })}
        onExport={exportPng}
        onUndo={() => dispatch({ type: "history/undo" })}
      />
      <section className="editor-frame" aria-label="视觉文字效果编辑器">
        <ToolRail
          onToolChange={(tool) => dispatch({ type: "tool/set", tool })}
          tool={state.tool}
        />
        <EditorCanvas
          document={state.document}
          onAddRegion={addRegion}
          onMoveNode={(regionId, nodeIndex, point) => {
            dispatch({ type: "selection/set", regionId });
            dispatch({ type: "region/move-node", nodeIndex, point });
          }}
          onSelectRegion={(regionId) => dispatch({
            type: "selection/set",
            regionId,
          })}
          selectedRegionId={state.selectedRegionId}
          tool={state.tool}
        />
        <Inspector
          nextRegionDefaults={state.nextRegionDefaults}
          onDeleteRegion={() => dispatch({ type: "region/delete-selected" })}
          onPatch={patchSettings}
          onSelectRegion={(regionId) => dispatch({
            type: "selection/set",
            regionId,
          })}
          regions={state.document.regions}
          selectedRegionId={state.selectedRegionId}
          selectedRegion={selectedRegion}
        />
      </section>
      <Notice message={state.notice} />
    </main>
  );
}
