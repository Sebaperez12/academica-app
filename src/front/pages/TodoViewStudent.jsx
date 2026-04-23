import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { RandomImgTarea } from "../components/RandomImgTarea";

export const TodoViewStudent = () => {
  const { store, dispatch } = useGlobalReducer();

  const [err, setErr] = useState(null);
  const [statusMap, setStatusMap] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
   const [todos, setTodos] = useState([]);
  

  const todosPerPage = 6;

  // useEffect(() => {
  //   getTodos();
  // }, []);

  // const getTodos = async () => {
  //   setErr(null);
  //   try {
  //     const backend = import.meta.env.VITE_BACKEND_URL;

  //     const resp = await fetch(`${backend}/student/todos/home`);

  //     const data = await resp.json().catch(() => ([]));
  //     if (!resp.ok) throw new Error("Error al cargar tareas");

  //     dispatch({ type: "GET_TODOS_SUCCESS", payload: data });
  //   } catch (error) {
  //     setErr(error.message);
  //   }
  // };

  useEffect(() => {
    getStudentTodos();
  }, []);

  const getStudentTodos = async () => {
    setErr(null);
    try {
      const backend = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Usuario no autenticado");

      const resp = await fetch(`${backend}/student/todos/home`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await resp.json().catch(() => ([]));
      if (!resp.ok) throw new Error("Aún no tienes tareas asignadas");

      setTodos(Array.isArray(data) ? data : []);
    } catch (error) {
      setErr(error.message);
    }
  };

  const toggleStatus = (id) => {
    setStatusMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const sortedTodos = [...(store.todos || [])].sort((a, b) => b.id - a.id);

  const totalPages = Math.ceil(sortedTodos.length / todosPerPage);
  const indexOfLast = currentPage * todosPerPage;
  const indexOfFirst = indexOfLast - todosPerPage;
  const currentTodos = sortedTodos.slice(indexOfFirst, indexOfLast);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);



  return (
    <div className="container mb-2">

      <div className="m-0 p-0">
                            <img
                                src= "https://res.cloudinary.com/dxvdismgz/raw/upload/v1771106272/Screenshot_2026-02-14_at_3.54.56_p.m._zxz1ju.png"
                                className="img-fluid w-100 rounded p-0"
                                alt="cover"
                                style={{ maxHeight: "250px", objectFit: "cover" }}
                            />
                        </div>
      {/* Header responsive */}
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2 mb-2">
        <h1 className="mt-2">
          Tus tareas,{" "}
          <span className="text-primary">{store.user?.name || "Estudiante"}</span>
        </h1>

       </div>
         <Link to="/homeStudent">
								<button className="btn btn-outline-dark p-1 mb-3">
									←   Volver a Página Principal
								</button>
							</Link>

      {err && <div className="alert alert-danger">{err}</div>}

      <div className="row g-4">
        {todos.map((todo) => (
          <div className="col-12 col-sm-6 col-lg-4" key={todo.id}>
            <div className="card h-100 shadow-sm">
              <div className="todo-img-wrapper">
                <RandomImgTarea seed={todo.id} className="card-img-top" alt="tarea" />
              </div>

              <div className="card-body d-flex flex-column text-center">
                <h5 className="card-title">{todo.title}</h5>

                <div className="mt-auto d-flex flex-column flex-sm-row gap-2 card-footer">
                  <Link to={`/todos/${todo.id}`} className="btn btn-primary w-100 p-1">
                    Ver tarea
                  </Link>

                </div>
              </div>
            </div>
          </div>
        ))}

        {sortedTodos.length === 0 && !err && (
          <div className="col-12">
            <div className="alert alert-light border mb-0">
              No tienes tareas asignadas.
            </div>
          </div>
        )}
      </div>

      {/* {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4 mb-3">
          <div className="d-flex flex-wrap gap-2 justify-content-center">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`btn btn-sm ${page === currentPage ? "btn-dark" : "btn-outline-dark"}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )} */}
 {/* paginación  */}
            <div className="d-flex justify-content-center mt-5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                        key={page}
                        className={`btn me-2 ${
                            page === currentPage
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
