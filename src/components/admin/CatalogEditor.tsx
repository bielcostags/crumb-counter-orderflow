import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export function CatalogEditor({
  title,
  dirty,
  pending,
  onClose,
  children,
}: {
  title: string;
  dirty: boolean;
  pending: boolean;
  onClose: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const [discard, setDiscard] = useState(false);
  const close = () => {
    if (!pending) {
      if (dirty) setDiscard(true);
      else onClose();
    }
  };
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Atualize as informações e salve as alterações.</DialogDescription>
          </DialogHeader>
          {children(close)}
        </DialogContent>
      </Dialog>
      <AlertDialog open={discard} onOpenChange={setDiscard}>
        <AlertDialogContent className="w-[calc(100%_-_2rem)]">
          <AlertDialogTitle>Descartar alterações não salvas?</AlertDialogTitle>
          <AlertDialogDescription>
            As alterações deste formulário serão perdidas.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={onClose}>Descartar alterações</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
