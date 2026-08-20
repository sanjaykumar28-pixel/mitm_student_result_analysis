from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Login
from app.security import decode_access_token

bearer = HTTPBearer(auto_error=False)


def get_current_login(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Login:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_access_token(creds.credentials)
        login_id = int(payload["sub"])
    except (InvalidTokenError, KeyError, ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    login = (
        db.query(Login)
        .options(joinedload(Login.student))
        .filter(Login.login_id == login_id)
        .first()
    )
    if login is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not found")
    return login


def require_admin(login: Login = Depends(get_current_login)) -> Login:
    if login.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return login


def require_student(login: Login = Depends(get_current_login)) -> Login:
    if login.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required",
        )
    return login


def student_usn(login: Login) -> str:
    usn = login.student.usn if login.student is not None else login.usn
    if not usn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found",
        )
    return usn
