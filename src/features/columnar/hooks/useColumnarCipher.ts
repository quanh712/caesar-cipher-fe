import { useMemo, useRef, useState } from "react";
import { CipherApiError } from "../../../shared/services/cipherApi";
import type { CipherMode, InputType, NoticeState } from "../../../shared/types/cipher";
import { saveBlob } from "../../../shared/utils/download";
import { MAX_TEXT_FILE_BYTES } from "../../../shared/utils/textFileValidation";
import type { ColumnarFileRequest, ColumnarGateway } from "../services/columnarGateway";
import type { ColumnarResultSnapshot, ProcessingStatus } from "../types/cipher";
import { readColumnarFile } from "../utils/fileText";
import { parseColumnarKey, validateColumnarInput } from "../utils/validation";

const FILE_READ_ERROR = "Không thể đọc nội dung file. Vui lòng chọn lại file.";
const FILE_ENCODING_ERROR = "File phải sử dụng UTF-8.";

function userFacingError(error: unknown): string {
  return error instanceof CipherApiError
    ? error.message
    : "Không thể kết nối tới máy chủ. Vui lòng thử lại.";
}

export function useColumnarCipher(gateway: ColumnarGateway) {
  const [mode, setModeState] = useState<CipherMode>("encrypt");
  const [inputType, setInputTypeState] = useState<InputType>("text");
  const [text, setTextState] = useState("");
  const [file, setFileState] = useState<File | null>(null);
  const [fileText, setFileText] = useState("");
  const [fileReadError, setFileReadError] = useState<string | null>(null);
  const [key, setKeyState] = useState("");
  const [result, setResult] = useState<ColumnarResultSnapshot | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>("idle");
  const fileReadVersion = useRef(0);
  const fileReadInFlight = useRef(false);
  const requestInFlight = useRef(false);

  const keyValidation = useMemo(() => parseColumnarKey(key), [key]);
  const inputError = useMemo(() => {
    if (fileReadError) return fileReadError;
    return validateColumnarInput(inputType, text, file);
  }, [file, fileReadError, inputType, text]);
  const isBusy = isLoading || isReadingFile;
  const canSubmit = !isBusy && !inputError && keyValidation.ok;

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

  function setKey(nextKey: string) {
    if (draftMutationIsLocked()) return;
    setKeyState(nextKey);
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
      const content = await readColumnarFile(nextFile);
      if (fileReadVersion.current === readVersion) setFileText(content.text);
    } catch (error) {
      if (fileReadVersion.current === readVersion) {
        const message = error instanceof TypeError ? FILE_ENCODING_ERROR : FILE_READ_ERROR;
        setFileReadError(message);
        setProcessingStatus("error");
        setNotice({ kind: "error", message });
      }
    } finally {
      if (fileReadVersion.current === readVersion) {
        fileReadInFlight.current = false;
        setIsReadingFile(false);
      }
    }
  }

  async function processCipher() {
    if (!canSubmit || draftMutationIsLocked() || !keyValidation.ok) return;
    const snapshot = {
      mode,
      inputType,
      text,
      file,
      fileText,
      key,
      parsedKey: keyValidation.value,
    };
    requestInFlight.current = true;
    setResult(null);
    setIsLoading(true);
    setProcessingStatus("loading");
    setNotice(null);

    try {
      const response =
        snapshot.inputType === "text"
          ? await gateway.processText(snapshot.mode, { text: snapshot.text, key: snapshot.key })
          : await gateway.previewFile({
              file: snapshot.file!,
              action: snapshot.mode,
              key: snapshot.key,
            });

      setResult({
        text: response.result,
        source: snapshot.inputType === "text" ? snapshot.text : snapshot.fileText,
        mode: snapshot.mode,
        inputType: snapshot.inputType,
        file: snapshot.file ?? undefined,
        key: {
          ...snapshot.parsedKey,
          permutation: [...snapshot.parsedKey.permutation],
          readOrder: [...snapshot.parsedKey.readOrder],
        },
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
        const request: ColumnarFileRequest = {
          file: snapshot.file!,
          key: snapshot.key.raw,
          action: snapshot.mode,
        };
        const download = await gateway.downloadFile(request);
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
    setTextState("khoacongnghethongtin");
    setFileState(null);
    setFileText("");
    setFileReadError(null);
    setIsReadingFile(false);
    setKeyState("3,6,2,1,5,4");
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
    setKeyState("");
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
    key,
    setKey,
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

export type ColumnarCipherController = ReturnType<typeof useColumnarCipher>;
