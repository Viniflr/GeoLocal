// Nome da cache para a versão atual do aplicativo
const CACHE_NAME = 'habitat-locator-v1';
// Arquivos essenciais para o funcionamento offline (o 'shell' do aplicativo)
const urlsToCache = [
    '/',
    '/plant_locator.html', 
    '/manifest.json',
    // O Service Worker tentará cachear o CSS/JS do CDN na primeira requisição 'fetch' 
    // mas listamos os arquivos locais do 'shell' aqui.
];

// Instalação do Service Worker: Caching do App Shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache aberta com sucesso.');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Falha ao adicionar ao cache:', error);
            })
    );
});

// Interceptação de requisições: Estratégia "Cache-First" 
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Retorna o recurso do cache se ele existir
                if (response) {
                    return response;
                }
                // Senão, tenta obter o recurso da rede
                return fetch(event.request);
            })
    );
});

// Limpeza de caches antigas
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        // Deleta caches que não estão na lista branca
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});