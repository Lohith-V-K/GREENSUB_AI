import pandas as pd
import glob

# Pick up all checkpoint files from Desktop
files = glob.glob("checkpoint_*.csv")
print(f"Found {len(files)} checkpoint files: {files}")

# Merge all of them
df = pd.concat([pd.read_csv(f) for f in files], ignore_index=True)

# Remove duplicates
df.drop_duplicates(inplace=True)
df.reset_index(drop=True, inplace=True)

# Show actual column names
print("Columns found:", df.columns.tolist())
print(f"Total records recovered: {len(df)}")

# Save as CSV and Excel
df.to_csv("pubchem_chemicals.csv", index=False)
df.to_excel("pubchem_chemicals.xlsx", index=False)

print("Done! Files saved as pubchem_chemicals.csv and pubchem_chemicals.xlsx")