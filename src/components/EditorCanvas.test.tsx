import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createDefaultDocument,
  createDefaultRegion,
} from "../domain/defaults";
import { EditorCanvas } from "./EditorCanvas";

describe("EditorCanvas", () => {
  it("closes a drawn path and emits a usable region", () => {
    const onAddRegion = vi.fn();
    render(
      <EditorCanvas
        document={createDefaultDocument()}
        tool="draw"
        onAddRegion={onAddRegion}
      />,
    );
    const canvas = screen.getByLabelText("创作画布");

    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 110, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 110, clientY: 110 });
    fireEvent.mouseMove(canvas, { clientX: 10, clientY: 110 });
    fireEvent.mouseUp(canvas);

    expect(onAddRegion).toHaveBeenCalledTimes(1);
  });

  it("ignores a tiny drawn path", () => {
    const onAddRegion = vi.fn();
    render(
      <EditorCanvas
        document={createDefaultDocument()}
        tool="draw"
        onAddRegion={onAddRegion}
      />,
    );
    const canvas = screen.getByLabelText("创作画布");

    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 11, clientY: 11 });
    fireEvent.mouseUp(canvas);

    expect(onAddRegion).not.toHaveBeenCalled();
  });

  it("selects the topmost region under the pointer", () => {
    const first = createDefaultRegion([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 200 },
      { x: 0, y: 200 },
    ]);
    const second = createDefaultRegion([
      { x: 20, y: 20 },
      { x: 180, y: 20 },
      { x: 180, y: 180 },
      { x: 20, y: 180 },
    ]);
    const onSelectRegion = vi.fn();
    render(
      <EditorCanvas
        document={{ ...createDefaultDocument(), regions: [first, second] }}
        tool="select"
        onAddRegion={vi.fn()}
        onSelectRegion={onSelectRegion}
      />,
    );

    fireEvent.mouseDown(screen.getByLabelText("创作画布"), {
      clientX: 100,
      clientY: 100,
    });

    expect(onSelectRegion).toHaveBeenCalledWith(second.id);
  });

  it("emits one node move when a drag finishes", () => {
    const first = createDefaultRegion([
      { x: 10, y: 10 },
      { x: 200, y: 10 },
      { x: 200, y: 200 },
    ]);
    const onMoveNode = vi.fn();
    render(
      <EditorCanvas
        document={{ ...createDefaultDocument(), regions: [first] }}
        tool="select"
        selectedRegionId={first.id}
        onAddRegion={vi.fn()}
        onMoveNode={onMoveNode}
      />,
    );
    const canvas = screen.getByLabelText("创作画布");

    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 30, clientY: 40 });
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 60 });
    expect(onMoveNode).not.toHaveBeenCalled();
    fireEvent.mouseUp(canvas);

    expect(onMoveNode).toHaveBeenCalledTimes(1);
    expect(onMoveNode).toHaveBeenCalledWith(first.id, 0, { x: 50, y: 60 });
  });
});
