export const initialStore = () => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const role =
    typeof window !== "undefined" ? localStorage.getItem("role") : null;

  return {
    message: null,
    todos: [],
    readings: [],
    students: [],
    groups: [],
    staff: [],
    user: null,
    role: role,
    isAuthenticated: Boolean(token && role),
  };
};

export default function storeReducer(store, action = {}) {
  switch (action.type) {

    case "LOGIN_SUCCESS":
      return {
        ...store,
        user: action.payload.user,
        role: action.payload.role,
        isAuthenticated: true,
        message: "Inicio de sesión exitoso",
      };

    case "LOGOUT":
      return {
        ...store,
        user: null,
        role: null,
        isAuthenticated: false,
        message: null,
      };

    
    case "REGISTER_STUDENTS_SUCCESS":
      return {
        ...store,
        students: [...store.students, action.payload],
        message: "Alumno registrado correctamente",
      };

    case "REGISTER_STAFF_SUCCESS":
      return {
        ...store,
        staff: [...store.staff, action.payload],
        message: "Staff registrado correctamente",
      };

    case "SET_TODOS":
    case "GET_TODOS_SUCCESS":
      return {
        ...store,
        todos: action.payload,
      };

    case "CREATE_READING_SUCCESS":
      return {
        ...store,
        readings: [...store.readings, action.payload],
        message: "Lectura creada correctamente",
      };

    case "GET_READINGS_SUCCESS":
      return {
        ...store,
        readings: action.payload,
      };

    case "GET_STAFF_SUCCESS":
      return {
        ...store,
        staff: action.payload,
      };

    case "SET_GROUPS":
      return {
        ...store,
        groups: action.payload,
      };

    case "SET_CURRENT_USER":
      return {
        ...store,
        user: action.payload,
      };

    default:
      throw Error("Unknown action.");



    case "SET_STUDENT_GROUP_ID":
       return { ...store, student_group_id: action.payload };

  }
}