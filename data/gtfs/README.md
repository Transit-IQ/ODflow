# data/gtfs/ — Israel MOT GTFS Files

This folder must contain the extracted GTFS text files from the Israel Ministry of Transport.

## Files Required

| File | Size | Description |
|------|------|-------------|
| `agency.txt` | ~3 KB | Transit operators (Dan, Egged, etc.) |
| `routes.txt` | ~865 KB | All bus/rail route definitions |
| `trips.txt` | ~16 MB | Trip → shape_id mappings |
| `stops.txt` | ~4.8 MB | Stop locations (name, lat, lon) |
| `shapes.txt` | ~211 MB | GPS traces for each route shape (**required**) |
| `stop_times.txt` | ~458 MB | Stop sequences per trip (optional, needed for `/route/{id}/stops`) |

## Where to Get Them

Download the Israel MOT GTFS feed and extract these `.txt` files directly into `data/gtfs/`.
(The frontend's own `scripts/gtfs_data/extracted/` copy path that used to be documented here no
longer exists — the frontend's data-fetch scripts were removed when the static JSON pipeline
replaced them.)

## After Copying

Restart the backend:
```bash
cd apps/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

The server will begin indexing the files in the background.
Check build progress at: **http://127.0.0.1:8000/gtfs/status**

Once `ready: true`, all endpoints are live at **http://127.0.0.1:8000/docs**
