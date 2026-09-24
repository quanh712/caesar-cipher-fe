import { useMemo, useRef, useState } from "react";
import { CipherApiError } from "../../../shared/services/cipherApi";
import type { CipherMode, InputType, NoticeState } from "../../../shared/types/cipher";
import { saveBlob } from "../../../shared/utils/download";
import { MAX_TEXT_FILE_BYTES, readTextFile } from "../../../shared/utils/textFileValidation";
import type { AffineGateway } from "../services/affineGateway";
import type { AffineKeySnapshot, AffineResultSnapshot, ProcessingStatus } from "../types/cipher";
import { validateAffineInput, validateAffineKeyPair } from "../utils/validation";

const FILE_READ_ERROR = "Không thể đọc nội dung file. Vui lòng chọn lại file.";

function userFacingError(error: unknown) {
  return error instanceof CipherApiError
    ? error.message
    : "Không thể kết nối tới máy chủ. Vui lòng thử lại.";
}

export function useAffineCipher(gateway: AffineGateway) {
  const [mode, setModeState] = useState<CipherMode>("encrypt");
  const [inputType, setInputTypeState] = useState<InputType>("text");
  const [text, setTextState] = useState("");
  const [file, setFileState] = useState<File | null>(null);
  const [fileText, setFileText] = useState("");
  const [fileReadError, setFileReadError] = useState<string | null>(null);
  const [a, setAState] = useState("");
  const [b, setBState] = useState("");
  const [result, setResult] = useState<AffineResultSnapshot | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>("idle");
  const fileReadVersion = useRef(0);
  const fileReadInFlight = useRef(false);
  const requestInFlight = useRef(false);

  const keyValidation = useMemo(() => validateAffineKeyPair(a, b, inputType), [a, b, inputType]);
  const inputError = useMemo(
    () => fileReadError ?? validateAffineInput(inputType, text, file),
    [file, fileReadError, inputType, text],
  );
  const isBusy = isLoading || isReadingFile;
  const canSubmit = !isBusy && !inputError && keyValidation.isValid;

  function draftMutationIsLocked() {
    return requestInFlight.current || fileReadInFlight.current;
  }

  function clearDerivedState() {
    setResult(null);
    setProcessingStatus("idle");
    setNotice(null);
  }

  function setMode(nextMode: CipherMode) {
    if (draftMutationIsLocked() || nextMode === mode) return;
    setModeState(nextMode);
    clearDerivedState();
  }

  function setInputType(nextType: InputType) {
    if (draftMutationIsLocked() || nextType === inputType) return;
    setInputTypeState(nextType);
    clearDerivedState();
  }

  function setText(nextText: string): boolean {
    if (draftMutationIsLocked()) return false;
    setTextState(nextText);
    clearDerivedState();
    return true;
  }

  function setA(nextA: string) {
    if (draftMutationIsLocked()) return;
    setAState(nextA);
    clearDerivedState();
  }

  function setB(nextB: string) {
    if (draftMutationIsLocked()) return;
    setBState(nextB);
    clearDerivedState();
  }

  async function setFile(nextFile: File | null) {
    if (requestInFlight.current) return;
    const readVersion = ++fileReadVersion.current;
    fileReadInFlight.current = false;
    setFileState(nextFile);
    setFileText("");
    setFileReadError(null);
    setIsReadingFile(false);
    clearDerivedState();

    const canRead =
      nextFile &&
      /\.txt$/i.test(nextFile.name) &&
      nextFile.size > 0 &&
      nextFile.size <= MAX_TEXT_FILE_BYTES;
    if (!canRead) return;

    fileReadInFlight.current = true;
    setIsReadingFile(true);
    try {
      const content = await readTextFile(nextFile);
      if (fileReadVersion.current === readVersion) {
        setFileText(content.replace(/^\uFEFF/, ""));
      }
    } catch {
      if (fileReadVersion.current === readVersion) {
        setFileReadError(FILE_READ_ERROR);
        setProcessingStatus("error");
        setNotice({ kind: "error", message: FILE_READ_ERROR });
      }
    } finally {
      if (fileReadVersion.current === readVersion) {
        fileReadInFlight.current = false;
        setIsReadingFile(false);
      }
    }
  }

  async function processCipher() {
    if (!canSubmit || draftMutationIsLocked()) return;
    if (
      keyValidation.a.normalized === null ||
      keyValidation.a.inverse === null ||
      keyValidation.b.normalized === null
    ) {
      return;
    }

    const keySnapshot: AffineKeySnapshot = {
      rawA: a,
      rawB: b,
      normalizedA: keyValidation.a.normalized,
      normalizedB: keyValidation.b.normalized,
      inverseA: keyValidation.a.inverse,
    };
    const snapshot = {
      mode,
      inputType,
      text,
      file,
      fileText,
      key: keySnapshot,
    };

    requestInFlight.current = true;
    setResult(null);
    setIsLoading(true);
    setProcessingStatus("loading");
    setNotice(null);

    try {
      const response =
        snapshot.inputType === "text"
          ? await gateway.processText(snapshot.mode, {
              text: snapshot.text,
              aToken: snapshot.key.rawA,
              bToken: snapshot.key.rawB,
            })
          : await gateway.previewFile({
              file: snapshot.file!,
              aToken: snapshot.key.rawA,
              bToken: snapshot.key.rawB,
              action: snapshot.mode,
            });

      setResult({
        text: response.result,
        source: snapshot.inputType === "text" ? snapshot.text : snapshot.fileText,
        mode: snapshot.mode,
        inputType: snapshot.inputType,
        file: snapshot.file ?? undefined,
        ...snapshot.key,
      });
      setProcessingStatus("success");
      setNotice({
        kind: "success",
        message: snapshot.mode === "encrypt" ? "Mã hóa thành công." : "Giải mã thành công.",
      });
    } catch (error) {
      setResult(null);
      setProcessingStatus("error");
      setNotice({ kind: "error", message: userFacingError(error) });
    } finally {
      requestInFlight.current = false;
      setIsLoading(false);
    }
  }

  async function downloadResult() {
    const snapshot = result;
    if (!snapshot || isBusy || requestInFlight.current) return;

    requestInFlight.current = true;
    setIsLoading(true);
    setNotice(null);
    try {
      if (snapshot.inputType === "text") {
        const suffix = snapshot.mode === "encrypt" ? "encrypted" : "decrypted";
        saveBlob(
          new Blob([snapshot.text], { type: "text/plain;charset=utf-8" }),
          `ket-qua.${suffix}.txt`,
        );
      } else {
        const download = await gateway.downloadFile({
          file: snapshot.file!,
          aToken: snapshot.rawA,
          bToken: snapshot.rawB,
          action: snapshot.mode,
        });
        saveBlob(download.blob, download.filename);
      }
      setNotice({ kind: "success", message: "Đã tải kết quả." });
    } catch (error) {
      setResult(null);
      setProcessingStatus("error");
      setNotice({ kind: "error", message: userFacingError(error) });
    } finally {
      requestInFlight.current = false;
      setIsLoading(false);
    }
  }

  function resetInput() {
    if (draftMutationIsLocked()) return;
    if (inputType === "text") {
      setTextState("");
    } else {
      fileReadVersion.current += 1;
      fileReadInFlight.current = false;
      setFileState(null);
      setFileText("");
      setFileReadError(null);
      setIsReadingFile(false);
    }
    clearDerivedState();
  }

  function loadExample() {
    if (draftMutationIsLocked()) return;
    fileReadVersion.current += 1;
    fileReadInFlight.current = false;
    setModeState("encrypt");
    setInputTypeState("text");
    setTextState("HELLO");
    setFileState(null);
    setFileText("");
    setFileReadError(null);
    setIsReadingFile(false);
    setAState("5");
    setBState("8");
    clearDerivedState();
  }

  function clearResult() {
    if (!draftMutationIsLocked()) clearDerivedState();
  }

  function resetAll() {
    if (draftMutationIsLocked()) return;
    fileReadVersion.current += 1;
    fileReadInFlight.current = false;
    setModeState("encrypt");
    setInputTypeState("text");
    setTextState("");
    setFileState(null);
    setFileText("");
    setFileReadError(null);
    setIsReadingFile(false);
    setAState("");
    setBState("");
    clearDerivedState();
  }

  return {
    mode,
    setMode,
    inputType,
    setInputType,
    text,
    setText,
    file,
    fileText,
    setFile,
    a,
    setA,
    b,
    setB,
    keyValidation,
    result,
    notice,
    setNotice,
    isLoading,
    isReadingFile,
    isBusy,
    processingStatus,
    inputError,
    canSubmit,
    processCipher,
    downloadResult,
    resetInput,
    loadExample,
    clearResult,
    resetAll,
  };
}

export type AffineCipherController = ReturnType<typeof useAffineCipher>;
