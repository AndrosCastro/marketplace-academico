-- Restricciones de integridad adicionales (RNF-06) que Prisma no expresa en el esquema.

-- Precio del servicio y precio acordado no negativos (RF-04)
ALTER TABLE "servicios"   ADD CONSTRAINT "chk_servicio_precio"  CHECK ("precio" >= 0);
ALTER TABLE "solicitudes" ADD CONSTRAINT "chk_solicitud_precio" CHECK ("precio_acordado" >= 0);

-- Calificación entre 1 y 5 (RF-12, RN-09)
ALTER TABLE "resenas" ADD CONSTRAINT "chk_resena_calificacion" CHECK ("calificacion" BETWEEN 1 AND 5);

-- Un mensaje debe tener texto o archivo
ALTER TABLE "mensajes" ADD CONSTRAINT "chk_mensaje_no_vacio"
  CHECK (("contenido" IS NOT NULL AND length(trim("contenido")) > 0) OR "archivo_datos" IS NOT NULL);

-- Archivos de máximo 4 MB
ALTER TABLE "mensajes" ADD CONSTRAINT "chk_mensaje_archivo_tamano"
  CHECK ("archivo_tamano" IS NULL OR "archivo_tamano" <= 4194304);

-- RN-08: un estudiante no puede solicitar su propio servicio (defensa en la base de datos)
CREATE OR REPLACE FUNCTION fn_validar_solicitud_no_propia() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "servicios" s WHERE s."id_servicio" = NEW."id_servicio" AND s."id_proveedor" = NEW."id_cliente") THEN
    RAISE EXCEPTION 'RN-08: no se puede solicitar un servicio propio';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_solicitud_no_propia
  BEFORE INSERT ON "solicitudes"
  FOR EACH ROW EXECUTE FUNCTION fn_validar_solicitud_no_propia();

-- RN-12: el remitente de un mensaje debe ser el cliente o el proveedor de la solicitud
CREATE OR REPLACE FUNCTION fn_validar_remitente_mensaje() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "solicitudes" so JOIN "servicios" se ON se."id_servicio" = so."id_servicio"
    WHERE so."id_solicitud" = NEW."id_solicitud"
      AND (so."id_cliente" = NEW."id_remitente" OR se."id_proveedor" = NEW."id_remitente")
  ) THEN
    RAISE EXCEPTION 'RN-12: el remitente no participa en la solicitud';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mensaje_remitente
  BEFORE INSERT ON "mensajes"
  FOR EACH ROW EXECUTE FUNCTION fn_validar_remitente_mensaje();
