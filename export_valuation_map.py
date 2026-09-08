"""Export only public chart fields from the existing valuation analysis.

Run after portfolio_as_company_analysis; also called by the portfolio publisher.
No network calls or changes to financial calculations.
"""
import argparse
import csv
import json
import math
from pathlib import Path

SITE = Path(__file__).resolve().parent
DEFAULT_SOURCE = (SITE.parent / "Portfolio_analysis/company_analysis/financial_statement"
                  / "Output/portfolio_as_company/portfolio_company_yahoo_ttm_fcf.csv")


def number(row, key):
    try:
        value = float(row[key])
        return value if math.isfinite(value) else None
    except (KeyError, TypeError, ValueError):
        return None


def export(source, destination):
    with source.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        raise ValueError("Valuation source is empty")
    reference = {
        "priceToBook": number(rows[0], "portfolio_price_to_tangible_book_threshold"),
        "fcfYield": number(rows[0], "portfolio_yahoo_ttm_fcf_yield_threshold"),
    }
    if any(value is None for value in reference.values()) or reference["priceToBook"] <= 0:
        raise ValueError("Valuation reference levels are missing or invalid")
    companies = []
    for row in rows:
        price_to_book = number(row, "price_to_tangible_book_at_current_price")
        fcf_yield = number(row, "yahoo_ttm_fcf_yield")
        if price_to_book is None or price_to_book <= 0 or fcf_yield is None:
            continue  # Same inclusion rule as the existing logarithmic chart.
        ticker = row["ticker"]
        detail = SITE / "stocks" / f"{ticker}-US.html"
        companies.append({
            "ticker": ticker,
            "priceToBook": price_to_book,
            "fcfYield": fcf_yield,
            "weight": number(row, "company_sleeve_market_weight_pct"),
            "changeVsMedian": number(row, "ttm_minus_5y_median_fcf_yield"),
            "periodEnd": row.get("ttm_period_end") or None,
            "retrievedAt": row.get("fetched_at_utc") or None,
            "detailsUrl": f"stocks/{detail.name}" if detail.is_file() else None,
        })
    if not companies:
        raise ValueError("No plottable companies in valuation source")
    payload = {
        "schemaVersion": 1,
        "source": "Yahoo Finance TTM cash flow and portfolio valuation analysis",
        "reference": reference,
        "excludedCount": len(rows) - len(companies),
        "companies": sorted(companies, key=lambda row: row["ticker"]),
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temporary.replace(destination)
    return payload


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=SITE / "data/valuation-map.json")
    args = parser.parse_args()
    result = export(args.source, args.output)
    print(f"Exported {len(result['companies'])} companies to {args.output}")
