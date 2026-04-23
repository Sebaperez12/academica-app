import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import UploadFiles from "../components/UploadFiles.jsx";

export const EditTodoTeacher = () => {
    const backend = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const { id } = useParams();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [groupId, setGroupId] = useState("");
    const [archiveUrl, setArchiveUrl] = useState("");

    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [okMsg, setOkMsg] = useState(null);
    const [uploading, setUploading] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const token = localStorage.getItem("token");

    const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    };

    const getFileName = (url) => {
        if (!url) return "";
        return url.split("/").pop();
    };


    useEffect(() => {
        const fetchTodo = async () => {
            try {
                const resp = await fetch(`${backend}/todos/${id}`, {
                    headers: authHeaders
                });

                const data = await resp.json();
                if (!resp.ok) throw new Error(data?.msg || "Error cargando tarea");

                setTitle(data.title || "");
                setDescription(data.description || "");
                setDueDate(data.due_date || "");
                setGroupId(String(data.group_id || ""));
                setArchiveUrl(data.archive_url || "");

            } catch (error) {
                setErrorMsg(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTodo();
    }, [backend, id]);


    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const resp = await fetch(`${backend}/groups`, {
                    headers: authHeaders
                });

                const data = await resp.json();
                if (!resp.ok) throw new Error("Error cargando grupos");

                setGroups(data);
            } catch (error) {
                console.error(error);
            }
        };

        fetchGroups();
    }, []);

 
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg(null);
        setOkMsg(null);

        if (!dueDate) {
            setErrorMsg("La fecha es obligatoria");
            return;
        }

        if (uploading) {
            setErrorMsg("Espera a que termine la subida del archivo");
            return;
        }

        try {
            const payload = {
                title,
                description,
                due_date: dueDate,
                archive_url: archiveUrl || null,
                group_id: Number(groupId)
            };

            const resp = await fetch(`${backend}/todos/${id}`, {
                method: "PUT",
                headers: authHeaders,
                body: JSON.stringify(payload)
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.msg || "Error actualizando tarea");

            setOkMsg("Tarea actualizada correctamente");

            setTimeout(() => {
                navigate("/teacher/todos");
            }, 1200);

        } catch (error) {
            setErrorMsg(error.message);
        }
    };

    // 🔹 Eliminar tarea
    const handleDelete = async () => {
        try {
            const resp = await fetch(`${backend}/todos/${id}`, {
                method: "DELETE",
                headers: authHeaders
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.msg || "Error eliminando tarea");

            setShowDeleteModal(false);
            setOkMsg("Tarea eliminada correctamente");

            setTimeout(() => {
                navigate("/teacher/todos");
            }, 1200);

        } catch (error) {
            setErrorMsg(error.message);
        }
    };

    if (loading) {
        return (
            <div className="page-teacher-todos d-flex justify-content-center align-items-center">
                <div className="text-center">
                    <div className="spinner-border mb-3 g-color" role="status"></div>
                    <p className="sidebar-title">Cargando tarea...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-teacher-todos">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-12 d-flex justify-content-center">
                        <div className="w-100 px-4" style={{ maxWidth: "900px" }}>

    
                            <div className="main-header mb-4">
                                <div className="main-header-inner main-header-inner--todo d-flex align-items-center gap-3">
                                    <Link
                                        to="/homeTeacher/todos"
                                        className="btn btn-light rounded-circle p-1"
                                    >
                                        ←   Volver 
                                    </Link>

                                    <div>
                                        <h2 className="header-title mb-0">
                                            ✏️ Editar tarea
                                        </h2>
                                        <p className="header-subtitle mb-0">
                                            Modifica los detalles de la tarea existente
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="main-content main-content--todo">

                                {errorMsg && (
                                    <div className="alert tile-pink d-flex align-items-center gap-2 mb-4">
                                        {errorMsg}
                                    </div>
                                )}

                                {okMsg && (
                                    <div className="alert tile-teal text-white d-flex align-items-center gap-2 mb-4">
                                        {okMsg}
                                    </div>
                                )}

                                <div className="ctf-panel card shadow-sm">
                                    <div className="card-body">
                                        <form onSubmit={handleSubmit}>

                                            <div className="mb-4">
                                                <label className="ctf-label form-label">Título</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-lg ctf-input"
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value)}
                                                    required
                                                />
                                            </div>

                                            <div className="mb-4">
                                                <label className="ctf-label form-label">Grupo</label>
                                                <select
                                                    className="form-select form-select-lg ctf-select"
                                                    value={groupId}
                                                    onChange={(e) => setGroupId(e.target.value)}
                                                    required
                                                >
                                                    <option value="">Seleccionar grupo...</option>
                                                    {groups.map(g => (
                                                        <option key={g.id} value={g.id}>
                                                             {g.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="mb-4">
                                                <label className="ctf-label form-label">Fecha límite</label>
                                                <input
                                                    type="date"
                                                    className="form-control ctf-input"
                                                    value={dueDate}
                                                    onChange={(e) => setDueDate(e.target.value)}
                                                    required
                                                />
                                            </div>

                                            <div className="mb-4">
                                                <label className="ctf-label form-label">Descripción</label>
                                                <textarea
                                                    className="form-control ctf-textarea"
                                                    rows={6}
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                />
                                            </div>

                                            <div className="mb-5">
                                                <label className="ctf-label form-label">Archivo adjunto</label>

                                                {archiveUrl ? (
                                                    <div className="p-3 border rounded">
                                                        <a href={archiveUrl} target="_blank" rel="noopener noreferrer">
                                                            {getFileName(archiveUrl)}
                                                        </a>
                                                        <div className="mt-2">
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-danger"
                                                                onClick={() => setArchiveUrl("")}
                                                            >
                                                                Eliminar archivo
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <UploadFiles
                                                        onUpload={(url) => setArchiveUrl(url)}
                                                        setUploading={setUploading}
                                                    />
                                                )}
                                            </div>

                                            <div className="d-flex justify-content-between align-items-center">
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger"
                                                    onClick={() => setShowDeleteModal(true)}
                                                >
                                                    🗑 Eliminar tarea
                                                </button>

                                                <button
                                                    type="submit"
                                                    className="btn ctf-btn-primary"
                                                    disabled={uploading}
                                                >
                                                    Guardar cambios
                                                </button>
                                            </div>

                                        </form>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>

        
            {showDeleteModal && (
                <>
                    <div className="modal fade show d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg rounded-4">

                                <div className="modal-header border-0">
                                    <h5 className="modal-title text-danger fw-bold">
                                         Confirmar eliminación
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowDeleteModal(false)}
                                    ></button>
                                </div>

                                <div className="modal-body">
                                    <p>¿Seguro que deseas eliminar esta tarea?</p>
                                    <p className="text-muted small">
                                        Esta acción no se puede deshacer.
                                    </p>
                                </div>

                                <div className="modal-footer border-0">
                                    <button
                                        type="button"
                                        className="btn btn-light"
                                        onClick={() => setShowDeleteModal(false)}
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-danger"
                                        onClick={handleDelete}
                                    >
                                        Sí, eliminar
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>

                    <div
                        className="modal-backdrop fade show"
                        onClick={() => setShowDeleteModal(false)}
                    ></div>
                </>
            )}
        </div>
    );
};
