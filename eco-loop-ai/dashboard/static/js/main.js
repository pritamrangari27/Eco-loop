document.addEventListener("DOMContentLoaded", () => {
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
            datasets: [{
                label: 'Energy Usage (kWh)',
                data: [],
                borderColor: '#38bdf8',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
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
        document.getElementById('occupancy').innerText = data.telemetry.occupancy;
        document.getElementById('pmv').innerText = data.telemetry.pmv;
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
            
            const logContainer = document.getElementById('operations-log');
            logContainer.innerHTML = '';
            
            const labels = [];
            const energyData = [];

            // History comes ordered DESC from DB, reverse for chart (oldest first)
            const chartData = [...history].reverse();
            
            chartData.forEach(row => {
                const timeStr = new Date(row.timestamp).toLocaleTimeString();
                labels.push(timeStr);
                energyData.push(row.energy);
            });

            // Update Chart
            energyChart.data.labels = labels;
            energyChart.data.datasets[0].data = energyData;
            energyChart.update();

            // Populate Logs (newest first)
            history.forEach(row => {
                const timeStr = new Date(row.timestamp).toLocaleTimeString();
                const logEntry = `
                    <div class="log-entry">
                        <div class="log-time">${timeStr}</div>
                        <strong>Strategy:</strong> ${row.strategy}<br>
                        <strong>Action:</strong> ${row.action}<br>
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
