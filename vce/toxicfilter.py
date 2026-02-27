import pandas as pd
import numpy as np
import pickle

df = pd.read_csv("preprocessed_chemicals.csv")
fingerprints = np.load('fingerprints.npy')

with open('similarity_model.pkl', 'rb') as f:
    similarity_model = pickle.load(f)

def filter_safer_chemicals(
    chemical_name,
    top_n=10
):
    # Find target chemical
    matches = df[
        df['IUPACName'].str.contains(
            chemical_name, case=False, na=False
        )
    ]
    
    if len(matches) == 0:
        print(f"'{chemical_name}' not found!")
        return None
    
    target = matches.iloc[0]
    target_idx = target.name
    target_tox = target['Toxicity_Encoded']
    
    print(f"\nInput Chemical: {target['IUPACName']}")
    print(f"Toxicity Level: {target['Toxicity_Label']}")
    print(f"Molecular Weight: {target['MolecularWeight']:.2f}")
    
    if target_tox == 0:
        print("Already unknown/low toxicity!")
    
    # Find 50 most similar
    target_fp = fingerprints[target_idx].reshape(1, -1)
    distances, indices = similarity_model.kneighbors(
        target_fp,
        n_neighbors=50
    )
    
    # Filter safer ones
    safer_chemicals = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx == target_idx:
            continue
        
        candidate = df.iloc[idx]
        candidate_tox = candidate['Toxicity_Encoded']
        similarity = 1 - dist
        
        # Only keep if less toxic
        if candidate_tox < target_tox:
            safer_chemicals.append({
                'CID': candidate['CID'],
                'Name': candidate['IUPACName'],
                'Similarity': round(similarity, 3),
                'Toxicity_Score': candidate_tox,
                'Toxicity_Label': candidate['Toxicity_Label'],
                'MolecularWeight': candidate['MolecularWeight'],
                'Data_Source': candidate['Toxicity_Source']
            })
    
    if not safer_chemicals:
        print("No safer alternatives found!")
        return None
    
    # Sort by similarity
    result_df = pd.DataFrame(safer_chemicals)
    result_df = result_df.sort_values(
        'Similarity', ascending=False
    ).head(top_n)
    
    print(f"\n=== TOP {top_n} SAFER REPLACEMENTS ===")
    print(result_df.to_string(index=False))
    
    return result_df

# Test
filter_safer_chemicals("benzene", top_n=5)