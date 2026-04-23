import { useMemo } from "react";

const imagesModules = import.meta.glob(
  "../assets/img/GroupsImg/*.{png,jpg,jpeg,webp}",
  { eager: true }
);

const poolLecturas = Object.values(imagesModules)
  .map((m) => m.default)
  .filter(Boolean);

const hashSeed = (seed) => {
  const s = String(seed ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

export const RandomImgGroup = ({
  seed = 0,
  alt = "lectura",
  className = "",
  style = {},
}) => {
  const src = useMemo(() => {
    if (!poolLecturas.length) return null;
    const index = hashSeed(seed) % poolLecturas.length;
    return poolLecturas[index];
  }, [seed]);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
    />
  );
};
