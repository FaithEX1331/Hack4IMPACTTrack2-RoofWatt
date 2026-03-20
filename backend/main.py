from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import predict, installers, report
import os

app = FastAPI(title="GreenLens API", version="1.0.0")

# Restrict CORS to known frontend origins; fall back to permissive in dev.
# Set ALLOWED_ORIGINS env var as comma-separated URLs in production.
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(predict.router, prefix="/api")
app.include_router(installers.router, prefix="/api")
app.include_router(report.router, prefix="/api")


@app.get("/")
def root():
    return {"status": "GreenLens API running"}
