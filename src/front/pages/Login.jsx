import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { Link } from "react-router-dom";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [showPassword, setShowPassword] = useState(false);


  const navigate = useNavigate();
  const { store, dispatch } = useGlobalReducer();
  const { role } = store;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(null);

    try {
      const backend = import.meta.env.VITE_BACKEND_URL;

      const resp = await fetch(`${backend}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.msg || "Error de Inicio de Sesión");
      }
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("user_name", data.user?.name || "");
      localStorage.setItem("user_id", String(data.user?.id || ""));

      console.log("GUARDADO:", {
        token: localStorage.getItem("token"),
        role: localStorage.getItem("role"),
      });

      dispatch({
        type: "LOGIN_SUCCESS",
        payload: {
          user: null,
          role: data.role
        }
      });

      if (data.role === "STUDENT") {
        navigate("/homeStudent");
      } else if (data.role === "TEACHER") {
        navigate("/homeTeacher");
      } else if (data.role === "ADMIN") {
        navigate("/homeAdmin");
      } else {
        navigate("/");
      }

    } catch (error) {
      setErr(error.message);
    }


  };



  return (
    <div className="container-fluid min-vh-100 py-4 py-md-0">
      <div className="row h-100">

        <div className="col-md-6 d-none d-md-flex p-4">
          <div className="w-100 position-relative rounded-4 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d"
              alt="login"
              className="w-100 h-100 object-fit-cover"
            />
            <div className="position-absolute bottom-0 start-0 p-4 text-white">
              <h2 className="fw-bold">BIENVENID@ A ACADEMICA</h2>
              <p>Ingresa con tu cuenta</p>
            </div>
          </div>
        </div>


        <div className="col-12 col-md-6 d-flex align-items-center justify-content-center px-3">
          <div className="w-100" style={{ maxWidth: "420px" }}>

            <h3 className="text-center mb-4">INICIAR SESIÓN EN ACADEMICA</h3>

            <div className="d-flex justify-content-center mb-4">
              <div className="btn-group flex-wrap rounded-pill bg-light p-1">
                <button className="btn btn-info rounded-pill px-4">
                  Ingresar
                </button>
                <Link to="/Signup">
                  <button className="btn btn-light rounded-pill px-4">
                    Registarte
                  </button>
                </Link>
              </div>
            </div>

            <p className="text-muted text-center mb-4">
              Accede con tu correo institucional.
            </p>

            {err && <div className="alert alert-danger">{err}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control rounded-pill"
                  placeholder="Ingresa tu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>


              <div className="mb-4">
                <label className="form-label">Contraseña</label>

                <div className="position-relative">

                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control rounded-pill pe-5"
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <i className="fa-solid fa-eye-slash eye-icon"></i>
                    ) : (
                      <i className="fa-solid fa-eye eye-icon"></i>
                    )}
                  </button>

                </div>
              </div>



              <div className="d-flex justify-content-between mb-4">
                <div>
                  <input type="checkbox" className="form-check-input me-2" />
                  <label className="form-check-label">Recuerdame</label>
                </div>
                <Link to="/forgotpassword">
                  <button className="btn btn-link p-0" type="button">

                    ¿Olvidaste tu contraseña?
                  </button>
                </Link>
              </div>
              <div className="text-center">
                <button
                  type="submit"
                  className="btn btn-info rounded-pill px-5"
                >
                  Ingresar
                </button>
              </div>
            </form>

          </div>
        </div>

      </div>
    </div>
  );
};