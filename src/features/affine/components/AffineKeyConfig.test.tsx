import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { validateAffineKeyPair } from "../utils/validation";
import { AffineKeyConfig } from "./AffineKeyConfig";

function renderConfig(a = "", b = "", mode: "encrypt" | "decrypt" = "encrypt") {
  const onAChange = vi.fn();
  const onBChange = vi.fn();
  render(
    <AffineKeyConfig
      mode={mode}
      a={a}
      b={b}
      validation={validateAffineKeyPair(a, b)}
      onAChange={onAChange}
      onBChange={onBChange}
    />,
  );
  return { onAChange, onBChange };
}

describe("AffineKeyConfig", () => {
  it("renders neutral inputs and a symbolic formula before entry", () => {
    renderConfig();

    expect(screen.getByRole("textbox", { name: "Khóa nhân a" })).toHaveAttribute(
      "inputmode",
      "numeric",
    );
    expect(screen.getByRole("textbox", { name: "Khóa dịch b" })).toHaveAttribute(
      "inputmode",
      "numeric",
    );
    expect(screen.getByLabelText("Công thức Affine hiện tại")).toHaveTextContent(
      "E(x) = (a × x + b) mod 26",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Chưa nhập khóa");
  });

  it("emits raw input tokens without converting them", () => {
    const { onAChange, onBChange } = renderConfig();

    fireEvent.change(screen.getByRole("textbox", { name: "Khóa nhân a" }), {
      target: { value: "+005" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Khóa dịch b" }), {
      target: { value: "-18" },
    });

    expect(onAChange).toHaveBeenCalledWith("+005");
    expect(onBChange).toHaveBeenCalledWith("-18");
  });

  it("shows normalized values, the concrete formula and inverse for a valid pair", () => {
    renderConfig("-21", "34");

    expect(screen.getByText("a: -21 → 5")).toBeInTheDocument();
    expect(screen.getByText("b: 34 → 8")).toBeInTheDocument();
    expect(screen.getByLabelText("Công thức Affine hiện tại")).toHaveTextContent(
      "E(x) = (5 × x + 8) mod 26",
    );
    expect(screen.getByRole("status")).toHaveTextContent("gcd(5, 26) = 1");
    expect(screen.getByRole("status")).toHaveTextContent("a⁻¹ = 21");
  });

  it("links a field error without duplicating it into another live region", () => {
    renderConfig("2", "8");

    const input = screen.getByRole("textbox", { name: "Khóa nhân a" });
    const error = screen.getByText("a không hợp lệ vì gcd(2, 26) phải bằng 1.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", error.id);
    expect(error).not.toHaveAttribute("role", "status");
    expect(screen.getByRole("status")).toHaveTextContent("Cặp khóa chưa hợp lệ");
  });

  it("treats the identity pair as valid and explains its effect", () => {
    renderConfig("27", "-26", "decrypt");

    expect(screen.getByLabelText("Công thức Affine hiện tại")).toHaveTextContent(
      "D(y) = 1 × (y - 0) mod 26",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Khóa hợp lệ");
    expect(screen.getByRole("status")).toHaveTextContent("Khóa này không làm thay đổi nội dung.");
  });

  it("disables both controls", () => {
    render(
      <AffineKeyConfig
        mode="encrypt"
        a="5"
        b="8"
        validation={validateAffineKeyPair("5", "8")}
        disabled
        onAChange={vi.fn()}
        onBChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Khóa nhân a" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Khóa dịch b" })).toBeDisabled();
  });
});
