import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDeliveryAddress } from "@/hooks/use-delivery-address";
import { DeliveryAddressFields } from "@/components/public/DeliveryAddressFields";
import {
  composeDeliveryAddress,
  deliveryAddressSchema,
  emptyDeliveryAddress,
} from "@/lib/delivery-address";
const response = (street = "Rua Exemplo") =>
  ({
    ok: true,
    json: async () => ({
      logradouro: street,
      bairro: "Centro",
      localidade: "Cidade Exemplo",
      uf: "RO",
    }),
  }) as Response;
function Form() {
  const delivery = useDeliveryAddress(true);
  return <DeliveryAddressFields delivery={delivery} errors={{}} />;
}
function cep(value: string) {
  fireEvent.change(screen.getByLabelText("CEP"), { target: { value } });
}
beforeEach(() => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response())));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("Endereço ViaCEP", () => {
  it("mascara CEP completo e preenche sem preencher número", async () => {
    render(<Form />);
    cep("76801000");
    expect(screen.getByLabelText("CEP")).toHaveValue("76801-000");
    await waitFor(() => expect(screen.getByLabelText("Rua/logradouro")).toHaveValue("Rua Exemplo"));
    expect(screen.getByLabelText("Número")).toHaveValue("");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("CEP incompleto não consulta", async () => {
    render(<Form />);
    cep("76801");
    await new Promise((r) => setTimeout(r, 400));
    expect(fetch).not.toHaveBeenCalled();
  });
  it("trata CEP inexistente", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ erro: true }),
    } as Response);
    render(<Form />);
    cep("00000000");
    expect(await screen.findByText(/CEP não encontrado/)).toBeInTheDocument();
  });
  it("falha de rede mantém preenchimento manual disponível", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    render(<Form />);
    cep("76801000");
    await screen.findByText(/Não foi possível consultar/);
    fireEvent.change(screen.getByLabelText("Rua/logradouro"), { target: { value: "Rua Manual" } });
    expect(screen.getByLabelText("Rua/logradouro")).toHaveValue("Rua Manual");
  });
  it("resposta antiga não substitui CEP novo mesmo sem suporte a abort", async () => {
    let resolveOld!: (r: Response) => void;
    vi.mocked(fetch)
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolveOld = r;
          }),
      )
      .mockResolvedValue(response("Rua Nova"));
    render(<Form />);
    cep("76801000");
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    cep("01001000");
    await waitFor(() => expect(screen.getByLabelText("Rua/logradouro")).toHaveValue("Rua Nova"));
    await act(async () => resolveOld(response("Rua Antiga")));
    expect(screen.getByLabelText("Rua/logradouro")).toHaveValue("Rua Nova");
  });
  it("edição manual durante consulta também invalida resposta", async () => {
    let resolve!: (r: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    render(<Form />);
    cep("76801000");
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText("Rua/logradouro"), {
      target: { value: "Correção manual" },
    });
    await act(async () => resolve(response()));
    expect(screen.getByLabelText("Rua/logradouro")).toHaveValue("Correção manual");
  });
  it("valida campos e compõe endereço completo", () => {
    const a = {
      ...emptyDeliveryAddress,
      cep: "76801-000",
      street: "Rua Exemplo",
      number: "10",
      district: "Centro",
      city: "Cidade Exemplo",
      uf: "RO",
      complement: "Casa",
    };
    expect(deliveryAddressSchema.safeParse(a).success).toBe(true);
    expect(composeDeliveryAddress(a)).toBe(
      "Rua Exemplo, 10, Casa — Centro, Cidade Exemplo/RO — CEP 76801-000",
    );
    expect(deliveryAddressSchema.safeParse({ ...a, number: "" }).success).toBe(false);
  });
  it("permite informar número enquanto aguarda preenchimento automático", async () => {
    let resolve!: (r: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    render(<Form />);
    cep("76801000");
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText("Número"), { target: { value: "25" } });
    await act(async () => resolve(response()));
    expect(screen.getByLabelText("Rua/logradouro")).toHaveValue("Rua Exemplo");
    expect(screen.getByLabelText("Número")).toHaveValue("25");
  });
});
