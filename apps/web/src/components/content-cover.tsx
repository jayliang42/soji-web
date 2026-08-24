import clsx from "clsx";

export function ContentCover({
  alt,
  className,
  eager = false,
  label = "GS学院内容库",
  src,
  title = "A clearer next decision"
}: {
  alt: string;
  className?: string;
  eager?: boolean;
  label?: string;
  src?: string;
  title?: string;
}) {
  const placeholderStyles = [
    "bg-[linear-gradient(145deg,#f5e9e2_0%,#f3efe7_52%,#dce6db_100%)]",
    "bg-[linear-gradient(145deg,#e2e9df_0%,#f4f0e8_52%,#ead7cc_100%)]",
    "bg-[linear-gradient(145deg,#eee2d9_0%,#f7f3ec_50%,#d9e2e4_100%)]"
  ] as const;
  const placeholderStyle =
    placeholderStyles[
      [...title].reduce((total, character) => total + character.charCodeAt(0), 0) %
        placeholderStyles.length
    ];

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
          className={`relative flex h-full w-full flex-col justify-between overflow-hidden p-6 sm:p-8 ${placeholderStyle}`}
        >
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full border border-cocoa/10 bg-white/25" />
          <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full border border-clay/15 bg-clay/5" />
          <span className="relative text-[11px] font-bold uppercase tracking-[0.18em] text-cocoa/60">
            {label}
          </span>
          <div className="relative max-w-[18rem]">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-px w-12 bg-clay/60" />
              <span className="h-px w-5 bg-cocoa/25" />
            </div>
            <span className="font-display text-2xl font-bold leading-[1.05] text-cocoa sm:text-3xl">
              {title}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
