// Import necessary components and functions from react-router-dom.

import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";

import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { Single } from "./pages/Single";
import { Demo } from "./pages/Demo";
import { Signup } from "./pages/Signup";
import { Login } from "./pages/Login";

import { ProtectedRoute } from "./components/ProtectedRoute";

import { HomeStudent } from "./pages/homeStudent";
import { TodoViewStudent } from "./pages/TodoViewStudent.jsx";
import { IndividualTodoViewStudent } from "./pages/IndividualTodoViewStudent.jsx";
import { StudentViewReadings } from "./pages/StudentViewReadings.jsx";
import { IndividualReadingViewStudent } from "./pages/IndividualReadingViewStudent.jsx";

import { HomeTeacher } from "./pages/HomeTeacher.jsx";
import { CreateTodoForm } from "./pages/CreateTodoForm";
import { CreateReadings } from "./pages/CreateReadings";
import { TeacherViewReadings } from "./pages/TeacherViewReadings";
import { IndividualReadingViewTeacher } from "./pages/IndividualReadingViewTeacher.jsx";
import { EditReadingTeacher } from "./pages/EditReadingTeacher.jsx";
import { TodoDetailTeacher } from "./pages/TodoDetailTeacher.jsx";
import { TodoViewTeacher } from "./pages/TodoViewTeacher.jsx";
import { TeacherSubmissionsList } from "./pages/TeacherSubmissionsList.jsx";
import { TeacherSubmissionReview } from "./pages/TeacherSubmissionReview.jsx";
import { EditTodoTeacher } from "./pages/EditTodoTeacher.jsx";

import { HomeAdmin } from "./pages/HomeAdmin.jsx";
import { CreateGroupsAdmin } from "./pages/CreateGroupsAdmin";
import { SignupStaff } from "./pages/SignupStaff";

import { ForgotPassword } from "./pages/ForgotPassword.jsx";
import { ResetPassword } from "./pages/ResetPassword.jsx";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />} errorElement={<h1>Not found!</h1>}>
      {/* PUBLIC */}
      <Route path="/" element={<Home />} />
      <Route path="/single/:theId" element={<Single />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgotpassword" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/homeStudent"
        element={
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <HomeStudent />
          </ProtectedRoute>
        }
      />
      <Route
        path="/todoviewstudent"
        element={
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <TodoViewStudent />
          </ProtectedRoute>
        }
      />
      <Route
        path="/todos/:id"
        element={
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <IndividualTodoViewStudent />
          </ProtectedRoute>
        }
      />
      <Route
        path="/readings/student"
        element={
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <StudentViewReadings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reading/:id"
        element={
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <IndividualReadingViewStudent />
          </ProtectedRoute>
        }
      />

      <Route
        path="/homeTeacher"
        element={
          <ProtectedRoute allowedRoles={["TEACHER"]}>
            <HomeTeacher />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crear-tarea"
        element={
          <ProtectedRoute allowedRoles={["TEACHER"]}>
            <CreateTodoForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/readings-create"
        element={
          <ProtectedRoute allowedRoles={["TEACHER"]}>
            <CreateReadings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/readings"
        element={
          <ProtectedRoute allowedRoles={["TEACHER"]}>
            <TeacherViewReadings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reading/teacher/:id"
        element={
          <ProtectedRoute allowedRoles={["TEACHER"]}>
            <IndividualReadingViewTeacher />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reading/edit/:id"
        element={
          <ProtectedRoute allowedRoles={["TEACHER"]}>
            <EditReadingTeacher />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/todos/:id"
        element={
          <ProtectedRoute allowedRoles={["TEACHER"]}>
            <TodoDetailTeacher />
          </ProtectedRoute>
        }
      />
      <Route
        path="/homeTeacher/todos"
        element={
          <ProtectedRoute allowedRoles={["TEACHER"]}>
            <TodoViewTeacher />
          </ProtectedRoute>
        }
      />
      <Route
        path="/homeTeacher/todos/:todoId/submissions"
        element={
          <ProtectedRoute allowedRoles={["TEACHER"]}>
            <TeacherSubmissionsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/homeTeacher/todos/:todoId/submissions/:submissionId"
        element={
          <ProtectedRoute allowedRoles={["TEACHER"]}>
            <TeacherSubmissionReview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/EditTodoTeacher/:id"
        element={
          <ProtectedRoute allowedRoles={["TEACHER"]}>
            <EditTodoTeacher />
          </ProtectedRoute>
        }
      />

      <Route
        path="/homeAdmin"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <HomeAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/groups"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <CreateGroupsAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/signup-staff"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <SignupStaff />
          </ProtectedRoute>
        }
      />
    </Route>
  )
);
