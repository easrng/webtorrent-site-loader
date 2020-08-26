const wait = ms => new Promise(r => setTimeout(r, ms));
// A convenient shortcut for `document.querySelector()`
var $ = document.querySelector.bind(document); // eslint-disable-line id-length

let installed = () => {};
(async () => {
  // Check if the application is installed by checking the controller.
  // If there is a service worker controlling this page, let's assume
  // the application is installed.
  let registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    installed();
  } else {
    await install();
  }
  logInstall("Worker added");
  let client = new WebTorrent();
  client.on("error", function(err) {
    logInstall("Fatal error.");
  });
  logInstall("Got WebTorrent client");
  logInstall("Downloading torrent metadata");
  let torrentId =
    "magnet:?xt=urn:btih:ccae092931c1f7f60d10792735bc38ef22840936&dn=site.zip&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337";
  client.add(torrentId, function(torrent) {
    torrent.on("wire", function(wire, addr) {
      logInstall("Connected to a peer");
    });
    torrent.on("noPeers", function(announceType) {
      logInstall("No peers");
    });
    torrent.on("download", function(bytes) {
      logInstall(Math.floor(torrent.progress * 100) + "% downloaded");
    });
    logInstall("Torrent metadata downloaded");
    torrent.files;
    let loadpromises = [];
    for (let file of torrent.files) {
      loadpromises.push(
        new Promise(r => {
          logInstall("Loading " + file.name);
          file.getBlob(async (err, blob) => {
            if (err) throw err;
            logInstall("Loaded " + file.name);
            if (
              await (await fetch(
                "/_load?name=" + encodeURIComponent(file.name),
                {
                  method: "PUT",
                  body: blob
                }
              )).json().done
            ) {
              logInstall("Cached " + file.name);
            } else {
              logInstall("Error caching " + file.name);
            }
            r();
          });
        })
      );
    }
    Promise.all(loadpromises).then(() => {
      client.destroy(() => {
        logInstall("Done!");
        setTimeout(() => window.location.replace(window.location.href), 500);
      });
    });
  });
})();

// During installation, once the service worker is active, we shows
// the image dynamic loader.
navigator.serviceWorker.oncontrollerchange = function() {
  if (navigator.serviceWorker.controller) {
    installed();
  }
};

// Install the worker is no more than registering. It is in charge of
// downloading the package, decompress and cache the resources.
function install() {
  return new Promise(r => {
    installed = r;
    navigator.serviceWorker
      .register("sw.js")
      .then(function() {})
      .catch(function(error) {
        logInstall("An error happened.");
      });
  });
}

function logInstall(what) {
  log(what, "Install");
}

function logUninstall(what) {
  log(what, "Uninstall");
}

const logEle = document.querySelector("pre");
function log(what, tag) {
  var label = "[" + tag + "] ";
  logEle.innerText += label + what + "\n";
}
