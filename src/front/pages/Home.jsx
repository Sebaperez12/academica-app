import React from "react";
import diplomados from "../assets/img/diplomados.png";

export const Home = () => {
	return (
		<div className="bg-light pb-5">
			<div className="g-color-bg text-white home-hero">
				<div className="container">
					<div className="row align-items-center">

						<div className="col-sm-12 col-md-6 text-center text-md-start mb-5 home-hero-text">
							<h1 className="display-5 fw-bold mb-4">
								<span className="text-warning">Entregar</span> tus tareas nunca fue tan fácil
							</h1>

							<p className="fs-5 mt-3">
								Gestioná tareas, lecturas y calificaciones de forma simple y rápida en una sola plataforma.
							</p>

							<button className="btn btn-light btn-lg mt-3 fw-bold home-cta">
								Comenzar ahora
							</button>
						</div>

						<div className="col-sm-12 col-md-6 text-center ps-md-5">
							<img
								src={diplomados}
								alt="diplomados"
								className="img-fluid hero-image"
							/>
						</div>

					</div>
				</div>
			</div>
			<div className="bg-light py-5">
				<div className="container">
					<div className="text-center mb-5">
					<h1 className="display-5 fw-bold mb-4">Los números que nos <span className="v-color">respaldan</span></h1>
					</div>
				</div>
				<div className="row text-center g-4">

					<div className="col-sm-12 col-md-3">
						<h2 className="display-3 fw-bold v-color">500+</h2>
						<p className="fs-3 mb-0 fw-bold">Docentes satisfechos</p>
					</div>

					<div className="col-sm-12 col-md-3">
						<h2 className="display-3 fw-bold v-color">10,000+</h2>
						<p className="fs-3 mb-0 fw-bold">Tareas gestionadas</p>
					</div>

					<div className="col-sm-12 col-md-3">
						<h2 className="display-3 fw-bold v-color">1,200+</h2>
						<p className="fs-3 mb-0 fw-bold">Estudiantes beneficiados</p>
					</div>

					<div className="col-sm-12 col-md-3">
						<h2 className="display-3 fw-bold v-color">4+</h2>
						<p className="fs-3 mb-0 fw-bold">semanas de experiencia</p>
					</div>

				</div>
			</div>

				<div className="container text-center bg-light mt-3 home-why">
					<h1 className="fw-bold mb-4">¿Por qué elegir <span className="g-color">ACADEMICA</span>?</h1>
					<p className="fs-4 mb-0">
						Nuestra plataforma automatizada está diseñada para simplificar la gestión académica, mejorar la comunicación y optimizar el seguimiento del progreso de los estudiantes.
					</p>
					<p className="fs-3">
						Al elegir nuestra solución, los docentes pueden centrarse en lo que realmente importa: la enseñanza y el aprendizaje.
					</p>
				</div>

			<div className="container mt-5">
				<div className="row text-center g-4 ">

					<div className="col-sm-12 col-md-6 col-lg-3">
						<div className="bg-white rounded-3 shadow-sm p-4 h-100">
							<i className="fa-solid fa-clock fa-3x mb-3 g-color"></i>
							<h4 className="fw-bold mb-3">Ahorro de tiempo</h4>
							<p>
								Automatiza la gestión de tareas y calificaciones, permitiendo a los docentes centrarse en la enseñanza.
							</p>
							<p>
								Este método garantiza una mayor eficiencia en la gestión académica.
							</p>
						</div>
					</div>

					<div className="col-sm-12 col-md-6 col-lg-3">
						<div className="bg-white rounded-3 shadow-sm p-4 h-100">
							<i className="fa-solid fa-users fa-3x mb-3 g-color"></i>
							<h4 className="fw-bold mb-3">Mejora la comunicación</h4>
							<p>
								Facilita la interacción entre estudiantes y docentes, promoviendo un ambiente colaborativo.
							</p>
							<p>
								La automatización mejora la comunicación entre todos los involucrados.
							</p>
						</div>
					</div>

					<div className="col-sm-12 col-md-6 col-lg-3">
						<div className="bg-white rounded-3 shadow-sm p-4 h-100">
							<i className="fa-solid fa-chart-line fa-3x mb-3 g-color"></i>
							<h4 className="fw-bold mb-3">Seguimiento del progreso</h4>
							<p>
								Proporciona herramientas para monitorear el rendimiento académico.
							</p>
							<p>
								Permite un seguimiento detallado del progreso de los estudiantes.
							</p>
						</div>
					</div>
					<div className="col-sm-12 col-md-6 col-lg-3">
						<div className="bg-white rounded-3 shadow-sm p-4 h-100">
							<i className="fa-solid fa-shield-halved fa-3x mb-3 g-color"></i>
							<h4 className="fw-bold mb-3">Seguridad y privacidad</h4>
							<p>
								Garantiza la protección de datos académicos y personales.
							</p>
							<p>
								La plataforma cumple con los estándares de seguridad más altos.
							</p>
						</div>
					</div>

				</div>
			</div>
		</div>
	);
};
