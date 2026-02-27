import pandas as pd

# Load your data
df = pd.read_csv("pubchem_chemicals.csv")
print(f"Your data: {len(df)} records")

# Load Tox21
tox = pd.read_csv("tox21.csv")
print(f"Tox21 records: {len(tox)}")
print(f"Tox21 columns: {tox.columns.tolist()}")

# ---- STEP 1: MERGE TOX21 REAL DATA ----
# Merge on SMILES column
merged = pd.merge(
    df,
    tox,
    left_on='SMILES',
    right_on='smiles',
    how='left'
)

# ---- STEP 2: CALCULATE TOXICITY FOR REMAINING ----
def calculated_score(row):
    score = 0
    try:
        if float(row.get('XLogP', 0) or 0) > 5:
            score += 2
        elif float(row.get('XLogP', 0) or 0) > 3:
            score += 1
        if float(row.get('MolecularWeight', 0) or 0) > 500:
            score += 2
        elif float(row.get('MolecularWeight', 0) or 0) > 300:
            score += 1
        if float(row.get('Complexity', 0) or 0) > 500:
            score += 2
        elif float(row.get('Complexity', 0) or 0) > 200:
            score += 1
        if float(row.get('TPSA', 0) or 0) < 20:
            score += 2
        elif float(row.get('TPSA', 0) or 0) < 60:
            score += 1
        if float(row.get('HBondDonorCount', 0) or 0) > 5:
            score += 1
        if float(row.get('HBondAcceptorCount', 0) or 0) > 10:
            score += 1
    except:
        score = 0

    if score >= 7:
        return 3, "High Toxic", "Calculated"
    elif score >= 4:
        return 2, "Moderate Toxic", "Calculated"
    elif score >= 1:
        return 1, "Low Toxic", "Calculated"
    else:
        return 0, "Unknown", "Calculated"

# ---- STEP 3: COMBINE BOTH ----
def assign_final_toxicity(row):
    # Check if Tox21 real data exists for this chemical
    # Tox21 has columns like NR-AR, SR-HSE etc (12 assays)
    tox21_cols = [col for col in row.index 
                  if col.startswith('NR-') or col.startswith('SR-')]
    
    if tox21_cols:
        tox_values = [row[col] for col in tox21_cols 
                     if pd.notna(row[col])]
        
        if tox_values:
            # Real Tox21 data available
            max_tox = max(tox_values)
            if max_tox == 1:
                return 3, "High Toxic", "Real-Tox21"
            else:
                return 1, "Low Toxic", "Real-Tox21"
    
    # No real data — use calculated
    score, label, source = calculated_score(row)
    return score, label, source

print("\nAssigning toxicity...")
results = merged.apply(assign_final_toxicity, axis=1)
merged['Toxicity_Score'] = results.apply(lambda x: x[0])
merged['Toxicity_Label'] = results.apply(lambda x: x[1])
merged['Toxicity_Source'] = results.apply(lambda x: x[2])

# ---- SHOW RESULTS ----
print("\n=== FINAL TOXICITY DISTRIBUTION ===")
print(merged['Toxicity_Label'].value_counts())

print("\n=== DATA SOURCE DISTRIBUTION ===")
print(merged['Toxicity_Source'].value_counts())

# Save
merged.to_csv("final_chemical_dataset.csv", index=False)
merged.to_excel("final_chemical_dataset.xlsx", index=False)
print(f"\nDone! Total: {len(merged)} records")
print(merged[[
    'CID', 'IUPACName',
    'Toxicity_Score',
    'Toxicity_Label',
    'Toxicity_Source'
]].head(10))