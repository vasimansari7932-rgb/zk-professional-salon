from fastapi import FastAPI, Request, HTTPException, Depends, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from passlib.context import CryptContext
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from dotenv import load_dotenv

load_dotenv()
import json
import os
import uuid
import shutil

# Configuration
DB_FILE = "db.json"
UPLOAD_DIR = os.path.join("uploads", "images")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app = FastAPI(title="ZK Professional Salon API")

# Password Hashing Setup
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# CORS - Restricted for Security
ALLOWED_ORIGINS = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://zk-professional-salon.onrender.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Note: HTTPSRedirectMiddleware is recommended for production (Render)
# but can be problematic on localhost without SSL. 
# if not os.environ.get("DEBUG"):
#     app.add_middleware(HTTPSRedirectMiddleware)

# Trusted Host Middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["localhost", "127.0.0.1", "zk-professional-salon.onrender.com", "*.onrender.com"]
)

# Email Configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.environ.get("EMAIL_USER"),
    MAIL_PASSWORD=os.environ.get("EMAIL_PASSWORD"),
    MAIL_FROM=os.environ.get("EMAIL_FROM"),
    MAIL_PORT=int(os.environ.get("EMAIL_PORT", 587)),
    MAIL_SERVER=os.environ.get("EMAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

async def send_booking_notification(booking: dict):
    html = f"""
    <h3>New Appointment Booking</h3>
    <p><strong>Customer:</strong> {booking['customerName']}</p>
    <p><strong>Mobile:</strong> {booking['mobile']}</p>
    <p><strong>Service:</strong> {booking['serviceName']}</p>
    <p><strong>Date:</strong> {booking['date']}</p>
    <p><strong>Time:</strong> {booking['time']}</p>
    <p><strong>Barber:</strong> {booking['barberName']}</p>
    <hr>
    <p>Sent from ZK Salon API</p>
    """
    
    message = MessageSchema(
        subject="🆕 New Booking - ZK Salon",
        recipients=[os.environ.get("EMAIL_FROM")],
        body=html,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        print("Admin notification email sent successfully")
    except Exception as e:
        print(f"Failed to send admin notification email: {e}")

# Models
class LoginRequest(BaseModel):
    email: str
    password: str

class Booking(BaseModel):
    id: Optional[str] = None
    customerName: str
    mobile: str
    serviceId: str
    serviceName: str
    date: str
    time: str
    barberId: str
    barberName: str
    status: Optional[str] = "upcoming"
    price: Optional[float] = 0.0

class Employee(BaseModel):
    id: Optional[str] = None
    name: str
    email: str
    password: Optional[str] = None
    mobile: str
    role: str
    isActive: bool = True

class Service(BaseModel):
    id: Optional[str] = None
    name: str
    price: float
    duration: int
    isActive: bool = True

class ImageMetadata(BaseModel):
    filename: str
    path: str
    url: str
    fileType: str
    fileSize: int
    uploadedDate: str
    entityId: str

class Product(BaseModel):
    id: Optional[str] = None
    name: str
    image: Optional[ImageMetadata] = None # Updated to metadata
    description: str
    price: float
    isActive: bool = True
    createdAt: Optional[str] = None

# Database Helpers
def read_db():
    if not os.path.exists(DB_FILE):
        return {"employees": [], "bookings": [], "services": [], "products": [], "admin": {}}
    with open(DB_FILE, "r") as f:
        data = json.load(f)
        if "products" not in data: data["products"] = []
        if "admin" not in data: data["admin"] = {}
        return data

def write_db(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2)

# Endpoints
@app.post("/api/login")
async def login(req: LoginRequest):
    db = read_db()
    admin = db.get("admin", {})
    
    # Check Admin
    if admin.get("email") == req.email:
        stored_password = admin.get("password")
        is_valid = False
        needs_migration = False
        
        # Check if already hashed
        if stored_password.startswith("$pbkdf2-sha256$"):
            is_valid = verify_password(req.password, stored_password)
        else:
            # Migration logic for plain text
            if stored_password == req.password:
                is_valid = True
                needs_migration = True
        
        if is_valid:
            if needs_migration:
                admin["password"] = get_password_hash(req.password)
                write_db(db)
            
            user_res = admin.copy()
            user_res["role"] = "admin"
            user_res["id"] = "admin-id"
            if "password" in user_res: del user_res["password"]
            return {"success": True, "user": user_res}

    # Check Employees
    for user in db.get("employees", []):
        if user.get("email") == req.email:
            stored_password = user.get("password")
            is_valid = False
            needs_migration = False
            
            if stored_password.startswith("$pbkdf2-sha256$"):
                is_valid = verify_password(req.password, stored_password)
            else:
                if stored_password == req.password:
                    is_valid = True
                    needs_migration = True
            
            if is_valid:
                if needs_migration:
                    user["password"] = get_password_hash(req.password)
                    write_db(db)
                
                user_res = user.copy()
                if "password" in user_res: del user_res["password"]
                return {"success": True, "user": user_res}
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/diag")
async def diagnostic():
    db = read_db()
    return {
        "status": "online",
        "mode": "local",
        "db_products_count": len(db.get("products", [])),
        "server_local_time": get_local_date_iso()
    }

# Image Management Utilities
def validate_image(file: UploadFile):
    MAX_SIZE = 5 * 1024 * 1024 # 5MB
    ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
    
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and WEBP are allowed.")
    
    # Check size (requires seeking)
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)
    
    if size > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size too large. Max 5MB allowed.")
    return size

def save_image_local(file: UploadFile, entity_id: str) -> dict:
    size = validate_image(file)
    file_ext = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "filename": unique_filename,
        "path": file_path,
        "url": f"/uploads/images/{unique_filename}",
        "fileType": file.content_type,
        "fileSize": size,
        "uploadedDate": get_local_date_iso(),
        "entityId": entity_id
    }

def delete_image_local(image_path: str):
    if os.path.exists(image_path):
        try:
            os.remove(image_path)
            return True
        except Exception as e:
            print(f"ERROR: Failed to delete image {image_path}: {e}")
    return False

# Bookings
@app.get("/api/bookings")
async def get_bookings():
    db = read_db()
    return db.get("bookings", [])

@app.post("/api/bookings")
async def create_booking(booking: Booking):
    db = read_db()
    new_booking = booking.dict()
    new_booking["id"] = str(uuid.uuid4())
    new_booking["status"] = "upcoming"
    db["bookings"].append(new_booking)
    write_db(db)
    
    # Trigger Email Notification in background
    import asyncio
    asyncio.create_task(send_booking_notification(new_booking))
    
    return new_booking

@app.put("/api/bookings/{booking_id}")
async def update_booking(booking_id: str, data: dict):
    db = read_db()
    for b in db["bookings"]:
        if b["id"] == booking_id:
            b.update(data)
            write_db(db)
            return {"success": True}
    raise HTTPException(status_code=404, detail="Booking not found")

# Employees
@app.get("/api/employees")
async def get_employees():
    db = read_db()
    return db.get("employees", [])

@app.post("/api/employees")
async def create_employee(emp: Employee):
    db = read_db()
    new_emp = emp.dict()
    new_emp["id"] = str(uuid.uuid4())
    # Hash password if provided
    if new_emp.get("password"):
        new_emp["password"] = get_password_hash(new_emp["password"])
    db["employees"].append(new_emp)
    write_db(db)
    return new_emp

@app.put("/api/employees/{emp_id}")
async def update_employee(emp_id: str, data: dict):
    db = read_db()
    for e in db["employees"]:
        if e["id"] == emp_id:
            if "id" in data: del data["id"]
            if "password" in data:
                if not data["password"]: 
                    del data["password"]
                else:
                    data["password"] = get_password_hash(data["password"])
            e.update(data)
            write_db(db)
            return {"success": True, "employee": e}
    raise HTTPException(status_code=404, detail="Employee not found")

@app.delete("/api/employees/{emp_id}")
async def delete_employee(emp_id: str):
    db = read_db()
    initial_count = len(db["employees"])
    db["employees"] = [e for e in db["employees"] if e["id"] != emp_id]
    if len(db["employees"]) == initial_count:
        raise HTTPException(status_code=404, detail="Employee not found")
    write_db(db)
    return {"success": True}

# Services
@app.get("/api/services")
async def get_services():
    db = read_db()
    return db.get("services", [])

@app.post("/api/services")
async def create_service(service: Service):
    db = read_db()
    new_service = service.dict()
    new_service["id"] = str(uuid.uuid4())
    db["services"].append(new_service)
    write_db(db)
    return new_service

@app.put("/api/services/{service_id}")
async def update_service(service_id: str, data: dict):
    db = read_db()
    for s in db["services"]:
        if s["id"] == service_id:
            s.update(data)
            write_db(db)
            return {"success": True}
    raise HTTPException(status_code=404, detail="Service not found")

# Products
@app.get("/api/products")
async def get_products():
    db = read_db()
    return db.get("products", [])

@app.get("/api/products/active")
async def get_active_products():
    db = read_db()
    return [p for p in db.get("products", []) if p.get("isActive")]

@app.post("/api/products")
async def create_product(
    name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    isActive: bool = Form(True),
    image: UploadFile = File(...)
):
    product_id = str(uuid.uuid4())
    metadata = save_image_local(image, product_id)
    
    db = read_db()
    new_product = {
        "id": product_id,
        "name": name,
        "description": description,
        "price": price,
        "isActive": isActive,
        "image": metadata, # Save full metadata object
        "createdAt": get_local_date_iso()
    }
    db["products"].append(new_product)
    write_db(db)
    return new_product

@app.put("/api/products/{product_id}")
async def update_product(
    product_id: str,
    name: str = Form(None),
    description: str = Form(None),
    price: float = Form(None),
    isActive: bool = Form(None),
    image: Optional[UploadFile] = File(None)
):
    db = read_db()
    product = next((p for p in db["products"] if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if name is not None: product["name"] = name
    if description is not None: product["description"] = description
    if price is not None: product["price"] = price
    if isActive is not None: product["isActive"] = isActive
    
    if image:
        # Delete old image if it exists and is local
        if product.get("image") and isinstance(product["image"], dict):
            delete_image_local(product["image"]["path"])
        
        # Save new image
        metadata = save_image_local(image, product_id)
        product["image"] = metadata
        
    write_db(db)
    return {"success": True, "product": product}

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str):
    db = read_db()
    product = next((p for p in db["products"] if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Delete image from disk
    if product.get("image") and isinstance(product["image"], dict):
        delete_image_local(product["image"]["path"])
        
    db["products"] = [p for p in db["products"] if p["id"] != product_id]
    write_db(db)
    return {"success": True}

def get_local_date_iso():
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# Barbers
@app.get("/api/barbers")
async def get_barbers():
    db = read_db()
    barbers = [e for e in db.get("employees", []) if e.get("role") == "employee" and e.get("isActive")]
    return [{"id": b["id"], "name": b["name"], "initials": b["name"][0].upper()} for b in barbers]

# Static Files
app.mount("/uploads/images", StaticFiles(directory=UPLOAD_DIR), name="images")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/admin", StaticFiles(directory="admin", html=True), name="admin")
app.mount("/", StaticFiles(directory=".", html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
