import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import portada from "../assets/img/portada.png";
import SubirArchivo from "../components/UploadFiles";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const IndividualTodoViewStudent = () => {
  const { store, dispatch } = useGlobalReducer();
  const params = useParams();
  const navigate = useNavigate();

  const [description, setDescription] = useState("");
  const [err, setErr] = useState(null);
  const [okMsg, setOkMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [archiveUrl, setArchiveUrl] = useState(null);

  const [todo, setTodo] = useState(null);
  const [status, setStatus] = useState(null);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await getTodo();
      await getMyStudentGroup();
    };
    loadData();
  }, [params.id]);

  useEffect(() => {
    if (store?.student_group_id && params.id) {
      checkExistingSubmission();
    }
  }, [store?.student_group_id, params.id]);

  useEffect(() => {
    if (todo?.due_date) {
      const dueDate = new Date(todo.due_date);
      const today = new Date();
      setIsExpired(dueDate < today);
    }
  }, [todo]);

  const getTodo = async () => {
    setErr(null);
    try {
      const backend = import.meta.env.VITE_BACKEND_URL;
      const resp = await fetch(`${backend}/todos/${params.id}`);
      const data = await resp.json().catch(() => ({}));
      
      if (!resp.ok) throw new Error("Error al cargar tarea");
      setTodo(data);
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getMyStudentGroup = async () => {
    const backend = import.meta.env.VITE_BACKEND_URL;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const resp = await fetch(`${backend}/my-student-group`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) return;

      dispatch({ type: "SET_STUDENT_GROUP_ID", payload: data.id });
    } catch (error) {
      console.error("Error getting student group:", error);
    }
  };

  const checkExistingSubmission = async () => {
    try {
      const backend = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem("token");
      
      const url = `${backend}/submissions?todo_id=${params.id}&student_id=${store.student_group_id}`;
      
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resp.ok) {
        const data = await resp.json();

        if (data.submissions && data.submissions.length > 0) {
          const submissionData = data.submissions[0];
          
          setExistingSubmission(submissionData);
          setDescription(submissionData.description || "");
          setArchiveUrl(submissionData.response_url || null);
        
          await getSubmissionStatus(submissionData.id);
        } else {
          setExistingSubmission(null);
          setStatus(null);
          setShowEditForm(true);
        }
      } else {
        setExistingSubmission(null);
        setStatus(null);
        setShowEditForm(true);
      }
    } catch (error) {
      console.error("Error checking submission:", error);
    }
  };

  const getSubmissionStatus = async (submissionId) => {
    try {
      const backend = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem("token");
      
      const url = `${backend}/submissions/${submissionId}/status`;
      
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resp.ok) {
        const data = await resp.json();
        setStatus(data);

        if (data.state === 'APPROVED') {
          setShowEditForm(false);
        } else {
          setShowEditForm(false); 
        }
      } else if (resp.status === 404) {
        setStatus(null);
        setShowEditForm(false); 
      }
    } catch (error) {
      console.error("Error fetching status:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setOkMsg(null);
    setErrorMsg(null);

    if (!description.trim()) {
      setErrorMsg("Completá la descripción.");
      return;
    }
    if (!archiveUrl) {
      setErrorMsg("Adjuntá un archivo antes de subir.");
      return;
    }
    if (!store?.student_group_id) {
      setErrorMsg("No pude identificar tu student_group_id. Volvé a iniciar sesión e intentá de nuevo.");
      return;
    }

  
    if (isExpired) {
      setErrorMsg("No se puede modificar la entrega porque la tarea está vencida.");
      return;
    }

    try {
      const backend = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem("token");

      const payload = {
        todo_id: Number(params.id),
        student_id: store.student_group_id,
        description: description.trim(),
        response_url: archiveUrl,
      };

      let resp;
      if (existingSubmission?.id) {
        resp = await fetch(`${backend}/submission/${existingSubmission.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        resp = await fetch(`${backend}/submission`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await resp.json().catch(() => null);
      
      if (!resp.ok) throw new Error(data?.msg || "Error subiendo tarea");

      setOkMsg(existingSubmission?.id ? "Tarea actualizada con éxito" : "Tarea subida con éxito");
      

      setShowEditForm(false);
      
  
      setTimeout(() => {
        checkExistingSubmission();
      }, 500);
      
    } catch (e2) {
      console.error("Submit error:", e2);
      setErrorMsg(e2.message);
    }
  };

  const getStatusBadge = (state) => {
    switch(state?.toUpperCase()) {
      case 'APPROVED':
        return <span className="badge bg-success px-3 py-2"> Aprobado</span>;
      case 'REJECTED':
        return <span className="badge bg-danger px-3 py-2"> Rechazado</span>;
      default:
        return <span className="badge bg-warning text-dark px-3 py-2">⏳ Pendiente de corrección</span>;
    }
  };

  const canEdit = () => {
    if (!existingSubmission) return true; 
    if (status?.state === 'APPROVED') return false; 
    if (isExpired) return false; 
    return true; 
  };

  if (loading) return (
    <div className="page-teacher-todos d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
      <div className="spinner-border text-info" role="status">
        <span className="visually-hidden">Cargando...</span>
      </div>
    </div>
  );
  
  if (err) return (
    <div className="page-teacher-todos py-5">
      <div className="container">
        <div className="alert alert-danger shadow-sm">{err}</div>
      </div>
    </div>
  );
  
  if (!todo) return (
    <div className="page-teacher-todos py-5">
      <div className="container">
        <div className="alert alert-warning shadow-sm">No se encontró la tarea.</div>
      </div>
    </div>
  );

  return (
    <div className="page-teacher-todos">
    
      <div className="position-relative">
        <img
          src={portada}
          className="img-fluid w-100 object-fit-cover"
          alt="cover"
          style={{ maxHeight: "200px" }}
        />
        <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-25" />
      </div>

      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-lg-8">
        
            <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-3">
                  <button 
                    onClick={() => navigate(-1)}
                    className="btn btn-outline-secondary rounded-3"
                    style={{ width: "48px", height: "48px" }}
                  >
                    ←
                  </button>
                  <div className="flex-grow-1">
                    <h1 className="h3 fw-bold text-dark mb-2">{todo.title}</h1>
                    <div className="d-flex align-items-center gap-3 text-muted flex-wrap">
                      <span>
                        <i className="far fa-calendar-alt me-2 text-info"></i>
                        {todo.due_date || "Fecha no especificada"}
                        {isExpired && (
                          <span className="badge bg-secondary ms-2">Vencida</span>
                        )}
                      </span>
                      {todo.group_name && (
                        <span>
                          <i className="fas fa-users me-2 text-info"></i>
                          {todo.group_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          
            {existingSubmission && (
              <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
                <div className="card-header bg-white border-0 pt-4 px-4">
                  <h5 className="fw-bold mb-0">
                    <i className="fas fa-clipboard-check me-2 text-info"></i>
                    Estado de tu entrega
                  </h5>
                </div>
                <div className="card-body px-4 pb-4">
                  <div className={`p-3 rounded-3 bg-${status?.state === 'APPROVED' ? 'success' : status?.state === 'REJECTED' ? 'danger' : 'warning'} bg-opacity-10`}>
                    <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
                      <div>
                        {getStatusBadge(status?.state)}
                        <p className="mt-3 mb-0 text-secondary">
                          <i className="far fa-clock me-2"></i>
                          Entregado: {new Date(existingSubmission.created_at || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                      
          
                      {canEdit() && !showEditForm && (
                        <button
                          onClick={() => setShowEditForm(true)}
                          className="btn btn-outline-info rounded-3"
                        >
                          <i className="fas fa-edit me-2"></i>
                          Modificar entrega
                        </button>
                      )}

                      {!canEdit() && existingSubmission && (
                        <span className="text-muted">
                          <i className="fas fa-lock me-2"></i>
                          {status?.state === 'APPROVED' 
                            ? "Entrega aprobada - No se puede modificar" 
                            : "Tarea vencida - No se puede modificar"}
                        </span>
                      )}
                    </div>

           
                    {status?.feedback && (
                      <div className="mt-4">
                        <hr />
                        <strong className="d-block mb-2">Feedback del profesor:</strong>
                        <div className="p-3 bg-white rounded-3 border">
                          {status.feedback}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
              <div className="card-header bg-white border-0 pt-4 px-4">
                <h5 className="fw-bold mb-0">
                  <i className="fas fa-book-open me-2 text-info"></i>
                  Instrucciones de la tarea
                </h5>
              </div>
              <div className="card-body px-4 pb-4">
                <p className="text-secondary mb-4" style={{ whiteSpace: "pre-wrap" }}>
                  {todo.description}
                </p>
                
                {todo.archive_url && (
                  <a
                    href={todo.archive_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline-info rounded-3 px-4"
                  >
                    <i className="fas fa-download me-2"></i>
                    Descargar material adjunto
                  </a>
                )}
              </div>
            </div>


            {showEditForm && (
              <div className="card border-0 shadow-sm rounded-4 mb-5 overflow-hidden">
                <div className="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold mb-0">
                    <i className="fas fa-upload me-2 text-info"></i>
                    {existingSubmission ? "Modificar entrega" : "Subir entrega"}
                  </h5>
                  <button
                    onClick={() => setShowEditForm(false)}
                    className="btn-close"
                    aria-label="Cerrar"
                  />
                </div>
                <div className="card-body px-4 pb-4">
                  {errorMsg && (
                    <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
                      <i className="fas fa-exclamation-circle me-2"></i>
                      {errorMsg}
                    </div>
                  )}
                  {okMsg && (
                    <div className="alert alert-success d-flex align-items-center mb-4" role="alert">
                      <i className="fas fa-check-circle me-2"></i>
                      {okMsg}
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label className="form-label fw-semibold text-secondary">
                        Descripción de tu trabajo
                      </label>
                      <textarea
                        className="form-control rounded-3 border-1 p-3"
                        rows={6}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Explicá brevemente lo que entregaste, los conceptos que aplicaste, etc."
                        style={{ backgroundColor: "#f8f9fa" }}
                      />
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold text-secondary">
                        Archivo adjunto
                      </label>
                      <div className="p-4 bg-light rounded-3 border">
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                          <SubirArchivo onUpload={setArchiveUrl} setUploading={setUploading} />
                          {archiveUrl ? (
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-success px-3 py-2">
                                <i className="fas fa-check me-2"></i>
                                Archivo listo
                              </span>
                              <a 
                                href={archiveUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-info rounded-3"
                              >
                                <i className="fas fa-eye me-1"></i>
                                Ver
                              </a>
                            </div>
                          ) : (
                            <span className="text-muted">
                              <i className="fas fa-paperclip me-2"></i>
                              No hay archivo seleccionado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="d-flex gap-3">
                      <button
                        type="submit"
                        className="btn btn-info text-white rounded-3 px-4 py-2 fw-semibold"
                        disabled={uploading}
                      >
                        {uploading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Subiendo...
                          </>
                        ) : (
                          <>
                            <i className={`fas ${existingSubmission ? 'fa-sync-alt' : 'fa-cloud-upload-alt'} me-2`}></i>
                            {existingSubmission ? "Guardar cambios" : "Subir entrega"}
                          </>
                        )}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setShowEditForm(false)}
                        className="btn btn-outline-secondary rounded-3 px-4 py-2"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

     
            {!existingSubmission && !showEditForm && (
              <div className="card border-0 shadow-sm rounded-4 mb-5 overflow-hidden">
                <div className="card-body p-5 text-center">
                  <i className="fas fa-paper-plane text-info mb-3" style={{ fontSize: "3rem" }}></i>
                  <h5 className="fw-bold mb-3">Aún no has realizado la entrega</h5>
                  <p className="text-muted mb-4">
                    {isExpired 
                      ? "Lo sentimos, la tarea ya está vencida. No se pueden recibir más entregas."
                      : "Hacé clic en el botón para subir tu trabajo"}
                  </p>
                  {!isExpired && (
                    <button
                      onClick={() => setShowEditForm(true)}
                      className="btn btn-info text-white rounded-3 px-4 py-2"
                    >
                      <i className="fas fa-plus-circle me-2"></i>
                      Realizar entrega
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="text-center mt-4">
              <Link
                to="/todoviewstudent"
                className="btn btn-outline-secondary rounded-3 px-4 py-2"
              >
                <i className="fas fa-arrow-left me-2"></i>
                Volver a todas las tareas
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};