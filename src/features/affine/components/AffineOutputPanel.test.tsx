import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AffineResultSnapshot } from "../types/cipher";
import { AffineOutputPanel } from "./AffineOutputPanel";

const result: AffineResultSnapshot = {
  text: "Rclla 😀",
  source: "Hello 😀",
  mode: "encrypt",
  inputType: "text",
  rawA: "-21",
  rawB: "34",
  normalizedA: 5,
  normalizedB: 8,
  inverseA: 21,
};

function renderPanel(snapshot: AffineResultSnapshot | null = result) {
  const actions = {
    onClear: vi.fn(),
    onCopy: vi.fn(),
    onDownload: vi.fn(),
  };
  const view = render(
    <AffineOutputPanel
      result={snapshot}
      mode="encrypt"
      processingStatus={snapshot ? "success" : "idle"}
      disabled={false}
      {...actions}
    />,
  );
  return { ...actions, ...view };
}

describe("AffineOutputPanel", () => {
  it("shows a directional empty state and disables result actions", () => {
    renderPanel(null);

    expect(screen.getByRole("heading", { name: "Bản mã" })).toBeInTheDocument();
    expect(screen.getByText("Kết quả sẽ hiển thị ở đây sau khi xử lý.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tải kết quả" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sao chép" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Xóa" })).toBeDisabled();
  });

  it("renders colorized result text and dispatches actions", async () => {
    const user = userEvent.setup();
    const actions = renderPanel();

    expect(screen.getByRole("tabpanel", { name: "Văn bản" })).toHaveTextContent("Rclla 😀");
    await user.click(screen.getByRole("button", { name: "Tải kết quả" }));
    await user.click(screen.getByRole("button", { name: "Sao chép" }));
    await user.click(screen.getByRole("button", { name: "Xóa" }));

    expect(actions.onDownload).toHaveBeenCalledOnce();
    expect(actions.onCopy).toHaveBeenCalledOnce();
    expect(actions.onClear).toHaveBeenCalledOnce();
  });

  it("shows immutable snapshot metadata and Unicode code-point statistics", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("tab", { name: "Phân tích" }));

    expect(screen.getByText("-21 / 5")).toBeInTheDocument();
    expect(screen.getByText("34 / 8")).toBeInTheDocument();
    expect(screen.getByText("gcd(5, 26) = 1")).toBeInTheDocument();
    expect(screen.getByText("a⁻¹ = 21")).toBeInTheDocument();
    expect(screen.getByText("E(x) = (5 × x + 8) mod 26")).toBeInTheDocument();
    expect(screen.getByText("7", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("5", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("2", { exact: true })).toBeInTheDocument();
  });

  it("supports Arrow, Home and End navigation between output tabs", () => {
    renderPanel();
    const textTab = screen.getByRole("tab", { name: "Văn bản" });
    const analysisTab = screen.getByRole("tab", { name: "Phân tích" });

    textTab.focus();
    fireEvent.keyDown(textTab, { key: "End" });
    expect(analysisTab).toHaveAttribute("aria-selected", "true");
    expect(analysisTab).toHaveFocus();

    fireEvent.keyDown(analysisTab, { key: "Home" });
    expect(textTab).toHaveAttribute("aria-selected", "true");
    expect(textTab).toHaveFocus();

    fireEvent.keyDown(textTab, { key: "ArrowLeft" });
    expect(analysisTab).toHaveAttribute("aria-selected", "true");
  });

  it("keeps the chosen view when a new result snapshot is rendered", async () => {
    const user = userEvent.setup();
    const { rerender, onClear, onCopy, onDownload } = renderPanel();
    await user.click(screen.getByRole("tab", { name: "Phân tích" }));

    rerender(
      <AffineOutputPanel
        result={{ ...result, text: "New result" }}
        mode="encrypt"
        processingStatus="success"
        disabled={false}
        onClear={onClear}
        onCopy={onCopy}
        onDownload={onDownload}
      />,
    );

    expect(screen.getByRole("tab", { name: "Phân tích" })).toHaveAttribute("aria-selected", "true");
  });
});
