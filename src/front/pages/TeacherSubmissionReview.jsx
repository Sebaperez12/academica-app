import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";

export const TeacherSubmissionReview = () => {
  const { store } = useGlobalReducer();
  const { todoId, submissionId } = useParams();
  const navigate = useNavigate();
  const backend = (import.meta.env.VITE_BACKEND_URL || "").trim();
  const token = localStorage.getItem("token");

  const [todo, setTodo] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [students, setStudents] = useState([]);

  const [status, setStatus] = useState(null);
  const [stateValue, setStateValue] = useState("pendiente");
  const [feedback, setFeedback] = useState("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
   const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [okMsg, setOkMsg] = useState(null);

  const authHeaders = useMemo(() => {
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [token]);

  const mapStateToBackend = (uiState) => {
    const m = {
      pendiente: "PENDING",
      aprobado: "APPROVED",
      rechazado: "REJECTED",
    };
    return m[uiState] || "PENDING";
  };

  const mapStateToUI = (apiState) => {
    const s = String(apiState || "").toUpperCase();
    if (s === "APPROVED") return "aprobado";
    if (s === "REJECTED") return "rechazado";
    return "pendiente";
  };

  const safeReadJsonOrTextError = async (resp) => {
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await resp.json().catch(() => null);
      return { json: data, text: null, ct };
    }
    const text = await resp.text().catch(() => "");
    return { json: null, text, ct };
  };

  const getTeacherId = () => {
    const u = store?.user;
    const id =
      u?.id ??
      u?.user_id ??
      u?.uid ??
      (typeof window !== "undefined" ? localStorage.getItem("user_id") : null);
    return id ? Number(id) : null;
  };


  const studentByStudentGroupId = useMemo(() => {
    const m = new Map();
    (students || []).forEach((st) => {
      if (st?.student_group_id != null) {
        m.set(String(st.student_group_id), st);
      } else if (st?.id != null) {
        m.set(String(st.id), st);
      }
    });
    return m;
  }, [students]);

  const student = useMemo(() => {
    if (!submission) return null;
    return studentByStudentGroupId.get(String(submission.student_id)) || null;
  }, [submission, studentByStudentGroupId]);

  useEffect(() => {
    const load = async () => {
      setErr(null);
      setLoading(true);

      try {
        if (!backend) throw new Error("VITE_BACKEND_URL no está definido.");
        if (!todoId) throw new Error("Falta todoId en la URL.");
        if (!submissionId) throw new Error("Falta submissionId en la URL.");

      
        const todoResp = await fetch(`${backend}/todos/${todoId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const todoParsed = await safeReadJsonOrTextError(todoResp);

        if (!todoResp.ok) {
          const msg =
            todoParsed.json?.msg || todoParsed.text || "Error al cargar tarea";
          throw new Error(msg);
        }
        const todoData = todoParsed.json;
        setTodo(todoData);

      
        const subResp = await fetch(`${backend}/submission/${submissionId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const subParsed = await safeReadJsonOrTextError(subResp);

        if (!subResp.ok) {
          const msg =
            subParsed.json?.msg || subParsed.text || "Error al cargar entrega";
          throw new Error(msg);
        }

        
        const submissionData = subParsed.json?.submission || subParsed.json;
        console.log("Submission cargada:", submissionData);
        setSubmission(submissionData);

       
        if (todoData?.group_id) {
          const studentsResp = await fetch(
            `${backend}/groups/${todoData.group_id}/students`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          );
          const studentsParsed = await safeReadJsonOrTextError(studentsResp);

          if (studentsResp.ok) {
            const studentsData = Array.isArray(studentsParsed.json) ? studentsParsed.json : [];
            console.log("Estudiantes cargados:", studentsData);
            setStudents(studentsData);
          }
        }

   
        const stResp = await fetch(
          `${backend}/submissions/${submissionId}/status`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        const stParsed = await safeReadJsonOrTextError(stResp);

        if (stResp.ok) {
          console.log("Status cargado:", stParsed.json);
          setStatus(stParsed.json);
          setStateValue(mapStateToUI(stParsed.json?.state));
          setFeedback(stParsed.json?.feedback || "");
        } else {
          setStatus(null);
          setStateValue("pendiente");
          setFeedback("");
        }
      } catch (e) {
        console.error("Error en load:", e);
        setErr(e.message || "Error inesperado");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [backend, todoId, submissionId, token]);

  const saveReview = async () => {
    setErr(null);
    setOkMsg(null);
    
    try {
      if (!backend) throw new Error("VITE_BACKEND_URL no está definido.");
      if (!submissionId) throw new Error("Falta submissionId.");

      const teacherId = getTeacherId();
      if (!teacherId) throw new Error("No se encontró el ID del docente.");

      const payload = {
        submission_id: Number(submissionId),
        teacher_id: teacherId,
        state: mapStateToBackend(stateValue),
        feedback: feedback.trim(),
      };

      console.log("Guardando calificación:", payload);

      if (status?.id) {
        const putResp = await fetch(`${backend}/statuses/${status.id}`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify(payload),
        });

        const putParsed = await safeReadJsonOrTextError(putResp);

        if (!putResp.ok) {
          const msg =
            putParsed.json?.msg ||
            putParsed.text ||
            `Error actualizando calificación (${putResp.status})`;
          throw new Error(msg);
        }
      } else {
        const postResp = await fetch(`${backend}/statuses`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(payload),
        });

        const postParsed = await safeReadJsonOrTextError(postResp);

        if (!postResp.ok) {
          const msg =
            postParsed.json?.msg ||
            postParsed.text ||
            `Error creando calificación (${postResp.status})`;
          throw new Error(msg);
        }
      }


      const stResp = await fetch(
        `${backend}/submissions/${submissionId}/status`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const stParsed = await safeReadJsonOrTextError(stResp);

      if (stResp.ok) {
        setStatus(stParsed.json);
        setStateValue(mapStateToUI(stParsed.json?.state));
        setFeedback(stParsed.json?.feedback || "");
      }

      setOkMsg("Calificación guardada exitosamente.");

    
      setTimeout(() => {
        navigate("/homeTeacher/todos");
      }, 1500);

    } catch (e) {
      console.error("Error guardando:", e);
      setErr(`❌ ${e.message || "Error guardando calificación"}`);
    }

    setTimeout(() => {
      navigate("/homeTeacher/todos");
    }, 1000);
  };

  if (loading) return (
    <div className="page-teacher-todos d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
      <div className="spinner-border v-color" role="status">
        <span className="visually-hidden">Cargando...</span>
      </div>
    </div>
  );
  
  if (err) return (
    <div className="page-teacher-todos py-5">
      <div className="container">
        <div className="alert alert-danger shadow-sm">{err}</div>
        <button className="btn btn-outline-secondary mt-3" onClick={() => navigate(-1)}>
          ← Volver
        </button>
      </div>
    </div>

   
  );
  
  if (!todo) return (
    <div className="page-teacher-todos py-5">
      <div className="container">
        <div className="alert alert-warning shadow-sm">No se encontró la tarea.</div>
        <button className="btn btn-outline-secondary mt-3" onClick={() => navigate(-1)}>
          ← Volver
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-teacher-todos">
      <div className="container py-4">

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="sidebar-title h3 mb-0">Revisión de entrega</h2>
          <button 
            className="btn btn-outline-secondary rounded-3 px-4 py-2"
            onClick={() => navigate(-1)}
          >
            <i className="fas fa-arrow-left me-2"></i>
            Volver
          </button>
        </div>

        {okMsg && (
          <div className="alert alert-success mb-4" role="alert">
            <i className="fas fa-check-circle me-2"></i>
            {okMsg}
          </div>
        )}

        <div className="row">
          <div className="col-lg-8 mx-auto">
        
            <div className="ctf-card mb-4">
              <div className="ctf-card-head">
                <h5 className="fw-bold mb-0">
                  <i className="fas fa-tasks me-2 v-color"></i>
                  Tarea
                </h5>
              </div>
              <div className="card-body p-4">
                <h6 className="fw-bold text-dark mb-2">{todo.title || "Sin título"}</h6>
                <p className="text-secondary mb-3" style={{ whiteSpace: "pre-wrap" }}>
                  {todo.description || "Sin descripción"}
                </p>
                <div className="bg-light p-3 rounded-3">
                  <p className="mb-1 small text-secondary">Fecha de entrega</p>
                  <p className="fw-bold mb-0 v-color">
                    <i className="far fa-calendar-alt me-2"></i>
                    {todo.due_date || "No especificada"}
                  </p>
                </div>
              </div>
            </div>

        
            <div className="ctf-card mb-4">
              <div className="ctf-card-head">
                <h5 className="fw-bold mb-0">
                  <i className="fas fa-user-graduate me-2 v-color"></i>
                  Alumno
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="d-flex align-items-center">
                  <div className="ctf-avatar me-3">
                    {student?.name ? student.name.charAt(0).toUpperCase() : 
                     student?.user?.name ? student.user.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <h5 className="fw-bold mb-1">
                      {student?.name || student?.user?.name || "Nombre no disponible"}
                    </h5>
                    <p className="text-secondary mb-0">
                      <i className="fas fa-envelope me-2 v-color"></i>
                      {student?.email || student?.user?.email || "Email no disponible"}
                    </p>
                    <p className="text-secondary mb-0 mt-1 small">
                      <i className="fas fa-id-card me-2 v-color"></i>
                      ID de entrega: {submission?.student_id || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>


            <div className="ctf-card mb-4">
              <div className="ctf-card-head">
                <h5 className="fw-bold mb-0">
                  <i className="fas fa-cloud-upload-alt me-2 v-color"></i>
                  Entrega del alumno
                </h5>
              </div>
              <div className="card-body p-4">
                {submission ? (
                  <>
                    <div className="mb-4">
                      <h6 className="fw-bold mb-2">Descripción de la entrega:</h6>
                      <div className="bg-light p-3 rounded-3">
                        <p className="mb-0 text-secondary" style={{ whiteSpace: "pre-wrap" }}>
                          {submission.description || "Sin descripción"}
                        </p>
                      </div>
                    </div>

                    {submission.response_url ? (
                      <div>
                        <h6 className="fw-bold mb-2">Archivo adjunto:</h6>
                        <a
                          href={submission.response_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-info text-white rounded-3"
                        >
                          <i className="fas fa-external-link-alt me-2"></i>
                          Ver archivo entregado
                        </a>
                      </div>
                    ) : (
                      <div>
                        <h6 className="fw-bold mb-2">Archivo adjunto:</h6>
                        <p className="text-muted">No hay archivo adjunto</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted">No hay información de la entrega</p>
                )}
              </div>
            </div>

     
            <div className="ctf-card mb-5">
              <div className="ctf-card-head">
                <h5 className="fw-bold mb-0">
                  <i className="fas fa-check-circle me-2 v-color"></i>
                  Corrección
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-4">
                  <div className="col-md-4">
                    <label className="ctf-label mb-2">Estado</label>
                    <select
                      className="ctf-select form-select"
                      value={stateValue}
                      onChange={(e) => setStateValue(e.target.value)}
                    >
                      <option value="pendiente"> Pendiente</option>
                      <option value="aprobado"> Aprobado</option>
                      <option value="rechazado"> Rechazado</option>
                    </select>
                    <div className="mt-3">
                      {status?.id ? (
                        <span className="ctf-badge d-inline-block">
                          <i className="fas fa-check-circle me-2 text-success"></i>
                          Calificación existente
                        </span>
                      ) : (
                        <span className="ctf-badge d-inline-block bg-warning bg-opacity-10">
                          <i className="fas fa-clock me-2 text-warning"></i>
                          Sin calificar aún
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="col-md-8">
                    <label className="ctf-label mb-2">Feedback</label>
                    <textarea
                      className="ctf-textarea form-control"
                      rows={5}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Escribe tu devolución para el estudiante..."
                    />
                  </div>
                </div>

                <div className="d-flex gap-3 mt-4">
                  <button
                    className="ctf-btn-primary"
                    onClick={saveReview}
                  >
                    <i className="fas fa-save me-2"></i>
                    Guardar calificación
                  </button>
                  <button
                    className="btn btn-outline-secondary rounded-3 px-4 py-2 fw-semibold"
                    onClick={() => {
                      setStateValue(status ? mapStateToUI(status.state) : "pendiente");
                      setFeedback(status?.feedback || "");
                    }}
                  >
                    <i className="fas fa-undo me-2"></i>
                    Revertir cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};