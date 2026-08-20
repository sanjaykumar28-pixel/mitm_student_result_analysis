from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = ""
    mysql_database: str = "result_analysis"

    jwt_secret: str = "change-me"
    jwt_expire_minutes: int = 480
    jwt_algorithm: str = "HS256"

    admin_email: str = "admin@mitmysore.ac.in"
    admin_password: str = "Admin@123"
    admin_name: str = "Administrator"

    cors_origins: str = "http://localhost:5173,http://localhost:8080"

    @property
    def database_url(self) -> str:
        user = quote_plus(self.mysql_user)
        if self.mysql_password:
            auth = f"{user}:{quote_plus(self.mysql_password)}"
        else:
            auth = user
        return (
            f"mysql+pymysql://{auth}@{self.mysql_host}:{self.mysql_port}/"
            f"{self.mysql_database}?charset=utf8mb4"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
