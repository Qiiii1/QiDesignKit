import { useState } from "react";
import { EffectSelection } from "./components/EffectSelection";
import { TextWorkspace } from "./components/TextWorkspace";
import { StylizedImageWorkspace } from "./stencil/StylizedImageWorkspace";

type Workspace = "home" | "text" | "stencil";

export function App() {
  const [workspace, setWorkspace] = useState<Workspace>("home");

  if (workspace === "text") {
    return <TextWorkspace onBack={() => setWorkspace("home")} />;
  }

  if (workspace === "stencil") {
    return <StylizedImageWorkspace onBack={() => setWorkspace("home")} />;
  }

  return (
    <EffectSelection
      onSelect={(selectedWorkspace) => setWorkspace(selectedWorkspace)}
    />
  );
}
