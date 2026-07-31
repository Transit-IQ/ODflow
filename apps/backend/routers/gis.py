from fastapi import APIRouter, HTTPException
from services.gis_loader import get_gis_data, get_gis_status

router = APIRouter(prefix="/gis", tags=["GIS Analysis"])

@router.get("/status")
def status():
    return get_gis_status()

@router.get("/border")
def get_border():
    """Return the precise Tel Aviv City Limits GeoJSON polygon"""
    data = get_gis_data()
    if not data:
        raise HTTPException(status_code=503, detail="GIS data is still processing")
    return data["border"]

@router.get("/speeds")
def get_speeds():
    """Return all bus speed segments fully clipped to Tel Aviv City Limits"""
    data = get_gis_data()
    if not data:
        raise HTTPException(status_code=503, detail="GIS data is still processing")
    return data["speeds"]
