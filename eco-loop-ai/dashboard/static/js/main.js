document.addEventListener("DOMContentLoaded", () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // Clock Logic
    function updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        const day = now.getDate();
        const month = now.toLocaleString('en-US', { month: 'short' });
        const year = now.getFullYear();
        const dateStr = `${day} ${month} ${year}`;
        
        document.getElementById('clock-time').innerText = timeStr;
        document.getElementById('clock-date').innerText = dateStr;
        document.getElementById('last-sync').innerText = `Last Sync: ${timeStr}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Handle File Upload
    const uploadForm = document.getElementById('upload-form');
    const uploadStatus = document.getElementById('upload-status');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            uploadStatus.innerText = "Initializing...";
            uploadStatus.style.color = "var(--primary)";
            
            const formData = new FormData();
            formData.append('epw_file', document.getElementById('epw-file').files[0]);
            formData.append('idf_file', document.getElementById('idf-file').files[0]);

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                const result = await res.json();
                if (res.ok) {
                    uploadStatus.innerText = "System Autonomous";
                    uploadStatus.style.color = "var(--success)";
                } else {
                    uploadStatus.innerText = "Error: " + result.error;
                    uploadStatus.style.color = "var(--danger)";
                }
            } catch (err) {
                uploadStatus.innerText = "Network error";
                uploadStatus.style.color = "var(--danger)";
            }
        });
    }

    // Chart.js Globals
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = "#6B7280";
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(27, 35, 32, 0.9)';

    // Energy Line Chart
    const energyCtx = document.getElementById('energyChart');
    const energyChartConfig = {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Baseline Energy (kWh)',
                    data: [],
                    borderColor: '#9CA3AF',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'AI Optimized (kWh)',
                    data: [],
                    borderColor: '#16A34A',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: true, 
                    position: 'top',
                    align: 'start',
                    labels: { boxWidth: 20, usePointStyle: true, pointStyle: 'line' } 
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } },
                y: { grid: { color: '#E7E8EB' }, beginAtZero: true }
            },
            animation: { duration: 400 }
        }
    };
    let energyChart = energyCtx ? new Chart(energyCtx, energyChartConfig) : null;

    // PMV Gauge Chart (Doughnut)
    const gaugeCtx = document.getElementById('gaugeChart');
    const gaugeConfig = {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 6], // Dynamic [value, remaining] (total scale 6, from -3 to +3)
                backgroundColor: ['#16A34A', '#E7E8EB'],
                borderWidth: 0,
                cutout: '80%',
                circumference: 180,
                rotation: 270
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            animation: { duration: 600 }
        }
    };
    let gaugeChart = gaugeCtx ? new Chart(gaugeCtx, gaugeConfig) : null;

    function getComfortStatus(pmv) {
        if (pmv > 1.5 || pmv < -1.5) return ["Uncomfortable", "var(--danger)"];
        if (pmv > 0.5 || pmv < -0.5) return ["Moderate", "var(--warning)"];
        return ["Comfortable", "var(--success)"];
    }

    // Update Dashboard UI
    function updateDashboard(data) {
        if (!data || !data.telemetry) return;

        const t = data.telemetry;
        
        // Top Metrics
        document.getElementById('indoor-temp').innerText = `${t.indoor_temp.toFixed(2)}°C`;
        document.getElementById('outdoor-temp').innerText = `${t.outdoor_temp.toFixed(1)}°C`;
        document.getElementById('energy').innerText = `${t.energy.toFixed(1)} kWh`;
        document.getElementById('occupancy').innerText = t.occupancy;
        document.getElementById('pmv').innerText = t.pmv.toFixed(1);
        document.getElementById('hvac-status').innerText = t.hvac_status;

        // Dynamic statuses
        const [pmvText, pmvColor] = getComfortStatus(t.pmv);
        document.getElementById('pmv-status').innerText = pmvText;
        document.getElementById('pmv-status').style.color = pmvColor;
        document.getElementById('indoor-status').innerText = pmvText;
        document.getElementById('indoor-status').style.color = pmvColor;

        // Bottom Env Row
        document.getElementById('humidity').innerText = '62%';
        document.getElementById('iaq').innerText = `${t.iaq_co2 || 400} ppm`;
        document.getElementById('carbon').innerText = `${(t.carbon_emissions || 0).toFixed(1)} kgCO2`;

        // Update Gauge
        if (gaugeChart) {
            // Scale -3 to +3 maps to 0 to 6
            let mappedVal = t.pmv + 3;
            if (mappedVal < 0) mappedVal = 0;
            if (mappedVal > 6) mappedVal = 6;
            
            // Color based on value
            let color = '#16A34A';
            if (mappedVal < 1.5 || mappedVal > 4.5) color = '#EF4444';
            else if (mappedVal < 2.5 || mappedVal > 3.5) color = '#F59E0B';
            
            gaugeChart.data.datasets[0].data = [mappedVal, 6 - mappedVal];
            gaugeChart.data.datasets[0].backgroundColor = [color, '#E7E8EB'];
            gaugeChart.update();
            
            document.getElementById('gauge-val').innerText = t.pmv.toFixed(1);
            document.getElementById('gauge-status').innerText = pmvText;
            document.getElementById('gauge-status').style.color = color;
        }

        // AI Panel
        if (data.ai) {
            document.getElementById('ai-strategy').innerText = data.ai.strategy;
            document.getElementById('ai-reason').innerText = data.ai.reason;
            document.getElementById('ai-action').innerText = data.ai.action;
            document.getElementById('ai-savings').innerText = `+${data.ai.savings} kWh saved`;
        }
    }

    // Load History
    async function fetchHistory() {
        try {
            const res = await fetch('/api/history');
            const history = await res.json();
            
            const logContainer = document.getElementById('log-timeline');
            if(!logContainer) return;
            logContainer.innerHTML = '';
            
            const labels = [];
            const energyData = [];
            const baselineData = [];
            let totalSaved = 0;
            let totalBaseline = 0;

            const chartData = [...history].reverse();
            
            chartData.forEach(row => {
                const timeStr = new Date(row.timestamp.replace(' ', 'T') + 'Z').toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                labels.push(timeStr);
                energyData.push(row.energy);
                baselineData.push(row.baseline_energy || row.energy);
                
                totalSaved += (row.estimated_savings || 0);
                totalBaseline += (row.baseline_energy || row.energy);
            });

            // Update Chart
            if (energyChart) {
                energyChart.data.labels = labels;
                energyChart.data.datasets[0].data = baselineData;
                energyChart.data.datasets[1].data = energyData;
                energyChart.update();
            }
            
            // Update Totals
            document.getElementById('total-saved').innerText = `${totalSaved.toFixed(1)} kWh`;
            document.getElementById('monthly-saved').innerText = `~${(totalSaved * 30).toFixed(0)} kWh`;
            if (totalBaseline > 0) {
                const percent = (totalSaved / totalBaseline) * 100;
                document.getElementById('percent-saved').innerText = `${percent.toFixed(1)}%`;
            }

            // Horizontal Log Render (Take top 5 recent)
            const recentLogs = history.slice(0, 5).reverse();
            
            recentLogs.forEach((row, index) => {
                const timeStr = new Date(row.timestamp.replace(' ', 'T') + 'Z').toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                
                let iconName = 'activity';
                if (row.strategy.includes("Balanced")) iconName = 'scale';
                if (row.strategy.includes("Comfort")) iconName = 'smile';
                if (row.strategy.includes("Energy")) iconName = 'zap';

                const logItem = `
                    <div class="log-step">
                        <div class="log-step-content">
                            <div class="log-icon">
                                <i data-lucide="${iconName}" size="16"></i>
                            </div>
                            <div class="log-text">
                                <h5>${timeStr}</h5>
                                <p>${row.strategy}<br><span style="color:var(--text-muted);font-weight:400;">${row.action}</span></p>
                            </div>
                        </div>
                        ${index < recentLogs.length - 1 ? `<div class="log-arrow"><i data-lucide="arrow-right" size="16"></i></div>` : ''}
                    </div>
                `;
                logContainer.insertAdjacentHTML('beforeend', logItem);
            });
            lucide.createIcons(); // Re-init icons for new HTML
            
        } catch (error) {
            console.error("Error fetching history:", error);
        }
    }

    // Polling
    setInterval(async () => {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            if (Object.keys(data).length === 0) return;
            
            updateDashboard(data);
            fetchHistory();
        } catch (error) {
            console.error("Error fetching status:", error);
        }
    }, 2000);
    
    // Initial fetch
    fetchHistory();
});
