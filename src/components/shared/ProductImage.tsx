import { useState } from "react";
import { Croissant } from "lucide-react";

import { isValidProductImage } from "@/lib/catalog";
import { cn } from "@/lib/utils";

interface Props {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}

/** Imagem de produto com fallback quando a URL falha. */
export function ProductImage({ src, alt, className, eager }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === src || !src || !isValidProductImage(src)) {
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
      width={800}
      height={800}
      onError={() => setFailedSrc(src)}
      className={cn("object-cover", className)}
    />
  );
}
