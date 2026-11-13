"""Rutas del panel de administración de homologaciones.

Todas las operaciones están protegidas: solo usuarios con rol ADMIN pueden
consultar o modificar solicitudes. La validación se hace en el backend; el
frontend replica la redirección, pero la autorización real vive aquí.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Documento, Materia, Programa, Solicitud, Usuario

logger = logging.getLogger(__name__)

router = APIRouter()

# Prioridad de ordenamiento: solicitudes activas primero, luego aprobadas,
# luego rechazadas. Los estudiantes sin solicitudes van al final.
_PRIORIDAD_ESTADO = {0: 0, 1: 0, 2: 1, 3: 2}
_ESTADO_NOMBRE = {
    0: "Borrador",
    1: "Pendiente de revisión",
    2: "Aprobada",
    3: "Rechazada",
}


def _get_admin(db: Session, admin_id: int) -> Usuario:
    """Valida que el usuario exista y tenga rol ADMIN."""
    user = db.query(Usuario).filter(Usuario.estudiante_id == admin_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.rol != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="No tienes permisos de administrador para realizar esta acción.",
        )
    return user


def _estudiante_payload(user: Usuario, programa: Optional[Programa]) -> dict:
    return {
        "id": user.estudiante_id,
        "nombres": user.nombres,
        "apellidos": user.apellidos,
        "nombre_completo": f"{user.nombres or ''} {user.apellidos or ''}".strip(),
        "documento": user.documento,
        "correo": user.correo,
        "codigo": user.codigo,
        "programa": programa.nombre if programa else None,
        "programa_id": user.programa_id,
    }


def _solicitud_payload(sol: Solicitud) -> dict:
    return {
        "solicitud_id": sol.solicitud_id,
        "materia_origen": sol.materia_origen,
        "materia_destino_id": sol.materia_destino_id,
        "tipo_homologacion": sol.tipo_homologacion,
        "estado": sol.estado,
        "estado_nombre": _ESTADO_NOMBRE.get(sol.estado, "Desconocido"),
        "nota_aportada": sol.nota_aportada,
        "creditos_aportados": sol.creditos_aportados,
        "semestre_cursado": sol.semestre_cursado,
        "materia_aprobada": bool(sol.materia_aprobada) if sol.materia_aprobada is not None else None,
        "rule_id": sol.rule_id,
        "fecha_registro": sol.fecha_registro.isoformat() if sol.fecha_registro else None,
    }


# ---------------------------------------------------------------------------
# Panel principal: indicadores + lista organizada de estudiantes y solicitudes
# ---------------------------------------------------------------------------
@router.get("/panel")
def panel_admin(admin_id: int = Query(...), db: Session = Depends(get_db)):
    _get_admin(db, admin_id)

    estudiantes = (
        db.query(Usuario)
        .filter(Usuario.rol == "ESTUDIANTE")
        .order_by(Usuario.estudiante_id)
        .all()
    )
    programas = {p.programa_id: p for p in db.query(Programa).all()}
    solicitudes = (
        db.query(Solicitud)
        .order_by(Solicitud.fecha_registro.desc())
        .all()
    )

    por_estudiante: dict[int, list[Solicitud]] = {}
    for sol in solicitudes:
        por_estudiante.setdefault(sol.estudiante_id, []).append(sol)

    # Indicadores con valores reales de la base de datos.
    indicadores = {
        "total_estudiantes": len(estudiantes),
        "borradores": sum(1 for s in solicitudes if s.estado == 0),
        "pendientes": sum(1 for s in solicitudes if s.estado == 1),
        "aprobadas": sum(1 for s in solicitudes if s.estado == 2),
        "rechazadas": sum(1 for s in solicitudes if s.estado == 3),
    }

    filas: list[dict] = []
    sin_solicitudes: list[dict] = []

    for user in estudiantes:
        user_sols = por_estudiante.get(user.estudiante_id, [])
        if not user_sols:
            sin_solicitudes.append({
                "tipo": "sin_solicitudes",
                "prioridad": 9,
                "estudiante": _estudiante_payload(user, programas.get(user.programa_id)),
            })
            continue

        for sol in user_sols:
            filas.append({
                "tipo": "solicitud",
                "prioridad": _PRIORIDAD_ESTADO.get(sol.estado, 3),
                "fecha_registro": sol.fecha_registro,
                "estudiante": _estudiante_payload(user, programas.get(user.programa_id)),
                "solicitud": _solicitud_payload(sol),
            })

    # Activa/pendiente primero, luego aprobadas, luego rechazadas y al final
    # los estudiantes sin solicitudes. Dentro de cada grupo, fecha reciente.
    from itertools import groupby

    orden_final = []
    for prioridad, grupo in groupby(
        sorted(filas, key=lambda f: f["prioridad"]), key=lambda f: f["prioridad"]
    ):
        orden_final.extend(
            sorted(grupo, key=lambda f: f["fecha_registro"] or "", reverse=True)
        )
    orden_final.extend(sin_solicitudes)

    return {"indicadores": indicadores, "filas": orden_final}


# ---------------------------------------------------------------------------
# Detalle de una solicitud
# ---------------------------------------------------------------------------
@router.get("/solicitudes/{solicitud_id}")
def detalle_solicitud(
    solicitud_id: int,
    admin_id: int = Query(...),
    db: Session = Depends(get_db),
):
    _get_admin(db, admin_id)

    sol = db.query(Solicitud).filter(Solicitud.solicitud_id == solicitud_id).first()
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    user = db.query(Usuario).filter(Usuario.estudiante_id == sol.estudiante_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    programa = (
        db.query(Programa).filter(Programa.programa_id == user.programa_id).first()
        if user.programa_id
        else None
    )
    materia_destino = (
        db.query(Materia).filter(Materia.materia_id == sol.materia_destino_id).first()
        if sol.materia_destino_id
        else None
    )
    documentos = (
        db.query(Documento)
        .filter(Documento.solicitud_id == sol.solicitud_id)
        .order_by(Documento.fecha_carga)
        .all()
    )

    return {
        "estudiante": _estudiante_payload(user, programa),
        "solicitud": _solicitud_payload(sol),
        "materia_destino": (
            {
                "id": materia_destino.materia_id,
                "nombre": materia_destino.nombre,
                "creditos": materia_destino.creditos,
            }
            if materia_destino
            else None
        ),
        "documentos": [
            {
                "documento_id": d.documento_id,
                "tipo_documento": d.tipo_documento,
                "nombre_archivo": d.nombre_archivo,
                "verificado": bool(d.verificado),
                "observacion": d.observacion,
                "fecha_carga": d.fecha_carga.isoformat() if d.fecha_carga else None,
            }
            for d in documentos
        ],
    }


# ---------------------------------------------------------------------------
# Cambiar el estado de una solicitud (aprobar / rechazar)
# ---------------------------------------------------------------------------
@router.post("/solicitudes/{solicitud_id}/estado")
def cambiar_estado_solicitud(
    solicitud_id: int,
    admin_id: int = Query(...),
    nuevo_estado: int = Query(...),
    db: Session = Depends(get_db),
):
    admin = _get_admin(db, admin_id)

    if nuevo_estado not in (2, 3):
        raise HTTPException(
            status_code=400,
            detail="Estado inválido. Solo se permite aprobar (2) o rechazar (3).",
        )

    sol = db.query(Solicitud).filter(Solicitud.solicitud_id == solicitud_id).first()
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    if sol.estado == nuevo_estado:
        raise HTTPException(
            status_code=409,
            detail=f"La solicitud ya se encuentra en el estado {nuevo_estado}.",
        )

    sol.estado = nuevo_estado
    db.commit()
    db.refresh(sol)

    logger.info(
        "Admin %s cambió la solicitud %s al estado %s",
        admin.estudiante_id,
        solicitud_id,
        nuevo_estado,
    )

    return {
        "message": "Estado actualizado correctamente",
        "solicitud_id": sol.solicitud_id,
        "estado": sol.estado,
        "estado_nombre": _ESTADO_NOMBRE.get(sol.estado, "Desconocido"),
    }


# ---------------------------------------------------------------------------
# Documentos: visualización y descarga del PDF
# ---------------------------------------------------------------------------
@router.get("/documentos/{documento_id}")
def obtener_documento(
    documento_id: int,
    admin_id: int = Query(...),
    descargar: bool = Query(False),
    db: Session = Depends(get_db),
):
    _get_admin(db, admin_id)

    doc = db.query(Documento).filter(Documento.documento_id == documento_id).first()
    if not doc or not doc.pdf_content:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    headers = {}
    if descargar:
        nombre = (doc.nombre_archivo or f"documento_{documento_id}.pdf").replace('"', "")
        headers["Content-Disposition"] = f'attachment; filename="{nombre}"'

    return Response(content=bytes(doc.pdf_content), media_type="application/pdf", headers=headers)
