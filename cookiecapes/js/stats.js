document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://api.cookieattack.de:8990'; // Passe dies an, falls nötig
    const PLAYERS_PER_PAGE = 12;
    const LIVE_STATS_REFRESH_INTERVAL_MS = 10000; // Alle 10 Sekunden

    const playerCountEl = document.getElementById('player-count');
    const connectionStatusEl = document.getElementById('connection-status');
    const connectionStatusTextEl = document.getElementById('connection-status-text');
    const chartContainer = document.getElementById('history-chart');
    const chartLoader = document.getElementById('chart-loader');
    const playtimeListEl = document.getElementById('playtime-list');
    const playtimeLoader = document.getElementById('playtime-loader');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfoEl = document.getElementById('page-info');
    const timespanControls = document.getElementById('timespan-controls');

    let currentPage = 0;
    let totalPlayers = 0;
    let historyChart;

    const fetchLiveStats = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/stats`);
            if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok');
            const data = await response.json();

            playerCountEl.textContent = data.online_player_count;
            
            if (data.websocket_connection_status === "CONNECTED") {
                connectionStatusEl.className = 'status-indicator connected';
                connectionStatusTextEl.textContent = "Verbunden";
            } else {
                connectionStatusEl.className = 'status-indicator disconnected';
                connectionStatusTextEl.textContent = "Getrennt";
            }
        } catch (error) {
            console.error('Fehler beim Abrufen der Live-Statistiken:', error);
            playerCountEl.textContent = 'N/A';
            connectionStatusEl.className = 'status-indicator disconnected';
            connectionStatusTextEl.textContent = "Fehler";
        }
    };

    const fetchHistory = async (timespan) => {
        chartLoader.style.display = 'block';
        chartContainer.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/history?timespan=${timespan}`);
            if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok');
            const data = await response.json();

            const timestamps = data.history.map(entry => {
                const d = new Date(entry.timestamp);
                return `${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString('de-DE')}`;
            });
            const playerCounts = data.history.map(entry => entry.player_count);

            renderHistoryChart(timestamps, playerCounts);
        } catch (error) {
            console.error('Fehler beim Abrufen des Verlaufs:', error);
            chartContainer.innerHTML = `<p style="text-align:center;">Fehler beim Laden des Graphen.</p>`;
        } finally {
            chartLoader.style.display = 'none';
            chartContainer.style.display = 'block';
        }
    };

    const renderHistoryChart = (timestamps, counts) => {
        if (historyChart) {
            historyChart.dispose();
        }
        historyChart = echarts.init(chartContainer, 'dark');

        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' }
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: timestamps,
                axisLabel: {
                    rotate: 15,
                    color: '#b3b3b3'
                }
            },
            yAxis: {
                type: 'value',
                name: 'Spieler',
                axisLabel: { color: '#b3b3b3' },
                splitLine: {
                    lineStyle: { color: '#2c2c2c' }
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '10%',
                containLabel: true
            },
            series: [{
                name: 'Spieler Online',
                type: 'line',
                smooth: true,
                showSymbol: false,
                data: counts,
                itemStyle: { color: '#ffffff' },
                lineStyle: { width: 3 },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                        offset: 0,
                        color: 'rgba(255, 255, 255, 0.3)'
                    }, {
                        offset: 1,
                        color: 'rgba(255, 255, 255, 0)'
                    }])
                }
            }]
        };

        historyChart.setOption(option);
        window.addEventListener('resize', () => historyChart.resize());
    };

    const fetchPlaytime = async (page) => {
        playtimeLoader.style.display = 'block';
        playtimeListEl.innerHTML = '';
        currentPage = page;
        const offset = page * PLAYERS_PER_PAGE;

        try {
            const response = await fetch(`${API_BASE_URL}/playtime?sort_by=playtime&order=desc&limit=${PLAYERS_PER_PAGE}&offset=${offset}`);
            if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok');
            const data = await response.json();
            
            totalPlayers = data.total_players;

            if (data.players.length === 0) {
                 playtimeListEl.innerHTML = `<p style="text-align:center; grid-column: 1 / -1;">Keine Spielerdaten gefunden.</p>`;
            } else {
                data.players.forEach(player => {
                    const entry = document.createElement('div');
                    entry.className = 'playtime-entry';
                    entry.innerHTML = `
                        <img src="https://starlightskins.lunareclipse.studio/render/isometric/${player.minecraft_uuid}/head" alt="Spieler-Kopf" class="player-head">
                        <div class="player-info">
                            <h4>${player.minecraft_uuid}</h4>
                            <p>Spielzeit: ${formatSeconds(player.total_playtime_seconds)}</p>
                        </div>
                    `;
                    playtimeListEl.appendChild(entry);
                });
            }

            updatePagination();
        } catch (error) {
            console.error('Fehler beim Abrufen der Spielzeiten:', error);
            playtimeListEl.innerHTML = `<p style="text-align:center;">Fehler beim Laden der Spielzeiten.</p>`;
        } finally {
            playtimeLoader.style.display = 'none';
        }
    };
    
    const formatSeconds = (totalSeconds) => {
        if (totalSeconds < 60) return `${totalSeconds}s`;
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h}h ${m}m ${s}s`;
    };

    const updatePagination = () => {
        pageInfoEl.textContent = `Seite ${currentPage + 1}`;
        prevPageBtn.disabled = currentPage === 0;
        
        const maxPage = Math.ceil(totalPlayers / PLAYERS_PER_PAGE) - 1;
        nextPageBtn.disabled = currentPage >= maxPage;
    };


    timespanControls.addEventListener('click', (e) => {
        if (e.target.classList.contains('timespan-btn')) {
            document.querySelector('.timespan-btn.active').classList.remove('active');
            e.target.classList.add('active');
            const newTimespan = e.target.dataset.timespan;
            fetchHistory(newTimespan);
        }
    });

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 0) {
            fetchPlaytime(currentPage - 1);
        }
    });

    nextPageBtn.addEventListener('click', () => {
        fetchPlaytime(currentPage + 1);
    });

    const init = () => {
        fetchLiveStats();
        setInterval(fetchLiveStats, LIVE_STATS_REFRESH_INTERVAL_MS);

        fetchHistory('7d');
        fetchPlaytime(0);
    };

    init();
});