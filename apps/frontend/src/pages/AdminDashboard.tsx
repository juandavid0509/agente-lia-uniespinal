import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../services/api';
import {
  LogOut,
  Moon,
  Sun,
  LayoutDashboard,
  ClipboardList,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  AlertTriangle,
} from 'lucide-react';

interface Estudiante {
  id: number;
  nombres?: string;
  apellidos?: string;
  nombre_completo: string;
  documento?: string;
  correo?: string;
  codigo?: string;
  programa?: string | null;
}

interface SolicitudRow {
  solicitud_id: number;
  materia_origen?: string;
  tipo_homologacion?: string;
  estado: number;
  estado_nombre?: string;
  fecha_registro?: string;
}

interface Fila {
  tipo: 'solicitud' | 'sin_solicitudes';
  prioridad: number;
  fecha_registro?: string;
  estudiante: Estudiante;
  solicitud?: SolicitudRow;
}

interface Indicadores {
  total_estudiantes: number;
  borradores: number;
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
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
  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function AdminDashboard() {
  const { user, setUser, toggleDarkMode, darkMode } = useStore();
  const navigate = useNavigate();

  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let activo = true;

    const cargar = async () => {
      setCargando(true);
      try {
        const res = await api.get('/admin/panel', {
          params: { admin_id: user.id },
        });
        if (!activo) return;
        setIndicadores(res.data.indicadores as Indicadores);
        setFilas(res.data.filas as Fila[]);
      } catch (e: any) {
        if (activo) {
          const detalle = e.response?.data?.detail;
          const estado = e.response?.status;
          if (estado === 404 || estado === 403) {
            setError(
              typeof detalle === 'string'
                ? `${detalle}. Tu sesión no corresponde a un administrador válido: cierra sesión y vuelve a ingresar con la cuenta ADMIN.`
                : 'Tu sesión no corresponde a un administrador válido: cierra sesión y vuelve a ingresar con la cuenta ADMIN.'
            );
          } else {
            setError(
              typeof detalle === 'string'
                ? detalle
                : 'No se pudo cargar el panel de administración.'
            );
          }
        }
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargar();
    return () => {
      activo = false;
    };
  }, [user]);

  const tarjetas = [
    { titulo: 'Estudiantes registrados', valor: indicadores?.total_estudiantes ?? '—', icono: Users, tono: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' },
    { titulo: 'Pendientes de revisión', valor: indicadores?.pendientes ?? '—', icono: Clock, tono: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' },
    { titulo: 'Aprobadas', valor: indicadores?.aprobadas ?? '—', icono: CheckCircle2, tono: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' },
    { titulo: 'Rechazadas', valor: indicadores?.rechazadas ?? '—', icono: XCircle, tono: 'text-red-600 bg-red-50 dark:bg-red-500/10' },
  ];

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
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium bg-blue-50 dark:bg-gray-700/50 text-blue-700 dark:text-blue-300"
            title="Panel de solicitudes"
          >
            <LayoutDashboard size={18} /> Panel de solicitudes
          </button>
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-gray-500 dark:text-gray-400">
            <ClipboardList size={18} />
            <span>Solicitudes</span>
            <span className="ml-auto text-xs font-semibold bg-blue-100 dark:bg-gray-700 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0.5">
              {filas.filter((f) => f.tipo === 'solicitud').length}
            </span>
          </div>
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

      {/* Contenido principal */}
      <main className="flex-1 flex flex-col relative">
        <header className="h-20 flex items-center justify-between px-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 absolute top-0 w-full z-10">
          <div className="flex items-center gap-2">
            <ClipboardList className="text-blue-500" size={20} />
            <h1 className="font-bold text-lg text-gray-800 dark:text-white">
              Gestión de Homologaciones
            </h1>
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
          {/* Indicadores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {tarjetas.map((t) => (
              <div
                key={t.titulo}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm flex items-center gap-4"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${t.tono}`}>
                  <t.icono size={22} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white leading-none">
                    {t.valor}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t.titulo}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border border-red-100 dark:border-red-800 rounded-2xl p-4 text-sm flex items-center gap-2">
              <AlertTriangle size={18} /> {error}
            </div>
          )}

          {/* Tabla de estudiantes y solicitudes */}
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              <h2 className="font-semibold text-gray-800 dark:text-white">
                Estudiantes y solicitudes
              </h2>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                (organizados por estado: activas, aprobadas, rechazadas y sin solicitudes)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/40 text-left">
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Estudiante
                    </th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Materia por homologar
                    </th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {cargando && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                        Cargando solicitudes…
                      </td>
                    </tr>
                  )}

                  {!cargando && filas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                        No hay estudiantes registrados todavía.
                      </td>
                    </tr>
                  )}

                  {!cargando &&
                    filas.map((fila, i) =>
                      fila.tipo === 'sin_solicitudes' ? (
                        <tr
                          key={`sin-${fila.estudiante.id}-${i}`}
                          className="hover:bg-gray-50 dark:hover:bg-gray-900/40"
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {fila.estudiante.nombre_completo || '—'}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {fila.estudiante.codigo || '—'} ·{' '}
                              {fila.estudiante.programa || 'Sin programa'}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400 dark:text-gray-500">
                            —
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                              Sin solicitudes
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400 dark:text-gray-500">
                            —
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-400 dark:text-gray-500">
                            —
                          </td>
                        </tr>
                      ) : (
                        <tr
                          key={`sol-${fila.solicitud!.solicitud_id}`}
                          className="hover:bg-gray-50 dark:hover:bg-gray-900/40"
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {fila.estudiante.nombre_completo || '—'}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {fila.estudiante.codigo || '—'} ·{' '}
                              {fila.estudiante.programa || 'Sin programa'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-700 dark:text-gray-200">
                              {fila.solicitud!.materia_origen || '—'}
                            </p>
                            {fila.solicitud!.tipo_homologacion && (
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                                {fila.solicitud!.tipo_homologacion}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                ESTILOS_ESTADO[fila.solicitud!.estado_nombre || ''] ||
                                'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {fila.solicitud!.estado_nombre || 'Desconocido'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                            {formatearFecha(fila.solicitud!.fecha_registro)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() =>
                                navigate(`/admin/solicitudes/${fila.solicitud!.solicitud_id}`)
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-gray-600 transition-colors"
                            >
                              <Eye size={14} /> Ver
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
