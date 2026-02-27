import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Load dataset
df = pd.read_csv("final_chemical_dataset.csv")

print("=== BASIC INFO ===")
print(f"Total records: {len(df)}")
print(f"Total columns: {len(df.columns)}")
print(f"Columns: {df.columns.tolist()}")

print("\n=== FIRST 5 ROWS ===")
print(df.head())

print("\n=== MISSING VALUES ===")
print(df.isnull().sum())

print("\n=== BASIC STATISTICS ===")
print(df.describe())

print("\n=== TOXICITY DISTRIBUTION ===")
print(df['Toxicity_Label'].value_counts())

print("\n=== TOXICITY SOURCE ===")
print(df['Toxicity_Source'].value_counts())

# Plot toxicity distribution
plt.figure(figsize=(10, 6))
df['Toxicity_Label'].value_counts().plot(kind='bar', color=[
    'red', 'orange', 'green', 'gray'
])
plt.title('Toxicity Distribution of 94k Chemicals')
plt.xlabel('Toxicity Level')
plt.ylabel('Number of Chemicals')
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig('toxicity_distribution.png')
plt.show()
print("\nChart saved as toxicity_distribution.png")