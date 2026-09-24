import { downloadFile, previewFile, transformText } from "../../../shared/services/cipherApi";
import type { ColumnarGateway } from "./columnarGateway";

export const columnarApi: ColumnarGateway = {
  processText(mode, request) {
    return transformText("columnar", mode, JSON.stringify(request));
  },
  previewFile(request) {
    return previewFile({ cipher: "columnar", ...request });
  },
  downloadFile(request) {
    return downloadFile({ cipher: "columnar", ...request });
  },
};
