import clsx from "clsx";

export function ContentCover({
  alt,
  className,
  eager = false,
  src
}: {
  alt: string;
  className?: string;
  eager?: boolean;
  src?: string;
}) {
  return (
    <div
      className={clsx(
        "aspect-[4/3] w-full overflow-hidden rounded-md bg-cream",
        className
      )}
    >
      {src ? (
        // Dynamic publisher URLs cannot be enumerated in Next Image's host allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={1200}
          height={900}
          decoding="async"
          loading={eager ? "eager" : "lazy"}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="relative h-full w-full bg-[linear-gradient(145deg,rgba(155,67,43,0.08),transparent_56%),linear-gradient(25deg,rgba(32,31,28,0.06),transparent_50%)]"
        >
          <div className="absolute bottom-5 left-5 h-px w-16 bg-clay/50" />
          <div className="absolute bottom-5 left-24 h-px w-8 bg-cocoa/20" />
        </div>
      )}
    </div>
  );
}
