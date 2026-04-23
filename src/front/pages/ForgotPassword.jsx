import React, { useState } from "react";

export const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const backend = import.meta.env.VITE_BACKEND_URL
            const resp = await fetch(`${backend}/forgot-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
            });

            const data = await resp.json();
            setMessage(data.msg);
        } catch (error) {
            setMessage("Error al enviar el email");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-5">
                    <h3 className="mb-4 text-center">Recuperar contraseña</h3>

                    <form onSubmit={handleSubmit}>
                        <input
                            type="email"
                            className="form-control mb-3"
                            placeholder="Tu email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <button
                            className="btn btn-primary w-100"
                            disabled={loading}
                        >
                            {loading ? "Enviando..." : "Enviar link"}
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