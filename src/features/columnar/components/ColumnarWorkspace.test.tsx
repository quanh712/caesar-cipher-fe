import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useColumnarCipher } from "../hooks/useColumnarCipher";
import type { ColumnarGateway } from "../services/columnarGateway";
import { createColumnarGateway } from "../test/createColumnarGateway";
import { ColumnarWorkspace } from "./ColumnarWorkspace";

function Harness({ gateway }: { gateway: ColumnarGateway }) {
  const cipher = useColumnarCipher(gateway);
  return <ColumnarWorkspace cipher={cipher} />;
}

describe("ColumnarWorkspace", () => {
  it("uses the HTML vector with Workbench controls and a static matrix", async () => {
    const user = userEvent.setup();
    const gateway = createColumnarGateway();
    render(<Harness gateway={gateway} />);

    await user.click(screen.getByRole("button", { name: "Tạo ví dụ" }));
    expect(screen.getByRole("textbox", { name: "Nội dung đầu vào" })).toHaveValue(
      "khoacongnghethongtin",
    );
    expect(screen.getByRole("textbox", { name: "Khóa hoán vị số" })).toHaveValue("3,6,2,1,5,4");
    expect(screen.getByText("Đọc cột: 4 → 3 → 1 → 6 → 5 → 2")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Đệm x để đủ hàng cuối" })).not.toBeChecked();
    expect(gateway.processText).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Mã hóa" }));
    expect(screen.getByRole("tabpanel", { name: "Văn bản" })).toHaveTextContent(
      "agnonokntioetchghghn",
    );

    await user.click(screen.getByRole("tab", { name: "Phân tích" }));
    expect(screen.getByRole("table", { name: "Ma trận Hệ mã hàng" })).toBeInTheDocument();
    expect(screen.getByText("Ma trận 6 cột")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tiếp|tự chạy|đặt lại bước/i })).toBeNull();
  });

  it("changes between number and keyword keys with visible validation", async () => {
    const user = userEvent.setup();
    render(<Harness gateway={createColumnarGateway()} />);

    await user.click(screen.getByRole("button", { name: "Từ khóa" }));
    const keyInput = screen.getByRole("textbox", { name: "Từ khóa" });
    await user.type(keyInput, "BALLOON");
    expect(screen.getByText("Đọc cột: 2 → 1 → 3 → 4 → 7 → 5 → 6")).toBeInTheDocument();
    await user.clear(keyInput);
    await user.type(keyInput, "KEY1");
    expect(keyInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Từ khóa chỉ được chứa chữ cái.")).toBeInTheDocument();
  });

  it("warns about normalization and hides the pad control in decrypt mode", async () => {
    const user = userEvent.setup();
    render(<Harness gateway={createColumnarGateway()} />);
    await user.type(screen.getByRole("textbox", { name: "Nội dung đầu vào" }), "Đà Nẵng! 9");
    expect(screen.getByRole("note")).toHaveTextContent("Sau chuẩn hóa: danang9");
    expect(screen.getByRole("note")).toHaveTextContent("3 ký tự bị loại");

    await user.click(screen.getByRole("radio", { name: /giải mã/i }));
    expect(screen.queryByRole("checkbox", { name: "Đệm x để đủ hàng cuối" })).toBeNull();
  });

  it("shows the normalized draft even when no characters are removed", async () => {
    const user = userEvent.setup();
    render(<Harness gateway={createColumnarGateway()} />);
    await user.type(screen.getByRole("textbox", { name: "Nội dung đầu vào" }), "abc123");
    expect(screen.getByRole("note")).toHaveTextContent("Sau chuẩn hóa: abc123");
  });

  it("supports keyboard navigation between output views", async () => {
    const user = userEvent.setup();
    render(<Harness gateway={createColumnarGateway()} />);
    const textTab = screen.getByRole("tab", { name: "Văn bản" });
    textTab.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Phân tích" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Home}");
    expect(textTab).toHaveAttribute("aria-selected", "true");
  });

  it("keeps results from becoming stale when the key changes", async () => {
    const user = userEvent.setup();
    render(<Harness gateway={createColumnarGateway()} />);
    await user.click(screen.getByRole("button", { name: "Tạo ví dụ" }));
    await user.click(screen.getByRole("button", { name: "Mã hóa" }));
    expect(screen.getByRole("tabpanel", { name: "Văn bản" })).toHaveTextContent(
      "agnonokntioetchghghn",
    );

    const keyInput = screen.getByRole("textbox", { name: "Khóa hoán vị số" });
    await user.clear(keyInput);
    await user.type(keyInput, "2,1");
    expect(screen.getByRole("tabpanel", { name: "Văn bản" })).toHaveTextContent(
      "Kết quả sẽ hiển thị ở đây sau khi xử lý.",
    );
    expect(screen.queryByText("agnonokntioetchghghn")).toBeNull();
  });
});
