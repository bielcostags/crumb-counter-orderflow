import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function CategoryDeactivateDialog({
  open,
  count,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  count: number;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !pending) onClose();
      }}
    >
      <AlertDialogContent className="w-[calc(100%_-_2rem)]">
        <AlertDialogHeader>
          <AlertDialogTitle>Desativar categoria?</AlertDialogTitle>
          <AlertDialogDescription>
            {count} produto(s) vinculado(s) deixarão de ser exibidos e vendidos nesta categoria.
            Produtos e pedidos históricos serão preservados. A reativação mantém a disponibilidade
            individual de cada produto.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Voltar</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending ? "Processando…" : "Confirmar desativação"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
