import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const CreateGroupsAdmin = () => {

  const navigate = useNavigate();
  const { store, dispatch} = useGlobalReducer();

  const backend = import.meta.env.VITE_BACKEND_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const role = store.role || (typeof window !== "undefined" ? localStorage.getItem("role") : null);

  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachersSearch, setTeachersSearch] = useState("");
  const [studentsSearch, setStudentsSearch] = useState("");

  const [groupName, setGroupName] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [studentIds, setStudentIds] = useState([]);

  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const authHeaders = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    if (role !== "ADMIN") {
      navigate("/login");
      return;
    }
  }, [token, role, navigate]);

  const safeJson = async (resp) => {
    try {
      return await resp.json();
    } catch {
      return null;
    }
  };
const loadTeachers = async () => {
    setErr(null);
    setMsg(null);
    setLoadingTeachers(true);
    try {
      const resp = await fetch(`${backend}/admin/teachers`, {
        method: "GET",
        headers: authHeaders,
      });

      const data = await safeJson(resp);
      if (!resp.ok) throw new Error(data?.msg || "Error obteniendo profesores");

      setTeachers(Array.isArray(data) ? data : data?.teachers || []);
    } catch (e) {
      setErr(e.message);
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const loadStudents = async () => {
    setErr(null);
    setMsg(null);
    setLoadingStudents(true);
    try {
      const resp = await fetch(`${backend}/admin/students`, {
        method: "GET",
        headers: authHeaders,
      });

      const data = await safeJson(resp);
      if (!resp.ok) throw new Error(data?.msg || "Error obteniendo alumnos");

      setStudents(Array.isArray(data) ? data : data?.students || []);
    } catch (e) {
      setErr(e.message);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (!backend) return;
    if (!token) return;
    loadTeachers();
    loadStudents();
  }, [backend, token]);

  const teacherNameById = useMemo(() => {
    const map = new Map();
    for (const t of teachers) map.set(Number(t.id), t.name);
    return map;
  }, [teachers]);

  const studentNameById = useMemo(() => {
    const map = new Map();
    for (const s of students) map.set(Number(s.id), s.name);
    return map;
  }, [students]);

  const filteredTeachers = useMemo(() => {
    const q = teachersSearch.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => (t.name || "").toLowerCase().includes(q));
  }, [teachers, teachersSearch]);

  const filteredStudents = useMemo(() => {
    const q = studentsSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => (s.name || "").toLowerCase().includes(q));
  }, [students, studentsSearch]);

  const toggleStudent = (id) => {
    const sid = Number(id);
    setStudentIds((prev) => {
      if (prev.includes(sid)) return prev.filter((x) => x !== sid);
      return [...prev, sid];
    });
  };

  const removeSelectedStudent = (sid) => {
    setStudentIds((prev) => prev.filter((x) => x !== Number(sid)));
  };

  const createGroupAndAssignStudents = async (e) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!groupName.trim()) {
      setErr("El nombre del grupo es obligatorio.");
      return;
    }
    if (!teacherId) {
      setErr("Debes seleccionar un profesor.");
      return;
    }
    if (studentIds.length === 0) {
      setErr("Debes seleccionar al menos 1 alumno.");
      return;
    }
setCreating(true);

    try {
      const createResp = await fetch(`${backend}/groups`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: groupName.trim(),
          teacher_id: Number(teacherId),
        }),
      });

      const createData = await safeJson(createResp);
      if (!createResp.ok) throw new Error(createData?.msg || "Error creando grupo");

      const groupId = createData?.group_id;
      if (!groupId) throw new Error("El backend no devolvió group_id.");

      for (const sid of studentIds) {
        const addResp = await fetch(`${backend}/groups/${groupId}/students`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ user_id: Number(sid) }),
        });

        const addData = await safeJson(addResp);
        if (!addResp.ok) throw new Error(addData?.msg || `Error agregando alumno id=${sid}`);
      }

      setMsg(`✅ Grupo creado y alumnos asignados correctamente.`);
      setGroupName("");
      setTeacherId("");
      setStudentIds([]);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setCreating(false);
    }
  };

  const tileClassByIndex = (idx) => {
    const mod = idx % 4;
    if (mod === 0) return "tile tile-teal";
    if (mod === 1) return "tile tile-sand";
    if (mod === 2) return "tile tile-blue";
    return "tile tile-pink";
  };

  useEffect(() => {
          const fetchMe = async () => {
              try {
                  const backend = import.meta.env.VITE_BACKEND_URL;
                  const resp = await fetch(`${backend}/me`, {
                      headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${localStorage.getItem("token")}`,
                      },
                  });
  
                  if (!resp.ok) throw new Error("Error obteniendo usuario");
  
                  const data = await resp.json();
  
                  dispatch({
                      type: "SET_CURRENT_USER",
                      payload: data,
                  });
              } catch (error) {
                  console.error("Error fetching current user:", error);
              }
          };
  
          fetchMe();
      }, [dispatch]);

  return (
    <div className="container-fluid page-admin-groups">
      <div className="row g-0">
        <aside className="col-12 col-lg-3 sidebar-left">
          <div className="sidebar-inner">
            <div className="sidebar-header">
              <Link to="/homeAdmin" className="btn p-1 volverGroups">
                                 ← Volver 
                              </Link>
              <h5 className="mb-0 sidebar-title">Bienvenido, <span className="text-primary">{store.user?.name || "Administrador"}</span></h5>
            </div>

            <div className="sidebar-section">
              <h4 className="section-title">Profesores</h4>

              <input
                className="form-control search-input"
                placeholder="Buscar profesor..."
                value={teachersSearch}
                onChange={(e) => setTeachersSearch(e.target.value)}
              />

              <div className="tiles-list">
                {loadingTeachers ? (
                  <div className="text-muted small mt-2">Cargando profesores...</div>
                ) : filteredTeachers.length === 0 ? (
                  <div className="text-muted small mt-2">No hay profesores</div>
                ) : (
                  filteredTeachers.map((t, idx) => (
                    <div key={t.id} className={tileClassByIndex(idx)}>
                      {t.name}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="sidebar-section">
              <h4 className="section-title">Alumnos</h4>

              <input
                className="form-control search-input"
                placeholder="Buscar alumno..."
                value={studentsSearch}
                onChange={(e) => setStudentsSearch(e.target.value)}
              />

              <div className="tiles-list">
                {loadingStudents ? (
                  <div className="text-muted small mt-2">Cargando alumnos...</div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-muted small mt-2">No hay alumnos</div>
                ) : (
                  filteredStudents.map((s, idx) => (
                    <div key={s.id} className={tileClassByIndex(idx + 1)}>
                      {s.name}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </aside>

        <main className="col-12 col-lg-9 main-right">
          <div className="main-header">
            <div className="main-header-inner">
              <h1 className="header-title">Creación de Grupos</h1>
              <div className="header-subtitle">Curso: Desarrollo Web</div>
            </div>
          </div>

          <div className="main-content">
            <div className="card soft-card">
              <div className="card-body">
                <h4 className="mb-2">Crear nuevo grupo</h4>

                {msg && <div className="alert alert-success">{msg}</div>}
                {err && <div className="alert alert-danger">{err}</div>}

                <form onSubmit={createGroupAndAssignStudents}>
                  {/* Group name */}
                  <div className="mb-3">
                    <label className="form-label">Nombre de Grupo</label>
                    <input
                      className="form-control"
                      placeholder="Nombre de grupo"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Profesor</label>
                    <select
                      className="form-select"
                      value={teacherId}
                      onChange={(e) => setTeacherId(e.target.value)}
                      required
                    >
                      <option value="">Seleccionar profesor</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={String(t.id)}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Alumnos</label>

                    <div className="dropdown w-100">
                      <button
                        className="btn btn-outline-secondary dropdown-toggle w-100 text-start"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        {studentIds.length === 0
                          ? "Seleccionar alumnos"
                          : `Seleccionados: ${studentIds.length}`}
                      </button>

                      <ul className="dropdown-menu w-100 dropdown-scroll">
                        {students.length === 0 ? (
                          <li className="dropdown-item text-muted">No hay alumnos</li>
                        ) : (
                          students.map((s) => {
                            const checked = studentIds.includes(Number(s.id));
                            return (
                              <li key={s.id}>
                                <button
                                  type="button"
                                  className={`dropdown-item d-flex align-items-center gap-2 ${checked ? "active-soft" : ""}`}
                                  onClick={() => toggleStudent(s.id)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    readOnly
                                    onClick={(ev) => ev.preventDefault()}
                                  />
                                  <span>{s.name}</span>
                                </button>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    </div>

                    {studentIds.length > 0 && (
                      <div className="selected-chips mt-2">
                        {studentIds.map((sid) => (
                          <span key={sid} className="chip">
                            {studentNameById.get(Number(sid)) || `Alumno ${sid}`}
                            <button
                              type="button"
                              className="chip-x"
                              onClick={() => removeSelectedStudent(sid)}
                              aria-label="quitar alumno"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="d-flex justify-content-end mt-4">
                    <button className="btn btn-primary btn-create" type="submit" disabled={creating}>
                      {creating ? "Creando..." : "Crear grupo"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
