interface StylizedImageWorkspaceProps {
  onBack: () => void;
}

export function StylizedImageWorkspace({ onBack }: StylizedImageWorkspaceProps) {
  return (
    <main className="stencil-shell">
      <header className="stencil-top-bar">
        <button className="back-button" onClick={onBack} type="button">
          返回效果选择
        </button>
        <h1>镂空图像转换</h1>
      </header>
    </main>
  );
}
