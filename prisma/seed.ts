// Datos de demostración para la Feria del Ingenio.
// Ejecutar: npm run db:seed  (requiere SEED_ADMIN_PASSWORD y SEED_DEMO_PASSWORD en el entorno/.env)
import { PrismaClient, type EstadoSolicitud } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync, existsSync } from "node:fs";

// Carga .env sin dependencias externas
if (existsSync(".env")) {
  for (const linea of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && process.env[m[1]!] === undefined) process.env[m[1]!] = m[2];
  }
}

const prisma = new PrismaClient();

const CATEGORIAS = [
  ["Programación", "programacion", "💻", "Python, Java, C#, web, bases de datos y lógica."],
  ["Matemáticas", "matematicas", "📐", "Cálculo, álgebra, estadística y matemática discreta."],
  ["Asesoría de proyectos", "proyectos", "🎓", "Acompañamiento y revisión de proyectos universitarios."],
  ["Idiomas", "idiomas", "🌎", "Inglés, francés y preparación de exámenes."],
  ["Edición de video", "video", "🎬", "Premiere, CapCut, DaVinci y producción audiovisual."],
  ["Diseño gráfico", "diseno", "🎨", "Canva, Illustrator, Figma, logotipos y afiches."],
  ["Ingeniería y AutoCAD", "ingenieria", "📏", "AutoCAD, Civil 3D, construcción e hidráulica."],
  ["Presentaciones", "presentaciones", "📊", "Diapositivas, oratoria y defensa de proyectos."],
  ["Ciencias", "ciencias", "🧪", "Física, química y biología."],
  ["Otros", "otros", "✨", "Todo lo demás que la comunidad sabe hacer."],
] as const;

const ESTUDIANTES = [
  { correo: "ana@marketplace.test", nombre: "Ana Lucía Reyes", carrera: "Ingeniería en Computación", habilidades: "Python, Java, SQL, Estructuras de datos", descripcion: "Monitora de Programación I. Me encanta explicar con ejemplos y ejercicios prácticos.", contacto: "+504 9811-2233" },
  { correo: "carlos@marketplace.test", nombre: "Carlos Mejía", carrera: "Ingeniería Civil", habilidades: "AutoCAD, Civil 3D, Hidráulica, Topografía", descripcion: "Practicante en una constructora del Valle de Sula. Te ayudo a entender planos y modelado.", contacto: "+504 3344-5566" },
  { correo: "sofia@marketplace.test", nombre: "Sofía Paz", carrera: "Licenciatura en Lenguas Extranjeras", habilidades: "Inglés, Francés, TOEFL, Conversación", descripcion: "Nivel C1 de inglés. Clases dinámicas de conversación y preparación de TOEFL.", contacto: "+504 9900-1122" },
  { correo: "diego@marketplace.test", nombre: "Diego Fernández", carrera: "Diseño Gráfico", habilidades: "Illustrator, Figma, Canva, Premiere", descripcion: "Diseñador freelance. Hago identidad visual, afiches y edición de video para eventos.", contacto: "+504 8877-6655" },
  { correo: "valeria@marketplace.test", nombre: "Valeria Castillo", carrera: "Ingeniería Industrial", habilidades: "Cálculo, Estadística, Excel, Álgebra lineal", descripcion: "Tutora de Cálculo I y II desde hace dos años. Paciencia garantizada.", contacto: "+504 9555-4433" },
  { correo: "jose@marketplace.test", nombre: "José Martínez", carrera: "Administración de Empresas", habilidades: "Presentaciones, Oratoria, PowerPoint", descripcion: "Ganador del concurso de oratoria UTH 2025. Te preparo para tu defensa.", contacto: "+504 3222-1100" },
];

type Svc = [correo: string, cat: string, titulo: string, desc: string, precio: number, unidad: "HORA" | "SERVICIO", modalidad: "PRESENCIAL" | "VIDEOCONFERENCIA" | null, horario: string];
const SERVICIOS: Svc[] = [
  ["ana@marketplace.test", "programacion", "Tutoría de Python desde cero", "Aprende variables, condicionales, ciclos, funciones y listas con ejercicios reales. Ideal para Programación I y lógica. Incluye material en PDF y retos semanales.", 150, "HORA", "VIDEOCONFERENCIA", "Lunes a jueves, 6:00–9:00 p. m."],
  ["ana@marketplace.test", "programacion", "Repaso de SQL y bases de datos para parciales", "Consultas SELECT, JOIN, GROUP BY, subconsultas y normalización. Practicamos con una base de datos real y resolvemos dudas de tu guía.", 180, "HORA", null, "Fines de semana"],
  ["ana@marketplace.test", "proyectos", "Revisión de código de tu proyecto de clase", "Reviso tu repositorio, te explico errores, buenas prácticas y cómo organizar el código. No hago el proyecto por ti: te acompaño para que lo entiendas.", 300, "SERVICIO", "VIDEOCONFERENCIA", "Entrega en 48 horas"],
  ["carlos@marketplace.test", "ingenieria", "Clases de AutoCAD 2D y 3D", "Comandos básicos, capas, cotas, bloques e impresión de planos. Luego pasamos a modelado 3D. Llevo laptop con licencia educativa si es presencial.", 200, "HORA", "PRESENCIAL", "Sábados 8:00 a. m.–12:00 m."],
  ["carlos@marketplace.test", "ingenieria", "Asesoría en sistemas hidráulicos", "Te explico conceptos de hidráulica de canales y tuberías aplicados al Valle de Sula, con ejemplos de obras reales y ejercicios tipo examen.", 220, "HORA", "PRESENCIAL", "Martes y jueves por la tarde"],
  ["sofia@marketplace.test", "idiomas", "Conversación en inglés (nivel intermedio)", "Sesiones 100 % en inglés para ganar fluidez y confianza. Temas de la vida diaria, entrevistas de trabajo y presentaciones académicas.", 160, "HORA", "VIDEOCONFERENCIA", "Todos los días, 7:00–9:00 p. m."],
  ["sofia@marketplace.test", "idiomas", "Preparación para el TOEFL ITP", "Estrategias para listening, structure y reading. Simulacros cronometrados y retroalimentación personalizada.", 250, "HORA", null, "A convenir"],
  ["diego@marketplace.test", "diseno", "Diseño de logotipo e identidad para tu emprendimiento", "Incluye 3 propuestas, 2 rondas de cambios, manual básico de marca y archivos en PNG, SVG y PDF.", 900, "SERVICIO", "VIDEOCONFERENCIA", "Entrega en 5 días"],
  ["diego@marketplace.test", "video", "Edición de video para eventos y redes", "Edición de videos de hasta 5 minutos con subtítulos, música libre de derechos y corrección de color.", 600, "SERVICIO", null, "Entrega en 3 días"],
  ["diego@marketplace.test", "diseno", "Taller de Canva para presentaciones", "Aprende a diseñar diapositivas y afiches profesionales en Canva en una sola sesión práctica.", 120, "HORA", "PRESENCIAL", "Viernes por la tarde"],
  ["valeria@marketplace.test", "matematicas", "Tutoría de Cálculo I: límites y derivadas", "Repasamos límites, continuidad, reglas de derivación y aplicaciones. Resolvemos ejercicios de guías y parciales anteriores.", 170, "HORA", "PRESENCIAL", "Lunes, miércoles y viernes"],
  ["valeria@marketplace.test", "matematicas", "Estadística para ingenieros", "Probabilidad, distribuciones, intervalos de confianza y pruebas de hipótesis con Excel y ejemplos de la carrera.", 190, "HORA", "VIDEOCONFERENCIA", "A convenir"],
  ["jose@marketplace.test", "presentaciones", "Preparación para la defensa de tu proyecto", "Ensayamos tu presentación, mejoramos tus diapositivas y practicamos preguntas difíciles del jurado. Ideal antes de la Feria del Ingenio.", 250, "SERVICIO", "PRESENCIAL", "A convenir"],
  ["jose@marketplace.test", "presentaciones", "Diapositivas profesionales en PowerPoint", "Convierto tu contenido en una presentación clara y visual con plantilla a la medida. Tú pones las ideas, yo el diseño.", 350, "SERVICIO", "VIDEOCONFERENCIA", "Entrega en 48 horas"],
];

// [servicio (índice), cliente, estado final, calificación?, comentario?]
const HISTORIAL: [number, string, EstadoSolicitud, number?, string?][] = [
  [0, "carlos@marketplace.test", "COMPLETADA", 5, "Ana explica súper claro. Pasé Programación I gracias a sus tutorías."],
  [0, "sofia@marketplace.test", "COMPLETADA", 5, "Muy paciente y con buenos ejercicios."],
  [1, "valeria@marketplace.test", "COMPLETADA", 4, "Buen repaso de JOINs, me hubiera gustado más tiempo."],
  [3, "ana@marketplace.test", "COMPLETADA", 5, "Carlos domina AutoCAD. Muy recomendado."],
  [4, "jose@marketplace.test", "COMPLETADA", 4, "Me ayudó a entender hidráulica para el parcial."],
  [5, "diego@marketplace.test", "COMPLETADA", 5, "Sesiones muy entretenidas, mejoré mi fluidez."],
  [7, "jose@marketplace.test", "COMPLETADA", 5, "El logo quedó increíble. Cumplió en tiempo."],
  [8, "valeria@marketplace.test", "COMPLETADA", 3, "Buen trabajo pero tardó un día más de lo acordado."],
  [10, "ana@marketplace.test", "COMPLETADA", 5, "La mejor tutora de cálculo."],
  [10, "diego@marketplace.test", "COMPLETADA", 4, "Explica bien, a veces va un poco rápido."],
  [12, "carlos@marketplace.test", "COMPLETADA", 5, "Me dio mucha seguridad para la defensa."],
  [2, "jose@marketplace.test", "ENTREGADA"],
  [6, "valeria@marketplace.test", "PAGO_CONFIRMADO"],
  [11, "sofia@marketplace.test", "ACEPTADA"],
  [13, "ana@marketplace.test", "PENDIENTE"],
  [9, "carlos@marketplace.test", "PENDIENTE"],
  [3, "valeria@marketplace.test", "RECHAZADA"],
  [5, "jose@marketplace.test", "CANCELADA"],
];

const dias = (n: number) => new Date(Date.now() - n * 86400000);

async function main() {
  const adminCorreo = (process.env.SEED_ADMIN_EMAIL ?? "admin@marketplace.test").toLowerCase();
  const adminPass = process.env.SEED_ADMIN_PASSWORD;
  const demoPass = process.env.SEED_DEMO_PASSWORD;
  if (!adminPass || adminPass.length < 10 || !demoPass || demoPass.length < 8) {
    throw new Error("Define SEED_ADMIN_PASSWORD (mín. 10) y SEED_DEMO_PASSWORD (mín. 8) en .env antes de sembrar datos.");
  }

  for (const [nombre, slug, icono, descripcion] of CATEGORIAS) {
    await prisma.categoria.upsert({ where: { slug }, update: { nombre, icono, descripcion }, create: { nombre, slug, icono, descripcion } });
  }
  console.log(`✔ ${CATEGORIAS.length} categorías`);

  await prisma.usuario.upsert({
    where: { correo: adminCorreo },
    update: { rol: "ADMIN", activo: true, contrasenia: await bcrypt.hash(adminPass, 12) },
    create: { correo: adminCorreo, nombre: "Administración Marketplace", rol: "ADMIN", contrasenia: await bcrypt.hash(adminPass, 12) },
  });
  console.log(`✔ administrador: ${adminCorreo}`);

  // SEED_DEMO="false" crea solo categorías y administrador (sin estudiantes ficticios).
  if (process.env.SEED_DEMO === "false") {
    console.log("ℹ SEED_DEMO=false: no se crean estudiantes ni servicios de demostración.");
    return;
  }

  if (await prisma.usuario.findUnique({ where: { correo: ESTUDIANTES[0]!.correo } })) {
    console.log("ℹ Los datos de demostración ya existen; no se duplican.");
    return;
  }

  const hashDemo = await bcrypt.hash(demoPass, 12);
  const ids: Record<string, string> = {};
  for (const [i, e] of ESTUDIANTES.entries()) {
    const u = await prisma.usuario.create({ data: { ...e, contrasenia: hashDemo, fechaRegistro: dias(60 - i * 5) } });
    ids[e.correo] = u.id;
  }
  console.log(`✔ ${ESTUDIANTES.length} estudiantes de demostración`);

  const cats = Object.fromEntries((await prisma.categoria.findMany()).map((c) => [c.slug, c.id]));
  const servicios = [];
  for (const [i, [correo, cat, titulo, descripcion, precio, unidadPrecio, modalidad, horario]] of SERVICIOS.entries()) {
    servicios.push(
      await prisma.servicio.create({
        data: { proveedorId: ids[correo]!, categoriaId: cats[cat]!, titulo, descripcion, precio, unidadPrecio, modalidad, horario, fechaPublicacion: dias(40 - i * 2) },
      }),
    );
  }
  console.log(`✔ ${servicios.length} servicios`);

  for (const [i, [idx, cliente, estado, nota, comentario]] of HISTORIAL.entries()) {
    const s = servicios[idx]!;
    const base = 30 - i;
    const pagado = ["PAGO_CONFIRMADO", "ENTREGADA", "COMPLETADA"].includes(estado);
    const sol = await prisma.solicitud.create({
      data: {
        clienteId: ids[cliente]!,
        servicioId: s.id,
        estado,
        modalidad: s.modalidad,
        precioAcordado: s.precio,
        mensajeInicial: "Hola, me interesa tu servicio. ¿Tienes disponibilidad esta semana?",
        fechaSolicitud: dias(base),
        fechaUltimoCambio: dias(Math.max(0, base - 3)),
        ...(pagado ? { metodoPago: "TRANSFERENCIA" as const, fechaPagoConfirmado: dias(base - 1) } : {}),
        ...(estado === "ENTREGADA" || estado === "COMPLETADA" ? { fechaEntrega: dias(base - 2) } : {}),
        ...(estado === "COMPLETADA" ? { fechaFinalizacion: dias(base - 3) } : {}),
      },
    });
    await prisma.mensaje.create({ data: { solicitudId: sol.id, remitenteId: ids[cliente]!, contenido: "¡Hola! Te escribo por la solicitud. ¿Qué día te queda bien?", fechaEnvio: dias(base) } });
    if (estado !== "PENDIENTE") {
      await prisma.mensaje.create({ data: { solicitudId: sol.id, remitenteId: s.proveedorId, contenido: "¡Hola! Claro, coordinemos por aquí los detalles.", fechaEnvio: dias(base - 0.5) } });
    }
    if (nota) await prisma.resena.create({ data: { solicitudId: sol.id, calificacion: nota, comentario, fechaResena: dias(base - 3) } });
  }

  // RF-14: reputación = promedio de calificaciones
  for (const id of Object.values(ids)) {
    const agg = await prisma.resena.aggregate({ where: { solicitud: { servicio: { proveedorId: id } } }, _avg: { calificacion: true }, _count: true });
    await prisma.usuario.update({
      where: { id },
      data: { reputacion: agg._avg.calificacion === null ? null : Math.round(agg._avg.calificacion * 100) / 100, totalResenas: agg._count },
    });
  }
  console.log(`✔ ${HISTORIAL.length} solicitudes con mensajes y reseñas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
