document.addEventListener('DOMContentLoaded', () => {

    // --- 0. Auth Guard & User Display ---
    // Only run auth guard on protected pages (not on auth.html)
    if (typeof requireAuth === 'function') {
        const user = requireAuth();
        if (user) {
            const displayName = getUserDisplayName(user);

            // Update welcome text if element exists
            const welcomeText = document.getElementById('welcomeText');
            if (welcomeText) {
                welcomeText.textContent = `Welcome, ${displayName}`;
            }

            // Update profile avatar if element exists
            const profileAvatar = document.getElementById('profileAvatar');
            if (profileAvatar) {
                const avatarName = encodeURIComponent(displayName);
                profileAvatar.src = `https://ui-avatars.com/api/?name=${avatarName}&background=1FAF9A&color=fff&bold=true`;
            }
        }
    }

    // --- 1. Number Counter Animation ---
    const counters = document.querySelectorAll('.counter');
    const speed = 200; // The lower the slower

    counters.forEach(counter => {
        const targetAttr = counter.getAttribute('data-target');
        if (!targetAttr) return;

        const target = parseFloat(targetAttr);
        const isDecimal = targetAttr.includes('.');

        const updateCount = () => {
            const current = parseFloat(counter.innerText) || 0;
            const inc = target / speed;

            if (current < target) {
                if (isDecimal) {
                    counter.innerText = (current + inc).toFixed(1);
                } else {
                    counter.innerText = Math.ceil(current + inc);
                }
                setTimeout(updateCount, 15);
            } else {
                counter.innerText = isDecimal ? target.toFixed(1) : Math.round(target);
            }
        };

        if (target > 0) {
            updateCount();
        }
    });

    // --- 2. Chart.js Initialization ---
    // Only initialize if we are on the dashboard (index.html)
    const toxCanvas = document.getElementById('toxicityChart');
    const perfCanvas = document.getElementById('performanceChart');

    if (toxCanvas && perfCanvas && typeof Chart !== 'undefined') {

        // Brand Colors
        const primary = '#1FAF9A';
        const primaryDark = '#0E8F83';
        const safe = '#2ECA7F';
        const warning = '#FFB020';
        const danger = '#FF5A5F';
        const bgGrid = 'rgba(0,0,0,0.03)';

        // Chart defaults
        Chart.defaults.font.family = 'Poppins, sans-serif';
        Chart.defaults.color = '#5B706E';

        // Toxicity Trend Chart (Line)
        new Chart(toxCanvas, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Avg Toxicity Level',
                    data: [4.2, 3.8, 3.1, 2.9, 2.6, 2.4],
                    borderColor: primary,
                    backgroundColor: 'rgba(31, 175, 154, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: 'white',
                    pointBorderColor: primary,
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(31, 45, 44, 0.9)',
                        padding: 12,
                        titleFont: { size: 13 },
                        bodyFont: { size: 14, weight: 'bold' },
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        grid: { color: bgGrid },
                        beginAtZero: true,
                        max: 6
                    }
                }
            }
        });

        // Alternative Performance (Bar)
        new Chart(perfCanvas, {
            type: 'bar',
            data: {
                labels: ['Thermal', 'Tensile', 'Flexibility', 'Durability'],
                datasets: [
                    {
                        label: 'Original (BPA)',
                        data: [85, 90, 60, 88],
                        backgroundColor: 'rgba(200, 200, 200, 0.5)',
                        borderRadius: 6
                    },
                    {
                        label: 'Alternative (Tritan)',
                        data: [82, 88, 75, 92],
                        backgroundColor: primary,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(31, 45, 44, 0.9)',
                        padding: 12,
                        titleFont: { size: 13 },
                        bodyFont: { size: 13 },
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        grid: { color: bgGrid },
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    // --- 3. Analyze Page Interactions ---
    const analyzeForm = document.getElementById('analyzeForm');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const resultsSection = document.getElementById('resultsSection');

    if (analyzeForm) {
        analyzeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const chemName = document.getElementById('chemName').value || 'Unknown Chemical';
            const smiles = document.getElementById('smiles').value.trim();
            const industry = document.getElementById('industry').value;

            if (!smiles) { alert('Please enter a SMILES notation.'); return; }

            // Show loading
            analyzeForm.style.display = 'none';
            document.getElementById('cardTitle').innerText = 'Querying PubChem...';
            loadingOverlay.style.display = 'flex';

            try {
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ smiles, chemicalName: chemName, industry })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Analysis failed.');
                }

                // Hide loading, show results
                loadingOverlay.style.display = 'none';
                document.getElementById('cardTitle').innerText = 'Analysis Results: ' + (data.compound.name || chemName);
                renderResults(data);
                resultsSection.classList.add('show');

            } catch (error) {
                loadingOverlay.style.display = 'none';
                document.getElementById('cardTitle').innerText = 'Analysis Failed';
                alert(error.message || 'Failed to analyze. Please check the SMILES notation.');
                analyzeForm.style.display = 'block';
            }
        });
    }

});

// ===== Render Results from PubChem API =====
function renderResults(data) {
    const { compound, scores, hazardStatements, alternatives } = data;

    // --- Compound Info ---
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('resultIupac', compound.iupacName);
    setEl('resultFormula', compound.formula);
    setEl('resultMW', compound.molecularWeight + ' g/mol');
    setEl('resultCID', compound.cid);
    setEl('resultXLogP', compound.xLogP !== undefined ? compound.xLogP : 'N/A');

    // --- Score Circles ---
    updateCircle('toxCircle', 'toxValue', scores.toxicity, 10, getScoreColor(scores.toxicity, true));
    updateCircle('ecoCircle', 'ecoValue', scores.eco, 10, getScoreColor(scores.eco, false));
    updateCircle('perfCircle', 'perfValue', scores.performance, 10, getScoreColor(scores.performance, false));

    // --- Hazard Statements ---
    const hazardSection = document.getElementById('hazardSection');
    const hazardList = document.getElementById('hazardList');
    if (hazardStatements && hazardStatements.length > 0) {
        hazardList.innerHTML = hazardStatements.map(h =>
            `<div style="padding:8px 12px; background:rgba(255,90,95,0.06); border-radius:8px; font-size:0.85rem; color:var(--text-main);">${h}</div>`
        ).join('');
        hazardSection.style.display = 'block';
    } else {
        hazardSection.style.display = 'none';
    }

    // --- Alternatives Table ---
    const altContainer = document.getElementById('alternativesContainer');
    const altBody = document.getElementById('alternativesBody');
    if (alternatives && alternatives.length > 0) {
        altBody.innerHTML = alternatives.map(alt => {
            const statusClass = alt.status === 'Safe' ? 'safe' : alt.status === 'Medium' ? 'warning' : 'danger';
            return `<tr>
                <td>${alt.name}</td>
                <td>${alt.similarity}%</td>
                <td>${alt.toxicity}</td>
                <td><span class="status-tag ${statusClass}">${alt.status}</span></td>
            </tr>`;
        }).join('');
        altContainer.style.display = 'block';
    } else {
        altContainer.style.display = 'none';
    }
}

// Update a conic-gradient circle with score value
function updateCircle(circleId, valueId, score, max, color) {
    const circle = document.getElementById(circleId);
    const value = document.getElementById(valueId);
    if (circle && value) {
        const pct = (score / max) * 100;
        circle.style.background = `conic-gradient(${color} ${pct}%, var(--bg-color) 0)`;
        value.textContent = score;
    }
}

// Get color based on score (for toxicity: high=bad, for eco/perf: high=good)
function getScoreColor(score, isInverse) {
    if (isInverse) {
        // High toxicity is bad
        if (score >= 7) return 'var(--danger)';
        if (score >= 4) return 'var(--warning)';
        return 'var(--safe)';
    } else {
        // High eco/perf is good
        if (score >= 7) return 'var(--safe)';
        if (score >= 4) return 'var(--warning)';
        return 'var(--danger)';
    }
}

// Global function to reset the analyze form
window.resetForm = function () {
    const analyzeForm = document.getElementById('analyzeForm');
    const resultsSection = document.getElementById('resultsSection');

    resultsSection.classList.remove('show');
    document.getElementById('cardTitle').innerText = 'Analyze Chemical Form';
    analyzeForm.reset();
    analyzeForm.style.display = 'block';

    // Reset dynamic areas
    const hazardSection = document.getElementById('hazardSection');
    const altContainer = document.getElementById('alternativesContainer');
    if (hazardSection) hazardSection.style.display = 'none';
    if (altContainer) altContainer.style.display = 'none';
};
