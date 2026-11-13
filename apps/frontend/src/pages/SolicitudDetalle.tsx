import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../services/api';
import {
  LogOut,
  Moon,
  Sun,
  ArrowLeft,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Download,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

interface Estudiante {
  id: number;
  nombre_completo: string;
  documento?: string;
  correo?: string;
  codigo?: string;
  programa?: string | null;
}

interface Solicitud {
  solicitud_id: number;
  materia_origen?: string;
  tipo_homologacion?: string;
  estado: number;
  estado_nombre?: string;
  nota_aportada?: number | null;
  creditos_aportados?: number | null;
  semestre_cursado?: number | null;
  materia_aprobada?: boolean | null;
  rule_id?: string | null;
  fecha_registro?: string;
}

interface MateriaDestino {
  id: number;
  nombre: string;
  creditos: number;
}

interface Documento {
  documento_id: number;
  tipo_documento?: string;
  nombre_archivo?: string;
  verificado: boolean;
  observacion?: string | null;
  fecha_carga?: string;
}

const ESTILOS_ESTADO: Record<string, string> = {
  'Borrador': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  'Pendiente de revisión': 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  'Aprobada': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  'Rechazada': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
};

const formatearFecha = (iso?: string) => {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function SolicitudDetalle() {
  const { id } = useParams<{ id: string }>();
  const { user, setUser, toggleDarkMode, darkMode } = useStore();
  const navigate = useNavigate();

  const [estudiante, setEstudiante] = useState<Estudiante | null>(null);
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [materiaDestino, setMateriaDestino] = useState<MateriaDestino | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [accion, setAccion] = useState<'aprobar' | 'rechazar' | ''>('');
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [pdfVisible, setPdfVisible] = useState<Documento | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let activo = true;

    const cargar = async () => {
      setCargando(true);
      try {
        const res = await api.get(`/admin/solicitudes/${id}`, {
          params: { admin_id: user.id },
        });
        if (!activo) return;
        setEstudiante(res.data.estudiante as Estudiante);
        setSolicitud(res.data.solicitud as Solicitud);
        setMateriaDestino((res.data.materia_destino ?? null) as MateriaDestino | null);
        setDocumentos(res.data.documentos as Documento[]);
      } catch (e: any) {
        if (activo) {
          const detalle = e.response?.data?.detail;
          setError(
            typeof detalle === 'string'
              ? detalle
              : 'No se pudo cargar la solicitud.'
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargar();
    return () => {
      activo = false;
    };
  }, [user, id]);

  // Recarga la solicitud tras un cambio de estado para reflejarlo al instante.
  const recargar = async () => {
    if (!user || !id) return;
    try {
      const res = await api.get(`/admin/solicitudes/${id}`, {
        params: { admin_id: user.id },
      });
      setSolicitud(res.data.solicitud as Solicitud);
    } catch {
      /* silencioso */
    }
  };

  const aplicarCambio = async () => {
    if (!user || !id || !accion) return;
    const mensaje =
      accion === 'aprobar'
        ? '¿Está seguro de que desea aprobar esta solicitud de homologación?'
        : '¿Está seguro de que desea rechazar esta solicitud de homologación?';

    if (!window.confirm(mensaje)) return;

    setProcesando(true);
    setAviso(null);
    try {
      const nuevoEstado = accion === 'aprobar' ? 2 : 3;
      const res = await api.post(
        `/admin/solicitudes/${id}/estado`,
        {},
        { params: { admin_id: user.id, nuevo_estado: nuevoEstado } }
      );
      setAviso({ tipo: 'ok', texto: res.data.message || 'Estado actualizado correctamente.' });
      setAccion('');
      await recargar();
    } catch (e: any) {
      const detalle = e.response?.data?.detail;
      setAviso({
        tipo: 'error',
        texto:
          typeof detalle === 'string'
            ? detalle
            : 'No se pudo actualizar la solicitud.',
      });
    } finally {
      setProcesando(false);
    }
  };

  const urlPdf = (doc: Documento) =>
    `${api.defaults.baseURL}/admin/documentos/${doc.documento_id}?admin_id=${user?.id}`;
  const urlDescarga = (doc: Documento) =>
    `${urlPdf(doc)}&descargar=1`;

  return (
    <div className="flex h-screen bg-[#F3F4F6] dark:bg-gray-900 font-sans">
      {/* Barra lateral */}
      <aside className="w-72 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex flex-col shadow-sm z-10">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
            U
          </div>
          <div>
            <span className="font-bold text-xl text-gray-800 dark:text-white tracking-tight block leading-none">
              UniEspinal
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Administración
            </span>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
          >
            <ArrowLeft size={18} /> Volver al panel
          </button>
        </nav>

        <div className="mt-auto p-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-300">
              {darkMode ? <Moon size={18} /> : <Sun size={18} />}
              <span>Modo Oscuro</span>
            </div>
            <button
              onClick={toggleDarkMode}
              aria-label="Cambiar modo oscuro"
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${darkMode ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </button>
          </div>
          <button
            onClick={() => setUser(null)}
            className="flex items-center gap-3 text-sm font-medium w-full p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all"
          >
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 flex flex-col relative">
        <header className="h-20 flex items-center justify-between px-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 absolute top-0 w-full z-10">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-500" size={20} />
            <div>
              <h1 className="font-bold text-lg text-gray-800 dark:text-white leading-tight">
                Detalle de la solicitud
              </h1>
              {solicitud && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  ID #{solicitud.solicitud_id}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 bg-white dark:bg-gray-700 px-4 py-2 rounded-full shadow-sm border border-gray-100 dark:border-gray-600">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {user?.name}
              </span>
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-full flex items-center justify-center uppercase font-bold text-xs shadow-md">
                {user?.name?.[0]}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pt-24 pb-10 px-8 scroll-smooth">
          {cargando && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-16">
              <Loader2 className="animate-spin" size={18} /> Cargando solicitud…
            </div>
          )}

          {error && !cargando && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border border-red-100 dark:border-red-800 rounded-2xl p-4 text-sm flex items-center gap-2">
              <AlertTriangle size={18} /> {error}
            </div>
          )}

          {!cargando && !error && (
            <>
              {aviso && (
                <div
                  className={`mb-4 rounded-2xl p-4 text-sm flex items-center gap-2 border ${
                    aviso.tipo === 'ok'
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border-red-100 dark:border-red-800'
                  }`}
                >
                  {aviso.tipo === 'ok' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  {aviso.texto}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Estudiante */}
                <section className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                  <h2 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white mb-4">
                    <Users size={18} className="text-blue-500" /> Estudiante
                  </h2>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-xs text-gray-400 dark:text-gray-500">Nombre completo</dt>
                      <dd className="font-medium text-gray-800 dark:text-gray-100">
                        {estudiante?.nombre_completo || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400 dark:text-gray-500">Documento</dt>
                      <dd className="font-medium text-gray-800 dark:text-gray-100">
                        {estudiante?.documento || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400 dark:text-gray-500">Correo</dt>
                      <dd className="font-medium text-gray-800 dark:text-gray-100 break-all">
                        {estudiante?.correo || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400 dark:text-gray-500">Código institucional</dt>
                      <dd className="font-medium text-gray-800 dark:text-gray-100">
                        {estudiante?.codigo || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400 dark:text-gray-500">Programa académico</dt>
                      <dd className="font-medium text-gray-800 dark:text-gray-100">
                        {estudiante?.programa || 'Sin programa registrado'}
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* Homologación */}
                <section className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                  <h2 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white mb-4">
                    <FileText size={18} className="text-blue-500" /> Homologación
                  </h2>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-xs text-gray-400 dark:text-gray-500">Materia por homologar</dt>
                      <dd className="font-medium text-gray-800 dark:text-gray-100">
                        {solicitud?.materia_origen || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400 dark:text-gray-500">Tipo</dt>
                      <dd className="font-medium text-gray-800 dark:text-gray-100">
                        {solicitud?.tipo_homologacion || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400 dark:text-gray-500">Materia de destino</dt>
                      <dd className="font-medium text-gray-800 dark:text-gray-100">
                        {materiaDestino
                          ? `${materiaDestino.nombre} (${materiaDestino.creditos} créditos)`
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400 dark:text-gray-500">Nota aportada</dt>
                      <dd className="font-medium text-gray-800 dark:text-gray-100">
                        {solicitud?.nota_aportada != null ? solicitud.nota_aportada : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400 dark:text-gray-500">Créditos aportados</dt>
                      <dd className="font-medium text-gray-800 dark:text-gray-100">
                        {solicitud?.creditos_aportados ?? '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400 dark:text-gray-500">Fecha de creación</dt>
                      <dd className="font-medium text-gray-800 dark:text-gray-100">
                        {formatearFecha(solicitud?.fecha_registro)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400 dark:text-gray-500">Estado actual</dt>
                      <dd>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            ESTILOS_ESTADO[solicitud?.estado_nombre || ''] ||
                            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {solicitud?.estado_nombre || 'Desconocido'}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* Acción del administrador */}
                <section className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                  <h2 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white mb-4">
                    <ShieldCheck size={18} className="text-blue-500" /> Decisión
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Selecciona la acción y confirma. El cambio se guarda directamente en la base
                    de datos y queda registrado en el historial del trámite.
                  </p>

                  <label
                    htmlFor="accion-estado"
                    className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5"
                  >
                    Acción a realizar
                  </label>
                  <select
                    id="accion-estado"
                    value={accion}
                    onChange={(e) => setAccion(e.target.value as 'aprobar' | 'rechazar' | '')}
                    disabled={procesando}
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <option value="">— Selecciona una acción —</option>
                    <option value="aprobar">Aprobar solicitud</option>
                    <option value="rechazar">Rechazar solicitud</option>
                  </select>

                  <button
                    onClick={aplicarCambio}
                    disabled={!accion || procesando}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-tr from-blue-600 to-indigo-500 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {procesando ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : accion === 'rechazar' ? (
                      <XCircle size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    {procesando ? 'Guardando…' : 'Aplicar y confirmar'}
                  </button>

                  <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
                    Se pedirá una confirmación antes de guardar. Solo se modifica la solicitud
                    seleccionada; los documentos y demás relaciones se conservan intactos.
                  </p>
                </section>
              </div>

              {/* Documentos */}
              <section className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
                    <FileText size={18} className="text-blue-500" /> Documentos asociados
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {documentos.length}{' '}
                    {documentos.length === 1 ? 'documento' : 'documentos'} de esta solicitud
                  </p>
                </div>

                {documentos.length === 0 ? (
                  <p className="px-6 py-10 text-sm text-gray-400 text-center">
                    Esta solicitud no tiene documentos adjuntos.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {documentos.map((doc) => (
                      <li
                        key={doc.documento_id}
                        className="px-6 py-4 flex items-center gap-4"
                      >
                        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                          <FileText size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                            {doc.tipo_documento || 'Documento'}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                            {doc.nombre_archivo || '—'}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {formatearFecha(doc.fecha_carga)} ·{' '}
                            {doc.verificado
                              ? 'Validado automáticamente'
                              : 'Pendiente de validación manual'}
                            {doc.observacion ? ` · ${doc.observacion}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setPdfVisible(doc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            <Eye size={14} /> Ver PDF
                          </button>
                          <a
                            href={urlDescarga(doc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            <Download size={14} /> Descargar
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      {/* Visor de PDF */}
      {pdfVisible && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setPdfVisible(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                  {pdfVisible.tipo_documento}
                </p>
                <p className="text-xs text-gray-400 truncate">{pdfVisible.nombre_archivo}</p>
              </div>
              <button
                onClick={() => setPdfVisible(null)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
            <iframe
              src={urlPdf(pdfVisible)}
              title={`PDF: ${pdfVisible.tipo_documento || pdfVisible.nombre_archivo || ''}`}
              className="flex-1 w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
