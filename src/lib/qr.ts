import QRCode from "qrcode";

/** A QR code as an SVG path: n×n modules, one unit each, dark runs merged per row. Drawn the same on screen and in the PDF. */
export type QrShape = { n: number; d: string };

export function qrShape(text: string): QrShape {
  const { size: n, data } = QRCode.create(text, { errorCorrectionLevel: "M" }).modules;
  let d = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!data[y * n + x]) continue;
      let end = x;
      while (end + 1 < n && data[y * n + end + 1]) end++;
      d += `M${x} ${y}H${end + 1}V${y + 1}H${x}Z`;
      x = end;
    }
  }
  return { n, d };
}
