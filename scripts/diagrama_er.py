# Genera docs/diagrama-er.html (modelo entidad-relación) con cajas y relaciones en SVG.
# Uso: python scripts/diagrama_er.py   (luego scripts/capturas.ts lo convierte en PNG)
ent = {
    "CATEGORIA": (40, 60, 270, [("PK", "id_categoria", "INT"), ("", "nombre", "VARCHAR(100) UQ"), ("", "slug", "VARCHAR(100) UQ"), ("", "descripcion", "TEXT"), ("", "icono", "VARCHAR(8)")]),
    "USUARIO": (560, 30, 310, [("PK", "id_usuario", "CUID"), ("", "nombre", "VARCHAR(100)"), ("", "correo", "VARCHAR(150) UQ"), ("", "contrasenia", "VARCHAR(255) bcrypt"), ("", "carrera", "VARCHAR(100)"), ("", "contacto", "VARCHAR(30)"), ("", "descripcion", "TEXT"), ("", "habilidades", "VARCHAR(255)"), ("", "rol", "ESTUDIANTE|ADMIN"), ("", "activo", "BOOLEAN"), ("", "reputacion", "DECIMAL(3,2)"), ("", "total_resenas", "INT"), ("", "fecha_registro", "DATETIME")]),
    "SERVICIO": (40, 420, 300, [("PK", "id_servicio", "CUID"), ("FK", "id_proveedor", "→ USUARIO"), ("FK", "id_categoria", "→ CATEGORIA"), ("", "titulo", "VARCHAR(100)"), ("", "descripcion", "TEXT"), ("", "precio", "DECIMAL(10,2) ≥ 0"), ("", "unidad_precio", "HORA|SERVICIO"), ("", "modalidad", "PRESENCIAL|VIDEO"), ("", "horario", "VARCHAR(150)"), ("", "estado", "ACTIVO|RETIRADO"), ("", "fecha_publicacion", "DATETIME"), ("", "fecha_modificacion", "DATETIME")]),
    "SOLICITUD": (560, 470, 310, [("PK", "id_solicitud", "CUID"), ("FK", "id_cliente", "→ USUARIO"), ("FK", "id_servicio", "→ SERVICIO"), ("", "estado", "7 estados"), ("", "modalidad", "PRESENCIAL|VIDEO"), ("", "mensaje_inicial", "VARCHAR(1000)"), ("", "precio_acordado", "DECIMAL(10,2)"), ("", "metodo_pago", "EFECTIVO|TRANSF."), ("", "nota_pago", "VARCHAR(200)"), ("", "fecha_solicitud", "DATETIME"), ("", "fecha_ultimo_cambio", "DATETIME"), ("", "fecha_pago_confirmado", "DATETIME"), ("", "fecha_entrega", "DATETIME"), ("", "fecha_finalizacion", "DATETIME")]),
    "MENSAJE": (1100, 470, 290, [("PK", "id_mensaje", "CUID"), ("FK", "id_solicitud", "→ SOLICITUD"), ("FK", "id_remitente", "→ USUARIO"), ("", "contenido", "TEXT"), ("", "archivo_nombre", "VARCHAR(150)"), ("", "archivo_tipo", "VARCHAR(100)"), ("", "archivo_tamano", "INT ≤ 4 MB"), ("", "archivo_datos", "BYTEA"), ("", "fecha_envio", "DATETIME")]),
    "RESENA": (1100, 800, 290, [("PK", "id_resena", "CUID"), ("FK", "id_solicitud", "→ SOLICITUD UQ"), ("", "calificacion", "SMALLINT 1..5"), ("", "comentario", "VARCHAR(500)"), ("", "fecha_resena", "DATETIME")]),
    "REPORTE": (1100, 230, 290, [("PK", "id", "CUID"), ("FK", "id_servicio", "→ SERVICIO"), ("FK", "id_reportante", "→ USUARIO"), ("", "motivo", "VARCHAR(500)"), ("", "estado", "ABIERTO|RESUELTO|…")]),
    "SESION": (1100, 30, 290, [("PK", "id", "CUID"), ("FK", "id_usuario", "→ USUARIO"), ("", "token_hash", "HMAC-SHA256 UQ"), ("", "expira", "DATETIME")]),
}
H, R = 38, 23


def box(n):
    x, y, w, rows = ent[n]
    return x, y, w, H + R * len(rows)


def pt(n, side, frac=0.5):
    x, y, w, h = box(n)
    return {"l": (x, y + h * frac), "r": (x + w, y + h * frac), "t": (x + w * frac, y), "b": (x + w * frac, y + h)}[side]


html = []
for n, (x, y, w, rows) in ent.items():
    head = "#6b7280" if n in ("SESION", "REPORTE") else "#186442"
    r = "".join(f'<div class="f"><span class="k {k.lower()}">{k}</span><span class="n">{c}</span><span class="t">{t}</span></div>' for k, c, t in rows)
    html.append(f'<div class="e" style="left:{x}px;top:{y}px;width:{w}px"><div class="h" style="background:{head}">{n}</div>{r}</div>')

rels = [
    ("USUARIO", "l", 0.55, "SERVICIO", "t", 0.7, "ofrece", "1", "N"),
    ("CATEGORIA", "b", 0.5, "SERVICIO", "t", 0.3, "clasifica", "1", "N"),
    ("USUARIO", "b", 0.45, "SOLICITUD", "t", 0.45, "solicita (cliente)", "1", "N"),
    ("SERVICIO", "r", 0.45, "SOLICITUD", "l", 0.3, "recibe", "1", "N"),
    ("SOLICITUD", "r", 0.2, "MENSAJE", "l", 0.25, "contiene", "1", "N"),
    ("USUARIO", "b", 0.95, "MENSAJE", "t", 0.3, "envía", "1", "N"),
    ("SOLICITUD", "r", 0.8, "RESENA", "l", 0.4, "se califica", "1", "0..1"),
    ("USUARIO", "r", 0.55, "REPORTE", "l", 0.5, "reporta", "1", "N"),
    ("USUARIO", "r", 0.15, "SESION", "l", 0.5, "inicia", "1", "N"),
]
svg = []
for a, sa, fa, b, sb, fb, lab, ca, cb in rels:
    x1, y1 = pt(a, sa, fa)
    x2, y2 = pt(b, sb, fb)
    if sa in "lr" and sb in "lr":
        d = f"M{x1},{y1} C{(x1+x2)/2},{y1} {(x1+x2)/2},{y2} {x2},{y2}"
    elif sa in "tb" and sb in "tb":
        d = f"M{x1},{y1} C{x1},{(y1+y2)/2} {x2},{(y1+y2)/2} {x2},{y2}"
    elif sa in "lr":
        d = f"M{x1},{y1} C{x2},{y1} {x2},{y1} {x2},{y2}"
    else:
        d = f"M{x1},{y1} C{x1},{y2} {x1},{y2} {x2},{y2}"
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    svg.append(f'<path d="{d}" fill="none" stroke="#1c7d50" stroke-width="2"/>')
    svg.append(f'<circle cx="{x1}" cy="{y1}" r="4" fill="#1c7d50"/><circle cx="{x2}" cy="{y2}" r="4" fill="#f9a01b"/>')
    svg.append(f'<rect x="{mx-len(lab)*3.6-30}" y="{my-11}" width="{len(lab)*7.2+60}" height="22" rx="11" fill="#fff" stroke="#b3e6c8"/>')
    svg.append(f'<text x="{mx}" y="{my+4}" text-anchor="middle" font-size="12" font-weight="600" fill="#10231c">{ca} · {lab} · {cb}</text>')

doc = f'''<!doctype html><html><head><meta charset="utf-8"><style>
body{{margin:0;font-family:"Segoe UI",system-ui,sans-serif;background:#fbfaf6}}
#diagrama{{position:relative;width:1430px;height:1000px;background:#fbfaf6;background-image:radial-gradient(circle at 1px 1px,rgba(16,35,28,.08) 1px,transparent 0);background-size:22px 22px}}
.e{{position:absolute;background:#fff;border:1.5px solid #10231c22;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px -12px #10231c40;z-index:2}}
.h{{color:#fff;font-weight:700;letter-spacing:.08em;font-size:14px;padding:0 14px;height:{H}px;line-height:{H}px}}
.f{{display:flex;gap:8px;align-items:center;height:{R}px;padding:0 12px;font-size:12px;border-top:1px solid #10231c0d}}
.k{{width:22px;font-size:10px;font-weight:800;color:#9ca3af}} .k.pk{{color:#b45309}} .k.fk{{color:#1c7d50}}
.n{{flex:1;font-weight:600;color:#10231c}} .t{{color:#6b7280;font-family:Consolas,monospace;font-size:11px}}
svg{{position:absolute;inset:0;z-index:1}} svg text{{font-family:"Segoe UI",sans-serif}}
.tit{{position:absolute;left:40px;bottom:24px;font-size:13px;color:#10231c99}}
</style></head><body><div id="diagrama">{"".join(html)}<svg width="1430" height="1000">{"".join(svg)}</svg>
<div class="tit"><b style="color:#10231c">Modelo entidad-relación · Marketplace Académico</b> — PostgreSQL · PK clave primaria · FK clave foránea · UQ único · gris = tablas de seguridad/moderación</div></div></body></html>'''
open("docs/diagrama-er.html", "w", encoding="utf-8").write(doc)
print("docs/diagrama-er.html generado")
