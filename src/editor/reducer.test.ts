import { describe, expect, it } from "vitest";
import {
  createDefaultDocument,
  createDefaultRegion,
} from "../domain/defaults";
import { createEditorState, editorReducer } from "./reducer";

const region = () => createDefaultRegion([
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 0, y: 100 },
]);

describe("editor reducer", () => {
  it("adds independent regions and undoes the newest edit", () => {
    let state = createEditorState(createDefaultDocument());
    state = editorReducer(state, { type: "region/add", region: region() });
    state = editorReducer(state, { type: "region/add", region: region() });
    expect(state.document.regions).toHaveLength(2);

    state = editorReducer(state, { type: "history/undo" });
    expect(state.document.regions).toHaveLength(1);
  });

  it("updates only the selected region", () => {
    const first = region();
    const second = region();
    let state = createEditorState({
      ...createDefaultDocument(),
      regions: [first, second],
    });
    state = editorReducer(state, { type: "selection/set", regionId: first.id });
    state = editorReducer(state, {
      type: "region/update",
      patch: {
        color: "#ff0000",
        fontFamily: '"Georgia", "Noto Serif SC", serif',
        showContour: false,
      },
    });

    expect(state.document.regions[0].color).toBe("#ff0000");
    expect(state.document.regions[1].color).not.toBe("#ff0000");
    expect(state.document.regions[0].fontFamily).toContain("Georgia");
    expect(state.document.regions[1].fontFamily).not.toContain("Georgia");
    expect(state.document.regions[0].showContour).toBe(false);
    expect(state.document.regions[1].showContour).toBe(true);
  });

  it("keeps at most fifty undo snapshots", () => {
    let state = createEditorState(createDefaultDocument());

    for (let index = 0; index < 55; index += 1) {
      state = editorReducer(state, { type: "contours/toggle" });
    }

    expect(state.history).toHaveLength(50);
  });

  it("hydrates a restored project without adding a new undo snapshot", () => {
    const restored = { ...createDefaultDocument(), showContours: false };
    const history = Array.from({ length: 55 }, () => createDefaultDocument());
    const state = editorReducer(createEditorState(createDefaultDocument()), {
      type: "project/hydrate",
      document: restored,
      history,
    });

    expect(state.document.showContours).toBe(false);
    expect(state.history).toHaveLength(50);
  });

  it("updates next-region defaults without mutating the current document", () => {
    const state = editorReducer(createEditorState(createDefaultDocument()), {
      type: "defaults/update",
      patch: { writingMode: "vertical" },
    });

    expect(state.nextRegionDefaults.writingMode).toBe("vertical");
    expect(state.document.regions).toEqual([]);
    expect(state.history).toEqual([]);
  });

  it("moves a selected node without mutating the prior document", () => {
    const first = region();
    const initialDocument = {
      ...createDefaultDocument(),
      regions: [first],
    };
    let state = createEditorState(initialDocument);
    state = editorReducer(state, { type: "selection/set", regionId: first.id });
    state = editorReducer(state, {
      type: "region/move-node",
      nodeIndex: 0,
      point: { x: 20, y: 30 },
    });

    expect(state.document.regions[0].points[0]).toEqual({ x: 20, y: 30 });
    expect(initialDocument.regions[0].points[0]).toEqual({ x: 0, y: 0 });
  });

  it("ignores invalid node indexes without adding an undo snapshot", () => {
    const first = region();
    let state = createEditorState({
      ...createDefaultDocument(),
      regions: [first],
    });
    state = editorReducer(state, { type: "selection/set", regionId: first.id });
    state = editorReducer(state, {
      type: "region/move-node",
      nodeIndex: 99,
      point: { x: 20, y: 30 },
    });

    expect(state.document.regions[0]).toBe(first);
    expect(state.history).toEqual([]);
  });

  it("restores a deleted selected region", () => {
    const first = region();
    let state = createEditorState({
      ...createDefaultDocument(),
      regions: [first],
    });
    state = editorReducer(state, { type: "selection/set", regionId: first.id });
    state = editorReducer(state, { type: "region/delete-selected" });
    expect(state.document.regions).toEqual([]);

    state = editorReducer(state, { type: "history/undo" });
    expect(state.document.regions).toEqual([first]);
  });

  it("keeps draft and tool updates out of undo history", () => {
    let state = createEditorState(createDefaultDocument());
    state = editorReducer(state, { type: "tool/set", tool: "draw" });
    state = editorReducer(state, {
      type: "draft/set",
      points: [{ x: 10, y: 20 }],
    });

    expect(state.tool).toBe("draw");
    expect(state.draftPath).toEqual([{ x: 10, y: 20 }]);
    expect(state.history).toEqual([]);
  });
});
