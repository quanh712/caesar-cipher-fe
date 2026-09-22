import type { CipherMode } from "../../../shared/types/cipher";
import { buildAffineMapping, formatAffineFormula, isAsciiLetter } from "../utils/analysis";
import type { AffineKeyPairValidation } from "../utils/validation";

interface AffineMapProps {
  mode: CipherMode;
  input: string;
  validation: AffineKeyPairValidation;
}

export function AffineMap({ mode, input, validation }: AffineMapProps) {
  if (!validation.isValid || validation.a.normalized === null || validation.b.normalized === null) {
    return (
      <section className="map-section" aria-labelledby="affine-map-title">
        <div className="section-label">Bảng ánh xạ Affine</div>
        <div className="panel affine-map-empty">
          <h2 id="affine-map-title">Chưa có bảng ánh xạ</h2>
          <p>Nhập cặp khóa hợp lệ để xem bảng ánh xạ.</p>
        </div>
      </section>
    );
  }

  const mapping = buildAffineMapping(mode, validation.a.normalized, validation.b.normalized);
  const formula = formatAffineFormula(mode, validation.a.normalized, validation.b.normalized);
  const usedLetters = new Set(
    Array.from(input)
      .filter(isAsciiLetter)
      .map((character) => character.toUpperCase()),
  );

  return (
    <section className="map-section" aria-labelledby="affine-map-title">
      <div className="section-label">
        <span>Bảng ánh xạ Affine</span>
        <span className="map-legend">Tô đỏ: chữ có trong đầu vào</span>
      </div>
      <div className="panel alphabet-panel">
        <div className="panel__header">
          <h2 id="affine-map-title">
            {formula} · A → {mapping.mappedAlphabet[0]}
          </h2>
        </div>
        <div className="alphabet-map">
          <div className="alphabet-row">
            <span className="alphabet-label">{mapping.sourceLabel}</span>
            {mapping.sourceAlphabet.map((letter) => (
              <span
                className={
                  usedLetters.has(letter) ? "alphabet-cell alphabet-cell--used" : "alphabet-cell"
                }
                key={letter}
              >
                {letter}
              </span>
            ))}
          </div>
          <div className="alphabet-row alphabet-row--mapped">
            <span className="alphabet-label">{mapping.targetLabel}</span>
            {mapping.mappedAlphabet.map((letter, index) => (
              <span
                className={
                  usedLetters.has(mapping.sourceAlphabet[index])
                    ? "alphabet-cell alphabet-cell--used"
                    : "alphabet-cell"
                }
                key={`${letter}-${index}`}
              >
                {letter}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
