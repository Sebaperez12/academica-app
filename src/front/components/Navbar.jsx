import { Link } from "react-router-dom";
import logofinal from "../assets/img/logofinal.png";
import logoLogeado from "../assets/img/logoLogeado.png";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const Navbar = () => {
  const { store, dispatch } = useGlobalReducer();

  const { isAuthenticated } = store;
  const role = store.role || localStorage.getItem("role");

  return (
    <nav className={`navbar navbar-expand-lg ${isAuthenticated ? "bg-white" : "g-color-bg"}`}>
    <div className="container mt-2">

        
          <Link to={isAuthenticated ? `/home${role}` : "/"}>
            <img
              src={isAuthenticated ? logoLogeado : logofinal}
              alt="logo"
              className="img-fluid"
              style={{ maxHeight: "50px" }}
            />
          </Link>

          <span
            className={`navbar-brand mb-0 h1 ms-2 ${
              isAuthenticated ? "g-color" : "text-white"
            }`}
          >
            ACADEMICA
          </span>
          

           <button
        className="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarContent"
      >
        <span className="navbar-toggler-icon"></span>
      </button>

      <div className="collapse navbar-collapse justify-content-end" id="navbarContent">
         <div className="navbar-nav align-items-lg-center text-end">
     
          {!isAuthenticated && (
            <>
              <Link to="/Signup">
                <button className="btn btn-light ms-2">
                  Registrate
                </button>
              </Link>

              <Link to="/Login">
                <button className="btn btn-outline-light ms-2">
                  Ingresar
                </button>
              </Link>
            </>
          )}

          {isAuthenticated && role === "TEACHER" && (
            <>

<Link to="/homeTeacher" className="text-dark text-decoration-none m-0 navbaritems">
                
                   <i class="fa-solid fa-house"></i> Página Principal
               
              </Link>
           

              <Link to="/crear-tarea" className="text-dark ms-4 text-decoration-none navbaritems">
                
                  Crear Tarea
                
              </Link>
            
            <Link to="/homeTeacher/todos" className="text-dark ms-4  text-decoration-none navbaritems">
              
                  Tareas Creadas
                  
                  
               
              </Link>
            

            <Link to="/readings-create" className="text-dark ms-4 text-decoration-none navbaritems">
                
                  Crear Lectura
               
              </Link>

              <Link to="/teacher/readings" className="text-dark ms-4 text-decoration-none navbaritems me-1">
                
                  Lecturas Creadas
                
                 </Link>

              

                 </>
          )}

          {isAuthenticated && role === "ADMIN" && (
            <>
           
            <Link to="/homeAdmin" className="text-dark text-decoration-none m-0 navbaritems">
                
                   <i class="fa-solid fa-house"></i> Página Principal
                
              </Link>

              <Link to="/signup-staff" className="text-dark ms-4 text-decoration-none navbaritems">
                
                  Crear Staff
               
              </Link>

              <Link to="/admin/groups" className="text-dark ms-4 text-decoration-none navbaritems me-1">
                
                  Crear Grupos
               
              </Link>
            </>
          )}

          {isAuthenticated && role === "STUDENT" && (
            <>

            <Link to="/homeStudent" className="text-dark text-decoration-none m-0 navbaritems">
                
                   <i class="fa-solid fa-house"></i> Página Principal
                
              </Link>

              <Link to="/todoviewstudent" className="text-dark ms-4 text-decoration-none navbaritems">
               
                  Mis Tareas
              
              </Link>

              <Link to="/readings/student"  className="text-dark ms-4 text-decoration-none navbaritems me-1">
                
                  Mis Lecturas
                
  </Link>

                
            

          

              
            </>
          )}

          {isAuthenticated && (
            <Link to="/" className="text-decoration-none">
              <button
                className="text-danger ms-3 buttonSalir navbaritems"
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("role");
                  dispatch({ type: "LOGOUT" });
                }}
              >
                Salir
              </button>
            </Link>
          )}
        </div>
</div>
      </div>
    </nav>
  );
};

