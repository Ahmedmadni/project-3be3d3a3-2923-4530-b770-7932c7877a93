import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageVisualHeaderProps = {
  title: string;
  subtitle?: string;
  image: string;
  imageAlt: string;
  sticker?: string;
  children?: ReactNode;
  className?: string;
};

export function PageVisualHeader({ title, subtitle, image, imageAlt, sticker, children, className }: PageVisualHeaderProps) {
  return (
    <section className={cn("glass relative mb-6 min-h-52 overflow-hidden rounded-3xl", className)}>
      <img src={image} alt={imageAlt} width={1504} height={1008} loading="lazy" className="absolute inset-0 size-full object-cover object-left" />
      <div className="absolute inset-0 bg-gradient-to-l from-background via-background/90 to-background/15" />
      <div className="relative z-10 flex min-h-52 max-w-2xl flex-col justify-center p-6 pe-24 sm:p-8 sm:pe-36">
        <h1 className="text-2xl font-extrabold md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm leading-7 text-muted-foreground md:text-base">{subtitle}</p> : null}
        {children}
      </div>
      {sticker ? <img src={sticker} alt="" width={816} height={816} loading="lazy" className="pointer-events-none absolute bottom-2 end-2 z-10 size-24 object-contain drop-shadow-lg sm:bottom-3 sm:end-4 sm:size-32" /> : null}
    </section>
  );
}