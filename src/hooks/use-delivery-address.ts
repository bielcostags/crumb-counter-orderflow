import { useEffect, useRef, useState } from "react";
import { emptyDeliveryAddress, maskCEP, type DeliveryAddress } from "@/lib/delivery-address";
import { onlyDigits } from "@/lib/format";
export function useDeliveryAddress(enabled: boolean) {
  const [address, setAddress] = useState<DeliveryAddress>(emptyDeliveryAddress);
  const [message, setMessage] = useState("");
  const revision = useRef(0);
  function update(key: keyof DeliveryAddress, value: string) {
    if (key !== "number" && key !== "complement") revision.current++;
    setMessage("");
    setAddress((prev) =>
      key === "cep"
        ? { ...prev, cep: maskCEP(value), street: "", district: "", city: "", uf: "" }
        : { ...prev, [key]: key === "uf" ? value.toUpperCase() : value },
    );
  }
  useEffect(() => {
    if (!enabled || onlyDigits(address.cep).length !== 8) return;
    const controller = new AbortController();
    const request = ++revision.current;
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 8000);
    const timer = setTimeout(async () => {
      if (request !== revision.current) return;
      setMessage("Buscando endereço...");
      try {
        const response = await fetch(`https://viacep.com.br/ws/${onlyDigits(address.cep)}/json/`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("network");
        const data: unknown = await response.json();
        if (!active || request !== revision.current) return;
        if (!data || typeof data !== "object") throw new Error("invalid");
        const record = data as Record<string, unknown>;
        if (record["erro"]) {
          setMessage("CEP não encontrado. Confira o CEP ou preencha o endereço manualmente.");
          return;
        }
        if (
          ![record["logradouro"], record["bairro"], record["localidade"], record["uf"]].every(
            (v) => typeof v === "string",
          )
        )
          throw new Error("invalid");
        setAddress((prev) => ({
          ...prev,
          street: String(record["logradouro"]),
          district: String(record["bairro"]),
          city: String(record["localidade"]),
          uf: String(record["uf"]),
        }));
        setMessage("Endereço encontrado. Confira os dados e informe o número.");
      } catch {
        if (active && request === revision.current)
          setMessage("Não foi possível consultar o CEP. Preencha o endereço manualmente.");
      } finally {
        clearTimeout(timeout);
      }
    }, 350);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
      clearTimeout(timeout);
    };
  }, [address.cep, enabled]);
  return { address, update, message };
}
