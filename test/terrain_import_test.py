"""Synthetic GeoTIFF fixtures, not Avesta measurements. Run with the terrain venv."""

import importlib.util
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import numpy as np
import rasterio
from rasterio.transform import from_origin

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("terrain_import", ROOT / "scripts/import-terrain.py")
IMPORTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORTER)


class TerrainImportTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.path = Path(self.temporary.name) / "fixture.tif"
        self.geography = {"origin": {"lat": 60.148, "lon": 16.178}, "scale": 0.25}

    def write_raster(self, crs="EPSG:4326", missing=False):
        transform = from_origin(16.118, 60.178, 0.0003, 0.0003)
        rows, cols = np.indices((200, 400))
        lons = 16.118 + (cols + 0.5) * 0.0003
        lats = 60.178 - (rows + 0.5) * 0.0003
        values = (100 + (lons - 16.178) * 1000 + (lats - 60.148) * 500).astype("float32")
        if missing:
            values[100, 200] = -9999
        with rasterio.open(self.path, "w", driver="GTiff", width=400, height=200,
                           count=1, dtype="float32", crs=crs, transform=transform,
                           nodata=-9999) as dataset:
            dataset.write(values, 1)

    def test_actual_map_origin_axis_order_and_bilinear_elevations(self):
        self.write_raster()
        result = IMPORTER.make_candidate(self.path, self.geography, "synthetic-test-fixture")
        self.assertEqual(result["origin"], self.geography["origin"])
        self.assertEqual(result["width"], 121)
        self.assertEqual(len(result["elevationsMetres"]), 121 * 121)
        self.assertEqual(result["verticalScale"], 0.25)
        self.assertEqual(len(result["sourceSha256"]), 64)
        self.assertEqual(result["source"], "synthetic-test-fixture")
        # An analytic plane catches a wrong origin, swapped axes and half-pixel shifts.
        for row, column in [(0, 0), (60, 60), (120, 120), (15, 91)]:
            x, z = -600 + column * 10, -600 + row * 10
            lon_delta = x / (111320 * math.cos(math.radians(60.148)) * 0.25)
            lat_delta = -z / (111320 * 0.25)
            expected = 100 + lon_delta * 1000 + lat_delta * 500
            self.assertAlmostEqual(result["elevationsMetres"][row * 121 + column], expected, delta=0.001)

    def test_rejects_wrong_projection_and_nodata(self):
        self.write_raster(crs="EPSG:3857")
        with self.assertRaisesRegex(ValueError, "4326"):
            IMPORTER.make_candidate(self.path, self.geography)
        self.write_raster(missing=True)
        with self.assertRaisesRegex(ValueError, "missing"):
            IMPORTER.make_candidate(self.path, self.geography)

    def test_invalid_source_preserves_existing_candidate(self):
        self.write_raster(missing=True)
        output = Path(self.temporary.name) / "candidate.json"
        original = json.dumps({"previousCandidate": True})
        output.write_text(original)
        result = subprocess.run([sys.executable, str(ROOT / "scripts/import-terrain.py"),
                                 "--input", str(self.path), "--output", str(output)],
                                capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("missing", result.stderr)
        self.assertEqual(output.read_text(), original)


if __name__ == "__main__":
    unittest.main()
