import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";

describe("error recovery screen", () => {
  it("hides technical details and offers safe recovery actions", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<ErrorPage error={new Error("private database failure")} reset={reset} />);

    const heading = screen.getByRole("heading", { name: "Ups, algo salió mal" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.queryByText(/private database failure/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");

    await user.click(screen.getByRole("button", { name: "Intentar nuevamente" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
