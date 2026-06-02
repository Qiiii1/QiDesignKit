export interface Poem {
  id: string;
  language: "zh" | "en";
  title: string;
  author: string;
  text: string;
}

export const POEMS: Poem[] = [
  { id: "quiet-night", language: "zh", title: "静夜思", author: "李白", text: "床前明月光，疑是地上霜。举头望明月，低头思故乡。" },
  { id: "spring-dawn", language: "zh", title: "春晓", author: "孟浩然", text: "春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。" },
  { id: "hope", language: "en", title: "Hope", author: "Emily Dickinson", text: "Hope is the thing with feathers that perches in the soul and sings the tune without the words and never stops at all." },
  { id: "dawn", language: "en", title: "A Clear Midnight", author: "Walt Whitman", text: "This is thy hour O Soul thy free flight into the wordless away from books away from art the day erased the lesson done." },
];
