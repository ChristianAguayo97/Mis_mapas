let map;
let windowLines = [];
let windowMarkers = [];
let selectedLocationId = null;
let SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1Izlbrw4NMixFpSfuBh7oBQFg4UGen6HMCKlWAx70if8/export?format=csv';
let showMarkers = true; // Nuevo estado para mostrar/ocultar marcadores

// Maneja el cambio de hoja desde el input
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    loadSheetAndDraw();

    const loadBtn = document.getElementById('loadSheetBtn');
    const urlInput = document.getElementById('sheetUrlInput');
    const toggleMarkers = document.getElementById('toggleMarkers');

    if (toggleMarkers) {
        toggleMarkers.addEventListener('change', function() {
            showMarkers = toggleMarkers.checked;
            updateMarkersVisibility();
        });
    }

    if (loadBtn && urlInput) {
        loadBtn.addEventListener('click', function() {
            let url = urlInput.value.trim();
            if (url) {
                const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
                if (match) {
                    const sheetId = match[1];
                    url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
                }
                SHEET_CSV_URL = url;
                loadSheetAndDraw();
                urlInput.value = '';
            }
        });
    }
});

// Inicializar el mapa
function initializeMap() {
    map = L.map('map').setView([-34.54331449419978, -58.71145951544417], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
}

// Limpia líneas y marcadores anteriores
function clearMap() {
    if (window.lines) {
        window.lines.forEach(line => map.removeLayer(line));
    }
    window.lines = [];
    if (window.markers) {
        window.markers.forEach(marker => map.removeLayer(marker));
    }
    window.markers = [];
}

// Carga y dibuja los datos de la hoja y el sidebar
async function loadSheetAndDraw() {
    clearMap();
    const response = await fetch(SHEET_CSV_URL);
    const csv = await response.text();
    const rows = csv.split('\n').slice(1); 
    window.lines = [];
    window.markers = [];
    const locationsList = document.getElementById('locationsList');
    if (locationsList) locationsList.innerHTML = '';

    rows.forEach((row, idx) => {
        const cols = row.split(',');
        if (cols.length < 7) return;
        const calle = cols[0];
        const entre1 = cols[1];
        const entre2 = cols[2];
        const latA = parseFloat(cols[3]);
        const lonA = parseFloat(cols[4]);
        const latB = parseFloat(cols[5]);
        const lonB = parseFloat(cols[6]);
        if (isNaN(latA) || isNaN(lonA) || isNaN(latB) || isNaN(lonB)) return;

        // Dibuja línea entre A y B
        const polyline = L.polyline([[latA, lonA], [latB, lonB]], {color: 'blue'}).addTo(map);
        window.lines.push(polyline);

        // Agrega marcadores para Punto A y B
        const markerA = L.marker([latA, lonA])
            .addTo(map)
            .bindPopup(`<b>${calle}</b><br>Entre: ${entre1} y ${entre2}<br><b>Punto A</b>`);
        const markerB = L.marker([latB, lonB])
            .addTo(map)
            .bindPopup(`<b>${calle}</b><br>Entre: ${entre1} y ${entre2}<br><b>Punto B</b>`);
        window.markers.push(markerA, markerB);

        // Oculta los marcadores si showMarkers es false
        if (!showMarkers) {
            map.removeLayer(markerA);
            map.removeLayer(markerB);
        }

        // Sidebar: agrega tramo
        if (locationsList) {
            const card = document.createElement('div');
            card.className = 'location-card';
            card.dataset.locationId = idx;
            card.innerHTML = `
                <div class="location-header">
                    <div class="location-title">${calle}</div>
                </div>
                <div class="location-description">
                    Entre: ${entre1} y ${entre2}
                </div>
                <div class="location-footer">
                    <span class="location-coords">A: ${latA.toFixed(5)}, ${lonA.toFixed(5)}</span><br>
                    <span class="location-coords">B: ${latB.toFixed(5)}, ${lonB.toFixed(5)}</span>
                </div>
            `;
            card.addEventListener('click', function() {
                map.fitBounds([[latA, lonA], [latB, lonB]], {padding: [50, 50]});
            });
            locationsList.appendChild(card);
        }
    });

    // Centra el mapa en la zona de los datos
    if (window.lines.length > 0) {
        map.fitBounds(L.featureGroup(window.lines).getBounds());
    }
}

// Función para mostrar/ocultar marcadores según el checkbox
function updateMarkersVisibility() {
    if (window.markers) {
        window.markers.forEach(marker => {
            if (showMarkers) {
                if (!map.hasLayer(marker)) map.addLayer(marker);
            } else {
                if (map.hasLayer(marker)) map.removeLayer(marker);
            }
        });
    }
}

// Redimensiona el mapa al cambiar el tamaño de la ventana
window.addEventListener('resize', function() {
    if (map) {
        map.invalidateSize();
    }
});