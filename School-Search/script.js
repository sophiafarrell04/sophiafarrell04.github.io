
let allDistricts = [];
let chartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupSearch();
});

function loadData() {
    Papa.parse('district_data.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            // Filter out any rows that might be empty or malformed
            allDistricts = results.data.filter(d => d.clean_name);
            console.log('Data loaded:', allDistricts.length, 'districts');
        },
        error: function(err) {
            console.error('Error loading CSV:', err);
        }
    });
}

function setupSearch() {
    const searchInput = document.getElementById('district-search');
    const suggestionsBox = document.getElementById('search-suggestions');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length < 2) {
            suggestionsBox.classList.add('hidden');
            return;
        }

        const matches = allDistricts.filter(d => 
            d.clean_name.toLowerCase().includes(query)
        ).slice(0, 10); // Limit to 10 suggestions

        renderSuggestions(matches, suggestionsBox);
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.classList.add('hidden');
        }
    });
}

function renderSuggestions(matches, container) {
    container.innerHTML = '';
    
    if (matches.length === 0) {
        container.classList.add('hidden');
        return;
    }

    matches.forEach(district => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = district.clean_name;
        div.addEventListener('click', () => {
            selectDistrict(district);
            container.classList.add('hidden');
            document.getElementById('district-search').value = district.clean_name;
        });
        container.appendChild(div);
    });

    container.classList.remove('hidden');
}

function selectDistrict(district) {
    const resultSection = document.getElementById('result-section');
    resultSection.classList.remove('hidden');
    
    // Update Name
    document.getElementById('district-name').textContent = district.clean_name;

    // Extract years and values
    // The CSV columns seen: 20242025, 20232024, 20222023, 20212022, 20202021, 20192020
    const years = ['20192020', '20202021', '20212022', '20222023', '20232024', '20242025'];
    
    // Format for display (e.g. 20192020 -> "2019-20")
    const displayYears = years.map(y => {
        // y is like "20192020"
        return y.substring(0, 4) + '-' + y.substring(6, 8); // "2019-20"
    });

    // Get values, handle NA
    const dataPoints = years.map(y => {
        const val = district[y];
        return val === 'NA' || val === '' || val === undefined ? null : parseFloat(val);
    });

    // Update Latest Rate Stat
    // Find the last non-null value for the "Current Rate"
    let latestVal = '--%';
    let latestYear = '';
    
    for (let i = years.length - 1; i >= 0; i--) {
        if (dataPoints[i] !== null && !isNaN(dataPoints[i])) {
            latestVal = dataPoints[i] + '%';
            latestYear = displayYears[i];
            break;
        }
    }
    
    document.getElementById('latest-rate').textContent = latestVal;
    document.getElementById('latest-year').textContent = latestYear;

    updateChart(displayYears, dataPoints);
    updateTable(displayYears, dataPoints);
}

function updateChart(labels, data) {
    const ctx = document.getElementById('absenteeismChart').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Chronic Absence Rate (%)',
                data: data,
                borderColor: '#2563eb', // primary blue
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#2563eb',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                fill: true,
                tension: 0.3, // smooth curves
                spanGaps: true // connect lines over nulls? user might prefer gaps. Let's try gap first. 
                // actually, for trends, spanning gaps often looks better, but let's stick to true structure first.
                // If spanGaps is false (default), lines break.
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    padding: 12,
                    titleFont: { family: 'Inter', size: 14 },
                    bodyFont: { family: 'Inter', size: 14 },
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#f1f5f9'
                    },
                    ticks: {
                        font: { family: 'Inter' },
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: { family: 'Inter' }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
        }
    });
}

function updateTable(years, data) {
    const tbody = document.getElementById('data-table-body');
    tbody.innerHTML = '';
    
    // We want to show most recent first in table? usually yes.
    // Let's loop backwards
    for (let i = years.length - 1; i >= 0; i--) {
        const row = document.createElement('tr');
        
        const cellYear = document.createElement('td');
        cellYear.textContent = years[i];
        
        const cellVal = document.createElement('td');
        const val = data[i];
        cellVal.textContent = (val === null) ? 'N/A' : val + '%';
        
        row.appendChild(cellYear);
        row.appendChild(cellVal);
        tbody.appendChild(row);
    }
}
