import { CipherModeSelector } from "../../../shared/components/CipherModeSelector";
import { DraftInputPanel } from "../../../shared/components/DraftInputPanel";
import { Notification } from "../../../shared/components/Notification";
import type { ColumnarCipherController } from "../hooks/useColumnarCipher";
import { ColumnarKeyConfig } from "./ColumnarKeyConfig";
import { ColumnarOutputPanel } from "./ColumnarOutputPanel";

interface ColumnarWorkspaceProps {
  cipher: ColumnarCipherController;
}

export function ColumnarWorkspace({ cipher }: ColumnarWorkspaceProps) {
  async function copyInput() {
    try {
      await navigator.clipboard.writeText(
        cipher.inputType === "text" ? cipher.text : cipher.fileText,
      );
      cipher.setNotice({ kind: "success", message: "Đã sao chép đầu vào." });
    } catch {
      cipher.setNotice({ kind: "error", message: "Không thể sao chép đầu vào." });
    }
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(cipher.result?.text ?? "");
      cipher.setNotice({ kind: "success", message: "Đã sao chép kết quả." });
    } catch {
      cipher.setNotice({ kind: "error", message: "Không thể sao chép kết quả." });
    }
  }

  async function pasteInput() {
    try {
      const text = await navigator.clipboard.readText();
      if (cipher.setText(text)) {
        cipher.setNotice({ kind: "success", message: "Đã dán nội dung từ clipboard." });
      }
    } catch {
      cipher.setNotice({ kind: "error", message: "Không thể đọc nội dung clipboard." });
    }
  }

  const draftHasContent =
    cipher.inputType === "text" ? cipher.text.length > 0 : cipher.fileText.length > 0;

  return (
    <div className="cipher-workspace">
      <CipherModeSelector value={cipher.mode} disabled={cipher.isBusy} onChange={cipher.setMode} />

      <div className="helper-row">
        <span>
          Hệ mã hàng bỏ dấu, khoảng trắng và dấu câu; chỉ giữ chữ a–z, số 0–9. Giải mã không tự xóa
          x đệm hoặc khôi phục định dạng ban đầu.
        </span>
        <button
          className="button button--secondary"
          type="button"
          onClick={cipher.loadExample}
          disabled={cipher.isBusy}
        >
          Tạo ví dụ
        </button>
      </div>

      <div className="workspace__columns">
        <div>
          <DraftInputPanel
            inputType={cipher.inputType}
            mode={cipher.mode}
            text={cipher.text}
            file={cipher.file}
            fileText={cipher.fileText}
            error={cipher.inputError}
            disabled={cipher.isBusy}
            isReadingFile={cipher.isReadingFile}
            fileHint="File .txt UTF-8, tối đa 5 MiB"
            onInputTypeChange={cipher.setInputType}
            onTextChange={cipher.setText}
            onFileChange={cipher.setFile}
            onClear={cipher.resetInput}
            onPaste={pasteInput}
            onCopy={copyInput}
          />
          {draftHasContent && !cipher.isReadingFile && (
            <p className="columnar-normalization-note" role="note">
              Sau chuẩn hóa: {cipher.draftNormalization.text.slice(0, 80)}
              {cipher.draftNormalization.text.length > 80 ? "…" : ""}
              {cipher.draftNormalization.removedCount > 0
                ? ` · ${cipher.draftNormalization.removedCount} ký tự bị loại`
                : ""}
            </p>
          )}
        </div>
        <ColumnarOutputPanel
          key={cipher.result ? "result" : "empty"}
          result={cipher.result}
          mode={cipher.mode}
          processingStatus={cipher.processingStatus}
          disabled={cipher.isBusy}
          onCopy={copyResult}
          onClear={cipher.clearResult}
          onDownload={cipher.downloadResult}
        />
      </div>

      <ColumnarKeyConfig
        mode={cipher.mode}
        keyType={cipher.keyType}
        keyValue={cipher.key}
        validation={cipher.keyValidation}
        pad={cipher.pad}
        disabled={cipher.isBusy}
        onKeyTypeChange={cipher.setKeyType}
        onKeyChange={cipher.setKey}
        onPadChange={cipher.setPad}
      />

      <button
        className="button button--primary"
        type="button"
        disabled={!cipher.canSubmit}
        onClick={cipher.processCipher}
      >
        {cipher.isReadingFile
          ? "Đang đọc file…"
          : cipher.isLoading
            ? "Đang xử lý…"
            : cipher.mode === "encrypt"
              ? "Mã hóa"
              : "Giải mã"}
      </button>

      {cipher.notice && (
        <Notification notice={cipher.notice} onClose={() => cipher.setNotice(null)} />
      )}
    </div>
  );
}
