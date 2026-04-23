import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage("Las contraseñas no coinciden");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const backend = import.meta.env.VITE_BACKEND_URL
            const resp = await fetch(`${backend}/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token,
                    password
                })
            });

            const data = await resp.json();

            if (!resp.ok) {
                setMessage(data.msg || "Error al cambiar contraseña");
                return;
            }

            setMessage("Contraseña actualizada. Redirigiendo...");
            setTimeout(() => navigate("/login"), 2000);

        } catch (error) {
            setMessage("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="container mt-5 text-center">
                <div className="alert alert-danger">
                    Token inválido o faltante
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-5">
                    <h3 className="mb-4 text-center">Nueva contraseña</h3>

                    <form onSubmit={handleSubmit}>
                        <input
                            type="password"
                            className="form-control mb-3"
                            placeholder="Nueva contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <input
                            type="password"
                            className="form-control mb-3"
                            placeholder="Confirmar contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />

                        <button
                            className="btn btn-success w-100"
                            disabled={loading}
                        >
                            {loading ? "Guardando..." : "Cambiar contraseña"}
                        </button>
                    </form>

                    {message && (
                        <div className="alert alert-info mt-3">
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};