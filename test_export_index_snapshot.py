import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location("index_export", Path(__file__).with_name("export_index_snapshot.py"))
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class IndexSnapshotTests(unittest.TestCase):
    def row(self, score=77.97):
        return {"ticker": "CSSPX.MI", "invquant_dd": score, "Reference_date": "2026-10-01", "weight": 99}

    def test_only_requested_benchmark_and_allowlisted_fields(self):
        result = exporter.build_snapshot([{"ticker": "PRIVATE", "weight": 99}, self.row()])
        self.assertEqual(set(result), {"schema_version", "symbol", "invquant_dd", "analysis_date", "generated_at"})
        self.assertEqual(result["symbol"], "CSSPX.MI")
        self.assertEqual(result["invquant_dd"], 77.97)

    def test_invalid_scores_and_valid_endpoints(self):
        for score in (None, "", "50", True, float("nan"), float("inf"), -1, 101):
            with self.subTest(score=score), self.assertRaises(ValueError):
                exporter.build_snapshot([self.row(score)])
        for score in (0, 100):
            self.assertEqual(exporter.build_snapshot([self.row(score)])["invquant_dd"], score)

    def test_identity_and_date_contract(self):
        for rows in ([], [self.row(), self.row()]):
            with self.assertRaises(ValueError):
                exporter.build_snapshot(rows)
        for stamp in (None, "2026-02-30", "2026-10-01T12:00:00"):
            with self.assertRaises(ValueError):
                exporter.build_snapshot([{**self.row(), "Reference_date": stamp}])
        with self.assertRaises(ValueError):
            exporter.build_snapshot([self.row()], expected_date="2026-09-28")

    def test_atomic_retention_and_cleanup(self):
        with tempfile.TemporaryDirectory() as folder:
            destination = Path(folder) / "snapshot.json"
            exporter.export_snapshot([self.row()], destination)
            previous = destination.read_bytes()
            with self.assertRaises(ValueError):
                exporter.export_snapshot([self.row(None)], destination)
            self.assertEqual(destination.read_bytes(), previous)
            with patch.object(Path, "replace", side_effect=OSError("staging failure")):
                with self.assertRaises(OSError):
                    exporter.export_snapshot([self.row(20)], destination)
            self.assertEqual(destination.read_bytes(), previous)
            self.assertEqual(list(Path(folder).glob(".index-snapshot-*")), [])

    def test_newest_source_and_no_silent_older_fallback(self):
        from openpyxl import Workbook
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for stamp, score in (("2026-09-28", 10), ("2026-10-01", 80)):
                workbook = Workbook()
                workbook.active.append(["ticker", "invquant_dd", "Reference_date"])
                workbook.active.append(["CSSPX.MI", score, stamp])
                workbook.save(root / f"invquantiledd_{stamp}.xlsx")
                workbook.close()
            (root / "invquantiledd_broken.xlsx").write_text("ignored nondated file")
            destination = root / "snapshot.json"
            exporter.export_latest(root, destination)
            self.assertEqual(json.loads(destination.read_text())["invquant_dd"], 80)
            previous = destination.read_bytes()
            (root / "invquantiledd_2026-10-02.xlsx").write_text("invalid latest")
            with self.assertRaises(Exception):
                exporter.export_latest(root, destination)
            self.assertEqual(destination.read_bytes(), previous)


if __name__ == "__main__":
    unittest.main()
