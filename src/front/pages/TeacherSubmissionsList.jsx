import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

export const TeacherSubmissionsList = () => {



  const { todoId } = useParams();
  const navigate = useNavigate();

  const [todo, setTodo] = useState(null);
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [statusBySubmissionId, setStatusBySubmissionId] = useState({});
  const [err, setErr] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const backendBase = (import.meta.env.VITE_BACKEND_URL || "").trim();
  const token = localStorage.getItem("token");

  const safeReadJsonOrText = async (resp) => {
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const json = await resp.json().catch(() => null);
      return { json, text: null };
    }
    const text = await resp.text().catch(() => "");
    return { json: null, text };
  };

  useEffect(() => {
    const load = async () => {
      setErr(null);
      setTodo(null);
      setStudents([]);
      setSubmissions([]);
      setStatusBySubmissionId({});
      setCurrentPage(1);

      try {
        if (!backendBase) throw new Error("VITE_BACKEND_URL no está definido.");
        if (!todoId) throw new Error("Falta todoId en la URL.");


        const todoResp = await fetch(`${backendBase}/todos/${todoId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const todoParsed = await safeReadJsonOrText(todoResp);

        if (!todoResp.ok) {
          throw new Error(
            todoParsed.json?.msg || todoParsed.text || "Error al cargar la tarea"
          );
        }

        const todoData = todoParsed.json;
        setTodo(todoData);

        if (!todoData?.group_id) throw new Error("La tarea no tiene group_id.");


        const studentsResp = await fetch(
          `${backendBase}/groups/${todoData.group_id}/students`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        const studentsParsed = await safeReadJsonOrText(studentsResp);

        if (!studentsResp.ok) {
          throw new Error(
            studentsParsed.json?.msg ||
            studentsParsed.text ||
            "Error al cargar alumnos del grupo"
          );
        }

        const studentsData = Array.isArray(studentsParsed.json)
          ? studentsParsed.json
          : [];
        setStudents(studentsData);

        console.log("STUDENTS:", studentsData);
        console.log("STUDENT KEYS:", studentsData.map(s => ({
          id: s.id,
          user_id: s.user_id,
          email: s.email,
          name: s.name
        })));



        const subResp = await fetch(`${backendBase}/submissions?todo_id=${todoId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const subParsed = await safeReadJsonOrText(subResp);

        if (!subResp.ok) {
          throw new Error(
            subParsed.json?.msg || subParsed.text || "Error al cargar entregas"
          );
        }

        const subs = Array.isArray(subParsed.json?.submissions)
          ? subParsed.json.submissions
          : Array.isArray(subParsed.json)
            ? subParsed.json
            : [];
        setSubmissions(subs);

        console.log("SUBMISSIONS:", subs);
        console.log("SUBMISSION KEYS:", subs.map(x => ({
          id: x.id,
          student_id: x.student_id,
          todo_id: x.todo_id,
          response_url: x.response_url
        })));



        const statusMap = {};
        await Promise.all(
          subs.map(async (s) => {
            try {
              const r = await fetch(`${backendBase}/submissions/${s.id}/status`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (!r.ok) return;
              const st = await r.json().catch(() => null);
              if (st) statusMap[s.id] = st;
            } catch { }
          })
        );
        setStatusBySubmissionId(statusMap);
      } catch (e) {
        setErr(e.message || "Error inesperado");
      }
    };

    load();
  }, [todoId, backendBase, token]);


  const rows = useMemo(() => {
    const subByStudentGroupId = new Map();

    for (const s of submissions) {
      if (s?.student_id != null) {
        subByStudentGroupId.set(String(s.student_id), s);
      }
    }

    return (students || []).map((st) => {
      const stKey = String(st.student_group_id);
      const sub = subByStudentGroupId.get(stKey) || null;
      const status = sub ? statusBySubmissionId[sub.id] : null;

      const state = status?.state
        ? String(status.state).toUpperCase()
        : sub
          ? "ENTREGADO"
          : "PENDIENTE";

      return {
        user_id: st.user_id,
        name: st.name,
        email: st.email,
        submission: sub,
        state,
      };
    });
  }, [students, submissions, statusBySubmissionId]);



  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
    if (currentPage > totalPages) setCurrentPage(1);
  }, [rows, currentPage]);

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const currentRows = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return rows.slice(start, start + perPage);
  }, [rows, currentPage]);

  if (err) return <div className="container mt-5 alert alert-danger">{err}</div>;
  if (!todo) return <div className="container mt-5">Cargando...</div>;

  return (
    <div className="container mt-4">
      <div className="mb-3">
        <h4 className="mb-1">Entregas / {todo.title}</h4>
        <div className="text-muted small">
          Grupo {todo.group_id} · {rows.length} alumnos
        </div>
      </div>

      <div className="list-group">
        {currentRows.map((r) => {
          const isPending = String(r.state).toUpperCase() === "PENDIENTE";

          return (
             <div className="row">
            <div
              key={String(r.student_group_id ?? r.user_id)}
              className="list-group-item tsl-item"
            >
              <div className="tsl-left ">
                <div className="fw-semibold">{r.name}</div>
                <div className="text-muted small">{r.email}</div>
              </div>

              <div className="tsl-right text-end ">
                <span className="badge tsl-badge me-2" style={{ backgroundColor: isPending ? "#6c757d" : "#5B72EE", color: "#fff" }}>
                  {r.state}
                </span>

                {r.submission ? (
                  <Link
                    to={`/homeTeacher/todos/${todoId}/submissions/${r.submission.id}`}
                    className="btn btn-sm btn-primary tsl-btn "
                    style={{ backgroundColor: "#49BBBD", borderColor: "#49BBBD" }}
                  >
                    Corregir
                  </Link>
                ) : (
                  <button className="btn btn-sm btn-outline-secondary tsl-btn" disabled>
                    Sin entrega
                  </button>
                )}
              </div>
            </div>
             </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-3 mb-3">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              className={`btn me-2 ${page === currentPage ? "btn-dark" : "btn-outline-dark"}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn btn-sm btn-outline-secondary m-3"
        onClick={() => navigate(-1)}
      >
        ← Volver
      </button>
    </div>
  );
};
