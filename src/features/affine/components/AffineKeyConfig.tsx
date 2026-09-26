import { useId } from "react";
import type { CipherMode } from "../../../shared/types/cipher";
import { formatAffineFormula } from "../utils/analysis";
import type { AffineKeyPairValidation } from "../utils/validation";

interface AffineKeyConfigProps {
  mode: CipherMode;
  a: string;
  b: string;
  validation: AffineKeyPairValidation;
  disabled?: boolean;
  onAChange: (value: string) => void;
  onBChange: (value: string) => void;
}

function normalizedKeyLabel(name: "a" | "b", raw: string, normalized: number | null) {
  if (normalized === null) return `${name} chưa có giá trị hợp lệ`;
  const token = raw.trim();
  return token === String(normalized)
    ? `${name} = ${normalized}`
    : `${name}: ${token} → ${normalized}`;
}

export function AffineKeyConfig(props: AffineKeyConfigProps) {
  const id = useId();
  const { validation } = props;
  const hasAnyValue = props.a.length > 0 || props.b.length > 0;
  const formula = validation.isValid
    ? formatAffineFormula(props.mode, validation.a.normalized!, validation.b.normalized!)
    : props.mode === "encrypt"
      ? "E(x) = (a × x + b) mod 26"
      : "D(y) = a⁻¹ × (y - b) mod 26";

  const aErrorId = validation.a.error ? `${id}-a-error` : undefined;
  const bErrorId = validation.b.error ? `${id}-b-error` : undefined;

  return (
    <section className="config-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Khóa Affine</h2>
      <p>
        Nhập hai số nguyên; khóa nhân a phải nguyên tố cùng nhau với 26. Với file, mỗi khóa tối đa
        32 ký tự sau khi bỏ khoảng trắng hai đầu.
      </p>
      <div className="panel">
        <div className="panel__header">
          <h2>Cặp khóa (a, b)</h2>
        </div>

        <div className="affine-key-grid">
          <div className="affine-key-field">
            <label htmlFor={`${id}-a`}>Khóa nhân a</label>
            <input
              id={`${id}-a`}
              aria-describedby={aErrorId}
              aria-invalid={Boolean(validation.a.error)}
              inputMode="numeric"
              placeholder="Ví dụ: 5"
              value={props.a}
              disabled={props.disabled}
              onChange={(event) => props.onAChange(event.target.value)}
            />
            {validation.a.error ? (
              <small className="affine-key-error" id={aErrorId}>
                {validation.a.error}
              </small>
            ) : (
              <small>{normalizedKeyLabel("a", props.a, validation.a.normalized)}</small>
            )}
          </div>

          <div className="affine-key-field">
            <label htmlFor={`${id}-b`}>Khóa dịch b</label>
            <input
              id={`${id}-b`}
              aria-describedby={bErrorId}
              aria-invalid={Boolean(validation.b.error)}
              inputMode="numeric"
              placeholder="Ví dụ: 8"
              value={props.b}
              disabled={props.disabled}
              onChange={(event) => props.onBChange(event.target.value)}
            />
            {validation.b.error ? (
              <small className="affine-key-error" id={bErrorId}>
                {validation.b.error}
              </small>
            ) : (
              <small>{normalizedKeyLabel("b", props.b, validation.b.normalized)}</small>
            )}
          </div>

          <div className="affine-formula" aria-label="Công thức Affine hiện tại">
            {formula}
          </div>
        </div>

        <div
          className={`status ${hasAnyValue && validation.isValid ? "status--success" : hasAnyValue && (validation.a.error || validation.b.error) ? "status--error" : ""}`}
          role="status"
          aria-live="polite"
        >
          {!hasAnyValue
            ? "Chưa nhập khóa"
            : validation.isValid
              ? `✓ Khóa hợp lệ · gcd(${validation.a.normalized}, 26) = 1 · a⁻¹ = ${validation.a.inverse}${validation.isIdentity ? " · Khóa này không làm thay đổi nội dung." : ""}`
              : validation.a.error || validation.b.error
                ? "! Cặp khóa chưa hợp lệ. Kiểm tra trường được đánh dấu."
                : "Nhập đủ a và b để kiểm tra khóa."}
        </div>
      </div>
    </section>
  );
}
