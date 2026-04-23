import React, { useEffect, useState } from "react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { ReadingCardHomeStudent } from "../components/ReadingCardHomeStudent.jsx";
import { TodoCardHomeStudent } from "../components/TodoCardHomeStudent.jsx";
import { Link } from "react-router-dom";

export const HomeStudent = () => {
  const { store, dispatch } = useGlobalReducer();

  const [readings, setReadings] = useState([]);
  const [todos, setTodos] = useState([]);
  const [err, setErr] = useState(null);

  const currentReadings = [...readings].sort((a, b) => b.id - a.id).slice(0, 4);
  const currentTodos = [...todos].sort((a, b) => b.id - a.id).slice(0, 4);

  useEffect(() => {
    getStudentTodos();
    getStudentReadings();
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

  const getStudentReadings = async () => {
    setErr(null);
    try {
      const backend = import.meta.env.VITE_BACKEND_URL;
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Usuario no autenticado");

      const resp = await fetch(`${backend}/student/readings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await resp.json().catch(() => ([]));
      if (!resp.ok) throw new Error("Aún no tienes lecturas asignadas");

      setReadings(Array.isArray(data) ? data : []);
    } catch (error) {
      setErr(error.message);
    }
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
        dispatch({ type: "SET_CURRENT_USER", payload: data });
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };

    fetchMe();
  }, [dispatch]);

  return (
    <div className="bg-light pb-5">
      <div className="g-color-bg hero-home text-white py-4 py-md-5">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-12 col-lg-6">
              <h1 className="fw-bold mb-3 g-color display-6 display-md-5">
                Bienvenido,{" "}
                <span className="text-primary">
                  {store.user?.name || "Estudiante"}
                </span>
              </h1>

              <p className="fs-6 fs-md-5 mb-0">
                Aquí podrás gestionar tus tareas, lecturas y calificaciones de forma simple y rápida.
              </p>
            </div>

            <div className="col-12 col-lg-6 text-center">
              <img
                src="https://fastly.picsum.photos/id/3/5000/3333.jpg?hmac=GDjZ2uNWE3V59PkdDaOzTOuV3tPWWxJSf4fNcxu4S2g"
                className="img-fluid rounded-5 hero-student-img"
                alt="novedades"
              />
            </div>
          </div>
        </div>
      </div>

      {err && (
        <div className="container mt-4">
          <div className="alert alert-warning mb-0">{err}</div>
        </div>
      )}

      <div className="container mt-5">
        <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2 gap-md-3 mb-3">
          <h2 className="fw-bold m-0">
            Tus tareas asignadas{" "}
            <span className="fs-6 fw-light d-block d-md-inline">(Vista Previa)</span>
          </h2>

          <div className="col-6 text-end">

            <Link to="/todoviewstudent">
              <button className="btn btn-outline-dark fs-6 p-1 mt-1 me-2">
                Ver todas las tareas →
              </button>
            </Link>

          </div>
        </div>

        {currentTodos.length === 0 ? (
          <p className="text-muted">No hay tareas asignadas</p>
        ) : (
          <div className="row g-4">
            {currentTodos.map((todo) => (
              <div key={todo.id} className="col-12 col-sm-6 col-lg-3">
                <TodoCardHomeStudent todo={todo} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="container mt-5">
        <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2 gap-md-3 mb-3">
          <h2 className="fw-bold m-0">
            Tus lecturas asignadas{" "}
            <span className="fs-6 fw-light d-block d-md-inline">(Vista Previa)</span>
          </h2>

          <div className="col-6 text-end">

            <Link to="/readings/student">
              <button className="btn btn-outline-dark fs-6 p-1 mt-1 me-2">
                Ver todas las lecturas →
              </button>
            </Link>

          </div>
        </div>

        {currentReadings.length === 0 ? (
          <p className="text-muted">No hay lecturas creadas</p>
        ) : (
          <div className="row g-4">
            {currentReadings.map((reading) => (
              <div key={reading.id} className="col-12 col-sm-6 col-lg-3">
                <ReadingCardHomeStudent reading={reading} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
