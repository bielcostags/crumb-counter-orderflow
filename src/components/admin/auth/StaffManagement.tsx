import { useEffect, useRef, useState } from "react";
import { listStaff, changeStaff } from "@/services/auth/functions";
import type { StaffProfile } from "@/services/auth/policy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAdminSession } from "@/contexts/admin-session";
export function StaffManagement() {
  const { profile } = useAdminSession();
  const [rows, setRows] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [revision, setRevision] = useState(0);
  const [edit, setEdit] = useState<StaffProfile | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const enabled = import.meta.env["VITE_STAFF_MANAGEMENT_ENABLED"] === "true";
  useEffect(() => {
    let live = true;
    setLoading(true);
    setRows([]);
    listStaff()
      .then((result) => {
        if (live) setRows(result);
      })
      .catch(() => {
        if (live) setError("Não foi possível consultar os funcionários. Verifique sua sessão.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [revision]);
  const busy = useRef(false);
  const save = async () => {
    if (!edit || !confirmed || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await changeStaff({
        data: { id: edit.id, fullName: edit.full_name, role: edit.role, active: edit.active },
      });
      setFeedback("Perfil atualizado.");
      setEdit(null);
      setRevision((x) => x + 1);
    } catch {
      setError(
        "Alteração não realizada. Verifique as permissões e mantenha um administrador ativo.",
      );
    } finally {
      setSaving(false);
      busy.current = false;
    }
  };
  return (
    <section className="space-y-5">
      <h1 className="font-display text-2xl text-primary">Funcionários</h1>
      <p>Contas individuais e permissões da equipe.</p>
      {!enabled && (
        <p>
          Alterações de perfil aguardam a ativação autorizada do módulo. A consulta não altera
          dados.
        </p>
      )}
      <Button disabled>Convidar funcionário</Button>
      <p className="text-sm text-muted-foreground">
        Convites exigem um endpoint administrativo seguro ainda não liberado. Nenhuma conta será
        criada por esta tela.
      </p>
      {error && <p role="alert">{error}</p>}
      {feedback && <p role="status">{feedback}</p>}
      {loading ? (
        <p role="status">Carregando funcionários…</p>
      ) : rows.length === 0 ? (
        <p>Nenhum funcionário disponível.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
            >
              <div>
                <p className="font-semibold">{row.full_name}</p>
                <p>
                  {row.role === "admin" ? "Administrador" : "Atendente"} ·{" "}
                  {row.active ? "Ativo" : "Inativo"}
                </p>
              </div>
              <Button
                variant="outline"
                disabled={!enabled || row.id === profile?.id}
                onClick={() => {
                  setEdit(row);
                  setConfirmed(false);
                }}
              >
                Editar permissões
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="outline"
        onClick={() => {
          setError("");
          setRevision((x) => x + 1);
        }}
        disabled={loading}
      >
        Atualizar lista
      </Button>
      <Dialog
        open={!!edit}
        onOpenChange={(open) => {
          if (!open && !saving) setEdit(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar alteração de funcionário</DialogTitle>
            <DialogDescription>
              Alterar acesso é uma operação sensível, registrada em auditoria.
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <div className="space-y-4">
              <label className="block">
                Nome
                <Input
                  value={edit.full_name}
                  maxLength={80}
                  onChange={(e) => {
                    setEdit({ ...edit, full_name: e.target.value });
                    setConfirmed(false);
                  }}
                />
              </label>
              <label className="block">
                Papel
                <select
                  className="ml-3 rounded border p-2"
                  value={edit.role}
                  onChange={(e) => {
                    setEdit({ ...edit, role: e.target.value as StaffProfile["role"] });
                    setConfirmed(false);
                  }}
                >
                  <option value="atendente">Atendente</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={edit.active}
                  onChange={(e) => {
                    setEdit({ ...edit, active: e.target.checked });
                    setConfirmed(false);
                  }}
                />
                Funcionário ativo
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Conferi e confirmo a alteração de acesso
              </label>
              <Button disabled={!confirmed || saving} onClick={() => void save()}>
                {saving ? "Salvando…" : "Confirmar alteração"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
