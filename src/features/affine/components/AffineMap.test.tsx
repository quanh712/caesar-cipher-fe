import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { validateAffineKeyPair } from "../utils/validation";
import { AffineMap } from "./AffineMap";

describe("AffineMap", () => {
  it("guides the user instead of showing a fake map for an invalid key", () => {
    render(<AffineMap mode="encrypt" input="HELLO" validation={validateAffineKeyPair("2", "8")} />);

    expect(screen.getByRole("heading", { name: "Chưa có bảng ánh xạ" })).toBeInTheDocument();
    expect(screen.getByText("Nhập cặp khóa hợp lệ để xem bảng ánh xạ.")).toBeInTheDocument();
  });

  it("renders the encryption direction and highlights source letters in the draft", () => {
    const { container } = render(
      <AffineMap mode="encrypt" input="Hello" validation={validateAffineKeyPair("5", "8")} />,
    );

    expect(
      screen.getByRole("heading", { name: "E(x) = (5 × x + 8) mod 26 · A → I" }),
    ).toBeInTheDocument();
    const rows = container.querySelectorAll(".alphabet-row");
    expect(within(rows[0] as HTMLElement).getByText("Bản rõ")).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText("Bản mã")).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByText("H")).toHaveClass("alphabet-cell--used");
    expect(within(rows[0] as HTMLElement).getByText("E")).toHaveClass("alphabet-cell--used");
  });

  it("renders the mathematically correct decryption direction", () => {
    const { container } = render(
      <AffineMap mode="decrypt" input="R" validation={validateAffineKeyPair("5", "8")} />,
    );

    expect(
      screen.getByRole("heading", { name: "D(y) = 21 × (y - 8) mod 26 · A → O" }),
    ).toBeInTheDocument();
    const rows = container.querySelectorAll(".alphabet-row");
    expect(within(rows[0] as HTMLElement).getByText("Bản mã")).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText("Bản rõ")).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText("H")).toHaveClass("alphabet-cell--used");
  });

  it("does not let Unicode case expansion highlight ASCII cells", () => {
    const { container } = render(
      <AffineMap mode="encrypt" input="ß ﬃ" validation={validateAffineKeyPair("5", "8")} />,
    );

    expect(container.querySelectorAll(".alphabet-cell--used")).toHaveLength(0);
  });
});
