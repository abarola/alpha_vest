"""Check the website export's inclusion, units, privacy and failed-refresh behavior."""
import csv
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("valuation_export", Path(__file__).with_name("export_valuation_map.py"))
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class ValuationExportTests(unittest.TestCase):
    def write_source(self, folder, overrides):
        base = {
            "ticker": "TEST", "price_to_tangible_book_at_current_price": "3",
            "yahoo_ttm_fcf_yield": ".08", "company_sleeve_market_weight_pct": ".025",
            "ttm_minus_5y_median_fcf_yield": "-.01",
            "portfolio_price_to_tangible_book_threshold": "6",
            "portfolio_yahoo_ttm_fcf_yield_threshold": ".04",
            "current_market_value_eur": "123456.78", "error": "private local path",
        }
        source = folder / "source.csv"
        with source.open("w", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=base)
            writer.writeheader()
            writer.writerows([{**base, **row} for row in overrides])
        return source

    def test_units_inclusion_and_public_fields(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            source = self.write_source(folder, [
                {"ticker": "VALID"},
                {"ticker": "NEGATIVE_YIELD", "yahoo_ttm_fcf_yield": "-.01"},
                {"ticker": "NO_BOOK", "price_to_tangible_book_at_current_price": "0"},
                {"ticker": "NO_YIELD", "yahoo_ttm_fcf_yield": ""},
                {"ticker": "NOT_FINITE", "price_to_tangible_book_at_current_price": "inf"},
            ])
            data = exporter.export(source, folder / "chart.json")
            self.assertEqual([r["ticker"] for r in data["companies"]], ["NEGATIVE_YIELD", "VALID"])
            self.assertEqual(data["excludedCount"], 3)
            company = data["companies"][1]
            self.assertEqual((company["fcfYield"], company["weight"], company["changeVsMedian"]), (.08, .025, -.01))
            self.assertIsNone(company["detailsUrl"])
            text = json.dumps(data)
            self.assertNotIn("123456.78", text)
            self.assertNotIn("private local path", text)
            self.assertNotIn("current_market_value_eur", text)

    def test_failed_refresh_preserves_last_valid_export(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            output = folder / "chart.json"
            source = self.write_source(folder, [{}])
            exporter.export(source, output)
            previous = output.read_bytes()
            source = self.write_source(folder, [{"portfolio_price_to_tangible_book_threshold": "nan"}])
            with self.assertRaises(ValueError):
                exporter.export(source, output)
            self.assertEqual(output.read_bytes(), previous)


if __name__ == "__main__":
    unittest.main()
