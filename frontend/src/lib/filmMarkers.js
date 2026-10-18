const EXPOSED_LUMINANCE = 28;

export function markerOnExposedFilm(pixels, width, height, x, y) {
  if (!pixels || width < 2 || height < 2) return false;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const px = Math.min(width - 1, Math.max(0, Math.round(x * (width - 1))));
  const py = Math.min(height - 1, Math.max(0, Math.round(y * (height - 1))));
  const radius = Math.max(3, Math.round(Math.min(width, height) * 0.015));
  const values = [];
  for (let row = py - radius; row <= py + radius; row += 1) {
    if (row < 0 || row >= height) continue;
    for (let column = px - radius; column <= px + radius; column += 1) {
      if (column < 0 || column >= width) continue;
      const index = (row * width + column) * 4;
      values.push(
        pixels[index] * 0.2126 +
          pixels[index + 1] * 0.7152 +
          pixels[index + 2] * 0.0722,
      );
    }
  }
  if (!values.length) return false;
  values.sort((left, right) => left - right);
  return (
    values[Math.min(values.length - 1, Math.floor(values.length * 0.8))] >=
    EXPOSED_LUMINANCE
  );
}

export function markersInsideFilm(image, markers) {
  if (!Array.isArray(markers) || !markers.length) return [];
  if (!image?.naturalWidth || !image?.naturalHeight) return markers;
  const scale = Math.min(
    1,
    256 / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(2, Math.round(image.naturalWidth * scale));
  const height = Math.max(2, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return markers;
  try {
    context.drawImage(image, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    return markers.filter((marker) =>
      markerOnExposedFilm(data, width, height, marker.x, marker.y),
    );
  } catch {
    return markers;
  }
}
