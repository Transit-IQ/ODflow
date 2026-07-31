from fastapi import APIRouter, HTTPException
from services.data_loader import list_available_layers, load_layer, layer_to_geojson

router = APIRouter()


@router.get("/")
def get_layers():
    """List all available GIS layers in the data directory."""
    return list_available_layers()


@router.get("/{layer_path:path}")
def get_layer(layer_path: str):
    """
    Return a GIS layer as GeoJSON.

    Example:
      GET /layers/neighborhoods/hatikva.geojson
      GET /layers/stops.csv
    """
    try:
        gdf = load_layer(layer_path)
        return layer_to_geojson(gdf)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
