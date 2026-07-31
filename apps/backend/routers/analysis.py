from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from services.data_loader import load_layer, layer_to_geojson
from services import analysis as svc

router = APIRouter()


@router.get("/buffer")
def buffer(
    layer: str = Query(..., description="Layer path relative to data/"),
    distance_m: float = Query(..., description="Buffer distance in metres"),
):
    """Buffer all features in a layer by a given distance."""
    try:
        gdf = load_layer(layer)
        result = svc.buffer_layer(gdf, distance_m)
        return layer_to_geojson(result)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/overlay")
def overlay(
    base: str = Query(..., description="Base layer path"),
    overlay: str = Query(..., description="Overlay layer path"),
    how: str = Query("intersection", description="intersection|union|difference"),
):
    """Spatial overlay between two layers."""
    try:
        base_gdf = load_layer(base)
        overlay_gdf = load_layer(overlay)
        result = svc.overlay_layers(base_gdf, overlay_gdf, how=how)
        return layer_to_geojson(result)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/points-in-polygons")
def points_in_polygons(
    points: str = Query(..., description="Points layer path"),
    polygons: str = Query(..., description="Polygons layer path"),
):
    """Count points inside each polygon and return the enriched polygon layer."""
    try:
        pts_gdf = load_layer(points)
        poly_gdf = load_layer(polygons)
        result = svc.count_points_in_polygons(pts_gdf, poly_gdf)
        return layer_to_geojson(result)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/clip")
def clip(
    layer: str = Query(..., description="Layer path to clip"),
    min_lat: float = Query(...),
    max_lat: float = Query(...),
    min_lon: float = Query(...),
    max_lon: float = Query(...),
):
    """Clip a layer to a bounding box."""
    try:
        gdf = load_layer(layer)
        result = svc.clip_to_bbox(gdf, min_lat, max_lat, min_lon, max_lon)
        return layer_to_geojson(result)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
