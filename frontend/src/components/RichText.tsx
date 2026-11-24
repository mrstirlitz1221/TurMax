/** Текст из БД: абзацы через пустую строку, подзаголовки — строки, начинающиеся с «## ». HTML не интерпретируется. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}|\r\n\r\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={`prose-tm ${className}`}>
      {blocks.map((b, i) =>
        b.startsWith("## ") ? (
          <h2 key={i} id={`s-${i}`}>{b.slice(3)}</h2>
        ) : (
          <p key={i}>{b}</p>
        ),
      )}
    </div>
  );
}
