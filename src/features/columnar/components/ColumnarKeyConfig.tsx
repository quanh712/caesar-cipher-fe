import { useId } from "react";
import type { CipherMode } from "../../../shared/types/cipher";
import type { ColumnarKeyParseResult, ColumnarKeyType } from "../utils/validation";

interface ColumnarKeyConfigProps {
  mode: CipherMode;
  keyType: ColumnarKeyType;
  keyValue: string;
  validation: ColumnarKeyParseResult;
  pad: boolean;
  disabled: boolean;
  onKeyTypeChange: (value: ColumnarKeyType) => void;
  onKeyChange: (value: string) => void;
  onPadChange: (value: boolean) => void;
}

export function ColumnarKeyConfig(props: ColumnarKeyConfigProps) {
  const id = useId();
  const hasKey = props.keyValue.trim().length > 0;
  const error = !props.validation.ok && hasKey ? props.validation.error : null;
  const readOrder = props.validation.ok ? props.validation.value.readOrder : null;
  const permutation = props.validation.ok ? props.validation.value.permutation : null;

  return (
    <section className="config-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Cấu hình Hệ mã hàng</h2>
      <p>Mỗi số là thứ hạng đọc của một cột. Khóa có từ 2 đến 20 cột.</p>
      <div className="panel">
        <div className="panel__header">
          <h2>Khóa cột</h2>
          <div className="segmented" role="group" aria-label="Cách nhập khóa">
            {(["permutation", "keyword"] as const).map((type) => (
              <button
                key={type}
                className={props.keyType === type ? "is-active" : ""}
                type="button"
                aria-pressed={props.keyType === type}
                disabled={props.disabled}
                onClick={() => props.onKeyTypeChange(type)}
              >
                {type === "permutation" ? "Hoán vị số" : "Từ khóa"}
              </button>
            ))}
          </div>
        </div>

        <div className="columnar-key-body">
          <label htmlFor={`${id}-key`}>
            {props.keyType === "permutation" ? "Khóa hoán vị số" : "Từ khóa"}
          </label>
          <input
            id={`${id}-key`}
            value={props.keyValue}
            type="text"
            inputMode={props.keyType === "permutation" ? "numeric" : "text"}
            placeholder={props.keyType === "permutation" ? "Ví dụ: 3,6,2,1,5,4" : "Ví dụ: BALLOON"}
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
            disabled={props.disabled}
            onChange={(event) => props.onKeyChange(event.target.value)}
          />
          <small id={`${id}-hint`}>
            {props.keyType === "permutation"
              ? "Nhập mỗi số từ 1 đến m đúng một lần; dùng dấu phẩy hoặc khoảng trắng."
              : "Chỉ dùng chữ cái. Chữ có dấu được chuyển sang không dấu; chữ lặp xếp từ trái sang phải."}
          </small>
          {error && (
            <small className="columnar-key-error" id={`${id}-error`}>
              {error}
            </small>
          )}

          {readOrder && permutation && (
            <div className="columnar-key-order" aria-label="Thứ tự cột hiệu lực">
              <span>Hoán vị: {permutation.join(", ")}</span>
              <strong>Đọc cột: {readOrder.join(" → ")}</strong>
            </div>
          )}

          {props.mode === "encrypt" && (
            <label className="columnar-pad-control">
              <input
                type="checkbox"
                checked={props.pad}
                disabled={props.disabled}
                onChange={(event) => props.onPadChange(event.target.checked)}
              />
              Đệm x để đủ hàng cuối
            </label>
          )}
        </div>

        <div
          className={`status ${readOrder ? "status--success" : error ? "status--error" : ""}`}
          role="status"
          aria-live="polite"
        >
          {readOrder
            ? `✓ Khóa hợp lệ · ${readOrder.length} cột`
            : error
              ? `! ${error}`
              : "Chưa nhập khóa"}
        </div>
      </div>
    </section>
  );
}
