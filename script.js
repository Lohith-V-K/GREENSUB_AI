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

    // --- 1. Dashboard Data ---
    const toxCanvas = document.getElementById('toxicityChart');
    const perfCanvas = document.getElementById('performanceChart');
    const dashActivityList = document.getElementById('dashActivityList');

    if (toxCanvas || perfCanvas || dashActivityList) {
        loadDashboard();
    }

    // --- Global Search ---
    const globalSearch = document.getElementById('globalSearch');
    const searchDropdown = document.getElementById('searchDropdown');
    if (globalSearch && searchDropdown) {
        let searchTimeout;
        globalSearch.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const q = globalSearch.value.trim().toLowerCase();
            if (q.length < 2) { searchDropdown.style.display = 'none'; return; }
            searchTimeout = setTimeout(() => runGlobalSearch(q), 300);
        });
        globalSearch.addEventListener('focus', () => {
            const q = globalSearch.value.trim().toLowerCase();
            if (q.length >= 2) runGlobalSearch(q);
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) searchDropdown.style.display = 'none';
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
                const token = localStorage.getItem('token');
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    },
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

    // --- 4. Notifications ---
    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const notifBadge = document.getElementById('notifBadge');
    const notifList = document.getElementById('notifList');
    const notifClear = document.getElementById('notifClear');

    if (notifBtn && notifDropdown) {
        // Toggle dropdown
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('show');
            if (notifDropdown.classList.contains('show')) {
                notifBadge.style.display = 'none';
                localStorage.setItem('notifs_seen', Date.now());
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
                notifDropdown.classList.remove('show');
            }
        });

        // Clear all
        if (notifClear) {
            notifClear.addEventListener('click', () => {
                localStorage.setItem('notifs_cleared', Date.now());
                notifList.innerHTML = '<div class="notif-empty">No notifications</div>';
                notifBadge.style.display = 'none';
            });
        }

        // Load notifications from history
        loadNotifications();
    }

    // --- 5. History Page ---
    const historyBody = document.getElementById('historyBody');
    if (historyBody) {
        loadHistory();

        // Live search
        const searchInput = document.getElementById('historySearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const q = searchInput.value.toLowerCase();
                document.querySelectorAll('.history-table tbody tr').forEach(row => {
                    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
                });
            });
        }
    }

    // --- 6. Reports Page ---
    const reportContent = document.getElementById('reportContent');
    if (reportContent) {
        loadReports();

        const exportBtn = document.getElementById('exportCSV');
        if (exportBtn) exportBtn.addEventListener('click', exportReportCSV);

        const printBtn = document.getElementById('printReport');
        if (printBtn) printBtn.addEventListener('click', () => window.print());
    }

});

// --- Dashboard Live Data ---
async function loadDashboard() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;

        const { analyses } = await response.json();
        if (!analyses || analyses.length === 0) {
            setDashEmpty();
            return;
        }

        const total = analyses.length;
        const avgTox = (analyses.reduce((s, a) => s + (a.scores?.toxicity || 0), 0) / total).toFixed(1);
        const avgEco = (analyses.reduce((s, a) => s + (a.scores?.eco || 0), 0) / total).toFixed(1);
        const avgPerf = (analyses.reduce((s, a) => s + (a.scores?.performance || 0), 0) / total).toFixed(1);

        // Update cards
        const el = id => document.getElementById(id);
        if (el('dashTotal')) el('dashTotal').textContent = total;
        if (el('dashAvgTox')) el('dashAvgTox').textContent = avgTox + '/10';
        if (el('dashAvgEco')) el('dashAvgEco').textContent = avgEco + '/10';
        if (el('dashAvgPerf')) el('dashAvgPerf').textContent = avgPerf + '/10';

        // Trend badges
        const toxLevel = parseFloat(avgTox);
        if (el('dashToxTrend')) {
            const cls = toxLevel >= 7 ? 'danger' : toxLevel >= 4 ? 'warning' : 'safe';
            el('dashToxTrend').className = `trend ${toxLevel < 4 ? 'down' : 'up'}`;
            el('dashToxTrend').textContent = toxLevel < 4 ? '↓ Low risk' : toxLevel < 7 ? '→ Moderate' : '↑ High risk';
        }
        if (el('dashTotalTrend')) el('dashTotalTrend').textContent = `${total} total`;
        if (el('dashEcoTrend')) {
            const ecoVal = parseFloat(avgEco);
            el('dashEcoTrend').textContent = ecoVal >= 6 ? '↑ Good' : ecoVal >= 3 ? '→ Fair' : '↓ Low';
        }
        if (el('dashPerfTrend')) {
            const perfVal = parseFloat(avgPerf);
            el('dashPerfTrend').textContent = perfVal >= 7 ? '↑ Strong' : perfVal >= 4 ? '→ Average' : '↓ Weak';
        }

        // --- Charts ---
        if (typeof Chart !== 'undefined') {
            Chart.defaults.font.family = 'Poppins, sans-serif';
            Chart.defaults.color = '#5B706E';

            // Toxicity Trend (line chart) — group by date
            const toxCanvas = document.getElementById('toxicityChart');
            if (toxCanvas) {
                toxCanvas.style.height = '280px';
                const sorted = [...analyses].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                const dateGroups = {};
                sorted.forEach(a => {
                    const d = new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (!dateGroups[d]) dateGroups[d] = [];
                    dateGroups[d].push(a.scores?.toxicity || 0);
                });
                const labels = Object.keys(dateGroups);
                const data = labels.map(d => {
                    const vals = dateGroups[d];
                    return parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1));
                });

                new Chart(toxCanvas, {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Avg Toxicity',
                            data,
                            borderColor: '#1FAF9A',
                            backgroundColor: 'rgba(31, 175, 154, 0.1)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: 'white',
                            pointBorderColor: '#1FAF9A',
                            pointBorderWidth: 2,
                            pointRadius: 5,
                            pointHoverRadius: 7
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: 'rgba(31,45,44,0.9)',
                                padding: 12,
                                cornerRadius: 8,
                                displayColors: false
                            }
                        },
                        scales: {
                            x: { grid: { display: false } },
                            y: { grid: { color: 'rgba(0,0,0,0.03)' }, beginAtZero: true, max: 10 }
                        }
                    }
                });
            }

            // Score Comparison (bar chart) — top 5 chemicals: toxicity vs eco vs performance
            const perfCanvas = document.getElementById('performanceChart');
            if (perfCanvas) {
                perfCanvas.style.height = '280px';
                const top5 = analyses.slice(0, 5);
                const names = top5.map(a => (a.chemicalName || 'Unknown').substring(0, 12));

                new Chart(perfCanvas, {
                    type: 'bar',
                    data: {
                        labels: names,
                        datasets: [
                            {
                                label: 'Toxicity',
                                data: top5.map(a => a.scores?.toxicity ?? 0),
                                backgroundColor: '#FF5A5F',
                                borderRadius: 6
                            },
                            {
                                label: 'Eco Score',
                                data: top5.map(a => a.scores?.eco ?? 0),
                                backgroundColor: '#2ECA7F',
                                borderRadius: 6
                            },
                            {
                                label: 'Performance',
                                data: top5.map(a => a.scores?.performance ?? 0),
                                backgroundColor: '#1FAF9A',
                                borderRadius: 6
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top', align: 'end',
                                labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(31,45,44,0.9)',
                                padding: 12,
                                cornerRadius: 8
                            }
                        },
                        scales: {
                            x: { grid: { display: false } },
                            y: { grid: { color: 'rgba(0,0,0,0.03)' }, beginAtZero: true, max: 10 }
                        }
                    }
                });
            }
        }

        // --- Recent Activity ---
        const actList = document.getElementById('dashActivityList');
        if (actList) {
            const recent = analyses.slice(0, 5);
            if (recent.length === 0) {
                actList.innerHTML = '<div class="notif-empty" style="padding:32px;">No recent activity</div>';
            } else {
                actList.innerHTML = recent.map(a => {
                    const tox = a.scores?.toxicity ?? 0;
                    const level = tox >= 7 ? 'danger' : tox >= 4 ? 'warning' : 'safe';
                    const label = tox >= 7 ? 'High Risk' : tox >= 4 ? 'Medium' : 'Safe';
                    const title = tox >= 7 ? 'High toxicity detected' : tox >= 4 ? 'Moderate toxicity found' : 'Chemical analyzed';
                    const iconSvg = level === 'danger'
                        ? '<polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
                        : level === 'warning'
                            ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
                            : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>';
                    return `<div class="activity-item">
                        <div class="activity-icon ${level}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${iconSvg}</svg>
                        </div>
                        <div class="activity-content">
                            <h4>${title}</h4>
                            <p><strong>${a.chemicalName || 'Unknown'}</strong> — Toxicity: ${tox}/10</p>
                        </div>
                        <div class="activity-meta">
                            <span class="time">${timeAgo(a.createdAt)}</span>
                            <span class="status-tag ${level}">${label}</span>
                        </div>
                    </div>`;
                }).join('');
            }
        }

        // --- Top Hazards (right panel) ---
        const hazardsList = document.getElementById('topHazardsList');
        if (hazardsList) {
            const sorted = [...analyses].sort((a, b) => (b.scores?.toxicity || 0) - (a.scores?.toxicity || 0));
            const top3 = sorted.slice(0, 3);
            hazardsList.innerHTML = top3.map(a => {
                const tox = a.scores?.toxicity ?? 0;
                const cls = tox >= 7 ? 'danger' : tox >= 4 ? 'warning' : 'safe';
                return `<div class="task-item">
                    <span class="score-badge ${cls}" style="min-width:28px;">${tox}</span>
                    <label style="flex:1; font-size:0.9rem; color:var(--text-main);">${a.chemicalName || 'Unknown'}</label>
                </div>`;
            }).join('');
        }

    } catch (err) {
        console.warn('Dashboard load error:', err);
        setDashEmpty();
    }
}

function setDashEmpty() {
    const el = id => document.getElementById(id);
    if (el('dashTotal')) el('dashTotal').textContent = '0';
    if (el('dashAvgTox')) el('dashAvgTox').textContent = '—/10';
    if (el('dashAvgEco')) el('dashAvgEco').textContent = '—/10';
    if (el('dashAvgPerf')) el('dashAvgPerf').textContent = '—/10';
    const actList = el('dashActivityList');
    if (actList) actList.innerHTML = '<div class="notif-empty" style="padding:32px;">No analyses yet. <a href="analyze.html" style="color:var(--primary);">Analyze a chemical</a> to get started.</div>';
}

// --- Global Search ---
async function runGlobalSearch(query) {
    const dropdown = document.getElementById('searchDropdown');
    if (!dropdown) return;

    // Page navigation results
    const pages = [
        { name: 'Analyze Chemical', url: 'analyze.html', icon: '🔬' },
        { name: 'View History', url: 'history.html', icon: '🕐' },
        { name: 'View Reports', url: 'reports.html', icon: '📊' },
        { name: 'Dashboard', url: 'index.html', icon: '📋' }
    ];
    const matchedPages = pages.filter(p => p.name.toLowerCase().includes(query));

    // Fetch analysis data
    let matchedChemicals = [];
    try {
        const token = localStorage.getItem('token');
        if (token) {
            const res = await fetch('/api/history', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const { analyses } = await res.json();
                if (analyses) {
                    matchedChemicals = analyses.filter(a =>
                        (a.chemicalName || '').toLowerCase().includes(query) ||
                        (a.smiles || '').toLowerCase().includes(query) ||
                        (a.industry || '').toLowerCase().includes(query)
                    ).slice(0, 5);
                }
            }
        }
    } catch (e) { /* ignore */ }

    if (matchedPages.length === 0 && matchedChemicals.length === 0) {
        dropdown.innerHTML = '<div class="search-item empty">No results found</div>';
        dropdown.style.display = 'block';
        return;
    }

    let html = '';

    if (matchedChemicals.length > 0) {
        html += '<div class="search-section-label">Chemicals</div>';
        html += matchedChemicals.map(a => {
            const tox = a.scores?.toxicity ?? 0;
            const cls = tox >= 7 ? 'danger' : tox >= 4 ? 'warning' : 'safe';
            return `<a href="history.html" class="search-item">
                <span class="score-badge ${cls}" style="font-size:0.75rem;">${tox}</span>
                <span class="search-item-name">${a.chemicalName || 'Unknown'}</span>
                <span class="search-item-meta">${a.industry || '—'}</span>
            </a>`;
        }).join('');
    }

    if (matchedPages.length > 0) {
        html += '<div class="search-section-label">Pages</div>';
        html += matchedPages.map(p =>
            `<a href="${p.url}" class="search-item">
                <span style="font-size:1.1rem;">${p.icon}</span>
                <span class="search-item-name">${p.name}</span>
            </a>`
        ).join('');
    }

    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
}
async function loadReports() {
    const loading = document.getElementById('reportsLoading');
    const empty = document.getElementById('reportsEmpty');
    const content = document.getElementById('reportContent');

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed');
        const { analyses } = await response.json();

        loading.style.display = 'none';

        if (!analyses || analyses.length === 0) {
            empty.style.display = 'flex';
            return;
        }

        window._reportData = analyses;

        // Summary stats
        const total = analyses.length;
        const avgTox = (analyses.reduce((s, a) => s + (a.scores?.toxicity || 0), 0) / total).toFixed(1);
        const avgEco = (analyses.reduce((s, a) => s + (a.scores?.eco || 0), 0) / total).toFixed(1);
        const avgPerf = (analyses.reduce((s, a) => s + (a.scores?.performance || 0), 0) / total).toFixed(1);

        document.getElementById('rptTotal').textContent = total;
        document.getElementById('rptAvgTox').textContent = avgTox + '/10';
        document.getElementById('rptAvgEco').textContent = avgEco + '/10';
        document.getElementById('rptAvgPerf').textContent = avgPerf + '/10';

        // Risk distribution
        const safe = analyses.filter(a => (a.scores?.toxicity || 0) < 4).length;
        const medium = analyses.filter(a => (a.scores?.toxicity || 0) >= 4 && (a.scores?.toxicity || 0) < 7).length;
        const high = analyses.filter(a => (a.scores?.toxicity || 0) >= 7).length;

        const riskCanvas = document.getElementById('riskChart');
        if (riskCanvas && typeof Chart !== 'undefined') {
            new Chart(riskCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
                    datasets: [{
                        data: [safe, medium, high],
                        backgroundColor: ['#2ECA7F', '#FFB020', '#FF5A5F'],
                        borderWidth: 0,
                        spacing: 3,
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 12 } } }
                    }
                }
            });
        }

        // Industry breakdown
        const industries = {};
        analyses.forEach(a => {
            const ind = a.industry || 'general';
            industries[ind] = (industries[ind] || 0) + 1;
        });
        const indLabels = Object.keys(industries).map(i => i.charAt(0).toUpperCase() + i.slice(1));
        const indValues = Object.values(industries);

        const indCanvas = document.getElementById('industryChart');
        if (indCanvas && typeof Chart !== 'undefined') {
            new Chart(indCanvas, {
                type: 'bar',
                data: {
                    labels: indLabels,
                    datasets: [{
                        label: 'Analyses',
                        data: indValues,
                        backgroundColor: '#1FAF9A',
                        borderRadius: 8,
                        barPercentage: 0.6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false } },
                        y: { grid: { color: 'rgba(0,0,0,0.03)' }, beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                }
            });
        }

        // Table
        const tbody = document.getElementById('reportTableBody');
        tbody.innerHTML = analyses.map((a, i) => {
            const tox = a.scores?.toxicity ?? 0;
            const toxClass = tox >= 7 ? 'danger' : tox >= 4 ? 'warning' : 'safe';
            const ecoClass = (a.scores?.eco ?? 0) >= 7 ? 'safe' : (a.scores?.eco ?? 0) >= 4 ? 'warning' : 'danger';
            const perfClass = (a.scores?.performance ?? 0) >= 7 ? 'safe' : (a.scores?.performance ?? 0) >= 4 ? 'warning' : 'danger';
            const riskLabel = tox >= 7 ? 'High Risk' : tox >= 4 ? 'Medium' : 'Low Risk';
            return `<tr>
                <td>${i + 1}</td>
                <td><strong>${a.chemicalName || 'Unknown'}</strong></td>
                <td>${a.compound?.formula || '—'}</td>
                <td><span class="industry-tag">${a.industry || '—'}</span></td>
                <td><span class="score-badge ${toxClass}">${a.scores?.toxicity ?? '—'}</span></td>
                <td><span class="score-badge ${ecoClass}">${a.scores?.eco ?? '—'}</span></td>
                <td><span class="score-badge ${perfClass}">${a.scores?.performance ?? '—'}</span></td>
                <td><span class="status-tag ${toxClass}">${riskLabel}</span></td>
            </tr>`;
        }).join('');

        content.style.display = 'block';

    } catch (err) {
        loading.style.display = 'none';
        empty.style.display = 'flex';
        console.error('Reports error:', err);
    }
}

function exportReportCSV() {
    const data = window._reportData;
    if (!data || data.length === 0) { alert('No data to export.'); return; }

    const headers = ['Chemical Name', 'Formula', 'Industry', 'SMILES', 'Toxicity', 'Eco Score', 'Performance', 'Date'];
    const rows = data.map(a => [
        a.chemicalName || '',
        a.compound?.formula || '',
        a.industry || '',
        a.smiles || '',
        a.scores?.toxicity ?? '',
        a.scores?.eco ?? '',
        a.scores?.performance ?? '',
        new Date(a.createdAt).toLocaleDateString()
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greensub-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// --- Notification System ---
async function loadNotifications() {
    const notifList = document.getElementById('notifList');
    const notifBadge = document.getElementById('notifBadge');
    if (!notifList) return;

    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;

        const { analyses } = await response.json();
        const clearedAt = parseInt(localStorage.getItem('notifs_cleared') || '0');
        const seenAt = parseInt(localStorage.getItem('notifs_seen') || '0');

        // Filter to recent analyses (last 7 days) and not cleared
        const recent = (analyses || []).filter(a => {
            const t = new Date(a.createdAt).getTime();
            return t > clearedAt && t > (Date.now() - 7 * 24 * 60 * 60 * 1000);
        }).slice(0, 8);

        if (recent.length === 0) {
            notifList.innerHTML = '<div class="notif-empty">No notifications</div>';
            notifBadge.style.display = 'none';
            return;
        }

        // Count unseen
        const unseen = recent.filter(a => new Date(a.createdAt).getTime() > seenAt).length;
        if (unseen > 0) {
            notifBadge.style.display = 'block';
            notifBadge.textContent = unseen > 9 ? '9+' : unseen;
        } else {
            notifBadge.style.display = 'none';
        }

        notifList.innerHTML = recent.map(a => {
            const toxLevel = a.scores?.toxicity >= 7 ? 'danger' : a.scores?.toxicity >= 4 ? 'warning' : 'safe';
            const icon = toxLevel === 'danger' ? '⚠️' : toxLevel === 'warning' ? '🔶' : '✅';
            const label = toxLevel === 'danger' ? 'High toxicity' : toxLevel === 'warning' ? 'Medium toxicity' : 'Low toxicity';
            return `<div class="notif-item">
                <span class="notif-icon">${icon}</span>
                <div class="notif-body">
                    <p class="notif-text"><strong>${a.chemicalName || 'Unknown'}</strong> — ${label} (${a.scores?.toxicity ?? '?'}/10)</p>
                    <span class="notif-time">${timeAgo(a.createdAt)}</span>
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        console.warn('Notifications error:', err);
    }
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

async function loadHistory() {
    const loading = document.getElementById('historyLoading');
    const empty = document.getElementById('historyEmpty');
    const tableContainer = document.getElementById('historyTableContainer');
    const historyBody = document.getElementById('historyBody');
    const statsEl = document.getElementById('historyStats');

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch history');
        const { analyses } = await response.json();

        loading.style.display = 'none';

        if (!analyses || analyses.length === 0) {
            empty.style.display = 'flex';
            return;
        }

        // Stats
        const avgTox = (analyses.reduce((s, a) => s + (a.scores?.toxicity || 0), 0) / analyses.length).toFixed(1);
        const avgEco = (analyses.reduce((s, a) => s + (a.scores?.eco || 0), 0) / analyses.length).toFixed(1);
        statsEl.innerHTML = `
            <div class="stat-chip"><strong>${analyses.length}</strong> analyses</div>
            <div class="stat-chip">Avg Toxicity: <strong>${avgTox}</strong>/10</div>
            <div class="stat-chip">Avg Eco: <strong>${avgEco}</strong>/10</div>
        `;

        // Render table rows
        historyBody.innerHTML = analyses.map(a => {
            const toxClass = a.scores?.toxicity >= 7 ? 'danger' : a.scores?.toxicity >= 4 ? 'warning' : 'safe';
            const ecoClass = a.scores?.eco >= 7 ? 'safe' : a.scores?.eco >= 4 ? 'warning' : 'danger';
            const perfClass = a.scores?.performance >= 7 ? 'safe' : a.scores?.performance >= 4 ? 'warning' : 'danger';
            const date = new Date(a.createdAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            return `<tr>
                <td><strong>${a.chemicalName || 'Unknown'}</strong></td>
                <td>${a.compound?.formula || '—'}</td>
                <td><span class="industry-tag">${a.industry || '—'}</span></td>
                <td><span class="score-badge ${toxClass}">${a.scores?.toxicity ?? '—'}</span></td>
                <td><span class="score-badge ${ecoClass}">${a.scores?.eco ?? '—'}</span></td>
                <td><span class="score-badge ${perfClass}">${a.scores?.performance ?? '—'}</span></td>
                <td><span class="history-date">${date}</span></td>
                <td><button class="delete-btn" onclick="deleteAnalysis('${a._id}', this)" title="Delete">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button></td>
            </tr>`;
        }).join('');

        tableContainer.style.display = 'block';

    } catch (err) {
        loading.style.display = 'none';
        empty.style.display = 'flex';
        console.error('History error:', err);
    }
}

window.deleteAnalysis = async function (id, btn) {
    if (!confirm('Delete this analysis record?')) return;

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/history/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const row = btn.closest('tr');
            row.style.opacity = '0';
            row.style.transform = 'translateX(20px)';
            setTimeout(() => {
                row.remove();
                // Check if table is now empty
                if (!document.querySelector('.history-table tbody tr')) {
                    document.getElementById('historyTableContainer').style.display = 'none';
                    document.getElementById('historyEmpty').style.display = 'flex';
                }
            }, 300);
        }
    } catch (err) {
        alert('Failed to delete. Please try again.');
    }
};

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
