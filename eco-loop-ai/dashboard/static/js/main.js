document.addEventListener("DOMContentLoaded", () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // SPA Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    const screens = document.querySelectorAll('.screen');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            if(!targetId) return;

            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            screens.forEach(s => s.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
        });
    });

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
        
        const syncEl = document.getElementById('last-sync');
        if(syncEl) syncEl.innerText = `Last Sync: ${timeStr}`;
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

    // 1. Overview Energy Line Chart
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

    // 2. Analytics Full Energy Chart (Clone of Overview)
    const analyticsEnergyCtx = document.getElementById('analyticsEnergyChart');
    let analyticsEnergyChart = analyticsEnergyCtx ? new Chart(analyticsEnergyCtx, JSON.parse(JSON.stringify(energyChartConfig))) : null;

    // 3. Analytics Temperature Trends Chart
    const tempCtx = document.getElementById('tempChart');
    const tempChartConfig = {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Indoor Temp (°C)', data: [], borderColor: '#16A34A', tension: 0.4, fill: false },
                { label: 'Outdoor Temp (°C)', data: [], borderColor: '#F59E0B', tension: 0.4, fill: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', align: 'start' } },
            scales: { x: { grid: { display: false } }, y: { grid: { color: '#E7E8EB' } } }
        }
    };
    let tempChart = tempCtx ? new Chart(tempCtx, tempChartConfig) : null;

    // 4. PMV Gauge Chart (Doughnut)
    const gaugeCtx = document.getElementById('gaugeChart');
    const gaugeConfig = {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 6],
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

    // Update Dashboard Top Metrics
    function updateDashboard(data) {
        if (!data || !data.telemetry) return;

        const t = data.telemetry;
        
        document.getElementById('indoor-temp').innerText = `${t.indoor_temp.toFixed(2)}°C`;
        document.getElementById('outdoor-temp').innerText = `${t.outdoor_temp.toFixed(1)}°C`;
        document.getElementById('energy').innerText = `${t.energy.toFixed(1)} kWh`;
        document.getElementById('occupancy').innerText = t.occupancy;
        document.getElementById('pmv').innerText = t.pmv.toFixed(1);
        document.getElementById('hvac-status').innerText = t.hvac_status;

        const [pmvText, pmvColor] = getComfortStatus(t.pmv);
        document.getElementById('pmv-status').innerText = pmvText;
        document.getElementById('pmv-status').style.color = pmvColor;
        document.getElementById('indoor-status').innerText = pmvText;
        document.getElementById('indoor-status').style.color = pmvColor;

        document.getElementById('humidity').innerText = '62%';
        document.getElementById('iaq').innerText = `${t.iaq_co2 || 400} ppm`;
        document.getElementById('carbon').innerText = `${(t.carbon_emissions || 0).toFixed(1)} kgCO2`;

        // Update Gauge
        if (gaugeChart) {
            let mappedVal = t.pmv + 3;
            if (mappedVal < 0) mappedVal = 0;
            if (mappedVal > 6) mappedVal = 6;
            
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

    // Global History State
    let currentHistoryData = [];
    let currentLogLimit = 20;

    // Filter Logic
    const filterEl = document.getElementById('analytics-limit-filter');
    if (filterEl) {
        filterEl.addEventListener('change', (e) => {
            currentLogLimit = parseInt(e.target.value);
            renderHistoryData();
        });
    }

    // Render Data into DOM & Charts
    function renderHistoryData() {
        if (!currentHistoryData || currentHistoryData.length === 0) return;

        // Take first N elements (newest) based on limit filter and reverse to chronological order
        const historyToUse = currentHistoryData.slice(0, currentLogLimit).reverse();

        const labels = [];
        const energyData = [];
        const baselineData = [];
        const indoorData = [];
        const outdoorData = [];
        let totalSaved = 0;
        let totalBaseline = 0;

        historyToUse.forEach(row => {
            const timeStr = new Date(row.timestamp.replace(' ', 'T') + 'Z').toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            labels.push(timeStr);
            energyData.push(row.energy);
            
            let calculatedBaseline = (row.baseline_energy > 0) 
                ? row.baseline_energy 
                : row.energy + (row.estimated_savings || 12.0);
            baselineData.push(calculatedBaseline);
            
            indoorData.push(row.indoor_temp || 24);
            outdoorData.push(row.outdoor_temp || 30);
            
            totalSaved += (row.estimated_savings || 0);
            totalBaseline += calculatedBaseline;
        });

        // 1. Update Overview Chart
        if (energyChart) {
            energyChart.data.labels = labels;
            energyChart.data.datasets[0].data = baselineData;
            energyChart.data.datasets[1].data = energyData;
            energyChart.update();
        }
        
        // 2. Update Analytics Energy Chart
        if (analyticsEnergyChart) {
            analyticsEnergyChart.data.labels = labels;
            analyticsEnergyChart.data.datasets[0].data = baselineData;
            analyticsEnergyChart.data.datasets[1].data = energyData;
            analyticsEnergyChart.update();
        }

        // 3. Update Analytics Temp Chart
        if (tempChart) {
            tempChart.data.labels = labels;
            tempChart.data.datasets[0].data = indoorData;
            tempChart.data.datasets[1].data = outdoorData;
            tempChart.update();
        }
        
        // Update Overview Totals
        document.getElementById('total-saved').innerText = `${totalSaved.toFixed(1)} kWh`;
        document.getElementById('monthly-saved').innerText = `~${(totalSaved * 30).toFixed(0)} kWh`;
        if (totalBaseline > 0) {
            const percent = (totalSaved / totalBaseline) * 100;
            document.getElementById('percent-saved').innerText = `${percent.toFixed(1)}%`;
        }

        // 4. Update Overview Horizontal Logs (Top 5 only)
        const logContainer = document.getElementById('log-timeline');
        if(logContainer) {
            logContainer.innerHTML = '';
            const recentLogs = [...historyToUse].reverse().slice(0, 5);
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
        }

        // 5. Update AI Decisions Screen Table
        const aiTbody = document.getElementById('ai-decisions-tbody');
        if(aiTbody) {
            aiTbody.innerHTML = '';
            [...historyToUse].reverse().forEach(row => {
                const timeStr = new Date(row.timestamp.replace(' ', 'T') + 'Z').toLocaleString();
                aiTbody.insertAdjacentHTML('beforeend', `
                    <tr>
                        <td>${timeStr}</td>
                        <td style="font-weight:500; color:var(--primary);">${row.strategy}</td>
                        <td>${row.action}</td>
                        <td style="color:var(--success); font-weight: 500;">+${(row.estimated_savings || 0).toFixed(2)} kWh</td>
                        <td><span style="display:inline-flex; align-items:center; gap:4px; color:var(--success); font-weight:500;"><i data-lucide="check-circle-2" size="14"></i> Applied</span></td>
                    </tr>
                `);
            });
        }

        // 6. Update Operations Log Screen Viewer
        const opsViewer = document.getElementById('ops-log-viewer');
        if(opsViewer) {
            opsViewer.innerHTML = '';
            [...historyToUse].reverse().forEach(row => {
                const d = new Date(row.timestamp.replace(' ', 'T') + 'Z');
                const timeStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
                opsViewer.insertAdjacentHTML('beforeend', `
                    <div class="log-line">
                        <span class="log-time">[${timeStr}]</span>
                        <span class="log-level level-info">INFO</span>
                        <span class="log-msg">AI_CORE: Evaluating environmental state for optimization. Selected: ${row.strategy}.</span>
                    </div>
                    <div class="log-line">
                        <span class="log-time">[${timeStr}]</span>
                        <span class="log-level level-success">SUCCESS</span>
                        <span class="log-msg">HVAC_CTRL: Executed: ${row.action}. Expected savings: ${(row.estimated_savings || 0).toFixed(2)} kWh.</span>
                    </div>
                `);
            });
        }

        lucide.createIcons(); // Re-init icons for new HTML
    }

    // Network Fetch logic
    async function fetchHistory() {
        try {
            const res = await fetch('/api/history');
            currentHistoryData = await res.json();
            renderHistoryData();
        } catch (error) {
            console.error("Error fetching history:", error);
        }
    }

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
    
    fetchHistory();

    // REPORTS EXPORT LOGIC
    document.getElementById('btn-download-csv')?.addEventListener('click', () => {
        if(currentHistoryData.length === 0) return alert("No data available to export.");
        
        const headers = ["Timestamp", "Indoor_Temp", "Outdoor_Temp", "Energy_Usage", "Baseline_Energy", "AI_Strategy", "Control_Action", "Est_Savings"];
        const rows = currentHistoryData.map(r => {
            const localTime = new Date(r.timestamp.replace(' ', 'T') + 'Z').toLocaleString();
            return [
                localTime, r.indoor_temp, r.outdoor_temp, r.energy, r.baseline_energy, 
                r.strategy, r.action, r.estimated_savings
            ];
        });
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "ecoloop_operations_report.csv");
        document.body.appendChild(link);
        link.click();
    });

    document.getElementById('btn-download-pdf')?.addEventListener('click', () => {
        if(currentHistoryData.length === 0) return alert("No data available to export.");
        if(!window.jspdf) return alert("PDF generator library is still loading. Please try again in a moment.");
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add Header
        doc.setFontSize(22);
        doc.setTextColor(22, 163, 74);
        doc.text("EcoLoop AI", 14, 20);
        
        doc.setFontSize(14);
        doc.setTextColor(31, 41, 55);
        doc.text("Building Optimization Report", 14, 28);
        
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text("Generated: " + new Date().toLocaleString(), 14, 34);
        
        // Generate Table
        const head = [["Timestamp", "Strategy", "Action", "Energy Used", "Savings"]];
        const body = currentHistoryData.map(r => {
            const localTime = new Date(r.timestamp.replace(' ', 'T') + 'Z').toLocaleString();
            return [
                localTime,
                r.strategy,
                r.action,
                r.energy.toFixed(1) + " kWh",
                (r.estimated_savings || 0).toFixed(1) + " kWh"
            ];
        });
        
        doc.autoTable({
            startY: 40,
            head: head,
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [22, 163, 74] },
            styles: { fontSize: 9 }
        });
        
        doc.save("ecoloop_operations_report.pdf");
    });
});
