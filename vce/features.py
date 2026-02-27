import pandas as pd
import numpy as np
from rdkit import Chem
from rdkit.Chem import rdFingerprintGenerator
import pickle

df = pd.read_csv("preprocessed_chemicals.csv")
print(f"Total chemicals: {len(df)}")

# ---- GENERATE MORGAN FINGERPRINTS ----
# Fingerprint = unique number pattern for each chemical structure
# Like a fingerprint for humans — unique identifier

# Initialize generator once outside function (more efficient)
generator = rdFingerprintGenerator.GetMorganGenerator(
    radius=2,
    fpSize=1024
)

def generate_fingerprint(smiles):
    try:
        mol = Chem.MolFromSmiles(str(smiles))
        if mol is None:
            return None
        # Morgan fingerprint — captures chemical neighborhood
        fp = generator.GetFingerprint(mol)
        return list(fp)
    except:
        return None

print("Generating molecular fingerprints...")
print("This may take 5-10 minutes for 94k chemicals...")

fingerprints = []
valid_indices = []

for idx, row in df.iterrows():
    fp = generate_fingerprint(row['SMILES'])
    if fp is not None:
        fingerprints.append(fp)
        valid_indices.append(idx)
    
    if idx % 5000 == 0:
        print(f"Progress: {idx} / {len(df)}")

# Keep only valid chemicals
df_valid = df.loc[valid_indices].copy()
df_valid.reset_index(drop=True, inplace=True)

# Add fingerprints
fp_df = pd.DataFrame(
    fingerprints,
    columns=[f'FP_{i}' for i in range(1024)]
)

# Combine original data with fingerprints
df_final = pd.concat([df_valid, fp_df], axis=1)

print(f"\nValid chemicals with fingerprints: {len(df_final)}")
print(f"Total features: {len(df_final.columns)}")

# Save
df_final.to_csv("chemicals_with_fingerprints.csv", index=False)

# Save fingerprints separately for faster loading
np.save('fingerprints.npy', np.array(fingerprints))
print("Fingerprints saved!")