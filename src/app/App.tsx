import { useState, type ReactNode } from "react";
import { AffineWorkspace } from "../features/affine/components/AffineWorkspace";
import { useAffineCipher } from "../features/affine/hooks/useAffineCipher";
import { affineApi } from "../features/affine/services/affineApi";
import { CaesarWorkspace } from "../features/caesar/components/CaesarWorkspace";
import { useCaesarCipher } from "../features/caesar/hooks/useCaesarCipher";
import { ColumnarWorkspace } from "../features/columnar/components/ColumnarWorkspace";
import { useColumnarCipher } from "../features/columnar/hooks/useColumnarCipher";
import { columnarApi } from "../features/columnar/services/columnarApi";
import { PlayfairWorkspace } from "../features/playfair/components/PlayfairWorkspace";
import { usePlayfairCipher } from "../features/playfair/hooks/usePlayfairCipher";
import { VigenereWorkspace } from "../features/vigenere/components/VigenereWorkspace";
import { useVigenereCipher } from "../features/vigenere/hooks/useVigenereCipher";
import { CipherAlgorithmSelector } from "../shared/components/CipherAlgorithmSelector";
import { AppHeader } from "../shared/components/AppHeader";
import { cipherAlgorithms } from "../shared/config/cipherAlgorithms";
import type { CipherAlgorithm } from "../shared/types/cipher";

export function App() {
  const cipher = useCaesarCipher();
  const vigenere = useVigenereCipher();
  const playfair = usePlayfairCipher();
  const affine = useAffineCipher(affineApi);
  const columnar = useColumnarCipher(columnarApi);
  const [algorithm, setAlgorithm] = useState<CipherAlgorithm>("caesar");
  const isLoading =
    cipher.isLoading ||
    vigenere.isLoading ||
    playfair.isLoading ||
    affine.isBusy ||
    columnar.isBusy;

  function resetWorkspace() {
    setAlgorithm("caesar");
    cipher.resetAll();
    vigenere.resetAll();
    playfair.resetAll();
    affine.resetAll();
    columnar.resetAll();
  }

  function changeAlgorithm(nextAlgorithm: CipherAlgorithm) {
    if (isLoading || nextAlgorithm === algorithm) return;
    cipher.clearResult();
    cipher.setNotice(null);
    vigenere.clearResult();
    playfair.clearResult();
    affine.clearResult();
    affine.setNotice(null);
    columnar.clearResult();
    setAlgorithm(nextAlgorithm);
  }

  const workspaces: Record<CipherAlgorithm, ReactNode> = {
    caesar: <CaesarWorkspace cipher={cipher} />,
    playfair: <PlayfairWorkspace cipher={playfair} />,
    vigenere: <VigenereWorkspace cipher={vigenere} />,
    affine: <AffineWorkspace cipher={affine} />,
    columnar: <ColumnarWorkspace cipher={columnar} />,
  };

  return (
    <>
      <AppHeader disabled={isLoading} onReset={resetWorkspace} />
      <main className="page">
        <header className="hero">
          <div className="hero__title">
            <h1>Cipher Workbench</h1>
          </div>
          <p>
            Mã hóa và giải mã Caesar, Vigenère, Playfair, Affine hoặc Hệ mã hàng bằng kết quả từ
            Backend.
          </p>
        </header>
        <div className="workspace">
          <CipherAlgorithmSelector
            value={algorithm}
            disabled={isLoading}
            onChange={changeAlgorithm}
          />
          {cipherAlgorithms.map(({ value: panelAlgorithm }) => (
            <div
              id={`algorithm-panel-${panelAlgorithm}`}
              key={panelAlgorithm}
              role="tabpanel"
              aria-labelledby={`algorithm-tab-${panelAlgorithm}`}
              hidden={algorithm !== panelAlgorithm}
            >
              {algorithm === panelAlgorithm ? workspaces[panelAlgorithm] : null}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
