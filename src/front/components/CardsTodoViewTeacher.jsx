import { Link } from "react-router-dom";
import { RandomImgTarea } from "./RandomImgTarea";

export const CardsTodoViewTeacher = ({
  todos
}) => {
  return (
    <div className="row">
      {todos.map((todo) => (
        <div className="col-md-4 mb-4" key={todo.id}>
          <div className="card h-100 shadow">


            {<RandomImgTarea />}


            <div className="card-body text-center">

              <h5 className="card-title mb-3">
                {todo.title}
              </h5>
              <div className="card-footer">
                <Link
                  to={`/homeTeacher/todos/${todo.id}/submissions`}
                  className="btn btn-primary me-2 fs-5 "
                >
                  Ver entregas
                </Link>
                <Link
                  to={`/EditTodoTeacher/${todo.id}`}
                  className="btn btn-warning ms-2 fs-5"
                >
                  Editar tarea
                </Link>

              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};