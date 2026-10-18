import assert from "node:assert/strict";
import test from "node:test";
import { markerOnExposedFilm } from "./filmMarkers.js";

function frame(width, height, paint) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4)
    pixels[index + 3] = 255;
  paint(pixels, width, height);
  return pixels;
}

test("a marker on the black border is outside the exposed film", () => {
  const pixels = frame(40, 40, (data, width) => {
    for (let y = 12; y < 28; y += 1) {
      for (let x = 12; x < 28; x += 1) {
        const index = (y * width + x) * 4;
        data[index] = data[index + 1] = data[index + 2] = 140;
      }
    }
  });
  assert.equal(markerOnExposedFilm(pixels, 40, 40, 0.05, 0.5), false);
  assert.equal(markerOnExposedFilm(pixels, 40, 40, 0.5, 0.5), true);
});
