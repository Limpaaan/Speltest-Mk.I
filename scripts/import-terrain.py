"""Crop Copernicus GLO-30 into a reviewable candidate; never replaces game data."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import subprocess
import tempfile

import numpy as np
import rasterio
from rasterio.windows import Window, from_bounds

ROOT = Path(__file__).resolve().parents[1]
TILE = "Copernicus_DSM_COG_10_N60_00_E016_00_DEM"
PREFIX = f"https://copernicus-dem-30m.s3.amazonaws.com/{TILE}"
SOURCE = f"{PREFIX}/{TILE}.tif"
ATTRIBUTION = (
    "produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus "
    "Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European "
    "Union and ESA; all rights reserved"
)
DISCLAIMER = (
    "The organisations in charge of the Copernicus programme by law or by "
    "delegation do not incur any liability for any use of the Copernicus WorldDEM-30"
)


def make_candidate(path, geography, source_url=SOURCE):
    origin = geography["origin"]
    scale = float(geography["scale"])
    if not (0 < scale <= 1 and 60 < origin["lat"] < 61 and 16 < origin["lon"] < 17):
        raise ValueError("Expected the Avesta origin and a valid geographic scale")
    extent, step, base = 600, 10, 80
    count = extent * 2 // step + 1
    lon_scale = 111320 * math.cos(math.radians(origin["lat"])) * scale
    lat_scale = 111320 * scale
    with rasterio.open(path) as dataset:
        if dataset.crs != rasterio.crs.CRS.from_epsg(4326):
            raise ValueError("Expected a geographic EPSG:4326 raster")
        if dataset.count != 1 or dataset.transform.a <= 0:
            raise ValueError("Expected a single-band, north-up elevation raster")
        if dataset.transform.b or dataset.transform.d or dataset.transform.e >= 0:
            raise ValueError("Rotated or south-up rasters are not supported")
        bounds = (
            origin["lon"] - extent / lon_scale,
            origin["lat"] - extent / lat_scale,
            origin["lon"] + extent / lon_scale,
            origin["lat"] + extent / lat_scale,
        )
        requested = from_bounds(*bounds, dataset.transform)
        # Extra source pixels for a 3x3 median and bilinear interpolation.
        left, top = math.floor(requested.col_off) - 3, math.floor(requested.row_off) - 3
        right = math.ceil(requested.col_off + requested.width) + 3
        bottom = math.ceil(requested.row_off + requested.height) + 3
        if left < 0 or top < 0 or right > dataset.width or bottom > dataset.height:
            raise ValueError("Raster does not cover the complete game map plus filter margin")
        window = Window(left, top, right - left, bottom - top)
        raw = dataset.read(1, window=window, masked=True)
        if np.ma.getmaskarray(raw).any() or not np.isfinite(raw.data).all():
            raise ValueError("Source crop has missing or non-finite elevations")
        raw = np.asarray(raw, dtype=np.float64)
        if raw.min() < -100 or raw.max() > 1000:
            raise ValueError("Unexpected elevation range for Avesta")
        filtered = np.median(
            np.lib.stride_tricks.sliding_window_view(np.pad(raw, 1, mode="edge"), (3, 3)),
            axis=(-2, -1),
        )
        transform = dataset.window_transform(window)
        altitudes = []
        for row in range(count):
            z = -extent + row * step
            for column in range(count):
                x = -extent + column * step
                lon, lat = origin["lon"] + x / lon_scale, origin["lat"] - z / lat_scale
                # Raster affine coordinates describe pixel corners, samples lie at centres.
                px, py = (~transform) * (lon, lat)
                px, py = px - 0.5, py - 0.5
                ix, iy = math.floor(px), math.floor(py)
                fx, fy = px - ix, py - iy
                height = (
                    filtered[iy, ix] * (1 - fx) * (1 - fy)
                    + filtered[iy, ix + 1] * fx * (1 - fy)
                    + filtered[iy + 1, ix] * (1 - fx) * fy
                    + filtered[iy + 1, ix + 1] * fx * fy
                )
                altitudes.append(round(float(height), 3))
        crop = {
            "width": raw.shape[1], "height": raw.shape[0],
            "transform": list(transform)[:6], "elevationsMetres": raw.round(3).ravel().tolist(),
        }
    with open(path, "rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    return {
        "status": "candidate-not-integrated", "schemaVersion": 1,
        "source": source_url, "sourceSha256": digest,
        "processedAt": datetime.now(timezone.utc).isoformat(),
        "product": "Copernicus GLO-30 DSM", "verticalDatum": "EGM2008",
        "licenseUrl": f"{PREFIX}/INFO/eula_F.pdf",
        "attribution": ATTRIBUTION, "disclaimer": DISCLAIMER,
        "modifications": "Avesta crop, 3x3 source-pixel median, bilinear resampling; no building or canopy removal",
        "origin": origin, "horizontalScale": scale, "verticalScale": scale,
        "baseAltitudeMetres": base, "extent": extent, "step": step,
        "width": count, "height": count, "rowOrder": "north-to-south; west-to-east",
        "minAltitudeMetres": min(altitudes), "maxAltitudeMetres": max(altitudes),
        "elevationsMetres": altitudes, "sourceCrop": crop,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Previously downloaded, unmodified source GeoTIFF")
    parser.add_argument("--output", type=Path, default=ROOT / ".local/avesta-terrain-candidate.json")
    args = parser.parse_args()
    geography = json.loads((ROOT / "shared/geography.json").read_text())
    local = ROOT / ".local"
    local.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="terrain-", dir=local) as directory:
        source = args.input
        if source is None:
            source = Path(directory) / f"{TILE}.tif"
            subprocess.run([
                "curl", "--fail", "--location", "--show-error", "--silent",
                "--max-time", "180", "--proto", "=https", "--proto-redir", "=https",
                "--output", str(source), SOURCE,
            ], check=True)
        candidate = make_candidate(source, geography)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        # Only publish a complete validated candidate, leaving any existing file on failure.
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=args.output.parent,
                                         prefix=".terrain-", delete=False) as temporary:
            temporary.write(json.dumps(candidate, ensure_ascii=False, allow_nan=False) + "\n")
            pending = Path(temporary.name)
        try:
            pending.replace(args.output)
        finally:
            pending.unlink(missing_ok=True)
    print(f"Candidate: {args.output}; {candidate['width']}x{candidate['height']} samples, "
          f"{candidate['minAltitudeMetres']}–{candidate['maxAltitudeMetres']} m. Game data unchanged.")


if __name__ == "__main__":
    main()
