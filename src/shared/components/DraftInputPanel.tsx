import { useRef, useState } from "react";
import type { CipherMode, InputType } from "../types/cipher";
import { formatFileSize } from "../utils/formatFileSize";
import { ColorizedText } from "./ColorizedText";

interface DraftInputPanelProps {
  inputType: InputType;
  mode: CipherMode;
  text: string;
  file: File | null;
  fileText?: string;
  error: string | null;
  disabled?: boolean;
  isReadingFile?: boolean;
  fileHint?: string;
  onInputTypeChange: (value: InputType) => void;
  onTextChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  onClear: () => void;
  onPaste: () => void;
  onCopy: () => void;
}

export function DraftInputPanel(props: DraftInputPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function selectFile(file: File | undefined) {
    if (file && !props.disabled) props.onFileChange(file);
  }

  const currentInput = props.inputType === "text" ? props.text : (props.fileText ?? "");

  return (
    <section>
      <div className="section-label">
        <span>Đầu vào</span>
        <div className="segmented" role="group" aria-label="Nguồn đầu vào">
          {(["text", "file"] as const).map((type) => (
            <button
              className={props.inputType === type ? "is-active" : ""}
              key={type}
              type="button"
              onClick={() => props.onInputTypeChange(type)}
              aria-pressed={props.inputType === type}
              disabled={props.disabled}
            >
              {type === "text" ? "Văn bản" : "File .txt"}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel__header">
          <h2>
            {props.inputType === "file"
              ? "Tệp văn bản"
              : props.mode === "encrypt"
                ? "Bản rõ"
                : "Bản mã"}
          </h2>
          <div className="button-group">
            {props.inputType === "text" && (
              <button
                className="button button--secondary"
                type="button"
                onClick={props.onPaste}
                disabled={props.disabled}
              >
                Dán
              </button>
            )}
            <button
              className="button button--secondary"
              type="button"
              onClick={props.onCopy}
              disabled={props.disabled || currentInput.length === 0 || Boolean(props.error)}
            >
              Sao chép
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={props.onClear}
              disabled={
                props.disabled ||
                (props.inputType === "text" ? props.text.length === 0 : !props.file)
              }
            >
              Xóa
            </button>
          </div>
        </div>

        {props.inputType === "text" ? (
          <textarea
            className="draft-textarea"
            aria-label="Nội dung đầu vào"
            placeholder="Nhập hoặc dán nội dung tại đây…"
            value={props.text}
            onChange={(event) => props.onTextChange(event.target.value)}
            disabled={props.disabled}
          />
        ) : (
          <div>
            <input
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              aria-label="Chọn file văn bản"
              accept=".txt,text/plain"
              disabled={props.disabled}
              onChange={(event) => {
                selectFile(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            {props.file ? (
              <div className="file-card">
                <div className="file-card__header">
                  <span className="file-extension">TXT</span>
                  <span className="file-card__meta">
                    <strong>{props.file.name}</strong>
                    <small>
                      {formatFileSize(props.file.size)} ·{" "}
                      {props.fileText !== undefined && !props.error
                        ? `${props.fileText.length} ký tự`
                        : "Chưa đọc nội dung"}
                    </small>
                  </span>
                  <div className="button-group">
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={props.disabled}
                    >
                      Đổi file
                    </button>
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => props.onFileChange(null)}
                      disabled={props.disabled}
                    >
                      Gỡ file
                    </button>
                  </div>
                </div>
                {props.fileText !== undefined && (
                  <pre className="file-preview" aria-label="Xem trước nội dung file">
                    <ColorizedText text={props.fileText.slice(0, 5_000)} />
                    {props.fileText.length > 5_000 ? "\n…" : ""}
                  </pre>
                )}
                {props.fileText === undefined && (
                  <div className="analysis-empty">
                    Preview file sẽ được bật cùng giai đoạn Playfair.
                  </div>
                )}
              </div>
            ) : (
              <div
                className={isDragging ? "file-picker file-picker--dragging" : "file-picker"}
                onDragEnter={(event) => {
                  event.preventDefault();
                  if (!props.disabled) setIsDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  if (!props.disabled) selectFile(event.dataTransfer.files[0]);
                }}
              >
                <strong>Kéo thả file .txt vào đây</strong>
                <span>hoặc</span>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={props.disabled}
                >
                  Chọn file
                </button>
                <small>{props.fileHint ?? "File .txt, tối đa 5 MiB"}</small>
              </div>
            )}
          </div>
        )}

        <div
          className={`status ${props.isReadingFile ? "" : props.inputType === "text" ? (props.text.length === 0 ? "" : "status--success") : !props.file ? "" : props.error ? "status--error" : "status--success"}`}
          role="status"
          aria-live="polite"
        >
          {props.isReadingFile
            ? "Đang đọc nội dung file…"
            : props.inputType === "text" && props.text.length === 0
              ? "Chưa có dữ liệu"
              : props.inputType === "file" && !props.file
                ? "Chưa chọn file"
                : props.error
                  ? `! ${props.error}`
                  : "✓ Đầu vào hợp lệ ở mức sơ bộ."}
        </div>
      </div>
    </section>
  );
}
