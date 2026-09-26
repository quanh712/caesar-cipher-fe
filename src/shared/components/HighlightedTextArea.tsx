import { useEffect, useRef } from "react";
import { ColorizedText } from "./ColorizedText";

interface HighlightedTextAreaProps {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

export function HighlightedTextArea({ value, disabled, onChange }: HighlightedTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;
    if (!textarea || !highlight) return;

    const observer = new ResizeObserver(() => {
      highlight.style.height = `${textarea.offsetHeight}px`;
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, []);

  function syncScroll() {
    if (!textareaRef.current || !highlightRef.current) return;
    highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
  }

  return (
    <div className="highlighted-input">
      <pre ref={highlightRef} aria-hidden="true">
        <ColorizedText text={value} />
        {"\n"}
      </pre>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={syncScroll}
        placeholder="Nhập hoặc dán nội dung tại đây…"
        disabled={disabled}
        spellCheck={false}
        aria-label="Nội dung đầu vào"
      />
    </div>
  );
}
