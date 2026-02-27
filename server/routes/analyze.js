const express = require('express');
const router = express.Router();

// ===== PubChem API Integration =====
// Uses PubChem PUG REST API (free, no API key needed)

const PUBCHEM_BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const PUBCHEM_VIEW = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug_view';

/**
 * POST /api/analyze
 * Analyze a chemical by SMILES notation using PubChem API
 */
router.post('/', async (req, res) => {
    try {
        const { smiles, chemicalName, industry } = req.body;

        if (!smiles) {
            return res.status(400).json({ error: 'SMILES notation is required.' });
        }

        // Step 1: Get compound properties from PubChem via SMILES
        const encodedSmiles = encodeURIComponent(smiles);
        const propsUrl = `${PUBCHEM_BASE}/compound/smiles/${encodedSmiles}/property/MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,Complexity,TPSA,ExactMass,IsomericSMILES,IUPACName,MolecularFormula/JSON`;

        const propsResponse = await fetch(propsUrl);

        if (!propsResponse.ok) {
            return res.status(404).json({
                error: 'Chemical not found in PubChem. Please verify the SMILES notation.'
            });
        }

        const propsData = await propsResponse.json();
        const props = propsData.PropertyTable.Properties[0];
        const cid = props.CID;

        // Step 2: Get GHS hazard classification for toxicity info
        let hazardStatements = [];
        let toxicityLevel = 'Low';
        try {
            const ghsUrl = `${PUBCHEM_VIEW}/data/compound/${cid}/JSON?heading=GHS+Classification`;
            const ghsResponse = await fetch(ghsUrl);
            if (ghsResponse.ok) {
                const ghsData = await ghsResponse.json();
                hazardStatements = extractHazardStatements(ghsData);
            }
        } catch (e) {
            // GHS data not available for all compounds — that's okay
        }

        // Step 3: Calculate scores based on molecular properties
        const toxicityScore = calculateToxicityScore(props, hazardStatements);
        const ecoScore = calculateEcoScore(props, hazardStatements);
        const performanceScore = calculatePerformanceScore(props, industry);

        // Step 4: Search for similar (alternative) compounds
        let alternatives = [];
        try {
            const simUrl = `${PUBCHEM_BASE}/compound/fastsimilarity_2d/smiles/${encodedSmiles}/property/IUPACName,MolecularWeight,XLogP,TPSA,Complexity,HBondDonorCount,HBondAcceptorCount,IsomericSMILES,MolecularFormula/JSON?Threshold=80&MaxRecords=8`;
            const simResponse = await fetch(simUrl);
            if (simResponse.ok) {
                const simData = await simResponse.json();
                alternatives = processAlternatives(simData, props, cid, hazardStatements);
            }
        } catch (e) {
            // Similarity search may fail for some compounds
        }

        // Step 5: Return full analysis
        res.json({
            compound: {
                name: chemicalName || props.IUPACName || 'Unknown Compound',
                iupacName: props.IUPACName || 'N/A',
                formula: props.MolecularFormula || 'N/A',
                smiles: props.IsomericSMILES || smiles,
                cid: cid,
                molecularWeight: parseFloat(props.MolecularWeight),
                xLogP: props.XLogP,
                tpsa: props.TPSA,
                complexity: props.Complexity,
                hBondDonors: props.HBondDonorCount,
                hBondAcceptors: props.HBondAcceptorCount
            },
            scores: {
                toxicity: toxicityScore,
                eco: ecoScore,
                performance: performanceScore
            },
            hazardStatements: hazardStatements.slice(0, 5),
            alternatives: alternatives
        });

    } catch (error) {
        console.error('Analyze error:', error);
        res.status(500).json({ error: 'Analysis failed. Please try again.' });
    }
});

// ===== Score Calculation Functions =====

/**
 * Calculate toxicity score (0-10, lower is safer)
 * Uses Lipinski-style rules + GHS hazard data
 */
function calculateToxicityScore(props, hazards) {
    let score = 1.0; // Start at baseline

    // XLogP: higher means more lipophilic → more likely to bioaccumulate
    if (props.XLogP !== undefined) {
        if (props.XLogP > 5) score += 2.5;
        else if (props.XLogP > 3) score += 1.5;
        else if (props.XLogP > 1) score += 0.5;
    }

    // Molecular weight: very large molecules can be more toxic
    const mw = parseFloat(props.MolecularWeight);
    if (mw > 500) score += 1.5;
    else if (mw > 300) score += 0.8;

    // Complexity: higher complexity can correlate with reactivity
    if (props.Complexity > 600) score += 1.5;
    else if (props.Complexity > 300) score += 0.8;

    // TPSA: very low TPSA → easily crosses membranes → more toxic potential
    if (props.TPSA < 20) score += 1.5;
    else if (props.TPSA < 40) score += 0.8;

    // GHS Hazard statements boost the score significantly
    const dangerKeywords = ['fatal', 'toxic', 'cancer', 'mutagenic', 'reproductive', 'organ damage'];
    const warningKeywords = ['harmful', 'irritation', 'sensitization', 'drowsiness'];

    for (const h of hazards) {
        const lower = h.toLowerCase();
        if (dangerKeywords.some(k => lower.includes(k))) score += 1.5;
        else if (warningKeywords.some(k => lower.includes(k))) score += 0.5;
    }

    return Math.min(10, Math.round(score * 10) / 10);
}

/**
 * Calculate eco score (0-10, higher is more eco-friendly)
 */
function calculateEcoScore(props, hazards) {
    let score = 8.0; // Start optimistic

    // XLogP: high lipophilicity → poor biodegradability
    if (props.XLogP > 5) score -= 3.0;
    else if (props.XLogP > 3) score -= 1.5;
    else if (props.XLogP > 1) score -= 0.5;

    // Molecular weight: larger molecules harder to biodegrade
    const mw = parseFloat(props.MolecularWeight);
    if (mw > 500) score -= 2.0;
    else if (mw > 300) score -= 1.0;

    // Complexity: more complex = harder to break down naturally
    if (props.Complexity > 600) score -= 1.5;
    else if (props.Complexity > 300) score -= 0.5;

    // Environmental hazard statements
    const envKeywords = ['aquatic', 'environment', 'ozone', 'persist'];
    for (const h of hazards) {
        const lower = h.toLowerCase();
        if (envKeywords.some(k => lower.includes(k))) score -= 1.5;
    }

    return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

/**
 * Calculate performance score (0-10) based on drug-likeness / industrial utility
 */
function calculatePerformanceScore(props, industry) {
    let score = 5.0;

    // Lipinski's Rule of Five (drug-likeness proxy for performance)
    const mw = parseFloat(props.MolecularWeight);
    let lipinskiPass = 0;
    if (mw <= 500) lipinskiPass++;
    if (props.XLogP !== undefined && props.XLogP <= 5) lipinskiPass++;
    if (props.HBondDonorCount <= 5) lipinskiPass++;
    if (props.HBondAcceptorCount <= 10) lipinskiPass++;

    score += lipinskiPass * 1.0;

    // TPSA in sweet spot (20-140) is ideal
    if (props.TPSA >= 20 && props.TPSA <= 140) score += 1.0;

    return Math.min(10, Math.round(score * 10) / 10);
}

/**
 * Extract GHS hazard statement strings from PubChem response
 */
function extractHazardStatements(ghsData) {
    const statements = [];
    try {
        const sections = ghsData.Record.Section;
        for (const section of sections) {
            const json = JSON.stringify(section);
            // Extract H-statements like "H302: Harmful if swallowed"
            const matches = json.match(/H\d{3}[^"]{0,100}/g);
            if (matches) {
                for (const m of matches) {
                    const clean = m.replace(/\\[nt]/g, ' ').trim();
                    if (!statements.includes(clean) && clean.length > 4) {
                        statements.push(clean);
                    }
                }
            }
        }
    } catch (e) { /* ignore parse errors */ }
    return [...new Set(statements)];
}

/**
 * Process similar compounds into alternatives table data
 */
function processAlternatives(simData, originalProps, originalCid, originalHazards) {
    const compounds = simData.PropertyTable.Properties;
    const origMW = parseFloat(originalProps.MolecularWeight);

    return compounds
        .filter(c => c.CID !== originalCid) // exclude the original
        .slice(0, 5) // max 5 alternatives
        .map(alt => {
            const altMW = parseFloat(alt.MolecularWeight);
            // Similarity based on molecular weight closeness (simplified Tanimoto proxy)
            const mwSim = 1 - Math.abs(altMW - origMW) / Math.max(altMW, origMW);
            const similarity = Math.round(mwSim * 100);

            // Quick toxicity estimate for the alternative
            const altTox = calculateToxicityScore(alt, []);

            let status = 'Safe';
            if (altTox > 6) status = 'High Risk';
            else if (altTox > 3.5) status = 'Medium';

            return {
                name: alt.IUPACName || `CID-${alt.CID}`,
                cid: alt.CID,
                similarity: similarity,
                toxicity: altTox,
                formula: alt.MolecularFormula || 'N/A',
                status: status
            };
        })
        .sort((a, b) => a.toxicity - b.toxicity); // safest first
}

module.exports = router;
