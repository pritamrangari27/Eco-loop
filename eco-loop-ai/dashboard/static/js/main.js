document.addEventListener("DOMContentLoaded", () => {
    // Handle File Upload
    const uploadForm = document.getElementById('upload-form');
    const uploadStatus = document.getElementById('upload-status');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            uploadStatus.innerText = "Uploading and initializing simulation...";
            uploadStatus.style.color = "var(--accent)";
            
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
                    uploadStatus.innerText = "Simulation initialized successfully! Loop starting...";
                    uploadStatus.style.color = "var(--success)";
                } else {
                    uploadStatus.innerText = "Error: " + result.error;
                    uploadStatus.style.color = "var(--warning)";
                }
            } catch (err) {
                uploadStatus.innerText = "Network error during upload.";
                uploadStatus.style.color = "var(--warning)";
                console.error(err);
            }
        });
    }

    // Initialize Chart.js
    const ctx = document.getElementById('energyChart').getContext('2d');
    
    // Gradient for the chart
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.5)');
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

    const chartConfig = {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Baseline Energy (kWh)',
                    data: [],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'AI Optimized (kWh)',
                    data: [],
                    borderColor: '#38bdf8',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, labels: { color: '#94a3b8' } }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                }
            },
            animation: {
                duration: 400
            }
        }
    };
    
    const energyChart = new Chart(ctx, chartConfig);

    // Update Dashboard UI
    function updateDashboard(data) {
        if (!data || !data.telemetry) return;

        // Telemetry
        document.getElementById('indoor-temp').innerText = `${data.telemetry.indoor_temp}°C`;
        document.getElementById('outdoor-temp').innerText = `${data.telemetry.outdoor_temp}°C`;
        document.getElementById('energy').innerText = `${data.telemetry.energy} kWh`;
        document.getElementById('carbon').innerText = `${data.telemetry.carbon_emissions || 0} kgCO2`;
        document.getElementById('occupancy').innerText = data.telemetry.occupancy;
        document.getElementById('pmv').innerText = data.telemetry.pmv;
        document.getElementById('iaq').innerText = data.telemetry.iaq_co2 || '--';
        document.getElementById('hvac-status').innerText = data.telemetry.hvac_status;

        // AI Panel
        if (data.ai) {
            document.getElementById('ai-strategy').innerText = data.ai.strategy;
            document.getElementById('ai-reason').innerText = data.ai.reason;
            document.getElementById('ai-action').innerText = data.ai.action;
            document.getElementById('ai-savings').innerText = `+${data.ai.savings} kWh saved`;
        }
    }

    // Load History and initialize chart & logs
    async function fetchHistory() {
        try {
            const res = await fetch('/api/history');
            const history = await res.json();
            
            const logContainer = document.getElementById('decision-log');
            if(!logContainer) return;
            logContainer.innerHTML = '';
            
            const labels = [];
            const energyData = [];
            const baselineData = [];
            let totalSaved = 0;
            let totalBaseline = 0;

            // History comes ordered DESC from DB, reverse for chart (oldest first)
            const chartData = [...history].reverse();
            
            chartData.forEach(row => {
                const timeStr = new Date(row.timestamp.replace(' ', 'T') + 'Z').toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
                labels.push(timeStr);
                energyData.push(row.energy);
                baselineData.push(row.baseline_energy || row.energy);
                
                totalSaved += (row.estimated_savings || 0);
                totalBaseline += (row.baseline_energy || row.energy);
            });

            // Update Chart
            energyChart.data.labels = labels;
            energyChart.data.datasets[0].data = baselineData;
            energyChart.data.datasets[1].data = energyData;
            energyChart.update();
            
            // Update Totals
            document.getElementById('total-saved').innerText = totalSaved.toFixed(1);
            if (totalBaseline > 0) {
                const percent = (totalSaved / totalBaseline) * 100;
                document.getElementById('percent-saved').innerText = percent.toFixed(1);
            }

            // Populate Logs (newest first)
            history.forEach(row => {
                const timeStr = new Date(row.timestamp.replace(' ', 'T') + 'Z').toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
                const logEntry = `
                    <div class="log-entry" style="margin-bottom:10px; border-bottom:1px solid #334155; padding-bottom:5px;">
                        <div class="log-time">${timeStr}</div>
                        <strong>Strategy:</strong> ${row.strategy}<br>
                        <strong>Action:</strong> ${row.action}<br>
                        <strong>Savings:</strong> <span style="color: var(--success);">+${row.estimated_savings || 0} kWh</span><br>
                        <em>${row.reason}</em>
                    </div>
                `;
                logContainer.insertAdjacentHTML('beforeend', logEntry);
            });
            
        } catch (error) {
            console.error("Error fetching history:", error);
        }
    }

    // Poll status every 2 seconds
    setInterval(async () => {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            updateDashboard(data);
            fetchHistory(); // Refresh charts and logs
        } catch (error) {
            console.error("Error fetching status:", error);
        }
    }, 2000);
    
    // Initial fetch
    fetchHistory();
});
