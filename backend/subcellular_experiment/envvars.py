import os

MONGO_URI = os.getenv("MONGO_URI")
SENTRY_DSN = os.getenv("SENTRY_DSN")
MASTER_HOST = os.getenv("MASTER_HOST")

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("username")
DB_PASSWORD = os.getenv("admin_password") or ""
