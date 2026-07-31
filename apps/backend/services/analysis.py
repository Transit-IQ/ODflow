"""
GIS analysis service — spatial operations on loaded layers.
"""

from typing import Optional
import geopandas as gpd
import pandas as pd
from shapely.geometry import shape, mapping


def overlay_layers(
    base: gpd.GeoDataFrame,
    overlay: gpd.GeoDataFrame,
    how: str = "intersection",
) -> gpd.GeoDataFrame:
    """
    Spatial overlay between two GeoDataFrames.
    how: 'intersection' | 'union' | 'difference' | 'symmetric_difference'
    """
    base = base.to_crs("EPSG:4326")
    overlay = overlay.to_crs("EPSG:4326")
    return gpd.overlay(base, overlay, how=how, keep_geom_type=False)


def buffer_layer(
    gdf: gpd.GeoDataFrame,
    distance_m: float,
) -> gpd.GeoDataFrame:
    """
    Buffer geometries by distance_m metres.
    Projects to Israel TM (EPSG:2039) for metric accuracy, then back to WGS-84.
    """
    projected = gdf.to_crs("EPSG:2039")
    buffered = projected.copy()
    buffered["geometry"] = projected.geometry.buffer(distance_m)
    return buffered.to_crs("EPSG:4326")


def count_points_in_polygons(
    points: gpd.GeoDataFrame,
    polygons: gpd.GeoDataFrame,
    label_col: Optional[str] = None,
) -> gpd.GeoDataFrame:
    """
    Count how many points fall inside each polygon.
    Returns the polygon GDF with an added 'point_count' column.
    """
    joined = gpd.sjoin(points, polygons, how="right", predicate="within")
    counts = joined.groupby(joined.index).size().rename("point_count")
    result = polygons.copy()
    result["point_count"] = counts.reindex(result.index, fill_value=0)
    return result


def clip_to_bbox(
    gdf: gpd.GeoDataFrame,
    min_lat: float,
    max_lat: float,
    min_lon: float,
    max_lon: float,
) -> gpd.GeoDataFrame:
    """Return only features whose geometry intersects the given bounding box."""
    from shapely.geometry import box
    bbox_geom = box(min_lon, min_lat, max_lon, max_lat)
    return gdf[gdf.geometry.intersects(bbox_geom)].copy()


def summarise_by_column(
    gdf: gpd.GeoDataFrame,
    group_col: str,
    value_col: str,
    agg: str = "sum",
) -> pd.DataFrame:
    """Group by a column and aggregate a numeric value."""
    return gdf.groupby(group_col)[value_col].agg(agg).reset_index()
