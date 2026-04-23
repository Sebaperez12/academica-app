import { useNavigate } from "react-router-dom";
import { RandomImgTarea } from "./RandomImgTarea";
import { Link } from "react-router-dom";

export const TodoCardHomeTeacher = ({ todo }) => {

    const navigate = useNavigate();

    
    return (
        <div className="card shadow-sm h-100 border-0 rounded-4">

            <RandomImgTarea
            
                className="card-img-top rounded-top-4"
                alt="reading"
                style={{ height: "180px", objectFit: "cover" }}
            />

            <div className="card-body d-flex flex-column">

                <h5 className="card-title fw-bold mb-3 text-center">
                    {todo.title}
                </h5>

                <p className="mb-2 text-muted">
            <strong>Entrega:</strong> {todo.due_date || "Sin fecha"}
          </p>

          <p className="card-text flex-grow-1">{todo.description || "Sin descripción"}</p>

                <div className="mt-auto card-footer">
                    <button
                        className="btn btn-primary w-100 rounded-3"
                        onClick={() => navigate(`/homeTeacher/todos/${todo.id}/submissions`)}
                    >
                        Ver Entregas
                    </button>
                </div>
                <div className="mt-auto card-footer">
                    <button
                        className="btn btn-warning w-100 rounded-3"
                        onClick={() => navigate(`/EditTodoTeacher/${todo.id}`)}
                    >
                        Editar Tarea
                    </button>
                </div>

            </div>
        </div>
    );
};
