import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.neighbors import NearestNeighbors
import pickle

df = pd.read_csv("preprocessed_chemicals.csv")

# Load fingerprints
fingerprints = np.load('fingerprints.npy')
print(f"Fingerprints shape: {fingerprints.shape}")

# ---- BUILD NEAREST NEIGHBOR MODEL ----
# This finds most similar chemicals efficiently
print("Building similarity model...")
similarity_model = NearestNeighbors(
    n_neighbors=20,    # find 20 most similar
    metric='jaccard',  # best metric for fingerprints
    algorithm='ball_tree',
    n_jobs=-1          # use all CPU cores
)
similarity_model.fit(fingerprints)
print("Similarity model built!")

# Save model
with open('similarity_model.pkl', 'wb') as f:
    pickle.dump(similarity_model, f)
print("Model saved!")

# Test similarity model
def test_similarity(chemical_name):
    matches = df[
        df['IUPACName'].str.contains(
            chemical_name, case=False, na=False
        )
    ]
    
    if len(matches) == 0:
        print(f"'{chemical_name}' not found!")
        return
    
    target = matches.iloc[0]
    target_idx = target.name
    
    print(f"\nSearching for: {target['IUPACName']}")
    print(f"Toxicity: {target['Toxicity_Label']}")
    
    # Find similar chemicals
    target_fp = fingerprints[target_idx].reshape(1, -1)
    distances, indices = similarity_model.kneighbors(target_fp)
    
    print(f"\nTop 10 similar chemicals:")
    for i, (dist, idx) in enumerate(
        zip(distances[0], indices[0])
    ):
        chem = df.iloc[idx]
        similarity = 1 - dist
        print(f"{i+1}. {chem['IUPACName'][:40]} "
              f"| Similarity: {similarity:.2f} "
              f"| Toxicity: {chem['Toxicity_Label']}")

# Test
test_similarity("benzene")