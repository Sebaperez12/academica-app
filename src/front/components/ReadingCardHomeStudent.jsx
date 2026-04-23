import { useNavigate } from "react-router-dom";
import { RandomImgLecturas } from "./RandomImgLecturas";

export const ReadingCardHomeStudent = ({ reading }) => {

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

				<div className="mt-auto card-footer">
					<button
						className="btn btn-primary w-100 rounded-3"
						onClick={() => navigate(`/reading/${reading.id}`)}
					>
						Ver lectura
					</button>
				</div>

			</div>
		</div>
	);
};
