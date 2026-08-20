from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_login
from app.models import Login
from app.schemas import AuthUser, LoginRequest, LoginResponse
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def to_auth_user(login: Login) -> AuthUser:
    student = login.student
    if login.role == "admin":
        name = student.student_name if student else "Administrator"
        return AuthUser(
            id=f"ADM{login.login_id:03d}",
            name=name,
            email=login.email,
            role="admin",
        )
    if student is None:
        return AuthUser(
            id=login.usn or str(login.login_id),
            name=login.email.split("@")[0],
            email=login.email,
            role="student",
            usn=login.usn,
        )
    return AuthUser(
        id=student.usn,
        name=student.student_name,
        email=login.email,
        role="student",
        usn=student.usn,
        department=student.department,
        semester=student.semester,
    )


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    account = (
        db.query(Login)
        .options(joinedload(Login.student))
        .filter(Login.email == str(body.email).lower())
        .first()
    )
    if account is None or not verify_password(body.password, account.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if account.role != body.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account is registered as {account.role}, not {body.role}",
        )

    token = create_access_token(login_id=account.login_id, email=account.email, role=account.role)
    return LoginResponse(access_token=token, user=to_auth_user(account))


@router.get("/me", response_model=AuthUser)
def me(login: Login = Depends(get_current_login)) -> AuthUser:
    return to_auth_user(login)


@router.post("/logout")
def logout() -> dict:
    return {"ok": True}
