import { useMemo } from "react";


const imagesModules = import.meta.glob(
  "../assets/img/TareasImg/*.{png,jpg,jpeg,webp}",
  { eager: true }
);


const poolTareas = Object.values(imagesModules)
  .map((m) => m.default)
  .filter(Boolean);

export const RandomImgTarea = ({
  seed = 0,
  alt = "tarea",
  className = "",
  style = {},
}) => {
  const src = useMemo(() => {
    if (!poolTareas.length) return null;
    const index = Math.abs(Number(seed) || 0) % poolTareas.length;
    return poolTareas[index];
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