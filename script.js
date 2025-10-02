// Variáveis globais para os elementos da UI
const locateButton = document.getElementById('locate-button');
const messageBox = document.getElementById('message');
const resultsContainer = document.getElementById('results-container');
const coordsDisplay = document.getElementById('coords');

const countryName = document.getElementById('country-name');
const countryCapital = document.getElementById('country-capital');
const countryPop = document.getElementById('country-pop');
const countryRegion = document.getElementById('country-region');
const countryTimezone = document.getElementById('country-timezone');
const countryFlag = document.getElementById('country-flag');

const API_TIMEOUT = 10000;

// Funções de UI e Feedback
function updateMessage(text, type = 'info') {
    messageBox.textContent = text;
    const styles = {
        error: 'bg-red-100 border-l-4 border-red-500 text-red-700',
        success: 'bg-green-100 border-l-4 border-green-500 text-green-700',
        loading: 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700',
        info: 'bg-blue-100 border-l-4 border-blue-500 text-blue-700'
    };
    messageBox.className = `p-4 rounded-xl mb-6 text-sm transition-all duration-300 ${styles[type] || styles.info}`;
}

function toggleLoading(isLoading) {
    locateButton.disabled = isLoading;
    locateButton.innerHTML = isLoading 
        ? '<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Localizando...' 
        : '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> Obter Localização';
}

// RECURSO DE HARDWARE: GEOLOCALIZAÇÃO
function getGeolocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            return reject(new Error('Geolocalização não é suportada pelo seu navegador.'));
        }

        const options = { enableHighAccuracy: true, timeout: API_TIMEOUT, maximumAge: 0 };
        navigator.geolocation.getCurrentPosition(resolve, (error) => {
            let errorMessage = 'Erro desconhecido na Geolocalização.';
            if (error.code === error.PERMISSION_DENIED) errorMessage = 'Permissão negada. Por favor, permita o acesso à localização.';
            else if (error.code === error.POSITION_UNAVAILABLE) errorMessage = 'Localização indisponível. Tente novamente.';
            else if (error.code === error.TIMEOUT) errorMessage = 'Tempo esgotado ao tentar obter a localização.';
            reject(new Error(errorMessage));
        }, options);
    });
}

// CONSUMO DE API 1: REVERSE GEOCODING (Nominatim)
async function getCountryCode(lat, lng) {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
    updateMessage('Buscando o código do país...', 'loading');
    
    try {
        const response = await fetch(nominatimUrl, { signal: AbortSignal.timeout(API_TIMEOUT) });
        const data = await response.json();
        const countryCode = data.address?.country_code;
        if (!response.ok || !countryCode) throw new Error('Falha ao reverter coordenadas para país.');
        return countryCode.toUpperCase();
    } catch (error) {
        console.error("Erro na Nominatim API:", error);
        throw new Error(`Erro ao encontrar o país. Você está em um local remoto?`);
    }
}

// CONSUMO DE API 2: REST COUNTRIES (Dados do País)
async function getCountryDetails(countryCode) {
    const restCountriesUrl = `https://restcountries.com/v3.1/alpha/${countryCode}`;
    updateMessage('Obtendo dados detalhados do país (Dossiê do local)...', 'loading');

    try {
        const response = await fetch(restCountriesUrl, { signal: AbortSignal.timeout(API_TIMEOUT) });
        if (!response.ok) throw new Error('Falha ao obter detalhes do país na API.');
        const data = await response.json();
        return data[0]; 
    } catch (error) {
        console.error("Erro na REST Countries API:", error);
        throw new Error(`Erro nos detalhes do país: ${error.message}`);
    }
}

// Função Principal do Localizador
async function runLocator() {
    toggleLoading(true);
    resultsContainer.classList.add('hidden');

    try {
        // 1. Obter Localização (Hardware)
        const position = await getGeolocation();
        const lat = position.coords.latitude.toFixed(4);
        const lng = position.coords.longitude.toFixed(4);
        coordsDisplay.textContent = `${lat}, ${lng}`;
        
        // 2. Converter para País (API 1)
        const countryCode = await getCountryCode(lat, lng);

        // 3. Buscar Detalhes (API 2)
        const countryData = await getCountryDetails(countryCode);

        // 4. Exibir
        renderResults(countryData);
        updateMessage('Sucesso! Dossiê do local Carregado.', 'success');

    } catch (error) {
        console.error('Erro no fluxo principal:', error);
        updateMessage(`Falha na localização: ${error.message}.`, 'error');
        resultsContainer.classList.add('hidden');
    } finally {
        toggleLoading(false);
    }
}

// Renderização dos Resultados
function renderResults(data) {
    countryName.textContent = data.translations.por?.common || data.name.common;
    countryCapital.textContent = data.capital?.[0] || 'N/A';
    countryPop.textContent = data.population.toLocaleString('pt-BR');
    countryRegion.textContent = `${data.region} (${data.subregion || 'Global'})`;
    countryTimezone.textContent = data.timezones?.[0] || 'N/A';
    countryFlag.textContent = data.flag || '❓'; 

    resultsContainer.classList.remove('hidden');
}


// Event Listener do botão
locateButton.addEventListener('click', runLocator);

// Registro do Service Worker (PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registrado com sucesso:', reg.scope))
            .catch(err => console.error('Falha no registro do Service Worker:', err));
    });
}