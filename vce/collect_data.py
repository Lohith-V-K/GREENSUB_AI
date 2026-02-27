import requests
import pandas as pd
import time

# Properties to collect
PROPERTIES = [
    "MolecularFormula",
    "MolecularWeight",
    "IUPACName",
    "IsomericSMILES",
    "XLogP",
    "TPSA",
    "HBondDonorCount",
    "HBondAcceptorCount",
    "RotatableBondCount",
    "HeavyAtomCount",
    "Complexity",
    "Charge"
]

PROP_STRING = ",".join(PROPERTIES)
BASE_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{}/property/{}/JSON"

def fetch_batch(cid_batch):
    cids_str = ",".join(map(str, cid_batch))
    url = BASE_URL.format(cids_str, PROP_STRING)
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            data = response.json()
            return data.get('PropertyTable', {}).get('Properties', [])
        else:
            return []
    except Exception as e:
        print(f"Error fetching batch starting {cid_batch[0]}: {e}")
        return []

# ---- SETTINGS ----
BATCH_SIZE = 100          # 100 CIDs per API call
TOTAL_COMPOUNDS = 100000  # change to 10000 for quick test first
SAVE_EVERY = 5000         # save checkpoint every 5000 records

all_data = []
print("Starting collection... This will take ~2 hours for 1 lakh records")
print("Tip: Run a test first with TOTAL_COMPOUNDS = 1000\n")

for i in range(0, TOTAL_COMPOUNDS, BATCH_SIZE):
    batch = list(range(i + 1, i + BATCH_SIZE + 1))
    results = fetch_batch(batch)
    all_data.extend(results)

    # Show progress
    if i % 1000 == 0:
        print(f"Fetched {i} / {TOTAL_COMPOUNDS} compounds...")

    # Save checkpoint
    if i % SAVE_EVERY == 0 and i != 0:
        temp_df = pd.DataFrame(all_data)
        temp_df.to_csv(f"checkpoint_{i}.csv", index=False)
        print(f"Checkpoint saved at {i} records")

    time.sleep(0.3)  # don't overload the API

# ---- CLEAN DATA ----
print("\nCleaning data...")
df = pd.DataFrame(all_data)
df.dropna(subset=['IsomericSMILES', 'MolecularWeight'], inplace=True)
df.reset_index(drop=True, inplace=True)

# ---- SAVE CSV ----
df.to_csv("pubchem_chemicals.csv", index=False)
print(f"CSV saved! Total records: {len(df)}")

# ---- SAVE EXCEL ----
if len(df) <= 1048576:
    df.to_excel("pubchem_chemicals.xlsx", index=False)
    print("Excel saved!")
else:
    for idx, start in enumerate(range(0, len(df), 100000)):
        df[start:start+100000].to_excel(f"pubchem_part{idx+1}.xlsx", index=False)
    print("Excel saved in parts!")

print("\nDone! Files are in the same folder as your script.")
print(df.head())