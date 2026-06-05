import json
import os
import re

def main():
    csv_file = 'docs/raw/qld-deducted.csv'
    json_file = 'data/qld-history.json'
    
    if not os.path.exists(csv_file):
        print(f"CSV file {csv_file} not found.")
        return
    
    if not os.path.exists(json_file):
        print(f"JSON file {json_file} not found.")
        return

    # Load existing JSON
    with open(json_file, 'r', encoding='utf-8') as f:
        history = {item['month']: item for item in json.load(f)}

    print(f"Loaded {len(history)} months from existing JSON.")

    # Parse CSV
    new_entries = {}
    date_range_start = "2000-03-01"
    date_range_end = "2006-06-01"

    # The pre-inception backfill in qld-deducted.csv is a synthetic 2x-QQQ series
    # whose basis is missing one of QLD's later 2:1 forward splits, so it sits at
    # exactly 2x the scale of the real (split-adjusted) prices that start 2006-07.
    # Divide by the split factor so the backfill joins the real series continuously
    # (without this, 2006-06 -> 2006-07 shows an artificial ~-54% cliff). See issue #28.
    SPLIT_FACTOR = 2.0

    with open(csv_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            
            # Match date format YYYY-MM-DD
            match = re.search(r'(\d{4}-\d{2}-\d{2})', line)
            if match:
                date_str = match.group(1)
                if date_range_start <= date_str <= date_range_end:
                    # Split by any whitespace
                    parts = line.split()
                    # Parts should be: Date, Low, Close
                    if len(parts) >= 3:
                        dt = parts[0]
                        low = float(parts[1]) / SPLIT_FACTOR
                        close = float(parts[2]) / SPLIT_FACTOR
                        month = dt[:7]

                        # Use the same key format as in the existing JSON
                        new_entries[month] = {
                            "month": month,
                            "low": round(low, 2),
                            "close": round(close, 2)
                        }

    print(f"Found {len(new_entries)} new months in CSV.")

    # Update history with new entries
    # We only add if not already present or as requested specifically for the range
    history.update(new_entries)

    # Sort by month
    sorted_history = sorted(history.values(), key=lambda x: x['month'])

    # Save back to JSON
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(sorted_history, f, indent=2, ensure_ascii=False)

    print(f"Total months in updated JSON: {len(sorted_history)}")
    print(f"Updated {json_file} successfully.")

if __name__ == "__main__":
    main()
