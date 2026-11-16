import { useState } from "react";
import { Croissant } from "lucide-react";

import { cn } from "@/lib/utils";

interface Props {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}

/** Imagem de produto com fallback quando a URL falha. */
export function ProductImage({ src, alt, className, eager }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={`${alt} (imagem indisponível)`}
        className={cn("flex items-center justify-center bg-secondary text-caramel", className)}
      >
        <Croissant className="h-1/3 w-1/3 max-h-10 max-w-10" aria-hidden />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      width={816}
      height={816}
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}
