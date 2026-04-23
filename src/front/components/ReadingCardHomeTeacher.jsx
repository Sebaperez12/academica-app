import { useNavigate } from "react-router-dom";
import { RandomImgLecturas } from "./RandomImgLecturas";

export const ReadingCardHomeTeacher = ({ reading }) => {

    const navigate = useNavigate();


    return (
        <div className="card shadow-sm h-100 border-0 rounded-4">

            <RandomImgLecturas

                className="card-img-top rounded-top-4"
                alt="reading"
                style={{ height: "180px", objectFit: "cover" }}
            />

            <div className="card-body d-flex flex-column">

                <h5 className="card-title fw-bold mb-3 text-center">
                    {reading.title}
                </h5>
                <div className="card-footer">
                    <div className="mt-auto">
                        <button
                            className="btn btn-primary w-100 rounded-3"
                            onClick={() => navigate(`/reading/teacher/${reading.id}`)}
                        >
                            Ver lectura
                        </button>

                    </div>

                    <div className="mt-2 ">
                        <button
                            className="btn btn-warning w-100 rounded-3"
                            onClick={() => navigate(`/reading/edit/${reading.id}`)}
                        >
                            Editar lectura
                        </button>

                    </div>
                </div>

            </div>
        </div>
    );
};
