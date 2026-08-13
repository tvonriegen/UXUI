import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import Modal from "./Modal";

function ModalHarness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Abrir modal</button>
      <Modal
        open={open}
        title="Modal de prueba"
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      >
        <button type="button">Primera acción</button>
        <button type="button">Última acción</button>
      </Modal>
    </>
  );
}

describe("Modal keyboard accessibility", () => {
  it("moves focus inside and restores it to the opener after closing", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    const opener = screen.getByRole("button", { name: "Abrir modal" });

    await user.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Modal de prueba" });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it("closes with Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ModalHarness onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Abrir modal" }));
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps Tab navigation inside the dialog", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    await user.click(screen.getByRole("button", { name: "Abrir modal" }));

    const dialog = screen.getByRole("dialog", { name: "Modal de prueba" });
    const close = within(dialog).getByRole("button", { name: "Cerrar" });
    const last = within(dialog).getByRole("button", { name: "Última acción" });

    last.focus();
    await user.tab();
    expect(close).toHaveFocus();

    close.focus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
  });

  it("provides an accessible fallback name when the visual title is empty", () => {
    render(
      <Modal open onClose={() => {}} title="">
        <p>Contenido</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog", { name: "Ventana de diálogo" })).toBeVisible();
  });
});
