from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import gtfs, gis
from services.gtfs_loader import start_index_build
from services.gis_loader import start_gis_build


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start loading files into memory when the server starts
    start_index_build()
    start_gis_build()
    yield

app = FastAPI(
    title="ODFlow Backend",
    description="GTFS and GIS analysis API — Israel MOT transit data",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(gtfs.router, prefix="/gtfs", tags=["GTFS"])
app.include_router(gis.router, tags=["GIS"])


@app.get("/health")
def health():
    from services.gtfs_loader import get_index_status
    from services.gis_loader import get_gis_status
    return {
        "status": "ok", 
        "gtfs": get_index_status(),
        "gis": get_gis_status()
    }
