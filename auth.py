# auth.py - Sistema completo de autenticação
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

# Configuração
SECRET_KEY = "your-super-secret-key-digital-factory-2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Contexto de criptografia
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Models
class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "operator"
    scopes: list = []
    disabled: bool = False

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# Banco de dados simulado (em produção, use PostgreSQL)
fake_users_db = {
    "admin": {
        "username": "admin",
        "email": "admin@digitalfactory.com",
        "full_name": "System Administrator",
        "role": "admin",
        "scopes": ["read", "write", "delete", "admin"],
        "hashed_password": pwd_context.hash("admin123"),
        "disabled": False
    },
    "operator": {
        "username": "operator",
        "email": "operator@digitalfactory.com",
        "full_name": "Plant Operator",
        "role": "operator",
        "scopes": ["read", "write"],
        "hashed_password": pwd_context.hash("123"),
        "disabled": False
    },
    "viewer": {
        "username": "viewer",
        "email": "viewer@digitalfactory.com",
        "full_name": "Monitoring Viewer",
        "role": "viewer",
        "scopes": ["read"],
        "hashed_password": pwd_context.hash("viewer123"),
        "disabled": False
    }
}

# Funções de utilidade
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)
    return None

def authenticate_user(db, username: str, password: str):
    user = get_user(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=payload.get("role"))
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTError:
        raise credentials_exception
    
    user = get_user(fake_users_db, username=token_data.username)
    if user is None:
        raise credentials_exception
    
    # Verificar se usuário está desativado
    if user.disabled:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user"
        )
    
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def check_user_has_role(current_user: User, required_role: str) -> bool:
    return current_user.role == required_role or current_user.role == "admin"

# Rotas de autenticação para incluir no main.py
from fastapi import APIRouter, Form, Request
from fastapi.responses import JSONResponse

auth_router = APIRouter(prefix="/api/auth", tags=["authentication"])

@auth_router.post("/login", response_model=Token)
async def login_for_access_token(
    request: Request,
    username: str = Form(...),
    password: str = Form(...)
):
    # Verificar se IP está bloqueado (simplificado)
    client_ip = request.client.host
    
    user = authenticate_user(fake_users_db, username, password)
    if not user:
        # Log de tentativa falha
        await log_access_attempt(username, client_ip, False)
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Log de acesso bem-sucedido
    await log_access_attempt(username, client_ip, True)
    
    # Criar token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role,
            "scopes": user.scopes,
            "name": user.full_name
        },
        expires_delta=access_token_expires
    )
    
    # Retornar token e informações do usuário
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "scopes": user.scopes
        }
    }

@auth_router.post("/logout")
async def logout(request: Request):
    # Em produção, você pode adicionar o token a uma blacklist
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    
    # Log de logout
    print(f"User logged out - Token: {token[:20]}...")
    
    return {"message": "Successfully logged out"}

@auth_router.get("/me")
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return {
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "scopes": current_user.scopes
    }

@auth_router.get("/validate")
async def validate_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        return {"valid": True, "username": username, "role": payload.get("role")}
    except jwt.ExpiredSignatureError:
        return {"valid": False, "error": "Token expired"}
    except jwt.JWTError:
        return {"valid": False, "error": "Invalid token"}

async def log_access_attempt(username: str, ip: str, success: bool):
    """Log de tentativas de acesso"""
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "username": username,
        "ip": ip,
        "success": success,
        "user_agent": "web"  # Em produção, pegar do request
    }
    
    # Aqui você pode salvar em um banco de dados, arquivo de log, etc.
    print(f"Access attempt: {log_entry}")
    
    return log_entry