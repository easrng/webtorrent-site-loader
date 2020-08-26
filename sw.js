// During installation, extend the event to recover the package
// for this recipe and install into an offline cache.
self.oninstall = function(event) {
  event.waitUntil(
    self.skipWaiting() // control clients ASAP
  );
};

// Control the clients as soon as possible.
self.onactivate = function(event) {
  event.waitUntil(self.clients.claim());
};

// Answer by querying the cache. If fail, go to the network.
self.onfetch = function(event) {
  let u = new URL(event.request.url);
  if (
    u.pathname == "/_load" &&
    event.request.method == "PUT" &&
    u.searchParams.get("name")
  ) {
    return event.respondWith(
      (async () => {
        try {
          let cache = await openCache();
          var location = getLocation(u.searchParams.get("name"));
          let data = await event.request.blob();
          var response = new Response(data, {
            headers: {
              // As the zip says nothing about the nature of the file, we extract
              // this information from the file name.
              "Content-Type": getContentType(u.searchParams.get("name"))
            }
          });

          // If the entry is the index, cache its contents for root as well.
          if (u.searchParams.get("name").startsWith("index.")) {
            // Response are one-use objects, as `.put()` consumes the data in the body
            // we need to clone the response in order to use it twice.
            cache.put(getLocation("/"), response.clone());
          }

          await cache.put(location, response);
          return new Response(JSON.stringify({ done: true }), {
            headers: { "content-type": "application/json" }
          });
        } catch (e) {
          return new Response(JSON.stringify(e), {
            headers: { "content-type": "application/json" },
            status: 500
          });
        }
      })()
    );
  }
  event.respondWith(
    openCache().then(function(cache) {
      return cache.match(event.request).then(function(response) {
        return response || fetch(event.request);
      });
    })
  );
};

// Return the location for each entry.
function getLocation(filename) {
  return new URL(filename, location.href).href;
}

var contentTypesByExtension = {
  css: "text/css",
  js: "application/javascript",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  html: "text/html",
  htm: "text/html"
};

// Return the content type of a file based on the name extension
function getContentType(filename) {
  var tokens = filename.split(".");
  var extension = tokens[tokens.length - 1];
  return contentTypesByExtension[extension] || "text/plain";
}

// Opening a cache is an expensive operation. By caching the promise
// returned by `cache.open()` we only open the cache once.
var cachePromise;
function openCache() {
  if (!cachePromise) {
    cachePromise = caches.open("cache-from-zip");
  }
  return cachePromise;
}