"""
GIS layer loader — reads from the shared ../data/ directory.

Supported formats:
  - GeoJSON  (.geojson, .json)
  - Shapefile (.shp)
  - GeoPackage (.gpkg)
  - CSV with lat/lon columns
"""

import os
from functools import lru_cache
from typing import Optional

import geopandas as gpd
import pandas as pd
from shapely.geometry import Point

from paths import DATA_DIR

SUPPORTED_EXTENSIONS = {".geojson", ".json", ".shp", ".gpkg", ".csv"}


def list_available_layers() -> list[dict]:
    """Return metadata for every readable GIS file in the data directory."""
    layers = []
    if not DATA_DIR.exists():
        return layers

    for f in sorted(DATA_DIR.rglob("*")):
        if f.suffix.lower() in SUPPORTED_EXTENSIONS and f.is_file():
            layers.append({
                "name": f.stem,
                "filename": f.name,
                "path": str(f.relative_to(DATA_DIR)),
                "format": f.suffix.lower().lstrip("."),
                "size_kb": round(f.stat().st_size / 1024, 1),
            })
    return layers


def load_layer(relative_path: str, crs: str = "EPSG:4326") -> gpd.GeoDataFrame:
    """
    Load a GIS layer from the data directory and reproject to the given CRS.

    Args:
        relative_path: path relative to ../data/ (e.g. "neighborhoods/hatikva.geojson")
        crs: target coordinate reference system (default WGS-84)

    Returns:
        GeoDataFrame in the requested CRS
    """
    full_path = DATA_DIR / relative_path
    if not full_path.exists():
        raise FileNotFoundError(f"Layer not found: {relative_path}")

    ext = full_path.suffix.lower()

    if ext == ".csv":
        df = pd.read_csv(full_path)
        # Auto-detect lat/lon columns
        lat_col = next((c for c in df.columns if c.lower() in ("lat", "latitude", "y")), None)
        lon_col = next((c for c in df.columns if c.lower() in ("lon", "lng", "longitude", "x")), None)
        if lat_col and lon_col:
            geometry = [Point(row[lon_col], row[lat_col]) for _, row in df.iterrows()]
            gdf = gpd.GeoDataFrame(df, geometry=geometry, crs="EPSG:4326")
        else:
            raise ValueError("CSV has no detectable lat/lon columns")
    else:
        gdf = gpd.read_file(full_path)

    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")
    elif gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(crs)

    return gdf


def layer_to_geojson(gdf: gpd.GeoDataFrame) -> dict:
    """Convert a GeoDataFrame to a GeoJSON-serialisable dict."""
    return gdf.__geo_interface__
