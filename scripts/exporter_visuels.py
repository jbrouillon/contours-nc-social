"""Exporte des séries de visuels sociaux avec Chromium.

Deux sources sont prises en charge :

- ``en-bref`` : les diapositives intégrées à un article de contours.nc ;
- ``html`` : une source HTML autonome contenant des éléments ``data-slide``.

Les captures sont produites sans recadrage aux dimensions exactes du format.
Le script attend les polices, images et croquis, contrôle les débordements et
refuse d'écraser un fichier existant sans ``--force``.
"""

from __future__ import annotations

import argparse
import base64
import functools
import http.server
import itertools
import json
import os
import shutil
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse
import urllib.request
from contextlib import ExitStack, contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

try:
    import websocket
except ImportError as erreur:
    raise SystemExit(
        "Dépendance manquante : installer websocket-client avec "
        "« python -m pip install --user websocket-client »"
    ) from erreur


RACINE = Path(__file__).resolve().parent.parent
SCRIPT_EN_BREF = RACINE / "export" / "export-en-bref.js"
NAVIGATEURS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
]


@dataclass(frozen=True)
class Format:
    nom: str
    largeur: int
    hauteur: int
    largeur_css_en_bref: int
    hauteur_css_en_bref: int
    layout_html: str

    @property
    def echelle_en_bref(self) -> float:
        echelle_x = self.largeur / self.largeur_css_en_bref
        echelle_y = self.hauteur / self.hauteur_css_en_bref
        if abs(echelle_x - echelle_y) > 1e-9:
            raise ValueError(f"Échelle incohérente pour {self.nom}")
        return echelle_x


FORMATS = {
    "portrait-4x5": Format("portrait-4x5", 1080, 1350, 720, 900, "portrait"),
    "carre-1x1": Format("carre-1x1", 1080, 1080, 900, 900, "square"),
    "vertical-9x16": Format("vertical-9x16", 1080, 1920, 540, 960, "tiktok"),
    "paysage-1.91x1": Format("paysage-1.91x1", 1200, 630, 1200, 630, "link"),
}


class ErreurExport(RuntimeError):
    pass


def port_libre() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def trouver_navigateur(chemin: str | None) -> str:
    candidats = [chemin] if chemin else []
    candidats += NAVIGATEURS
    candidats += [shutil.which(nom) for nom in ("msedge", "google-chrome", "chromium", "chrome")]
    for candidat in candidats:
        if candidat and Path(candidat).exists():
            return str(candidat)
    raise ErreurExport("Aucun navigateur Chromium trouvé : préciser --navigateur.")


class GestionnaireSilencieux(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class ServeurSilencieux(http.server.ThreadingHTTPServer):
    def handle_error(self, request, client_address):
        # Chromium peut fermer une connexion encore servie lors de son arrêt.
        # Ce cas attendu ne doit pas polluer le compte rendu d'export.
        if isinstance(sys.exc_info()[1], (ConnectionResetError, BrokenPipeError)):
            return
        super().handle_error(request, client_address)


@contextmanager
def servir(racine: Path) -> Iterator[str]:
    port = port_libre()
    serveur = ServeurSilencieux(
        ("127.0.0.1", port),
        functools.partial(GestionnaireSilencieux, directory=str(racine)),
    )
    fil = threading.Thread(target=serveur.serve_forever, daemon=True)
    fil.start()
    try:
        yield f"http://127.0.0.1:{port}"
    finally:
        serveur.shutdown()
        serveur.server_close()


class DevTools:
    def __init__(self, url_websocket: str):
        self.socket = websocket.create_connection(url_websocket, timeout=60)
        self.compteur = itertools.count(1)

    def appeler(self, methode: str, **parametres):
        identifiant = next(self.compteur)
        self.socket.send(json.dumps({"id": identifiant, "method": methode, "params": parametres}))
        while True:
            message = json.loads(self.socket.recv())
            if message.get("id") != identifiant:
                continue
            if "error" in message:
                raise ErreurExport(f"{methode} : {message['error']}")
            return message.get("result", {})

    def evaluer(self, expression: str):
        reponse = self.appeler(
            "Runtime.evaluate",
            expression=expression,
            returnByValue=True,
            awaitPromise=True,
        )
        if "exceptionDetails" in reponse:
            details = reponse["exceptionDetails"]
            exception = details.get("exception", {}).get("description")
            raise ErreurExport(exception or details.get("text", "Erreur JavaScript"))
        return reponse.get("result", {}).get("value")

    def attendre(self, expression: str, delai: float = 60, libelle: str | None = None) -> None:
        fin = time.monotonic() + delai
        derniere_erreur = None
        while time.monotonic() < fin:
            try:
                if self.evaluer(expression):
                    return
            except (ErreurExport, OSError) as erreur:
                derniere_erreur = erreur
            time.sleep(0.1)
        detail = f" ({derniere_erreur})" if derniere_erreur else ""
        raise ErreurExport(f"Délai dépassé : {libelle or expression}{detail}")

    def definir_fenetre(self, largeur: int, hauteur: int, echelle: float = 1) -> None:
        self.appeler(
            "Emulation.setDeviceMetricsOverride",
            width=largeur,
            height=hauteur,
            deviceScaleFactor=echelle,
            mobile=False,
        )

    def naviguer(self, url: str) -> None:
        self.appeler("Page.navigate", url=url)
        self.attendre("document.readyState === 'complete'", libelle="chargement de la page")

    def capturer(self) -> bytes:
        reponse = self.appeler(
            "Page.captureScreenshot",
            format="png",
            fromSurface=True,
            captureBeyondViewport=False,
        )
        return base64.b64decode(reponse["data"])

    def fermer(self) -> None:
        self.socket.close()


@contextmanager
def navigateur(chemin: str) -> Iterator[DevTools]:
    port = port_libre()
    profil = Path(tempfile.mkdtemp(prefix="contours-social-"))
    processus = subprocess.Popen(
        [
            chemin,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--mute-audio",
            "--remote-allow-origins=*",
            f"--remote-debugging-port={port}",
            f"--user-data-dir={profil}",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    outil = None
    try:
        fin = time.monotonic() + 30
        page = None
        while time.monotonic() < fin:
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list", timeout=2) as reponse:
                    page = next(cible for cible in json.load(reponse) if cible.get("type") == "page")
                break
            except (OSError, StopIteration):
                time.sleep(0.2)
        if not page:
            raise ErreurExport("Le navigateur n'a pas ouvert son port de débogage.")
        outil = DevTools(page["webSocketDebuggerUrl"])
        outil.appeler("Page.enable")
        outil.appeler("Runtime.enable")
        yield outil
    finally:
        if outil:
            outil.fermer()
        processus.terminate()
        try:
            processus.wait(timeout=30)
        except subprocess.TimeoutExpired:
            processus.kill()
            processus.wait(timeout=10)
        shutil.rmtree(profil, ignore_errors=True)


def ajouter_parametres(url: str, parametres: dict[str, str | int]) -> str:
    morceaux = urllib.parse.urlsplit(url)
    requete = dict(urllib.parse.parse_qsl(morceaux.query, keep_blank_values=True))
    requete.update({cle: str(valeur) for cle, valeur in parametres.items()})
    return urllib.parse.urlunsplit(
        (morceaux.scheme, morceaux.netloc, morceaux.path, urllib.parse.urlencode(requete), morceaux.fragment)
    )


def chemin_dans_depot(valeur: str | Path, libelle: str = "La sortie") -> Path:
    chemin = Path(valeur)
    cible = (chemin if chemin.is_absolute() else RACINE / chemin).resolve()
    if cible != RACINE and RACINE not in cible.parents:
        raise ErreurExport(f"{libelle} doit rester dans {RACINE} : {cible}")
    return cible


def dimensions_png(contenu: bytes) -> tuple[int, int]:
    if contenu[:8] != b"\x89PNG\r\n\x1a\n" or len(contenu) < 24:
        raise ErreurExport("La capture reçue n'est pas un PNG valide.")
    return struct.unpack(">II", contenu[16:24])


def ecrire_png(cible: Path, contenu: bytes, format_: Format, force: bool) -> None:
    dimensions = dimensions_png(contenu)
    attendues = (format_.largeur, format_.hauteur)
    if dimensions != attendues:
        raise ErreurExport(f"Dimensions inattendues pour {cible.name} : {dimensions}, attendu {attendues}.")
    if cible.exists() and not force:
        raise ErreurExport(f"Le fichier existe déjà : {cible}. Relancer avec --force pour l'écraser.")
    cible.parent.mkdir(parents=True, exist_ok=True)
    temporaire = cible.with_suffix(cible.suffix + ".tmp")
    temporaire.write_bytes(contenu)
    os.replace(temporaire, cible)


def preparer_cibles(sortie: Path, format_: Format, prefixe: str, nombre: int, force: bool) -> list[Path]:
    cibles = [sortie / format_.nom / f"{prefixe}-{numero:02d}.png" for numero in range(1, nombre + 1)]
    existantes = [cible for cible in cibles if cible.exists()]
    if existantes and not force:
        apercu = ", ".join(str(cible.relative_to(RACINE)) for cible in existantes[:3])
        suite = "…" if len(existantes) > 3 else ""
        raise ErreurExport(
            f"{len(existantes)} fichier(s) existent déjà ({apercu}{suite}). "
            "Relancer avec --force pour les écraser."
        )
    return cibles


def attendre_ressources(outil: DevTools, croquis: bool = False) -> None:
    outil.attendre(
        "document.fonts && document.fonts.status === 'loaded' && "
        "Array.from(document.images).every((image) => image.complete)",
        libelle="polices et images",
    )
    if croquis:
        outil.attendre(
            "(() => {"
            "const slide = Array.from(document.querySelectorAll("
            "'.contours-brief-slide, [data-vote-brief-slide]'"
            ")).find((node) => !node.hidden);"
            "if (!slide) return false;"
            "const sketches = Array.from(slide.querySelectorAll("
            "'.contours-brief-sketch, [data-vote-brief-sketch]'"
            "));"
            "return sketches.every((svg) => svg.childElementCount > 0);"
            "})()",
            delai=90,
            libelle="croquis de la diapositive active",
        )


def verifier_debordement_en_bref(outil: DevTools, numero: int, autoriser: bool) -> None:
    mesure = outil.evaluer(
        "(() => {"
        "const stage = document.querySelector('.contours-brief-stage, .vote-brief-stage');"
        "const slide = Array.from(document.querySelectorAll("
        "'.contours-brief-slide, [data-vote-brief-slide]'"
        ")).find((node) => !node.hidden);"
        "if (!stage || !slide) return null;"
        "return {"
        "stageWidth: stage.clientWidth, stageHeight: stage.clientHeight,"
        "scrollWidth: stage.scrollWidth, scrollHeight: stage.scrollHeight,"
        "slideWidth: slide.scrollWidth, slideHeight: slide.scrollHeight"
        "};"
        "})()"
    )
    if not mesure:
        raise ErreurExport(f"Diapositive {numero} introuvable pendant le contrôle.")
    deborde = (
        mesure["scrollWidth"] > mesure["stageWidth"] + 2
        or mesure["scrollHeight"] > mesure["stageHeight"] + 2
    )
    if deborde and not autoriser:
        raise ErreurExport(
            f"La diapositive {numero} déborde du canevas "
            f"({mesure['scrollWidth']} × {mesure['scrollHeight']} dans "
            f"{mesure['stageWidth']} × {mesure['stageHeight']}). "
            "Corriger la composition ou utiliser --autoriser-debordement pour diagnostiquer."
        )


def exporter_en_bref(args, outil: DevTools, url_source: str) -> None:
    script = SCRIPT_EN_BREF.read_text(encoding="utf-8")
    sortie = chemin_dans_depot(args.sortie)
    nombre_reference = None

    for nom_format in args.formats:
        format_ = FORMATS[nom_format]
        outil.definir_fenetre(
            format_.largeur_css_en_bref,
            format_.hauteur_css_en_bref,
            format_.echelle_en_bref,
        )
        url = ajouter_parametres(
            url_source,
            {"lecture": "en-bref", "slide": 1, "export": format_.nom},
        )
        print(f"{format_.nom} : chargement de {url}")
        outil.naviguer(url)
        outil.attendre(
            "(() => {"
            "const dialog = document.querySelector("
            "'.contours-brief-dialog, [data-vote-brief-dialog], .vote-brief-dialog'"
            ");"
            "return dialog && !dialog.hidden;"
            "})()",
            libelle="ouverture du résumé En bref",
        )
        outil.evaluer(script)
        outil.attendre(
            f"document.documentElement.dataset.contoursBriefExportReady === {json.dumps(format_.nom)}",
            libelle=f"préparation du format {format_.nom}",
        )
        nombre = outil.evaluer(
            "document.querySelectorAll("
            "'.contours-brief-slide, [data-vote-brief-slide]'"
            ").length"
        )
        if not nombre:
            raise ErreurExport("Aucune diapositive En bref trouvée.")
        if nombre_reference is None:
            nombre_reference = nombre
        elif nombre != nombre_reference:
            raise ErreurExport(f"Le nombre de diapositives varie selon le format : {nombre_reference} puis {nombre}.")

        cibles = preparer_cibles(sortie, format_, args.prefixe, nombre, args.force)
        captures: list[bytes] = []
        for index in range(nombre):
            outil.attendre(
                "Array.from(document.querySelectorAll("
                "'.contours-brief-slide, [data-vote-brief-slide]'"
                f")).findIndex((node) => !node.hidden) === {index}",
                libelle=f"activation de la diapositive {index + 1}",
            )
            attendre_ressources(outil, croquis=True)
            verifier_debordement_en_bref(outil, index + 1, args.autoriser_debordement)
            captures.append(outil.capturer())
            print(f"  diapositive {index + 1}/{nombre} contrôlée")
            if index + 1 < nombre:
                outil.evaluer(
                    "document.dispatchEvent(new KeyboardEvent('keydown', "
                    "{key: 'ArrowRight', bubbles: true}))"
                )

        for cible, capture in zip(cibles, captures):
            ecrire_png(cible, capture, format_, args.force)
            print(f"  écrit : {cible.relative_to(RACINE)}")


def analyser_paires(valeurs: list[str] | None, libelle: str) -> dict[str, str]:
    resultat = {}
    for valeur in valeurs or []:
        if "=" not in valeur:
            raise ErreurExport(f"{libelle} invalide : {valeur!r} (attendu CLE=VALEUR).")
        cle, contenu = valeur.split("=", 1)
        if not cle:
            raise ErreurExport(f"{libelle} invalide : {valeur!r}.")
        resultat[cle] = contenu
    return resultat


def verifier_source_html(outil: DevTools, selecteur: str, numero: int, autoriser: bool) -> None:
    mesure = outil.evaluer(
        "(() => {"
        f"const slide = document.querySelector({json.dumps(selecteur)});"
        "if (!slide) return null;"
        "const rect = slide.getBoundingClientRect();"
        "const style = getComputedStyle(slide);"
        "return {left: rect.left, top: rect.top, width: rect.width, height: rect.height,"
        "innerWidth: window.innerWidth, innerHeight: window.innerHeight,"
        "scrollWidth: slide.scrollWidth, scrollHeight: slide.scrollHeight,"
        "overflowX: style.overflowX, overflowY: style.overflowY};"
        "})()"
    )
    if not mesure:
        raise ErreurExport(f"Le sélecteur {selecteur!r} ne trouve pas la diapositive {numero}.")
    remplit = (
        abs(mesure["left"]) <= 1
        and abs(mesure["top"]) <= 1
        and abs(mesure["width"] - mesure["innerWidth"]) <= 1
        and abs(mesure["height"] - mesure["innerHeight"]) <= 1
    )
    deborde_x = mesure["scrollWidth"] > mesure["width"] + 2 and mesure["overflowX"] not in {"hidden", "clip"}
    deborde_y = mesure["scrollHeight"] > mesure["height"] + 2 and mesure["overflowY"] not in {"hidden", "clip"}
    deborde = deborde_x or deborde_y
    if (not remplit or deborde) and not autoriser:
        raise ErreurExport(
            f"La diapositive HTML {numero} ne remplit pas proprement le canevas : {mesure}. "
            "Corriger la source ou utiliser --autoriser-debordement pour diagnostiquer."
        )


def exporter_html(args, outil: DevTools, base_url: str, source: Path) -> None:
    sortie = chemin_dans_depot(args.sortie)
    parametres = analyser_paires(args.parametre, "Paramètre")
    layouts = analyser_paires(args.layout, "Layout")
    source_relative = source.relative_to(RACINE).as_posix()
    url_source = f"{base_url}/{urllib.parse.quote(source_relative, safe='/')}"

    for nom_format in args.formats:
        format_ = FORMATS[nom_format]
        outil.definir_fenetre(format_.largeur, format_.hauteur, 1)
        layout = layouts.get(format_.nom, format_.layout_html)
        premiere_url = ajouter_parametres(
            url_source,
            {**parametres, "layout": layout, "slide": 1},
        )
        print(f"{format_.nom} : chargement de {premiere_url}")
        outil.naviguer(premiere_url)
        outil.attendre(args.pret, delai=90, libelle="signal de disponibilité de la source HTML")
        nombre = args.slides or outil.evaluer("document.querySelectorAll('[data-slide]').length")
        if not nombre:
            raise ErreurExport("Aucun élément [data-slide] trouvé ; préciser --slides.")

        cibles = preparer_cibles(sortie, format_, args.prefixe, nombre, args.force)
        captures: list[bytes] = []
        for numero in range(1, nombre + 1):
            if numero > 1:
                url = ajouter_parametres(
                    url_source,
                    {**parametres, "layout": layout, "slide": numero},
                )
                outil.naviguer(url)
                outil.attendre(args.pret, delai=90, libelle=f"préparation de la diapositive {numero}")
            attendre_ressources(outil)
            verifier_source_html(outil, args.selecteur, numero, args.autoriser_debordement)
            captures.append(outil.capturer())
            print(f"  diapositive {numero}/{nombre} contrôlée")

        for cible, capture in zip(cibles, captures):
            ecrire_png(cible, capture, format_, args.force)
            print(f"  écrit : {cible.relative_to(RACINE)}")


def formats_valides(valeurs: list[str]) -> list[str]:
    inconnus = [valeur for valeur in valeurs if valeur not in FORMATS]
    if inconnus:
        raise ErreurExport(
            f"Format(s) inconnu(s) : {', '.join(inconnus)}. "
            f"Formats disponibles : {', '.join(FORMATS)}."
        )
    return valeurs


def ajouter_options_communes(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--formats",
        nargs="+",
        default=["portrait-4x5", "vertical-9x16"],
        metavar="FORMAT",
        help=f"formats à produire (défaut : portrait-4x5 vertical-9x16 ; choix : {', '.join(FORMATS)})",
    )
    parser.add_argument("--sortie", required=True, help="dossier de sortie, dans le dépôt social")
    parser.add_argument("--prefixe", help="préfixe des fichiers PNG")
    parser.add_argument("--force", action="store_true", help="écraser les PNG existants")
    parser.add_argument(
        "--autoriser-debordement",
        action="store_true",
        help="capturer malgré un débordement détecté (diagnostic seulement)",
    )
    parser.add_argument("--navigateur", help="chemin d'Edge, Chrome ou Chromium")


def parser_arguments() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sous_commandes = parser.add_subparsers(dest="type_source", required=True)

    en_bref = sous_commandes.add_parser("en-bref", help="exporter le résumé En bref d'un article")
    ajouter_options_communes(en_bref)
    origine = en_bref.add_mutually_exclusive_group(required=True)
    origine.add_argument("--url", help="URL complète de l'article publié ou prévisualisé")
    origine.add_argument("--racine-web", help="racine locale du site rendu (par exemple ../contours-nc/docs)")
    en_bref.add_argument("--page", help="page relative à --racine-web")

    html = sous_commandes.add_parser("html", help="exporter une source HTML autonome")
    ajouter_options_communes(html)
    html.add_argument("source", help="source HTML, relative à la racine du dépôt social")
    html.add_argument("--slides", type=int, help="nombre de diapositives (détecté sinon)")
    html.add_argument(
        "--layout",
        action="append",
        metavar="FORMAT=VALEUR",
        help="surcharge du paramètre layout pour un format ; option répétable",
    )
    html.add_argument(
        "--parametre",
        action="append",
        metavar="CLE=VALEUR",
        help="paramètre d'URL commun ; option répétable",
    )
    html.add_argument("--selecteur", default=".slide.is-active", help="sélecteur de la diapositive visible")
    html.add_argument(
        "--pret",
        default="document.documentElement.dataset.ready === 'true'",
        help="expression JavaScript qui signale que le rendu est prêt",
    )
    return parser


def main() -> int:
    parser = parser_arguments()
    args = parser.parse_args()
    try:
        args.formats = formats_valides(args.formats)
        chemin_navigateur = trouver_navigateur(args.navigateur)
        with ExitStack() as pile:
            if args.type_source == "en-bref":
                args.prefixe = args.prefixe or "en-bref"
                if args.racine_web:
                    if not args.page:
                        raise ErreurExport("--page est obligatoire avec --racine-web.")
                    racine_web = Path(args.racine_web).resolve()
                    if not racine_web.is_dir():
                        raise ErreurExport(f"Racine web introuvable : {racine_web}")
                    base_url = pile.enter_context(servir(racine_web))
                    url_source = f"{base_url}/{urllib.parse.quote(args.page.replace(os.sep, '/'), safe='/')}"
                else:
                    if args.page:
                        raise ErreurExport("--page s'utilise uniquement avec --racine-web.")
                    url_source = args.url
                outil = pile.enter_context(navigateur(chemin_navigateur))
                exporter_en_bref(args, outil, url_source)
            else:
                source = chemin_dans_depot(args.source, "La source HTML")
                if not source.is_file():
                    raise ErreurExport(f"Source HTML introuvable : {source}")
                args.prefixe = args.prefixe or source.parent.name
                base_url = pile.enter_context(servir(RACINE))
                outil = pile.enter_context(navigateur(chemin_navigateur))
                exporter_html(args, outil, base_url, source)
        return 0
    except (ErreurExport, OSError, websocket.WebSocketException) as erreur:
        parser.exit(1, f"Erreur : {erreur}\n")


if __name__ == "__main__":
    raise SystemExit(main())
