import { useState } from "react";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { useNavigate } from "react-router-dom";


export const SignupStaff = () => {
  
  useGlobalReducer();

  const navigate = useNavigate();


  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [role, setRole] = useState("");

  const [err, setErr] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    setSuccess(false);

    if (password !== confirmPassword) {
    setErr("Las contraseñas no coinciden");
    return;
  }

    try {
      const backend = import.meta.env.VITE_BACKEND_URL;

      const resp = await fetch(`${backend}/register-staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      });

      navigate("/homeAdmin");

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.msg || "Error de registro");
      }

      
      setSuccess(true);

     
      setName("");
      setEmail("");
      setPassword("");
      setRole("");

    } catch (error) {
      setErr(error.message);
    }
  };

  return (
    <div className="container-fluid vh-100">
      <div className="row h-100">

        <div className="col-md-6 d-none d-md-flex p-4">
          <div className="w-100 position-relative rounded-4 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1529070538774-1843cb3265df"
              alt="signup staff"
              className="w-100 h-100 object-fit-cover"
            />
            <div className="position-absolute bottom-0 start-0 p-4 text-white">
              <h2 className="fw-bold">INGRESA A TODO EL EQUIPO DE TRABAJO</h2>
              <p>Registro de miembros de la institución</p>
            </div>
          </div>
        </div>

        
        <div className="col-md-6 d-flex align-items-center justify-content-center">
          <div className="w-75 " style={{ maxWidth: "420px" }}>

            <h3 className="text-center mb-4">
              REGISTRO PERSONAL
            </h3>

            <p className="text-muted text-center mb-4">
              Completa los datos para crear un miembro de la institución.
            </p>

            {err && (
              <div className="alert alert-danger text-center">
                {err}
              </div>
            )}

            {success && (
              <div className="alert alert-success text-center">
                Miembro de la institución creado correctamente
              </div>
            )}

            <form  onSubmit={handleSubmit}>
              <div className="mb-0">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control rounded-pill"
                  placeholder="Email institucional"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Nombre Completo</label>
                <input
                  type="text"
                  className="form-control rounded-pill"
                  placeholder="Nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Rol</label>
                <select
                  className="form-select rounded-pill"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                >
                  <option value="">Seleccionar rol</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="TEACHER">Profesor</option>
                </select>
              </div>

              

                <div className="mb-4">
  <label className="form-label">Contraseña</label>

  <div className="position-relative">

    <input
      type={showPassword ? "text" : "password"}
      className="form-control rounded-pill pe-5"
      placeholder="Crea una contraseña"
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


                  <div className="mb-4">
  <label className="form-label">Confirmar Contraseña</label>

  <div className="position-relative">

    <input
      type={showPasswordConfirm ? "text" : "password"}
      className="form-control rounded-pill pe-5"
      placeholder="Confirma tu contraseña"
      value={confirmPassword}
      onChange={(e) => setConfirmPassword(e.target.value)}
      required
    />

    <button
      type="button"
      className="eye-btn"
      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
    >
      {showPasswordConfirm ? (
        <i className="fa-solid fa-eye-slash eye-icon"></i>
      ) : (
        <i className="fa-solid fa-eye eye-icon"></i>
      )}
    </button>

    

  </div>
 
</div>
 {password !== confirmPassword && confirmPassword && (
  <small className="text-danger">
    Las contraseñas no coinciden
  </small>
)}




              <div className="text-center ">
                <button
                  className="btn btn-info rounded-pill px-5"
                  disabled={success}
                >
                  Registrar
                </button>
              </div>
            </form>

          </div>
        </div>

      </div>
    </div>
  );
};