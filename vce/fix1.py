from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score, classification_report
from imblearn.over_sampling import SMOTE
import numpy as np
import pandas as pd

df = pd.read_csv("preprocessed_chemicals.csv")
fingerprints = np.load('fingerprints.npy')

X = fingerprints
y = df['Toxicity_Encoded'].values[:len(fingerprints)]

# Check current distribution
print("Before balancing:")
unique, counts = np.unique(y, return_counts=True)
for u, c in zip(unique, counts):
    print(f"  Class {u}: {c} records")

# ---- FIX 1: REMOVE UNKNOWN CLASS ----
# Unknown toxicity is noise — remove it from training
# Model should only learn from chemicals with known toxicity
known_mask = y != 0  # 0 = Unknown
X_known = X[known_mask]
y_known = y[known_mask]
print(f"\nAfter removing Unknown: {len(X_known)} records")

# ---- FIX 2: BALANCE CLASSES WITH SMOTE ----
# SMOTE creates synthetic samples for minority classes
# So all classes have equal representation
print("\nBalancing classes with SMOTE...")
smote = SMOTE(random_state=42)
X_balanced, y_balanced = smote.fit_resample(X_known, y_known)

print("After balancing:")
unique, counts = np.unique(y_balanced, return_counts=True)
for u, c in zip(unique, counts):
    print(f"  Class {u}: {c} records")

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X_balanced, y_balanced,
    test_size=0.2,
    random_state=42,
    stratify=y_balanced  # ensure equal class distribution in split
)

# ---- FIX 3: BETTER MODEL WITH CLASS WEIGHTS ----
clf = RandomForestClassifier(
    n_estimators=200,        # more trees = better accuracy
    class_weight='balanced', # penalize wrong predictions on minority classes
    max_depth=20,            # prevent overfitting
    min_samples_split=5,
    random_state=42,
    n_jobs=-1
)
clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)
f1 = f1_score(y_test, y_pred, average='weighted')
print(f"\nF1 Score: {f1:.3f}")
print(classification_report(
    y_test, y_pred,
    target_names=['Low','Moderate','High']
))