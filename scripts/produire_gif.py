"""Produit un GIF à partir d'une source HTML animée du dépôt.

La page est ouverte une seule fois dans Edge ou Chrome sans interface,
piloté par le protocole DevTools. L'animation est ralentie par le paramètre
d'URL `timeScale` (option `animationTimeScale` de assets/js/contours-sketch.js),
puis capturée à intervalles réguliers : le temps de capture d'une image
devient négligeable devant le pas de l'animation, qui reste fluide.

Exemple, depuis la racine du dépôt :

    python scripts/produire_gif.py campagnes/lancement-tiktok/outro-source.html \\
        campagnes/lancement-tiktok/contours-nc-outro.gif

La source doit accepter `?manual=1&timeScale=N`, signaler qu'elle est prête
(`document.documentElement.dataset.outroControllerReady = "true"`) et exposer
une fonction de démarrage (`window.startContoursOutro`), comme
campagnes/lancement-tiktok/outro-source.html.

Dépendances : Pillow et websocket-client
(python -m pip install --user pillow websocket-client).
"""

from __future__ import annotations

import argparse
import base64
import functools
import http.server
import io
import itertools
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from pathlib import Path

import websocket
from PIL import Image

RACINE = Path(__file__).resolve().parent.parent
NAVIGATEURS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
]


def trouver_navigateur(chemin: str | None) -> str:
    candidats = [chemin] if chemin else []
    candidats += NAVIGATEURS
    candidats += [shutil.which(nom) for nom in ("msedge", "google-chrome", "chromium", "chrome")]
    for candidat in candidats:
        if candidat and Path(candidat).exists():
            return candidat
    sys.exit("Aucun navigateur Chromium trouvé : préciser --navigateur.")


def port_libre() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def servir(racine: Path, port: int) -> http.server.ThreadingHTTPServer:
    # Les modules ES et fetch() exigent un serveur HTTP (pas de file://).
    class Gestionnaire(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    serveur = http.server.ThreadingHTTPServer(
        ("127.0.0.1", port), functools.partial(Gestionnaire, directory=str(racine))
    )
    threading.Thread(target=serveur.serve_forever, daemon=True).start()
    return serveur


class DevTools:
    """Client minimal du protocole DevTools, sur une page."""

    def __init__(self, url_websocket: str):
        self.socket = websocket.create_connection(url_websocket, timeout=60)
        self.compteur = itertools.count(1)

    def appeler(self, methode: str, **parametres):
        identifiant = next(self.compteur)
        self.socket.send(json.dumps({"id": identifiant, "method": methode, "params": parametres}))
        while True:
            message = json.loads(self.socket.recv())
            if message.get("id") == identifiant:
                if "error" in message:
                    raise RuntimeError(f"{methode} : {message['error']}")
                return message.get("result", {})

    def evaluer(self, expression: str):
        resultat = self.appeler("Runtime.evaluate", expression=expression, returnByValue=True)
        return resultat.get("result", {}).get("value")

    def attendre(self, expression: str, delai: float = 60) -> None:
        fin = time.monotonic() + delai
        while time.monotonic() < fin:
            if self.evaluer(expression):
                return
            time.sleep(0.05)
        raise TimeoutError(f"Condition non atteinte : {expression}")

    def fermer(self) -> None:
        self.socket.close()


def ouvrir_navigateur(navigateur: str, profil: str) -> tuple[subprocess.Popen, str]:
    port = port_libre()
    processus = subprocess.Popen(
        [
            navigateur,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--mute-audio",
            f"--remote-debugging-port={port}",
            "--remote-allow-origins=*",
            f"--user-data-dir={profil}",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    fin = time.monotonic() + 30
    while time.monotonic() < fin:
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list", timeout=2) as reponse:
                pages = [cible for cible in json.load(reponse) if cible.get("type") == "page"]
            if pages:
                return processus, pages[0]["webSocketDebuggerUrl"]
        except OSError:
            pass
        time.sleep(0.2)
    processus.kill()
    sys.exit("Le navigateur n'a pas ouvert son port de débogage.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("source", help="page HTML animée, relative à la racine du dépôt")
    parser.add_argument("sortie", help="fichier GIF à produire")
    parser.add_argument("--largeur", type=int, default=720, help="largeur du GIF, en pixels")
    parser.add_argument("--hauteur", type=int, default=1280, help="hauteur du GIF, en pixels")
    parser.add_argument("--echelle", type=float, default=4 / 3,
                        help="agrandissement de la page (720 × 1280 avec 4/3 : mise en page de 540 × 960)")
    parser.add_argument("--duree", type=int, default=9500, help="durée d'animation capturée, en ms")
    parser.add_argument("--ips", type=float, default=10, help="images par seconde du GIF")
    parser.add_argument("--ralenti", type=float, default=6, help="facteur de ralentissement (timeScale)")
    parser.add_argument("--pause-finale", type=int, default=2500, help="maintien de la dernière image, en ms")
    parser.add_argument("--demarrage", default="startContoursOutro", help="fonction JS qui lance l'animation")
    parser.add_argument("--attente", default="#outro-mark svg",
                        help="sélecteur CSS dont l'apparition marque le début de l'animation")
    parser.add_argument("--navigateur", help="chemin d'Edge ou de Chrome")
    args = parser.parse_args()

    source = (RACINE / args.source).resolve()
    if not source.exists():
        sys.exit(f"Source introuvable : {source}")
    navigateur = trouver_navigateur(args.navigateur)
    port = port_libre()
    serveur = servir(RACINE, port)
    url = (f"http://127.0.0.1:{port}/{source.relative_to(RACINE).as_posix()}"
           f"?manual=1&timeScale={args.ralenti:g}")

    pas = 1000 / args.ips
    nombre = int(args.duree // pas) + 1
    images = []
    with tempfile.TemporaryDirectory() as profil:
        processus, url_websocket = ouvrir_navigateur(navigateur, profil)
        outil = DevTools(url_websocket)
        try:
            outil.appeler("Page.enable")
            outil.appeler(
                "Emulation.setDeviceMetricsOverride",
                width=round(args.largeur / args.echelle),
                height=round(args.hauteur / args.echelle),
                deviceScaleFactor=args.echelle,
                mobile=False,
            )
            outil.appeler("Page.navigate", url=url)
            outil.attendre("document.documentElement.dataset.outroControllerReady === 'true'")
            outil.evaluer(f"window.{args.demarrage}()")
            selecteur = json.dumps(args.attente)
            outil.attendre(f"Boolean(document.querySelector({selecteur}))")
            depart = time.monotonic()
            for index in range(nombre):
                cible = depart + index * pas * args.ralenti / 1000
                attente = cible - time.monotonic()
                if attente > 0:
                    time.sleep(attente)
                capture = outil.appeler("Page.captureScreenshot", format="png", fromSurface=True)
                image = Image.open(io.BytesIO(base64.b64decode(capture["data"]))).convert("RGB")
                images.append(image.resize((args.largeur, args.hauteur)) if image.size != (args.largeur, args.hauteur) else image)
                print(f"\rImage {index + 1}/{nombre}", end="", flush=True)
        finally:
            outil.fermer()
            processus.terminate()
            processus.wait(timeout=30)
            serveur.shutdown()
    print()

    # Palette commune, construite sur la dernière image (la plus complète),
    # pour éviter le scintillement des couleurs d'une image à l'autre.
    palette = images[-1].quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    cadres = [image.quantize(palette=palette, dither=Image.Dither.NONE) for image in images]
    durees = [round(pas)] * len(cadres)
    durees[-1] += args.pause_finale

    sortie = Path(args.sortie)
    if not sortie.is_absolute():
        sortie = RACINE / sortie
    sortie.parent.mkdir(parents=True, exist_ok=True)
    cadres[0].save(sortie, save_all=True, append_images=cadres[1:], duration=durees, loop=0, optimize=True)
    taille = os.path.getsize(sortie) / 1024
    print(f"GIF produit : {sortie} ({len(cadres)} images, {taille:.0f} Ko)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
