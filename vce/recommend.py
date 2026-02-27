import pandas as pd
import numpy as np
import pickle

df = pd.read_csv("preprocessed_chemicals.csv")
fingerprints = np.load('fingerprints.npy')

with open('similarity_model.pkl', 'rb') as f:
    similarity_model = pickle.load(f)

def recommend_replacements(chemical_name, top_n=5):
    print(f"\n{'='*50}")
    print(f"CHEMICAL REPLACEMENT RECOMMENDER")
    print(f"{'='*50}")
    
    # Find chemical
    matches = df[
        df['IUPACName'].str.contains(
            chemical_name, case=False, na=False
        )
    ]
    
    if len(matches) == 0:
        print(f"Chemical '{chemical_name}' not found!")
        print("Try a different name or check spelling.")
        return None
    
    target = matches.iloc[0]
    target_idx = target.name
    target_tox = target['Toxicity_Encoded']
    
    print(f"\nINPUT CHEMICAL:")
    print(f"Name       : {target['IUPACName']}")
    print(f"CID        : {target['CID']}")
    print(f"Toxicity   : {target['Toxicity_Label']}")
    print(f"Mol Weight : {target['MolecularWeight']:.2f}")
    print(f"XLogP      : {target['XLogP']:.2f}")
    
    # Find similar
    target_fp = fingerprints[target_idx].reshape(1, -1)
    distances, indices = similarity_model.kneighbors(
        target_fp, n_neighbors=100
    )
    
    # Filter and rank
    recommendations = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx == target_idx:
            continue
        
        chem = df.iloc[idx]
        similarity = 1 - dist
        
        if chem['Toxicity_Encoded'] < target_tox:
            # Calculate overall score
            # Higher similarity + Lower toxicity = Better score
            tox_improvement = target_tox - chem['Toxicity_Encoded']
            overall_score = (similarity * 0.6) + (tox_improvement * 0.4)
            
            recommendations.append({
                'Rank': 0,
                'CID': chem['CID'],
                'Chemical_Name': chem['IUPACName'][:50],
                'Similarity_%': round(similarity * 100, 1),
                'Toxicity': chem['Toxicity_Label'],
                'Toxicity_Improvement': tox_improvement,
                'Overall_Score': round(overall_score, 3),
                'Data_Source': chem['Toxicity_Source']
            })
    
    if not recommendations:
        print("\nNo safer replacements found!")
        return None
    
    # Sort by overall score
    result_df = pd.DataFrame(recommendations)
    result_df = result_df.sort_values(
        'Overall_Score', ascending=False
    ).head(top_n)
    result_df['Rank'] = range(1, len(result_df) + 1)
    
    print(f"\nTOP {top_n} RECOMMENDED REPLACEMENTS:")
    print(f"{'='*50}")
    print(result_df[[
        'Rank', 'Chemical_Name',
        'Similarity_%', 'Toxicity',
        'Overall_Score', 'Data_Source'
    ]].to_string(index=False))
    
    # Save results
    result_df.to_csv(
        f"recommendations_{chemical_name}.csv",
        index=False
    )
    print(f"\nResults saved!")
    return result_df

# Test
recommend_replacements("benzene", top_n=5)
recommend_replacements("toluene", top_n=5)