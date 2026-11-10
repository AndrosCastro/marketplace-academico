// Validación de archivos adjuntos del chat (RF-16, CP-23).
// Se verifica tamaño, extensión, tipo MIME declarado y la "firma" real del archivo (magic bytes),
// para evitar que un ejecutable se suba renombrado como PDF.

export const TAMANO_MAXIMO = 4 * 1024 * 1024; // 4 MB (límite de cuerpo de Vercel ≈ 4.5 MB)

type Tipo = { ext: string[]; mime: string; firma?: (b: Uint8Array) => boolean };

const empieza = (b: Uint8Array, bytes: number[]) => bytes.every((x, i) => b[i] === x);
const esZip = (b: Uint8Array) => empieza(b, [0x50, 0x4b, 0x03, 0x04]);

export const TIPOS_PERMITIDOS: Tipo[] = [
  { ext: ["pdf"], mime: "application/pdf", firma: (b) => empieza(b, [0x25, 0x50, 0x44, 0x46]) },
  { ext: ["png"], mime: "image/png", firma: (b) => empieza(b, [0x89, 0x50, 0x4e, 0x47]) },
  { ext: ["jpg", "jpeg"], mime: "image/jpeg", firma: (b) => empieza(b, [0xff, 0xd8, 0xff]) },
  { ext: ["gif"], mime: "image/gif", firma: (b) => empieza(b, [0x47, 0x49, 0x46, 0x38]) },
  { ext: ["webp"], mime: "image/webp", firma: (b) => empieza(b, [0x52, 0x49, 0x46, 0x46]) },
  { ext: ["docx"], mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", firma: esZip },
  { ext: ["xlsx"], mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", firma: esZip },
  { ext: ["pptx"], mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", firma: esZip },
  { ext: ["txt"], mime: "text/plain" },
];

export const ACCEPT_ATTR = TIPOS_PERMITIDOS.flatMap((t) => t.ext.map((e) => "." + e)).join(",");

export type ResultadoArchivo = { ok: true; mime: string; nombre: string } | { ok: false; error: string };

export function validarArchivo(nombre: string, tamano: number, bytes: Uint8Array): ResultadoArchivo {
  if (tamano <= 0) return { ok: false, error: "El archivo está vacío." };
  if (tamano > TAMANO_MAXIMO) return { ok: false, error: "El archivo supera el límite de 4 MB." };
  const limpio = nombre.replace(/[\\/:*?"<>|\u0000-\u001F]/g, "_").slice(-150);
  const ext = limpio.split(".").pop()?.toLowerCase() ?? "";
  const tipo = TIPOS_PERMITIDOS.find((t) => t.ext.includes(ext));
  if (!tipo) return { ok: false, error: "Formato no permitido. Usa PDF, imágenes o documentos de Office." };
  if (tipo.firma && !tipo.firma(bytes)) return { ok: false, error: "El contenido del archivo no coincide con su extensión." };
  if (!tipo.firma) {
    // texto plano: no debe contener bytes nulos
    if (bytes.subarray(0, 4096).includes(0)) return { ok: false, error: "El archivo de texto no es válido." };
  }
  return { ok: true, mime: tipo.mime, nombre: limpio };
}
