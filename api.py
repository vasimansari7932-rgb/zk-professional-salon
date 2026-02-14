from fastapi import FastAPI, Request, HTTPException, Depends, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import os
import uuid
import shutil

# Configuration
DB_FILE = "db.json"
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app = FastAPI(title="ZK Professional Salon API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

class Product(BaseModel):
    id: Optional[str] = None
    name: str
    image: str
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
        if "products" not in data:
            data["products"] = []
        return data

def write_db(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2)

# Endpoints
@app.post("/api/login")
async def login(req: LoginRequest):
    db = read_db()
    # Check root admin
    admin = db.get("admin")
    if admin and admin["email"] == req.email and admin["password"] == req.password:
        user_res = admin.copy()
        user_res["role"] = "admin"
        user_res["id"] = "admin-id"
        if "password" in user_res: del user_res["password"]
        return {"success": True, "user": user_res}

    # Check employees
    user = next((u for u in db["employees"] if u["email"] == req.email and u["password"] == req.password), None)
    if user:
        user_res = user.copy()
        if "password" in user_res: del user_res["password"]
        return {"success": True, "user": user_res}
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

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
    db["employees"].append(new_emp)
    write_db(db)
    return new_emp

@app.put("/api/employees/{emp_id}")
async def update_employee(emp_id: str, data: dict):
    db = read_db()
    for e in db["employees"]:
        if e["id"] == emp_id:
            e.update(data)
            write_db(db)
            return {"success": True}
    raise HTTPException(status_code=404, detail="Employee not found")

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
    # Save Image
    file_ext = image.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
    
    db = read_db()
    new_product = {
        "id": str(uuid.uuid4()),
        "name": name,
        "description": description,
        "price": price,
        "isActive": isActive,
        "image": f"/uploads/{file_name}",
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
        # Delete old image if exists
        old_image_path = product["image"].lstrip("/")
        if os.path.exists(old_image_path):
            os.remove(old_image_path)
            
        file_ext = image.filename.split(".")[-1]
        file_name = f"{uuid.uuid4()}.{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        product["image"] = f"/uploads/{file_name}"
        
    write_db(db)
    return {"success": True, "product": product}

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str):
    db = read_db()
    product = next((p for p in db["products"] if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Delete image file
    image_path = product["image"].lstrip("/")
    if os.path.exists(image_path):
        os.remove(image_path)
        
    db["products"] = [p for p in db["products"] if p["id"] != product_id]
    write_db(db)
    return {"success": True}

def get_local_date_iso():
    # Simple helper for timestamp
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# Barbers (Filtered View)
@app.get("/api/barbers")
async def get_barbers():
    db = read_db()
    barbers = [e for e in db.get("employees", []) if e.get("role") == "employee" and e.get("isActive")]
    return [{"id": b["id"], "name": b["name"], "initials": b["name"][0].upper()} for b in barbers]

# Static Files - MUST BE LAST
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/admin", StaticFiles(directory="admin", html=True), name="admin")
app.mount("/", StaticFiles(directory=".", html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
