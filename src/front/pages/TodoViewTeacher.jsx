import { useState, useEffect } from "react";
import { CardsTodoViewTeacher } from "../components/CardsTodoViewTeacher.jsx";
import { Link, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const TodoViewTeacher = () => {
    const navigate = useNavigate();
    const { store, dispatch } = useGlobalReducer();
    const [todos, setTodos] = useState([]);
    const [err, setErr] = useState(null);


    const [currentPage, setCurrentPage] = useState(1);
    const todosPerPage = 6;

    useEffect(() => {
        getTeacherTodos();
    }, []);

    const getTeacherTodos = async () => {
        setErr(null);

        try {
            const backend = import.meta.env.VITE_BACKEND_URL;
            const token = localStorage.getItem("token");

            if (!token) {
                throw new Error("Usuario no autenticado");
            }

            const resp = await fetch(`${backend}/teacher/todos/home`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await resp.json().catch(() => ([]));

            if (!resp.ok) {
                throw new Error("Error al cargar tareas");
            }

            setTodos(data);

        } catch (error) {
            setErr(error.message);
        }
    };

    const toggleStatus = (id) => {
        setStatusMap(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
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

    //logica paginación 

    const indexOfLast = currentPage * todosPerPage;
    const indexOfFirst = indexOfLast - todosPerPage;

    const sortedTodos = [...todos].sort(
        (a, b) => b.id - a.id
    );

    const currentTodos = sortedTodos.slice(
        indexOfFirst,
        indexOfLast
    );

    const totalPages = Math.ceil(
        sortedTodos.length / todosPerPage
    );



    return (
        <div className="container mt-5">

            <div className="m-0 p-0">
                <img
                    src="https://res.cloudinary.com/dxvdismgz/raw/upload/v1771106272/Screenshot_2026-02-14_at_3.54.56_p.m._zxz1ju.png"
                    className="img-fluid w-100 rounded p-0"
                    alt="cover"
                    style={{ maxHeight: "250px", objectFit: "cover" }}
                />
            </div>


            <h2 className="display-5 fw-bold mb-2 mt-2 ">
                Tus tareas creadas,  <span className="text-primary">{store.user?.name || "Profesor"}</span>
            </h2>

            <Link to="/homeTeacher">
                <button className="btn btn-outline-dark fs-6 p-1 mb-3">
                    ←   Volver a Página Principal
                </button>
            </Link>

            {err && <div className="alert alert-danger">{err}</div>}

            <CardsTodoViewTeacher
                todos={currentTodos}
            />

            <div className="d-flex justify-content-center mt-3 mb-3">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                        key={page}
                        className={`btn me-2 ${page === currentPage
                                ? "btn-dark"
                                : "btn-outline-dark"
                            }`}
                        onClick={() => setCurrentPage(page)}
                    >
                        {page}
                    </button>
                ))}
            </div>

        </div>
    );
};