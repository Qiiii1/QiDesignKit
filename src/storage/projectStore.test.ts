import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultDocument } from "../domain/defaults";
import {
  deleteDatabase,
  loadProject,
  saveProject,
} from "./projectStore";

describe("project store", () => {
  beforeEach(async () => deleteDatabase());

  it("restores a saved document and undo history", async () => {
    const document = {
      ...createDefaultDocument(),
      background: {
        ...createDefaultDocument().background,
        color: "#000000",
      },
    };
    const history = [createDefaultDocument()];

    await saveProject({ document, history });

    expect(await loadProject()).toEqual({ document, history });
  });

  it("returns no project when local storage is empty", async () => {
    expect(await loadProject()).toBeUndefined();
  });

  it("overwrites the previous active project", async () => {
    await saveProject({
      document: createDefaultDocument(),
      history: [],
    });
    const document = {
      ...createDefaultDocument(),
      background: {
        ...createDefaultDocument().background,
        color: "#000000",
      },
    };

    await saveProject({ document, history: [] });

    expect(await loadProject()).toEqual({ document, history: [] });
  });
});
