import json
import os
import sys
from bs4 import BeautifulSoup

def parse_french_date(date_str):
    # Mapping for French month abbreviations used in the HTML
    months_map = {
        'janv.': '01', 'févr.': '02', 'mars': '03', 'avr.': '04',
        'mai': '05', 'juin': '06', 'juil.': '07', 'août': '08',
        'sept.': '09', 'oct.': '10', 'nov.': '11', 'déc.': '12'
    }
    
    parts = date_str.split(' ')
    if len(parts) == 3:
        day = parts[0].zfill(2)
        month = months_map.get(parts[1], '01')
        year = parts[2]
        return f"{year}-{month}-{day}"
    return None

def clean_number(num_str):
    if not num_str:
        return 0.0
    # The HTML uses comma as decimal separator and space/non-breaking space as thousands separator
    cleaned = num_str.replace('\u202f', '').replace('\u200b', '').replace(' ', '').replace(',', '.')
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

def process_history(input_file, output_file):
    if not os.path.exists(input_file):
        print(f"File {input_file} not found.")
        return

    print(f"Processing {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    tbody = soup.find('tbody')
    if not tbody:
        print(f"Could not find tbody in {input_file}")
        return

    table_rows = tbody.find_all('tr')
    
    daily_data = []

    for row in table_rows:
        cols = row.find_all('td')
        # Skip rows that don't have enough columns (e.g., dividend rows)
        if len(cols) < 5:
            continue
            
        date_str = cols[0].get_text(strip=True)
        # Plus bas is the 4th column (index 3)
        low_str = cols[3].get_text(strip=True)
        # Fermeture is the 5th column (index 4)
        close_str = cols[4].get_text(strip=True)
        
        iso_date = parse_french_date(date_str)
        if iso_date:
            daily_data.append({
                'date': iso_date,
                'low': clean_number(low_str),
                'close': clean_number(close_str),
                'month': iso_date[:7] # YYYY-MM
            })

    # Group by month
    monthly_stats = {}
    for entry in daily_data:
        month = entry['month']
        if month not in monthly_stats:
            monthly_stats[month] = {
                'month': month,
                'low': entry['low'],
                'close': entry['close'],
                'last_date': entry['date'] # To track closing price of the month
            }
        else:
            # Update monthly low
            if entry['low'] < monthly_stats[month]['low']:
                monthly_stats[month]['low'] = entry['low']
            
            # The HTML seems to be in reverse chronological order. 
            if entry['date'] > monthly_stats[month]['last_date']:
                monthly_stats[month]['last_date'] = entry['date']
                monthly_stats[month]['close'] = entry['close']

    # Sort results by month ascending
    results = sorted(monthly_stats.values(), key=lambda x: x['month'])
    
    # Clean up last_date from final output
    for res in results:
        del res['last_date']

    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"Successfully processed {len(results)} months of data from {input_file}.")
    print(f"Result saved to {output_file}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        # Default for QLD as requested
        process_history('docs/raw/qld-history.html', 'data/qld-history.json')
    else:
        process_history(sys.argv[1], sys.argv[2])
