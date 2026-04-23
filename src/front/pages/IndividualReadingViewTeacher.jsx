import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";


export const IndividualReadingViewTeacher = () => {

    const { id } = useParams();

    const [reading, setReading] = useState(null);
    const [err, setErr] = useState(null);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");
    const backend = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {

        const getReading = async () => {

            if (!token) {
                setErr("No autenticado");
                setLoading(false);
                return;
            }

            try {

                const resp = await fetch(`${backend}/reading/individual/${id}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    }
                });

                if (resp.status === 401) {
                    throw new Error("Sesión expirada");
                }

                if (resp.status === 403) {
                    throw new Error("No autorizado");
                }

                const data = await resp.json();

                if (!resp.ok) {
                    throw new Error(data?.msg || "Error al cargar lectura");
                }

                setReading(data);

            } catch (error) {
                setErr(error.message);
            } finally {
                setLoading(false);
            }
        };

        getReading();

    }, [backend, id, token]);

    if (loading) {
        return <div className="container mt-5">Cargando lectura...</div>;
    }

    if (err) {
        return <div className="container mt-5 alert alert-danger">{err}</div>;
    }

    return (

        <div className="container mt-1">

            <div className="m-0 p-0">
                <img
                    src= "https://res.cloudinary.com/dxvdismgz/raw/upload/v1771108762/Screenshot_2026-02-14_at_4.38.20_p.m._kvivpy.png"
                    className="img-fluid w-100 rounded"
                    alt="cover"
                    style={{ maxHeight: "300px", objectFit: "cover" }}
                />
            </div>

            <div className="text-center col-8 mx-auto">

                <h1 className="mt-4">
                    Título de lectura: {reading.title}
                </h1>

                <hr />

                <h3>Instrucciones de lectura:</h3>
                <p className="mt-3">
                    {reading.content}
                </p>

                <hr />

                {reading.reading_url && (
                    <div className="row">
                        <div className="col-4 m-auto">
                            <a
                                href={reading.reading_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary mt-4 mb-3"
                                download
                            >
                                Descargar archivo de lectura
                            </a>
                        </div>
                    </div>
                )}

                <p>
                    Haz click en el botón para descargar el archivo de la lectura.
                </p>

                <hr />
                <div className="row">
                    <div>
                <Link
    to={`/reading/edit/${reading.id}`}
    className="btn btn-warning me-2"
>
    Editar lectura
</Link>
</div>

<div>
                <Link to="/teacher/readings" className="btn btn-success mt-4 mb-3">
                    Volver a todas las lecturas
                </Link>
                </div>
                
                </div>

            </div>

        </div>
    );
};
