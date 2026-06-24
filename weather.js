/**
 * Asynchronous Weather Dashboard Engine
 * Handles decoupled geocoding lookups and multi-tier REST queries safely.
 */

document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const cityInput = document.getElementById('city-input');
    const statusDisplay = document.getElementById('status-display');
    const weatherUI = document.getElementById('weather-ui');

    // UI Field Selectors
    const uiCity = document.getElementById('ui-city');
    const uiCoords = document.getElementById('ui-coords');
    const uiTemp = document.getElementById('ui-temp');
    const uiHumidity = document.getElementById('ui-humidity');
    const uiWind = document.getElementById('ui-wind');
    const uiApparent = document.getElementById('ui-apparent');
    const uiCode = document.getElementById('ui-code');

    // WMO Weather Interpretation Codes Map (Open-Meteo Spec)
    const weatherCodeMap = {
        0: 'Clear Sky',
        1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Depositing Rime Fog',
        51: 'Light Drizzle', 53: 'Moderate Drizzle', 55: 'Dense Drizzle',
        61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
        71: 'Slight Snow Fall', 73: 'Moderate Snow Fall', 75: 'Heavy Snow Fall',
        95: 'Thunderstorm', 96: 'Thunderstorm with Slight Hail'
    };

    // ==========================================================================
    // MAIN CONTROLLER PIPELINE (Async/Await Flow)
    // ==========================================================================
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = cityInput.value.trim();

        if (!query) return;

        // Reset display state metrics
        showLoading(`Searching metrics data for "${query}"...`);

        try {
            // Stage 1: Call Geocoding Endpoint to resolve Name -> Coordinates
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
            const geoResponse = await fetch(geoUrl);
            
            if (!geoResponse.ok) {
                throw new Error('Geocoding interface service unexpected failure.');
            }

            const geoData = await geoResponse.json();
            
            // Boundary validation check: Did the location check return results?
            if (!geoData.results || geoData.results.length === 0) {
                throw new Error(`Could not find a city matching "${query}". Please check spelling.`);
            }

            // Extract nested properties safely via destructuring
            const { name, latitude, longitude, country } = geoData.results[0];

            // Stage 2: Call Weather Endpoint using resolved coordinate strings
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`;
            const weatherResponse = await fetch(weatherUrl);

            if (!weatherResponse.ok) {
                throw new Error('Weather metric metrics download network disruption.');
            }

            const weatherData = await weatherResponse.json();

            // Render successful results to the UI
            renderWeather(name, country, latitude, longitude, weatherData.current);

        } catch (error) {
            showError(error.message);
        }
    });

    // ==========================================================================
    // UI RENDERING UTILITIES
    // ==========================================================================
    
    function renderWeather(cityName, countryName, lat, lon, currentMetrics) {
        // Clear out notification status states
        statusDisplay.className = 'status-msg';
        statusDisplay.style.display = 'none';

        // Bind raw object attributes to UI text nodes
        uiCity.textContent = `${cityName}, ${countryName}`;
        uiCoords.textContent = `Lat: ${lat.toFixed(2)}° | Lon: ${lon.toFixed(2)}°`;
        
        // Render current atmospheric conditions
        uiTemp.textContent = `${Math.round(currentMetrics.temperature_2m)}°C`;
        uiHumidity.textContent = `${currentMetrics.relative_humidity_2m}%`;
        uiWind.textContent = `${currentMetrics.wind_speed_10m} km/h`;
        uiApparent.textContent = `${Math.round(currentMetrics.apparent_temperature)}°C`;
        
        // Translate numerical codes into human-readable text strings
        const conditionText = weatherCodeMap[currentMetrics.weather_code] || 'Unknown Conditions';
        uiCode.textContent = conditionText;

        // Reveal card viewport via transitions
        weatherUI.classList.add('active');
    }

    function showLoading(message) {
        weatherUI.classList.remove('active');
        statusDisplay.className = 'status-msg loading';
        statusDisplay.textContent = message;
    }

    function showError(errorMessage) {
        weatherUI.classList.remove('active');
        statusDisplay.className = 'status-msg error';
        statusDisplay.textContent = errorMessage;
    }
});
