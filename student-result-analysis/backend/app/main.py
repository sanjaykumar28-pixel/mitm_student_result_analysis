from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models import Login
from app.routers import admin, auth
from app.security import hash_password


def seed_admin(db: Session) -> None:
    email = settings.admin_email.lower()
    existing = db.query(Login).filter(Login.email == email).first()
    if existing:
        return
    db.add(
        Login(
            usn=None,
            email=email,
            password=hash_password(settings.admin_password),
            role="admin",
        )
    )
    db.commit()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db = SessionLocal()
    try:
        seed_admin(db)
    except OperationalError as exc:
        raise RuntimeError(
            "MySQL login failed. Open backend/.env and set MYSQL_USER / MYSQL_PASSWORD "
            "to the same values you use in phpMyAdmin. XAMPP root is often an empty password "
            "(MYSQL_PASSWORD= with nothing after the equals sign)."
        ) from exc
    finally:
        db.close()
    yield


app = FastAPI(title="MIT Mysore Result Analysis API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
