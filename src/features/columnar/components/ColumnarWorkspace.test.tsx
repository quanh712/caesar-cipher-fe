import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useColumnarCipher } from "../hooks/useColumnarCipher";
import { createColumnarGateway } from "../test/createColumnarGateway";
import { ColumnarWorkspace } from "./ColumnarWorkspace";

function Harness() {
  return <ColumnarWorkspace cipher={useColumnarCipher(createColumnarGateway())} />;
}

describe("ColumnarWorkspace", () => {
  it("shows the familiar Workbench controls and BE example matrix", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Tạo ví dụ" }));
    expect(screen.getByRole("textbox", { name: "Khóa cột" })).toHaveValue("3,6,2,1,5,4");
    expect(screen.queryByRole("checkbox", { name: /đệm/i })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Mã hóa" }));
    expect(screen.getByRole("tabpanel", { name: "Văn bản" })).toHaveTextContent(
      "agnonokntioetchghghn",
    );
    await user.click(screen.getByRole("tab", { name: "Phân tích" }));
    expect(screen.getByRole("table", { name: "Ma trận Hệ mã hàng" })).toBeInTheDocument();
  });

  it("auto-detects keyword and reports non-ASCII key errors", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const key = screen.getByRole("textbox", { name: "Khóa cột" });
    await user.type(key, "BALLOON");
    expect(screen.getByText("Đọc cột: 2 → 1 → 3 → 4 → 7 → 5 → 6")).toBeInTheDocument();
    await user.clear(key);
    await user.type(key, "ĐẮT");
    expect(key).toHaveAttribute("aria-invalid", "true");
    await user.clear(key);
    await user.type(key, "\u00a0");
    expect(key).toHaveAttribute("aria-invalid", "true");
    expect(key).toHaveAccessibleDescription(/2 đến 256 cột/i);
    expect(key).toHaveAccessibleDescription(/chỉ bỏ khoảng trắng ASCII ở hai đầu khóa/i);
    expect(screen.getByText(/chỉ bỏ khoảng trắng ASCII ở hai đầu khóa/i)).toBeInTheDocument();
  });

  it("explains lossless input and supports keyboard tabs", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByText(/hoán vị nguyên vẹn mọi ký tự Unicode/i)).toBeInTheDocument();
    const tab = screen.getByRole("tab", { name: "Văn bản" });
    tab.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Phân tích" })).toHaveAttribute("aria-selected", "true");
  });
});
