interface Props {
  src: string;
  alt: string;
}

export function ImageBlock({ src, alt }: Props) {
  return (
    <figure className="my-8">
      <img src={src} alt={alt} className="w-full rounded-[12px] border border-border" />
      {alt && (
        <figcaption className="text-center font-mono text-[11.5px] text-text-3 mt-3">
          {alt}
        </figcaption>
      )}
    </figure>
  );
}
