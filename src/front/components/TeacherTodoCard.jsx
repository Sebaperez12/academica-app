import React from "react";
import { Link } from "react-router-dom";
import { RandomImgTarea } from "../components/RandomImgTarea";

export const TeacherTodoCard = ({ todo }) => {
  return (
    <div className="card border shadow-sm" style={{ minWidth: "280px", minHeight: "450px" }}>
      <div className="border-bottom">
        <RandomImgTarea
        seed={todo.id}
        className="card-img-top"
        alt="tarea"
       style={{ height: "220px", objectFit: "cover" }} 
      />
      </div>

      <div className="card-body d-flex flex-column">
        <h5 className="card-title border-bottom pb-2 mb-2 text-center">{todo.title}</h5>

        {todo.due_date && (
          <p className="mb-2 text-muted">
            <strong>Entrega:</strong> {todo.due_date}
          </p>
        )}

        <p className="card-text flex-grow-1">{todo.description || "Sin descripción"}</p>

       {/* {todo.archive_url && (
          <a href={todo.archive_url} target="_blank" rel="noreferrer" className="small">
            Ver archivo adjunto
          </a>
        )}*/}
      </div>

      <div className="card-footer bg-white d-flex">
        <Link to={`/homeTeacher/todos/${todo.id}/submissions`} className="btn btn-primary w-100">
          Calificar tarea
        </Link>   
      </div>
    </div>
  );
};
