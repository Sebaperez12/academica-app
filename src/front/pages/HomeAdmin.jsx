import React, { useEffect } from "react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { TodoCardHomeAdmin} from "../components/TodoCardHomeAdmin.jsx";


export const HomeAdmin = () => {
    const { store, dispatch } = useGlobalReducer();

    const currentGroups = [...store.groups]
  .sort((a, b) => b.id - a.id) // más reciente primero
  

 
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

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const backend = import.meta.env.VITE_BACKEND_URL;
                const resp = await fetch(`${backend}/groups`, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                });

                const data = await resp.json();

                dispatch({
                    type: "SET_GROUPS",
                    payload: data,
                });
            } catch (error) {
                console.error("Error fetching groups:", error);
            }
        };

        fetchGroups();
    }, [dispatch]);



    return (
        <div className="bg-light pb-5">
            {/* HERO */}
            <div className="g-color-bg hero-home text-white">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <h1 className="display-5 fw-bold mb-4 g-color">
                                Bienvenido,  <span className="text-primary">{store.user?.name || "Administrador"}</span>
                            </h1>
                            <p className="fs-5">
                                Aquí podrás gestionar los grupos de tu institución
                                y administrar usuarios.
                            </p>
                        </div>

                        <div className="col-md-6 text-center my-3">
                            <img
                                src="https://fastly.picsum.photos/id/3/5000/3333.jpg?hmac=GDjZ2uNWE3V59PkdDaOzTOuV3tPWWxJSf4fNcxu4S2g"
                                className="img-fluid rounded-5"
                                alt="hero"
                            />
                        </div>
                    </div>
                </div>
            </div>


            <div className="container mt-5">
                    <div className="row">
                      <div className="col-6">
                    
                    <h2 className="fw-bold mb-4">Grupos Creados </h2> 
                    </div>
                  
                  </div>
                 
                    {currentGroups.length === 0 && (
                      <p>No hay grupos creados s</p>
                    )}
                  
                    <div className="row g-4">
                      {currentGroups.map(group => (
                        <div key={group.id} className="col-md-6 col-lg-3">
                          <TodoCardHomeAdmin group={group} />
                        </div>
                      ))}
                    </div>
                   
                  </div> 

          
        </div>
    );
};
