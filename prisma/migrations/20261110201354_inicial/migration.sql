-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ESTUDIANTE', 'ADMIN');

-- CreateEnum
CREATE TYPE "EstadoServicio" AS ENUM ('ACTIVO', 'RETIRADO');

-- CreateEnum
CREATE TYPE "UnidadPrecio" AS ENUM ('HORA', 'SERVICIO');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('PENDIENTE', 'ACEPTADA', 'PAGO_CONFIRMADO', 'ENTREGADA', 'COMPLETADA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "Modalidad" AS ENUM ('PRESENCIAL', 'VIDEOCONFERENCIA');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "EstadoReporte" AS ENUM ('ABIERTO', 'RESUELTO', 'DESCARTADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id_usuario" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "correo" VARCHAR(150) NOT NULL,
    "contrasenia" VARCHAR(255) NOT NULL,
    "carrera" VARCHAR(100),
    "contacto" VARCHAR(30),
    "descripcion" TEXT,
    "habilidades" VARCHAR(255),
    "rol" "Rol" NOT NULL DEFAULT 'ESTUDIANTE',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "reputacion" DECIMAL(3,2),
    "total_resenas" INTEGER NOT NULL DEFAULT 0,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id_categoria" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "icono" VARCHAR(8) NOT NULL DEFAULT '✨',

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "servicios" (
    "id_servicio" TEXT NOT NULL,
    "id_proveedor" TEXT NOT NULL,
    "id_categoria" INTEGER NOT NULL,
    "titulo" VARCHAR(100) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "unidad_precio" "UnidadPrecio" NOT NULL DEFAULT 'HORA',
    "modalidad" "Modalidad",
    "horario" VARCHAR(150),
    "estado" "EstadoServicio" NOT NULL DEFAULT 'ACTIVO',
    "fecha_publicacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(3),

    CONSTRAINT "servicios_pkey" PRIMARY KEY ("id_servicio")
);

-- CreateTable
CREATE TABLE "solicitudes" (
    "id_solicitud" TEXT NOT NULL,
    "id_cliente" TEXT NOT NULL,
    "id_servicio" TEXT NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "modalidad" "Modalidad",
    "mensaje_inicial" VARCHAR(1000),
    "precio_acordado" DECIMAL(10,2) NOT NULL,
    "metodo_pago" "MetodoPago",
    "nota_pago" VARCHAR(200),
    "fecha_solicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_ultimo_cambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_pago_confirmado" TIMESTAMP(3),
    "fecha_entrega" TIMESTAMP(3),
    "fecha_finalizacion" TIMESTAMP(3),

    CONSTRAINT "solicitudes_pkey" PRIMARY KEY ("id_solicitud")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id_mensaje" TEXT NOT NULL,
    "id_solicitud" TEXT NOT NULL,
    "id_remitente" TEXT NOT NULL,
    "contenido" TEXT,
    "archivo_nombre" VARCHAR(150),
    "archivo_tipo" VARCHAR(100),
    "archivo_tamano" INTEGER,
    "archivo_datos" BYTEA,
    "fecha_envio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id_mensaje")
);

-- CreateTable
CREATE TABLE "resenas" (
    "id_resena" TEXT NOT NULL,
    "id_solicitud" TEXT NOT NULL,
    "calificacion" SMALLINT NOT NULL,
    "comentario" VARCHAR(500),
    "fecha_resena" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resenas_pkey" PRIMARY KEY ("id_resena")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" TEXT NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "creada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_uso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira" TIMESTAMP(3) NOT NULL,
    "user_agent" VARCHAR(255),

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intentos_acceso" (
    "id" TEXT NOT NULL,
    "clave" VARCHAR(200) NOT NULL,
    "exitoso" BOOLEAN NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intentos_acceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bitacora" (
    "id" TEXT NOT NULL,
    "id_usuario" TEXT,
    "accion" VARCHAR(60) NOT NULL,
    "detalle" VARCHAR(500),
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes" (
    "id" TEXT NOT NULL,
    "id_servicio" TEXT NOT NULL,
    "id_reportante" TEXT NOT NULL,
    "motivo" VARCHAR(500) NOT NULL,
    "estado" "EstadoReporte" NOT NULL DEFAULT 'ABIERTO',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reportes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_slug_key" ON "categorias"("slug");

-- CreateIndex
CREATE INDEX "servicios_estado_fecha_publicacion_idx" ON "servicios"("estado", "fecha_publicacion");

-- CreateIndex
CREATE INDEX "servicios_id_categoria_idx" ON "servicios"("id_categoria");

-- CreateIndex
CREATE INDEX "servicios_id_proveedor_idx" ON "servicios"("id_proveedor");

-- CreateIndex
CREATE INDEX "solicitudes_id_cliente_idx" ON "solicitudes"("id_cliente");

-- CreateIndex
CREATE INDEX "solicitudes_id_servicio_idx" ON "solicitudes"("id_servicio");

-- CreateIndex
CREATE INDEX "mensajes_id_solicitud_fecha_envio_idx" ON "mensajes"("id_solicitud", "fecha_envio");

-- CreateIndex
CREATE UNIQUE INDEX "resenas_id_solicitud_key" ON "resenas"("id_solicitud");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_token_hash_key" ON "sesiones"("token_hash");

-- CreateIndex
CREATE INDEX "sesiones_id_usuario_idx" ON "sesiones"("id_usuario");

-- CreateIndex
CREATE INDEX "intentos_acceso_clave_fecha_idx" ON "intentos_acceso"("clave", "fecha");

-- CreateIndex
CREATE INDEX "bitacora_fecha_idx" ON "bitacora"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "reportes_id_servicio_id_reportante_key" ON "reportes"("id_servicio", "id_reportante");

-- AddForeignKey
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categorias"("id_categoria") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "servicios"("id_servicio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "solicitudes"("id_solicitud") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_id_remitente_fkey" FOREIGN KEY ("id_remitente") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resenas" ADD CONSTRAINT "resenas_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "solicitudes"("id_solicitud") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacora" ADD CONSTRAINT "bitacora_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "servicios"("id_servicio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_id_reportante_fkey" FOREIGN KEY ("id_reportante") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
