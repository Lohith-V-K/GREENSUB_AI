import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import pickle

df = pd.read_csv("final_chemical_dataset.csv")
print(f"Before cleaning: {df.shape}")

# ---- FILL MISSING VALUES ----
numerical_cols = [
    'MolecularWeight', 'XLogP', 'TPSA',
    'HBondDonorCount', 'HBondAcceptorCount',
    'RotatableBondCount', 'HeavyAtomCount',
    'Complexity', 'Charge'
]

# Fill numbers with median
for col in numerical_cols:
    if col in df.columns:
        median_val = df[col].median()
        df[col].fillna(median_val, inplace=True)
        print(f"Filled {col} missing values with {median_val}")

# Fill text with Unknown
df['IUPACName'].fillna('Unknown', inplace=True)
df['Toxicity_Label'].fillna('Unknown', inplace=True)

print(f"\nAfter cleaning: {df.shape}")
print(f"Missing values remaining: {df.isnull().sum().sum()}")

# ---- ENCODE TOXICITY ----
# Convert text labels to numbers for ML
toxicity_map = {
    'High Toxic': 3,
    'Moderate Toxic': 2,
    'Low Toxic': 1,
    'Unknown': 0
}
df['Toxicity_Encoded'] = df['Toxicity_Label'].map(toxicity_map)
print("\nToxicity encoding:")
print(df[['Toxicity_Label','Toxicity_Encoded']].drop_duplicates())

# ---- SCALE FEATURES ----
# Make all numbers in same range
# So MolecularWeight(500) doesn't overpower Charge(1)
scaler = StandardScaler()
df[numerical_cols] = scaler.fit_transform(df[numerical_cols])
print("\nScaling done — all features in same range")

# Save scaler for later use
with open('scaler.pkl', 'wb') as f:
    pickle.dump(scaler, f)

# Save clean data
df.to_csv("preprocessed_chemicals.csv", index=False)
print("\nPreprocessed data saved!")
print(df[numerical_cols].describe().round(2))