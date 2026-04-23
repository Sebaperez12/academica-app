"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import resend
from flask_swagger import swagger
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import Flow, InstalledAppFlow
from google.oauth2.credentials import Credentials
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from flask_cors import CORS
from functools import wraps
from flask_jwt_extended import JWTManager, create_access_token, get_jwt_identity, jwt_required, get_jwt
from sqlalchemy.exc import IntegrityError
from api.commands import setup_commands
from api.admin import setup_admin
from api.routes import api
from api.models import db
from api.models import Students_Group, Group, Todo, Submission, Status, User, Reading
from api.utils import APIException, generate_sitemap
from flask_migrate import Migrate
from flask import Flask, request, jsonify, url_for, send_from_directory, session, redirect, Blueprint
import os
import secrets
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
load_dotenv()
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_CLIENT_SECRETS_FILE = os.getenv("GOOGLE_CLIENT_SECRETS_FILE",
                                       "google_credentials/client_secret.json")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events"
]
resend.api_key = os.getenv("RESEND_API_KEY")


def get_google_redirect_uri():
    env_uri = os.getenv("GOOGLE_REDIRECT_URI")
    if env_uri:
        return env_uri

    return url_for("google_callback", _external=True)


def role_required(*roles):
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorated(*args, **kwargs):
            claims = get_jwt()
            if claims.get("role") not in roles:
                return jsonify({"msg": "Acceso no autorizado"}), 403
            return fn(*args, **kwargs)
        return decorated
    return wrapper


def get_calendar_service():
    token_path = "google_credentials/token.json"
    creds = None

    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)

    if not creds:
        raise Exception(
            "Google no está conectado. Primero hacé /google/login y completá el consentimiento.")

    if creds.expired and creds.refresh_token:
        from google.auth.transport.requests import Request
        creds.refresh(Request())

        with open(token_path, "w") as token:
            token.write(creds.to_json())

    return build("calendar", "v3", credentials=creds)

# resend


def send_email(to_email, subject, content):

    try:
        resend.Emails.send({
            "from": "Academica <onboarding@resend.dev>",
            "to": to_email,
            "subject": subject,
            "html": content
        })

        return True

    except Exception as e:
        print("ERROR EMAIL:", e)
        return False


ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"
static_file_dir = os.path.join(os.path.dirname(
    os.path.realpath(__file__)), '../dist/')
app = Flask(__name__)
app.secret_key = "super-secret-key"
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "super-secret-key")
app.config["JWT_TOKEN_LOCATION"] = ["headers"]
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False
jwt = JWTManager(app)
app.url_map.strict_slashes = False

frontend_url = os.getenv("FRONTEND_URL")

if ENV == "development":
    CORS(app)
else:
    CORS(app, resources={
        r"/*": {
            "origins": frontend_url
        }
    })

auth_bp = Blueprint('auth', __name__)

# database condiguration
db_url = os.getenv("DATABASE_URL")
if db_url is not None:
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url.replace(
        "postgres://", "postgresql://")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)

# add the admin
setup_admin(app)

# add the admin
setup_commands(app)

# Add all endpoints form the API with a "api" prefix
print(">>> Registrando blueprint API")
app.register_blueprint(api, url_prefix='/api')

# Handle/serialize errors like a JSON object


@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code

# generate sitemap with all your endpoints


@app.route('/')
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, 'index.html')

# any other endpoint will try to serve it like a static file


@app.route('/<path:path>', methods=['GET'])
def serve_any_other_file(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = 'index.html'
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0  # avoid cache memory
    return response


@app.route('/staff', methods=['GET'])
@role_required("ADMIN")
def staff():
    users = User.query.filter(User.role.in_(["ADMIN", "TEACHER"])).all()
    return jsonify([user.serialize() for user in users]), 200


@app.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()

    user = User.query.get(user_id)

    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    return jsonify(user.serialize()), 200 


def send_reset_email(to_email, reset_link, name=""):
    resend.Emails.send({
        "from": "Academica <onboarding@resend.dev>",
        "to": to_email,
        "subject": "Recuperar contraseña",
        "html": f"""
            <p>Hola {name},</p>
            <p>Solicitaste recuperar tu contraseña.</p>
            <p>
              <a href="{reset_link}">
                Click acá para resetearla
              </a>
            </p>
            <p>Este link expira en 15 minutos.</p>
        """
    })


@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    body = request.get_json()
    email = body.get("email")

    if not email:
        return jsonify({"msg": "Email requerido"}), 400

    user = User.query.filter_by(email=email).first()

    if user:
        reset_token = secrets.token_urlsafe(32)
        user.reset_token = reset_token
        user.reset_expires = datetime.utcnow() + timedelta(minutes=15)
        db.session.commit()

        frontend_url = os.getenv(
            "FRONTEND_URL",
            "http://localhost:3000"
        ).rstrip("/")

        reset_link = f"{frontend_url}/reset-password?token={reset_token}"

        try:
            send_reset_email(user.email, reset_link, user.name)
        except Exception as e:
            print("Error enviando email:", e)

    return jsonify({
        "msg": "Si el email existe, se enviará un link de recuperación"
    }), 200


@app.route('/reset-password', methods=['POST'])
def reset_password():
    body = request.get_json()
    token = body.get("token")
    new_password = body.get("password")

    if not token or not new_password:
        return jsonify({"msg": "Token y contraseña requeridos"}), 400

    user = User.query.filter_by(reset_token=token).first()

    if not user:
        return jsonify({"msg": "Token inválido"}), 400

    if user.reset_expires < datetime.utcnow():
        return jsonify({"msg": "Token expirado"}), 400

    user.password = generate_password_hash(new_password)
    user.reset_token = None
    user.reset_expires = None
    db.session.commit()

    return jsonify({
        "msg": "Contraseña actualizada correctamente"
    }), 200


# MOSTRAR LECTURAS


@app.route('/readings', methods=['GET'])
def get_all_readings():
    readings = Reading.query.all()
    readings_serialized = []
    for reading in readings:
        readings_serialized.append(reading.serialize())
    print("RESEND KEY:", os.getenv("RESEND_API_KEY"))
    return jsonify(readings_serialized)

# MOSTRAR LECTURA POR ID testeo


@app.route('/reading/individual/<int:reading_id>', methods=['GET'])
def get_reading_individual(reading_id):
    reading = Reading.query.get(reading_id)
    reading_serialized = reading.serialize()
    return jsonify(reading_serialized), 200

# MOSTRAR LECTURA POR ID CON AUTETICACION DE PROFESOR


@app.route('/reading/<int:reading_id>', methods=['GET'])
@jwt_required()
def get_reading(reading_id):

    reading = Reading.query.get(reading_id)

    if not reading:
        return jsonify({'msg': 'Lectura no encontrada'}), 404

    current_user_id = int(get_jwt_identity())

    if reading.teacher_id != current_user_id:
        return jsonify({'msg': 'No autorizado'}), 403

    return jsonify(reading.serialize()), 200

#mostrar tarea del profesor por id profesor

@app.route('/todo/<int:todo_id>', methods=['GET'])
@jwt_required()
def get_todo_id(todo_id):

    todo = Todo.query.get(todo_id)

    if not todo:
        return jsonify({'msg': 'Tarea no encontrada'}), 404

    current_user_id = int(get_jwt_identity())

    if todo.teacher_id != current_user_id:
        return jsonify({'msg': 'No autorizado'}), 403

    return jsonify(todo.serialize()), 200


# CREAR LECTURA NUEVO

@app.route('/readings/create', methods=["POST"])
@role_required("TEACHER", "ADMIN")
def create_reading_automatic():
    try:
        body = request.get_json(silent=True) or {}

        required = ["title", "description",
                    "group_id"]
        missing = [f for f in required if f not in body or body[f] in [None, ""]]
        if missing:
            return jsonify({"msg": f"Faltan campos obligatorios: {', '.join(missing)}"}), 400

        group = Group.query.get(int(body["group_id"]))
        if not group:
            return jsonify({"msg": f"No existe un grupo con group_id={body['group_id']}"}), 400

        teacher_id = int(get_jwt_identity())

        new_reading = Reading(
            title=body["title"],
            content=body["description"],
            reading_url=body.get("archive_url", ""),
            teacher_id=teacher_id,
            group_id=int(body["group_id"]),
        )

        db.session.add(new_reading)
        db.session.commit()
 
         


        for sg in group.students:

            student = sg.user

            if student.role != "STUDENT":
                continue
            
            send_email(
                student.email,
                "Nueva lectura asignada - ACADEMICA",
                f"""
                <div style="font-family: Arial, sans-serif; background:#f4f6fb; padding:20px;">
                <div style="max-width:600px; margin:auto; background:white; border-radius:14px; overflow:hidden; box-shadow:0 10px 22px rgba(0,0,0,0.08);">

                    <div style="background:#5B72EE; padding:18px 20px; text-align:center;">
                    <img src= "https://res.cloudinary.com/dxvdismgz/raw/upload/v1771243499/logofinal_1_hdpo88.png"
                        alt="ACADEMICA"
                        style="max-width:170px; height:auto; display:inline-block;" />
                    </div>

                    <div style="padding:24px 24px 10px;">
                    <h2 style="color:#252641; margin:0 0 10px; font-size:20px;">
                        Nueva lectura asignada 📚
                    </h2>

                    <p style="color:#444; margin:0 0 14px; line-height:1.5;">
                        Hola <strong>{student.name}</strong>, se te asignó una nueva lectura en <strong>ACADEMICA</strong>.
                    </p>

                    <div style="background:#eef6ff; border:1px solid rgba(37,38,65,0.10); padding:14px 14px; border-radius:12px; margin:12px 0;">
                        <p style="margin:0; color:#252641; line-height:1.7;">
                        <strong>Lectura:</strong> {new_reading.title}<br/>
                        <strong>Profesor:</strong> {new_reading.teacher.name}<br/>
                        <strong>Instrucciones:</strong> {new_reading.content}
                        </p>
                    </div>

                    <p style="color:#444; margin:12px 0 0; line-height:1.5;">
                        Ingresá a la plataforma para ver los detalles de la lectura.
                    </p>

                    <div style="margin-top:16px;">
                        <a href= {frontend_url}
                        style="display:inline-block; background:#49bbbd; color:white; padding:12px 16px; border-radius:10px; text-decoration:none; font-weight:700;">
                        Ir a ACADEMICA
                        </a>
                    </div>
                    </div>

                    <div style="padding:14px 24px 22px;">
                    <hr style="border:none; border-top:1px solid rgba(37,38,65,0.10); margin:16px 0;" />
                    <p style="margin:0; color:#666; font-size:13px; line-height:1.5;">
                        Saludos,<br/>
                        <strong>ACADEMICA</strong>
                    </p>
                    </div>

                </div>
                </div>
                """
            )
           

        

        return jsonify({
            "msg": "Lectura automática creada exitosamente",
            "reading_id": new_reading.id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "msg": "Error creando la lectura",
            "error": str(e)
        }), 500


# CREAR LECTURAS POR PROFESOR ANTIGUO


@app.route('/readings/create/antiguo', methods=['POST'])
def create_new_reading():
    body = request.get_json(silent=True)
    if body is None:
        return jsonify({'msg': 'Necesitas llenar el body'}), 400
    if 'title' not in body:
        return jsonify({'msg': 'Necesitas poner un titulo a la lectura'}), 400
    if 'content' not in body:
        return jsonify({'msg': 'Necesitas agregar contenido'}), 400
    if 'teacher_id' not in body:
        return jsonify({'msg': 'Necesitas agregar teacher_id'}), 400
    if 'group_id' not in body:
        return jsonify({'msg': 'Necesitas agregar group_id'}), 400
    new_reading = Reading()
    new_reading.title = body['title']
    new_reading.content = body['content']
    new_reading.reading_url = body.get('reading_url', '')
    new_reading.teacher_id = body['teacher_id']
    new_reading.group_id = body['group_id']
    db.session.add(new_reading)
    db.session.commit()

    send_email(
        "soportedeacademica@outlook.com",  # correo sandboxeado
        # subject o encabezado
        "¡Hola Estudiante de Academica!, tienes una nueva lectura asignada",

        # contenido html
        f""" 
        <h2>Nueva lectura asiganada por el profesor: {new_reading.teacher.name}</h2>    

        <p><strong>Título:</strong> {new_reading.title}</p>

        <p><strong>Contenido:</strong></p>
        <p>{new_reading.content}</p>

         <p><strong>Accede al portal y revisa tu lectura asignada</strong></p>


        """
    )

    return jsonify({'msg': f'lectura {new_reading.title} agregada'}), 200


# MODIFICAR LECTURA TESTEO

@app.route('/editreading/testeo/<int:reading_id>', methods=['PUT'])
def edit_reading_antiguo(reading_id):
    reading = Reading.query.get(reading_id)
    if reading is None:
        return jsonify({'msg': f'Lectura {reading_id} no encontrada'}), 404

    body = request.get_json(silent=True)
    if 'title' in body:
        reading.title = body['title']
    if 'content' in body:
        reading.content = body['content']
    db.session.commit()

    return jsonify({'msg': f'Lectura {reading.name} actualizada'}), 200

# MODIFICAR LECTURAS MEJORADO


@app.route('/editreading/<int:id>', methods=['PUT'])
@jwt_required()
def edit_reading(id):

    reading = Reading.query.get(id)
    if not reading:
        return jsonify({"msg": "Reading not found"}), 404

    data = request.get_json()

    reading.title = data.get("title", reading.title)
    reading.content = data.get("content", reading.content)
    reading.group_id = data.get("group_id", reading.group_id)

    reading.reading_url = data.get("reading_url")

    db.session.commit()

    return jsonify({"msg": "Reading updated"}), 200

#editar todo by vicenteagt

@app.route('/edittodo/<int:id>', methods=['PUT'])
@jwt_required()
def edit_todo(id):

    todo = Todo.query.get(id)
    if not todo:
        return jsonify({"msg": "Todo not found"}), 404

    data = request.get_json()

    todo.title = data.get("title", todo.title)
    todo.description = data.get("description", todo.description)
    todo.group_id = data.get("group_id", todo.group_id)

    todo.archive_url = data.get("archive_url")

    db.session.commit()

    return jsonify({"msg": "Todo updated"}), 200

#                   ENDPOINT PARA TRAER PROFESORES


@app.route("/admin/teachers", methods=["GET"])
@role_required("ADMIN")
def admin_get_teachers():
    try:
        teachers = User.query.filter_by(role="TEACHER").all()
        return jsonify({
            "teachers": [
                {
                    "id": u.id,
                    "name": u.name,
                    "email": u.email
                } for u in teachers
            ]
        }), 200
    except Exception as e:
        return jsonify({"msg": "Error obteniendo profesores", "error": str(e)}), 500

#                   ENDPOINT PARA TRAER ESTUDIANTES


@app.route("/admin/students", methods=["GET"])
@role_required("ADMIN")
def admin_get_students():
    try:
        students = User.query.filter_by(role="STUDENT").all()
        return jsonify({
            "students": [
                {"id": u.id, "name": u.name, "email": u.email}
                for u in students
            ]
        }), 200
    except Exception as e:
        return jsonify({"msg": "Error obteniendo alumnos", "error": str(e)}), 500


# ELIMINAR READING TEST


@app.route('/deletereading/test/<int:reading_id>', methods=['DELETE'])
def delete_reading_test(reading_id):
    reading = Reading.query.get(reading_id)
    if reading is None:
        return jsonify({'msg': f'Lectura {reading_id} no encontrada'}), 404

    db.session.delete(reading)
    db.session.commit()

    return jsonify(f'Se ha eliminado correctamente la lectura {reading.title} '), 200

# ELIMINAR READING CON AUTENTICACION


@app.route('/deletereading/<int:reading_id>', methods=['DELETE'])
@jwt_required()
def delete_reading(reading_id):

    reading = Reading.query.get(reading_id)

    if not reading:
        return jsonify({'msg': 'Lectura no encontrada'}), 404

    current_user_id = int(get_jwt_identity())

    if reading.teacher_id != current_user_id:
        return jsonify({'msg': 'No autorizado'}), 403

    db.session.delete(reading)
    db.session.commit()

    return jsonify({'msg': f'Lectura "{reading.title}" eliminada correctamente'}), 200

#ELIMINAR TAREA POR ID PROFESOR

@app.route('/deletetodo/<int:todo_id>', methods=['DELETE'])
@jwt_required()
def delete_todo_nuevo(todo_id):

    todo = Todo.query.get(todo_id)

    if not todo:
        return jsonify({'msg': 'Tarea no encontrada'}), 404

    current_user_id = int(get_jwt_identity())

    if todo.teacher_id != current_user_id:
        return jsonify({'msg': 'No autorizado'}), 403

    db.session.delete(todo)
    db.session.commit()

    return jsonify({'msg': f'Tarea "{todo.title}" eliminada correctamente'}), 200
# ENDPOINT READINGS BUSCAR LECTURA POR USER ID EN GRUPO PARA ESTUDIANTE


@app.route('/student/readings', methods=['GET'])
@jwt_required()
def get_student_readings():

    # para id desde el token
    student_id = get_jwt_identity()

    # filtrar id en grupos
    student_groups = Students_Group.query.filter(
        Students_Group.user_id == student_id
    ).all()

    if not student_groups:
        return jsonify("Usuario no encontrado"), 400

    # los ids de grupos
    group_ids = []
    for sg in student_groups:
        group_ids.append(sg.group_id)

    #  lecturas de ids de grupos
    readings = Reading.query.filter(
        Reading.group_id.in_(group_ids)
    ).all()

    readings_serialized = []
    for reading in readings:
        readings_serialized.append(reading.serialize())

    return jsonify(readings_serialized), 200

# ENDPOINT READINGS BUSCAR LECTURA POR USER ID PARA TEACHERS


@app.route('/teacher/readings', methods=['GET'])
@jwt_required()
def get_teacher_readings():

    # id del profesor desde el token
    teacher_id = get_jwt_identity()

    # traer lecturas creadas por ese profesor
    readings = Reading.query.filter(
        Reading.teacher_id == teacher_id
    ).all()

    readings_serialized = []
    for reading in readings:
        readings_serialized.append(reading.serialize())

    return jsonify(readings_serialized), 200


#ENDPOINTS TODO PARA HOMES
#HOME STUDENT TODO

@app.route('/student/todos/home', methods=['GET'])
@jwt_required()
def get_student_todos_home():

    # para id desde el token
    student_id = get_jwt_identity()

    # filtrar id en grupos
    student_groups = Students_Group.query.filter(
        Students_Group.user_id == student_id
    ).all()

    if not student_groups:
        return jsonify("Usuario no encontrado"), 400

    # los ids de grupos
    group_ids = []
    for sg in student_groups:
        group_ids.append(sg.group_id)

    #  lecturas de ids de grupos
    todos = Todo.query.filter(
        Todo.group_id.in_(group_ids)
    ).all()

    todos_serialized = []
    for todo in todos:
        todos_serialized.append(todo.serialize())

    return jsonify(todos_serialized), 200

#HOME TEACHER TODO POR ID DE PROFESOR
@app.route('/teacher/todos/home', methods=['GET'])
@jwt_required()
def get_teacher_todos_home():

    #id del profesor desde el token
    teacher_id = get_jwt_identity()

    #traer lecturas creadas por ese profesor
    todos = Todo.query.filter(
        Todo.teacher_id == teacher_id
    ).all()

    todos_serialized = []
    for todo in todos:
        todos_serialized.append(todo.serialize())

    return jsonify(todos_serialized), 200



#                  ENDPOINT REGISTER


@app.route("/register", methods=["POST"])
def register():
    try:
        body = request.get_json(silent=True)

        if not body:
            return jsonify({"msg": "Debes enviar información en el body"}), 400

        required_fields = ["email", "password", "name"]
        for field in required_fields:
            if field not in body or not body[field]:
                return jsonify({"msg": f"El campo {field} es obligatorio"}), 400

        if User.query.filter_by(email=body["email"]).first():
            return jsonify({"msg": "Este email ya está en uso"}), 409

        hashed_password = generate_password_hash(body["password"])

        new_user = User(
            email=body["email"],
            password=hashed_password,
            name=body["name"],
            role="STUDENT",
            is_active=True
        )

        db.session.add(new_user)
        db.session.commit()

        access_token = create_access_token(
            identity=new_user.id,
            additional_claims={"role": new_user.role}
        )

        return jsonify({
            "msg": "Estudiante registrado correctamente",
            "access_token": access_token,
            "role": new_user.role,
            "user": {
                "id": new_user.id,
                "email": new_user.email,
                "name": new_user.name
            }
        }), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({"msg": "Error de integridad en la base de datos"}), 409

    except Exception as e:
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


#             ENDPOINT LOGIN


@app.route("/login", methods=["POST"])
def login():
    try:
        body = request.get_json(silent=True)

        if body is None:
            return jsonify({'msg': 'Debes enviar información en el body'}), 400

        if 'email' not in body or 'password' not in body:
            return jsonify({'msg': 'Email y password son obligatorios'}), 400

        user = User.query.filter_by(email=body['email']).first()

        if not user or not check_password_hash(user.password, body['password']):
            return jsonify({'msg': 'Credenciales incorrectas'}), 401

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role}
        )

        return jsonify({
            "access_token": access_token,
            "role": user.role,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email
            }
        }), 200

    except Exception as e:
        return jsonify({
            'msg': 'Error interno del servidor',
            'error': str(e)
        }), 500

#             ENDPOINTS GROUP


@app.route("/groups", methods=["POST"])
@role_required("ADMIN")
def create_group():
    try:
        body = request.get_json(silent=True) or {}

        if "name" not in body or "teacher_id" not in body:
            return jsonify({"msg": "Faltan datos obligatorios: name, teacher_id"}), 400

        name = str(body["name"]).strip()
        if not name:
            return jsonify({"msg": "El campo name no puede estar vacío"}), 400

        description = body.get("description")
        if description is None or str(description).strip() == "":
            description = "Sin descripción"

        try:
            teacher_id = int(body["teacher_id"])
        except (TypeError, ValueError):
            return jsonify({"msg": "teacher_id inválido"}), 400

        teacher = User.query.get(teacher_id)
        if not teacher or teacher.role != "TEACHER":
            return jsonify({"msg": f"teacher_id inválido: {teacher_id}"}), 400

        admin_id = int(get_jwt_identity())

        group = Group(
            name=name,
            description=description,
            admin_id=admin_id,
            teacher_id=teacher_id
        )

        db.session.add(group)
        db.session.commit()

        return jsonify({"msg": "Grupo creado", "group_id": group.id}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error creando grupo", "error": str(e)}), 500


@app.route("/groups", methods=["GET"])
@role_required("ADMIN", "TEACHER")
def get_groups():
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get("role")

    if role == "ADMIN":
        groups = Group.query.filter_by(admin_id=user_id).all()
    else:
        groups = Group.query.filter_by(teacher_id=user_id).all()

    return jsonify([
        {
            "id": g.id,
            "name": g.name,
            "description": g.description
        } for g in groups
    ]), 200


@app.route("/groups/<int:group_id>", methods=["GET"])
@role_required("ADMIN", "TEACHER")
def get_group(group_id):
    try:
        group = Group.query.get(group_id)

        if not group:
            return jsonify({"msg": "Grupo no encontrado"}), 404

        return jsonify({
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "teacher_id": int(group.teacher_id) if group.teacher_id is not None else None
        }), 200

    except Exception as e:
        return jsonify({"msg": "Error obteniendo grupo", "error": str(e)}), 500


@app.route("/groups/<int:group_id>/teacher", methods=["POST"])
@role_required("ADMIN")
def assign_teacher(group_id):
    try:
        body = request.get_json(silent=True) or {}

        if "teacher_id" not in body:
            return jsonify({"msg": "teacher_id requerido"}), 400

        try:
            teacher_id = int(body["teacher_id"])
        except (TypeError, ValueError):
            return jsonify({"msg": "teacher_id inválido"}), 400

        group = Group.query.get(group_id)
        if not group:
            return jsonify({"msg": "Grupo no encontrado"}), 404

        teacher = User.query.get(teacher_id)
        if not teacher or teacher.role != "TEACHER":
            return jsonify({"msg": f"teacher_id inválido: {teacher_id}"}), 400

        group.teacher_id = teacher_id
        db.session.commit()

        return jsonify({"msg": "Profesor asignado", "group_id": group.id, "teacher_id": teacher_id}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error asignando profesor", "error": str(e)}), 500


@app.route("/groups/<int:group_id>/students", methods=["POST"])
@role_required("ADMIN")
def add_student_to_group(group_id):
    try:
        body = request.get_json(silent=True) or {}

        if "user_id" not in body:
            return jsonify({"msg": "user_id es requerido"}), 400

        try:
            user_id = int(body["user_id"])
        except (TypeError, ValueError):
            return jsonify({"msg": f"user_id inválido: {body.get('user_id')}"}), 400

        group = Group.query.get(group_id)
        if not group:
            return jsonify({"msg": "Grupo no encontrado"}), 404

        user = User.query.get(user_id)
        if not user or str(user.role).upper() != "STUDENT":
            return jsonify({"msg": "Usuario no válido"}), 400

        exists = Students_Group.query.filter_by(
            user_id=user.id,
            group_id=group_id
        ).first()

        if exists:
            return jsonify({"msg": "El estudiante ya está en el grupo"}), 409

        student_group = Students_Group(user_id=user.id, group_id=group_id)

        db.session.add(student_group)
        db.session.commit()

        return jsonify({
            
            "msg": "Estudiante agregado al grupo",
            "group_id": group_id,
            "user_id": user.id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error agregando estudiante al grupo", "error": str(e)}), 500


@app.route("/groups/<int:group_id>/students", methods=["GET"])
@role_required("TEACHER", "ADMIN")
def get_group_students(group_id):
    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Grupo no encontrado"}), 404

    students = []
    for sg in getattr(group, "students", []):
        if not getattr(sg, "user", None):
            continue

        students.append({
            "student_group_id": sg.id,  # agregado
            "user_id": sg.user.id,
            "name": sg.user.name,
            "email": sg.user.email
        })

    return jsonify(students), 200


@app.route("/groups/<int:group_id>/students/<int:user_id>", methods=["DELETE"])
@role_required("ADMIN")
def remove_student_from_group(group_id, user_id):
    try:
        student_group = Students_Group.query.filter_by(
            group_id=group_id,
            user_id=user_id
        ).first()

        if not student_group:
            return jsonify({"msg": "Relación no encontrada"}), 404

        db.session.delete(student_group)
        db.session.commit()

        return jsonify({
            "msg": "Estudiante removido del grupo",
            "group_id": group_id,
            "student_id": user_id
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error removiendo estudiante", "error": str(e)}), 500


@app.route("/my-groups", methods=["GET"])
@jwt_required()
@role_required("STUDENT")
def get_my_groups():
    current_user = get_jwt_identity()

    relations = Students_Group.query.filter_by(
        user_id=current_user["id"]
    ).all()

    result = []
    for sg in relations:
        result.append({
            "group_id": sg.group.id,
            "group_name": sg.group.name,
            "description": sg.group.description
        })

    return jsonify(result), 200


# STUDENTS_GROUP GET


@app.route("/my-student-group", methods=["GET"])
@jwt_required()
def my_student_group():
    user_id = get_jwt_identity()

    sg = Students_Group.query.filter_by(user_id=user_id).first()
    if not sg:
        return jsonify({"msg": "Este usuario no tiene grupo"}), 404

    return jsonify(sg.serialize()), 200


# SUBMISION POST SUBE TAREA DE UN ESTUDIANTE CON ID
@app.route("/submission", methods=["POST"])
def submission():
    try:
        body = request.get_json(silent=True)
        if body is None:
            return jsonify({'msg': 'Debes enviar información en el body'}), 400

        todo_id = body.get("todo_id")
        student_id = body.get("student_id")
        description = body.get("description")
        response_url = body.get("response_url")

        if todo_id is None or student_id is None:
            return jsonify({"msg": "todo_id y student_id son obligatorios"}), 400

        if not description and not response_url:
            return jsonify({"msg": "Debes enviar description o response_url"}), 400

        todo = Todo.query.get(todo_id)
        if not todo:
            return jsonify({"msg": "La tarea no existe"}), 404

        sg = Students_Group.query.get(student_id)
        if not sg:
            return jsonify({"msg": "Student_Group no existe"}), 404


        if not sg.user or sg.user.role.lower() != "student":
            return jsonify({"msg": "Solo un alumno puede crear una entrega"}), 403
        
        new_submission = Submission(
            description=description,
            response_url=response_url,
            todo_id=todo_id,
            student_id=student_id
        )

        db.session.add(new_submission)
        db.session.commit()

        return jsonify({
            "msg": "Entrega creada",
            "submission": new_submission.serialize()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error interno del servidor", "error": str(e)}), 500
        


# SUBMISION PUT EDITA TAREA SUBIDA POR UN ESTUDIANTE CON ID


@app.route("/submission/<int:submission_id>", methods=["PUT"])
def update_submission(submission_id):
    try:
        body = request.get_json(silent=True) or {}

        description = body.get("description")
        response_url = body.get("response_url")

        if description is None and response_url is None:
            return jsonify({"msg": "No hay nada que actualizar"}), 400

        student_group_id = body.get("student_id")  # Este es ID de Students_Group

        if student_group_id is None:
            return jsonify({"msg": "student_id es obligatorio"}), 400

        
        student_group = Students_Group.query.get(student_group_id)
        if not student_group:
            return jsonify({"msg": "Student_Group no existe"}), 404


        user = student_group.user
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404

       
        if user.role.lower() != "student":
            return jsonify({"msg": "Solo un alumno puede modificar una entrega"}), 403

        
        submission = Submission.query.get(submission_id)
        if not submission:
            return jsonify({"msg": "No existe la entrega"}), 404

       
        if submission.student_id != student_group_id:
            return jsonify({"msg": "No autorizado para modificar esta entrega"}), 403

       
        if description is not None:
            submission.description = description
        if response_url is not None:
            submission.response_url = response_url

     
        status = Status.query.filter_by(submission_id=submission_id).first()
        
        if status and status.state == 'REJECTED':
            status.state = 'PENDING'
            status.feedback = ''  
            db.session.add(status)

        db.session.commit()

        return jsonify({
            "msg": "Entrega actualizada",
            "submission": {
                "id": submission.id,
                "description": submission.description,
                "response_url": submission.response_url,
                "todo_id": submission.todo_id,
                "student_id": submission.student_id
            },
            "status_reset": bool(status and status.state == 'PENDING')
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error interno del servidor", "error": str(e)}), 500


# SUBMISION DELETE TAREA SUBIDA POR UN ESTUDIANTE CON ID
@app.route("/submission/<int:submission_id>", methods=["DELETE"])
def delete_submission(submission_id):
    try:
        body = request.get_json(silent=True) or {}
        student_id = body.get("student_id")

        if student_id is None:
            return jsonify({"msg": "student_id es obligatorio"}), 400

        user = User.query.get(student_id)
        if not user:
            return jsonify({"msg": "Usuario no existe"}), 404

        if user.role.lower() != "student":
            return jsonify({"msg": "Solo un alumno puede eliminar una entrega"}), 403

        submission = Submission.query.get(submission_id)
        if not submission:
            return jsonify({"msg": "No existe la entrega"}), 404

        if submission.student_id != student_id:
            return jsonify({"msg": "No autorizado para Eliminar esta entrega"}), 403

        db.session.delete(submission)
        db.session.commit()

        return jsonify({
            "msg": "Entrega borrada",
            "submission": {
                "id": submission.id,
                "todo_id": submission.todo_id,
                "student_id": submission.student_id,
                "description": submission.description,
                "response_url": submission.response_url

            }

        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error interno del servidor", "error": str(e)}), 500

# SUBMISION GET TAREA SUBIDA POR UN ESTUDIANTE CON ID


@app.route("/submission/<int:submission_id>", methods=["GET"])
def get_submission(submission_id):

    try:

        submission = Submission.query.get(submission_id)

        if not submission:
            return jsonify({"msg": "No existe la entrega"}), 404

        return jsonify({
            "msg": "Vista de entrega",
            "submission": {
                "id": submission.id,
                "todo_id": submission.todo_id,
                "student_id": submission.student_id,
                "description": submission.description,
                "response_url": submission.response_url

            }

        }), 200

    except Exception as e:

        return jsonify({"msg": "Error interno del servidor", "error": str(e)}), 500


# SUBMISION GET LISTA DE TAREAS SUBIDA POR ESTUDIANTES
@app.route("/submissions", methods=["GET"])
def get_submissions():
    try:
        student_id = request.args.get("student_id")
        todo_id = request.args.get("todo_id")

        query = Submission.query
        if student_id is not None:
            query = query.filter_by(student_id=student_id)
        if todo_id is not None:
            query = query.filter_by(todo_id=todo_id)

        submissions = query.all()

        return jsonify({
            "msg": "Listado de entrega",
            "submissions": [s.serialize() for s in submissions]
        }), 200

    except Exception as e:
        return jsonify({"msg": "Error interno del servidor", "error": str(e)}), 500


@app.route('/register-staff', methods=['POST'])
def register_staff():
    body = request.get_json()

    name = body.get("name")
    email = body.get("email")
    password = body.get("password")
    role = body.get("role")

    if not name or not email or not password or not role:
        return jsonify({"msg": "Datos incompletos"}), 400

    hashed_password = generate_password_hash(password)

    new_user = User(
        name=name,
        email=email,
        password=hashed_password,
        role=role
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "msg": "Staff creado correctamente",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role
        }
    }), 201


@app.route('/todos', methods=['GET'])
def get_todos():
    todos = Todo.query.all()
    todos_list = []
    for todo in todos:
        todos_list.append({
            'id': todo.id,
            'title': todo.title,
            'description': todo.description,
            'due_date': todo.due_date.isoformat(),
            'teacher_id': todo.teacher_id,
            'group_id': todo.group_id,
            'student_id': todo.student_id
        })
    return jsonify(todos_list), 200


@app.route('/todos/<int:todo_id>', methods=['GET'])
def get_todo_by_id(todo_id):
    todo = Todo.query.get(todo_id)
    if not todo:
        return jsonify({"msg": "Tarea no encontrada"}), 404
    todo_data = {
        'id': todo.id,
        'title': todo.title,
        'description': todo.description,
        'due_date': todo.due_date.isoformat(),
        'teacher_id': todo.teacher_id,
        'group_id': todo.group_id,
        'archive_url': todo.archive_url
    }
    return jsonify(todo_data), 200


@app.route('/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    todo = Todo.query.get(todo_id)

    if not todo:
        return jsonify({"msg": "Tarea no encontrada"}), 404

    body = request.get_json(silent=True)

    if body is None:
        return jsonify({"msg": "Complete los campos requeridos"}), 400

    if 'title' in body:
        todo.title = body['title']
    if 'description' in body:
        todo.description = body['description']
    if 'due_date' in body and body['due_date']:
        try:
            todo.due_date = datetime.strptime(
                body['due_date'], "%Y-%m-%d"
            ).date()
        except ValueError:
            return jsonify({"msg": "Formato de fecha inválido. Use YYYY-MM-DD"}), 400
    if 'archive_url' in body:
        todo.archive_url = body['archive_url']
    if 'group_id' in body:
        todo.group_id = body['group_id']

    db.session.commit()

    return jsonify({
        "msg": "Cambios aplicados a la tarea",
        "todo": todo.serialize()
    }), 200


@app.route('/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    todo = Todo.query.get(todo_id)
    if not todo:
        return jsonify({"msg": "tarea no encontrada"}), 404
    db.session.delete(todo)
    db.session.commit()
    return jsonify({"msg": "tarea eliminada exitosamente"}), 200


# GET POINT STATUS TRAER ID DESDE SUBMISSION

@app.route('/submissions/<int:submission_id>/status', methods=['GET'])
def get_status_by_submission(submission_id):
    status = Status.query.filter_by(submission_id=submission_id).first()
    if not status:
        return jsonify({"msg": "No hay calificación disponible"}), 404
    return jsonify({
        "id": status.id,
        "submission_id": status.submission_id,
        "state": status.state,
        "feedback": status.feedback
    }), 200


@app.route('/statuses', methods=['GET'])
def get_statuses():
    statuses = Status.query.all()
    statuses_list = []
    for status in statuses:
        statuses_list.append({
            'id': status.id,
            'name': status.name,
            'state': status.state,
            'feedback': status.feedback
        })
    return jsonify(statuses_list), 200


@app.route('/statuses/<int:status_id>', methods=['GET'])
def get_status_by_id(status_id):
    status = Status.query.get(status_id)
    if not status:
        return jsonify({"msg": "No hay calificación disponible"}), 404
    status_data = {
        'id': status.id,
        'name': status.name,
        'state': status.state,
        'feedback': status.feedback
    }
    return jsonify(status_data), 200


@app.route('/statuses/<int:status_id>', methods=['PUT'])
@jwt_required()
@role_required("TEACHER", "ADMIN")
def update_status(status_id):
    status = Status.query.get(status_id)
    if not status:
        return jsonify({"msg": "No hay calificación disponible"}), 404

    body = request.get_json(silent=True) or {}

    if "state" in body:
        status.state = str(body["state"]).upper()
    if "feedback" in body:
        status.feedback = body["feedback"]

    status.teacher_id = int(get_jwt_identity())

    db.session.commit()
    return jsonify({"msg": "Calificación actualizada", "status": status.serialize()}), 200


@app.route('/statuses', methods=['POST'])
@jwt_required()
@role_required("TEACHER", "ADMIN")
def create_status():
    body = request.get_json(silent=True) or {}

    if "submission_id" not in body:
        return jsonify({"msg": "submission_id requerido"}), 400
    if "state" not in body:
        return jsonify({"msg": "state requerido"}), 400

    existing = Status.query.filter_by(
        submission_id=body["submission_id"]).first()
    if existing:
        return jsonify({"msg": "Ya existe una calificación para esta entrega", "status_id": existing.id}), 409

    new_status = Status(
        submission_id=int(body["submission_id"]),
        state=str(body["state"]).upper(),
        feedback=body.get("feedback", ""),
        teacher_id=int(get_jwt_identity())
    )

    db.session.add(new_status)
    db.session.commit()

    return jsonify({"msg": "Calificación creada", "status": new_status.serialize()}), 201


#         API CALENDARIO DE GOOGLE


@app.route("/google/ping", methods=["GET"])
def google_ping():
    return jsonify({"msg": "Google Calendar listo"}), 200


@app.route("/google/events", methods=["POST"])
def create_google_event():
    try:
        body = request.get_json(silent=True) or {}

        title = body.get("title")
        due_date = body.get("due_date")
        description = body.get("description", "")
        calendar_id = body.get("calendar_id", "primary")

        emails = body.get("emails", [])

        if not title or not due_date:
            return jsonify({"msg": "Campos 'title' y 'due_date' son obligatorios"}), 400

        if emails and (not isinstance(emails, list) or not all(isinstance(e, str) for e in emails)):
            return jsonify({"msg": "El campo 'emails' debe ser una lista de strings"}), 400

        service = get_calendar_service()

        event_body = {
            "summary": title,
            "description": description,
            "start": {
                "dateTime": due_date,
                "timeZone": "America/Montevideo"
            },
            "end": {
                "dateTime": due_date,
                "timeZone": "America/Montevideo"
            }
        }

        if emails:
            event_body["attendees"] = [{"email": e} for e in emails]

        created_event = service.events().insert(
            calendarId=calendar_id,
            body=event_body,
            sendUpdates="all"
        ).execute()

        return jsonify({
            "msg": "Evento creado en Google Calendar",
            "google_event_id": created_event.get("id"),
            "htmlLink": created_event.get("htmlLink"),
            "attendees": [a.get("email") for a in created_event.get("attendees", [])]
        }), 201

    except Exception as e:
        return jsonify({"msg": "Error creando evento", "error": str(e)}), 500


@app.route("/google/events/<int:event_id>/invite", methods=["POST"])
@role_required("TEACHER", "ADMIN")
def invite_users_to_event(event_id):
    body = request.get_json(silent=True)
    if not body or "emails" not in body:
        return jsonify({"msg": "Debe enviar una lista de emails para invitar"}), 400

    invited_emails = body["emails"]
    return jsonify({"msg": f"Invitaciones enviadas a {len(invited_emails)} usuarios", "emails": invited_emails}), 200


@app.route("/todos-creation", methods=["POST"])
@role_required("TEACHER", "ADMIN")
def create_todo_automatic():
    try:
        body = request.get_json(silent=True) or {}

        required = ["title", "description",
                    "due_date", "group_id", "student_id"]
        missing = [f for f in required if f not in body or body[f] in [None, ""]]
        if missing:
            return jsonify({"msg": f"Faltan campos obligatorios: {', '.join(missing)}"}), 400

        group = Group.query.get(int(body["group_id"]))
        if not group:
            return jsonify({"msg": f"No existe un grupo con group_id={body['group_id']}"}), 400

        student = User.query.get(int(body["student_id"]))
        if not student or student.role != "STUDENT":
            return jsonify({"msg": f"student_id inválido: {body['student_id']}"}), 400

        teacher_id = int(get_jwt_identity())

        try:
            due_date = datetime.fromisoformat(
                str(body["due_date"]).replace("Z", "+00:00"))
        except Exception:
            return jsonify({"msg": "due_date debe ser ISO. Ej: 2026-02-10T23:59:00-03:00 (o con Z)"}), 400

        new_todo = Todo(
            title=body["title"],
            description=body["description"],
            archive_url=body.get("archive_url", ""),
            due_date=due_date,
            teacher_id=teacher_id,
            group_id=int(body["group_id"]),
            student_id=int(body["student_id"])
        )

        db.session.add(new_todo)
        db.session.commit()

        return jsonify({
            "msg": "Tarea automática creada exitosamente",
            "todo_id": new_todo.id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "msg": "Error creando la tarea",
            "error": str(e)
        }), 500

#             Crear un evento en el calendario


@app.route("/google/create-event", methods=["POST"])
@jwt_required()
def google_create_event():
    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials
    import datetim

    body = request.get_json(silent=True)
    if not body or 'summary' not in body or 'start' not in body or 'end' not in body:
        return jsonify({"msg": "Campos obligatorios: summary, start, end"}), 400

    creds = Credentials(
        token=os.getenv("GOOGLE_ACCESS_TOKEN"),
        refresh_token=os.getenv("GOOGLE_REFRESH_TOKEN"),
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        token_uri="https://oauth2.googleapis.com/token"
    )

    service = build("calendar", "v3", credentials=creds)

    event = {
        "summary": body["summary"],
        "description": body.get("description", ""),
        "start": {"dateTime": body["start"], "timeZone": "UTC"},
        "end": {"dateTime": body["end"], "timeZone": "UTC"},
        "attendees": [{"email": e} for e in body.get("attendees", [])],
    }

    created_event = service.events().insert(
        calendarId="primary", body=event).execute()
    return jsonify({"msg": "Evento creado", "event": created_event}), 201

#                Crear un evento en el calendario


@app.route("/google/list-events", methods=["GET"])
@jwt_required()
def google_list_events():
    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials
    import datetime

    creds = Credentials(
        token=os.getenv("GOOGLE_ACCESS_TOKEN"),
        refresh_token=os.getenv("GOOGLE_REFRESH_TOKEN"),
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        token_uri="https://oauth2.googleapis.com/token"
    )

    service = build("calendar", "v3", credentials=creds)

    now = datetime.datetime.utcnow().isoformat() + "Z"
    events_result = service.events().list(calendarId="primary", timeMin=now,
                                          maxResults=10, singleEvents=True,
                                          orderBy='startTime').execute()
    events = events_result.get('items', [])

    return jsonify({"events": events}), 200

    #              Actualizar un evento existente


@app.route("/google/update-event/<event_id>", methods=["PUT"])
@jwt_required()
def google_update_event(event_id):
    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials

    body = request.get_json(silent=True)
    if not body:
        return jsonify({"msg": "Cuerpo vacío"}), 400

    creds = Credentials(
        token=os.getenv("GOOGLE_ACCESS_TOKEN"),
        refresh_token=os.getenv("GOOGLE_REFRESH_TOKEN"),
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        token_uri="https://oauth2.googleapis.com/token"
    )

    service = build("calendar", "v3", credentials=creds)
    event = service.events().get(calendarId="primary", eventId=event_id).execute()

    for key in ["summary", "description", "start", "end", "attendees"]:
        if key in body:
            if key in ["start", "end"]:
                event[key] = {"dateTime": body[key], "timeZone": "UTC"}
            elif key == "attendees":
                event[key] = [{"email": e} for e in body[key]]
            else:
                event[key] = body[key]

    updated_event = service.events().update(
        calendarId="primary", eventId=event_id, body=event).execute()
    return jsonify({"msg": "Evento actualizado", "event": updated_event}), 200

#                Eliminar un evento


@app.route("/google/delete-event/<event_id>", methods=["DELETE"])
@jwt_required()
def google_delete_event(event_id):
    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials

    creds = Credentials(
        token=os.getenv("GOOGLE_ACCESS_TOKEN"),
        refresh_token=os.getenv("GOOGLE_REFRESH_TOKEN"),
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        token_uri="https://oauth2.googleapis.com/token"
    )

    service = build("calendar", "v3", credentials=creds)
    service.events().delete(calendarId="primary", eventId=event_id).execute()
    return jsonify({"msg": "Evento eliminado"}), 200

#                Login de google


@app.route("/google/login")
def google_login():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return jsonify({"msg": "Faltan GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET en el .env"}), 500

    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    if not redirect_uri:
        return jsonify({"msg": "Falta GOOGLE_REDIRECT_URI en el .env"}), 500

    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "redirect_uris": [redirect_uri],
        }
    }

    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )

    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent"
    )

    session["state"] = state
    return redirect(authorization_url)

#                callback google


@app.route("/google/callback")
def google_callback():
    state = session.get("state")

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        state=state,
        redirect_uri=os.getenv("GOOGLE_REDIRECT_URI"),
    )

    flow.fetch_token(authorization_response=request.url)
    credentials = flow.credentials

    os.makedirs("google_credentials", exist_ok=True)
    with open("google_credentials/token.json", "w") as token:
        token.write(credentials.to_json())

    return jsonify({"msg": "Google Calendar conectado correctamente"}), 200


@app.route("/google/calendars", methods=["GET"])
def google_calendars():
    try:
        service = get_calendar_service()
        calendars = service.calendarList().list().execute()

        return jsonify({
            "msg": "Calendarios obtenidos correctamente",
            "calendars": calendars.get("items", [])
        }), 200

    except Exception as e:
        return jsonify({
            "msg": "Error obteniendo calendarios",
            "error": str(e)
        }), 500


@app.route("/google/events", methods=["GET"])
def list_google_events():
    try:
        service = get_calendar_service()

        calendar_id = request.args.get("calendar_id", "primary")
        max_results = int(request.args.get("maxResults", 10))

        now = datetime.now(timezone.utc).isoformat()

        events_result = service.events().list(
            calendarId=calendar_id,
            timeMin=now,
            maxResults=max_results,
            singleEvents=True,
            orderBy="startTime"
        ).execute()

        events = events_result.get("items", [])

        simplified = []
        for e in events:
            simplified.append({
                "id": e.get("id"),
                "summary": e.get("summary"),
                "htmlLink": e.get("htmlLink"),
                "start": (e.get("start") or {}).get("dateTime") or (e.get("start") or {}).get("date"),
                "end": (e.get("end") or {}).get("dateTime") or (e.get("end") or {}).get("date"),
                "attendees": [a.get("email") for a in e.get("attendees", [])] if e.get("attendees") else []
            })

        return jsonify({
            "msg": "Eventos obtenidos correctamente",
            "count": len(simplified),
            "events": simplified
        }), 200

    except Exception as e:
        return jsonify({"msg": "Error listando eventos", "error": str(e)}), 500


@app.route("/google/events/<event_id>", methods=["DELETE"])
def delete_google_event(event_id):
    try:
        service = get_calendar_service()

        calendar_id = request.args.get("calendar_id", "primary")

        service.events().delete(
            calendarId=calendar_id,
            eventId=event_id,
            sendUpdates="all"
        ).execute()

        return jsonify({
            "msg": "Evento eliminado correctamente",
            "deleted_event_id": event_id
        }), 200

    except Exception as e:
        return jsonify({
            "msg": "Error eliminando evento",
            "error": str(e)
        }), 500


@app.route("/google/events/<event_id>", methods=["PUT"])
def update_google_event(event_id):
    try:
        body = request.get_json(silent=True) or {}
        if not body:
            return jsonify({"msg": "Debe enviar campos para actualizar"}), 400

        service = get_calendar_service()
        calendar_id = body.get("calendar_id", "primary")

        event = service.events().get(calendarId=calendar_id, eventId=event_id).execute()

        if "title" in body:
            event["summary"] = body["title"]
        if "description" in body:
            event["description"] = body["description"]

        if "due_date" in body:
            tz = body.get("timeZone", "America/Montevideo")
            event["start"] = {"dateTime": body["due_date"], "timeZone": tz}
            event["end"] = {"dateTime": body["due_date"], "timeZone": tz}

        if "attendees" in body:
            event["attendees"] = [{"email": e} for e in body["attendees"]]

        updated = service.events().update(
            calendarId=calendar_id,
            eventId=event_id,
            body=event,
            sendUpdates="all"
        ).execute()

        return jsonify({
            "msg": "Evento actualizado correctamente",
            "google_event_id": updated.get("id"),
            "htmlLink": updated.get("htmlLink"),
            "updated_summary": updated.get("summary"),
        }), 200

    except Exception as e:
        return jsonify({
            "msg": "Error actualizando evento",
            "error": str(e)
        }), 500


@app.route("/teacher/todos", methods=["POST"])
@role_required("TEACHER", "ADMIN")
def create_todo_with_google_event():
    try:
        body = request.get_json(silent=True) or {}

        title = body.get("title")
        description = body.get("description", "")
        due_date_str = body.get("due_date")
        group_id = body.get("group_id")
        archive_url = body.get("archive_url")

        if not title or not due_date_str or not group_id:
            return jsonify({"msg": "Campos obligatorios: title, due_date, group_id"}), 400

        try:
            due_date_str_fixed = due_date_str.replace("Z", "+00:00")
            dt_start = datetime.fromisoformat(due_date_str_fixed)

            if dt_start.tzinfo is None:
                dt_start = dt_start.replace(
                    tzinfo=timezone(timedelta(hours=-3)))
        except Exception:
            return jsonify({
                "msg": "due_date debe ser ISO. Ej: 2026-02-10T23:59:00-03:00 (o con Z)"
            }), 400

        dt_end = dt_start + timedelta(minutes=30)

        teacher_id = int(get_jwt_identity())

        group = Group.query.get(int(group_id))
        if not group:
            return jsonify({"msg": f"No existe un grupo con group_id={group_id}"}), 400

        students_rel = getattr(group, "students", None) or []
        if not students_rel:
            return jsonify({
                "msg": f"El grupo {group_id} no tiene estudiantes. Agregá alumnos antes."
            }), 400

        attendees_emails = []
        student_group_ids = []
        student_user_ids = []

        for rel in students_rel:
            user = getattr(rel, "user", None)
            if not user or not getattr(user, "email", None):
                continue

            attendees_emails.append(user.email)
            student_group_ids.append(rel.id)
            student_user_ids.append(user.id)

        if not student_group_ids:
            return jsonify({"msg": "No se encontraron estudiantes válidos con email en el grupo."}), 400

        service = get_calendar_service()
        google_event_body = {
            "summary": title,
            "description": description,
            "start": {"dateTime": dt_start.isoformat(), "timeZone": "America/Montevideo"},
            "end": {"dateTime": dt_end.isoformat(), "timeZone": "America/Montevideo"},
            "attendees": [{"email": e} for e in attendees_emails],
        }

        created_event = service.events().insert(
            calendarId="primary",
            body=google_event_body,
            sendUpdates="all"
        ).execute()

        due_date_db = dt_start.date()

        created_todos = []
        for sgid in student_group_ids:
            new_todo = Todo(
                title=title,
                description=description,
                archive_url=archive_url,
                due_date=due_date_db,
                teacher_id=teacher_id,
                group_id=int(group_id),
                student_id=int(sgid)
            )
            db.session.add(new_todo)
            created_todos.append(new_todo)

            db.session.commit()

            for sg in group.students:

                student = sg.user

                if student.role != "STUDENT":
                    continue
                
                send_email(
                    student.email,
                    "Nueva tarea asignada - ACADEMICA",
                    f"""
                    <div style="font-family: Arial, sans-serif; background:#f4f6fb; padding:20px;">
                    <div style="max-width:600px; margin:auto; background:white; border-radius:14px; overflow:hidden; box-shadow:0 10px 22px rgba(0,0,0,0.08);">

                        <div style="background:#5B72EE; padding:18px 20px; text-align:center;">
                        <img src="https://res.cloudinary.com/dxvdismgz/raw/upload/v1771243499/logofinal_1_hdpo88.png"
                            alt="ACADEMICA"
                            style="max-width:170px; height:auto; display:inline-block;" />
                        </div>

                        <div style="padding:24px 24px 10px;">
                        <h2 style="color:#252641; margin:0 0 10px; font-size:20px;">
                            Nueva tarea asignada 📚
                        </h2>

                        <p style="color:#444; margin:0 0 14px; line-height:1.5;">
                            Hola <strong>{student.name}</strong>, se te asignó una nueva tarea en <strong>ACADEMICA</strong>.
                        </p>

                        <div style="background:#eef6ff; border:1px solid rgba(37,38,65,0.10); padding:14px 14px; border-radius:12px; margin:12px 0;">
                            <p style="margin:0; color:#252641; line-height:1.7;">
                            <strong>Lectura:</strong> {new_todo.title}<br/>
                            <strong>Profesor:</strong> {new_todo.teacher.name}<br/>
                            <strong>Fecha de entrega:</strong> {new_todo.due_date}<br/>
                            <strong>Instrucciones:</strong> {new_todo.description}
                            </p>
                        </div>

                        <p style="color:#444; margin:12px 0 0; line-height:1.5;">
                            Ingresá a la plataforma para ver los detalles de la tarea y hacer su entrega.
                        </p>

                        <div style="margin-top:16px;">
                            <a href= {frontend_url}
                            style="display:inline-block; background:#49bbbd; color:white; padding:12px 16px; border-radius:10px; text-decoration:none; font-weight:700;">
                            Ir a ACADEMICA
                            </a>
                        </div>
                        </div>

                        <div style="padding:14px 24px 22px;">
                        <hr style="border:none; border-top:1px solid rgba(37,38,65,0.10); margin:16px 0;" />
                        <p style="margin:0; color:#666; font-size:13px; line-height:1.5;">
                            Saludos,<br/>
                            <strong>ACADEMICA</strong>
                        </p>
                        </div>

                    </div>
                    </div>
                    """
                )


        

       


        return jsonify({
            "msg": "Tarea creada (1 por alumno) + evento creado en Google Calendar",
            "google_event_id": created_event.get("id"),
            "htmlLink": created_event.get("htmlLink"),
            "attendees": attendees_emails,
            "todos_created": [
                {"todo_id": t.id, "student_group_id": t.student_id} for t in created_todos
            ],
            "debug_student_user_ids": student_user_ids
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error guardando la tarea en DB", "error": str(e)}), 500


@app.route("/teacher/todos", methods=["GET"])
@jwt_required()
@role_required("TEACHER", "ADMIN")
def get_teacher_todos():
    try:
        teacher_id = int(get_jwt_identity())

        todos = Todo.query.filter_by(
            teacher_id=teacher_id).order_by(Todo.id.desc()).all()

        return jsonify({
            "msg": "Tareas del profesor obtenidas correctamente",
            "todos": [t.serialize() for t in todos]
        }), 200

    except Exception as e:
        return jsonify({
            "msg": "Error obteniendo tareas del profesor",
            "error": str(e)
        }), 500


@app.route("/google/events/<event_id>", methods=["GET"])
@role_required("TEACHER", "ADMIN")
def get_google_event(event_id):
    try:
        service = get_calendar_service()
        event = service.events().get(calendarId="primary", eventId=event_id).execute()

        return jsonify({
            "msg": "Evento obtenido correctamente",
            "event": {
                "id": event.get("id"),
                "summary": event.get("summary"),
                "description": event.get("description"),
                "start": event.get("start"),
                "end": event.get("end"),
                "attendees": [a.get("email") for a in event.get("attendees", [])],
                "htmlLink": event.get("htmlLink")
            }
        }), 200
    except Exception as e:
        return jsonify({"msg": "Error obteniendo evento", "error": str(e)}), 500


# this only runs if `$ python src/main.py` is executed
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=PORT, debug=True)
