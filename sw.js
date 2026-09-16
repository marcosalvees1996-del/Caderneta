/* service worker da Caderneta de Sala
   guarda o essencial para abrir offline; tenta a rede primeiro,
   cai para o cache quando nao ha sinal. Nao toca em localStorage:
   isso nao existe neste escopo. */
var CACHE = "caderneta-v2";
var ARQUIVOS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-48.png",
  "./icons/icon-72.png",
  "./icons/icon-96.png",
  "./icons/icon-144.png",
  "./icons/icon-192.png",
  "./icons/icon-384.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", function(ev){
  ev.waitUntil(
    caches.open(CACHE).then(function(cache){
      return cache.addAll(ARQUIVOS);
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(ev){
  ev.waitUntil(
    caches.keys().then(function(chaves){
      return Promise.all(chaves.map(function(chave){
        if(chave !== CACHE) return caches.delete(chave);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(ev){
  if(ev.request.method !== "GET") return;
  ev.respondWith(
    fetch(ev.request, { cache: "no-store" }).then(function(resposta){
      var copia = resposta.clone();
      caches.open(CACHE).then(function(cache){ cache.put(ev.request, copia); });
      return resposta;
    }).catch(function(){
      return caches.match(ev.request).then(function(guardado){
        if(guardado) return guardado;
        if(ev.request.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
