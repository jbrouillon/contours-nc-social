"""Extraction des données embarquées dans une page publiée du site.

Certains articles n'ont pas de fichier de données séparé : leurs graphiques
lisent des blocs ``<script type="application/json" id="…-data">`` écrits par
``analysis.R`` dans la page rendue. Ce script lit cette page dans un commit du
dépôt du site (``HEAD`` par défaut, donc la version publiée et non un rendu
local en cours), extrait les blocs demandés dans ``donnees/<id>.json`` et
écrit ``provenance.json`` (page, commit, empreintes SHA-256).

Exemple, depuis la racine de ce dépôt :

    python scripts/extraire_donnees_page.py ^
      --page docs/posts/<slug>/index.html ^
      --sortie articles/<slug>/donnees ^
      chart-concentration carte-population-communes
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import html.parser
import json
import subprocess
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SITE_DEFAUT = RACINE.parent / "contours-nc"


class BlocsJson(html.parser.HTMLParser):
    """Collecte le texte des balises <script type="application/json" id=…>."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.blocs: dict[str, str] = {}
        self._courant: str | None = None
        self._morceaux: list[str] = []

    def handle_starttag(self, tag, attrs):
        attributs = dict(attrs)
        if tag == "script" and attributs.get("type") == "application/json" and attributs.get("id"):
            self._courant = attributs["id"]
            self._morceaux = []

    def handle_data(self, data):
        if self._courant:
            self._morceaux.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self._courant:
            self.blocs[self._courant] = "".join(self._morceaux)
            self._courant = None


def git(site: Path, *arguments: str, binaire: bool = False):
    resultat = subprocess.run(["git", "-C", str(site), *arguments], capture_output=True, check=False)
    if resultat.returncode != 0:
        raise SystemExit(f"Erreur git : {resultat.stderr.decode('utf-8', 'replace').strip()}")
    return resultat.stdout if binaire else resultat.stdout.decode("utf-8").strip()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("blocs", nargs="+", help="identifiants des blocs, avec ou sans le suffixe -data")
    parser.add_argument("--page", required=True, help="page rendue, relative à la racine du site")
    parser.add_argument("--commit", default="HEAD", help="commit du site à lire (défaut : HEAD)")
    parser.add_argument("--site", default=str(SITE_DEFAUT), help="racine du dépôt du site")
    parser.add_argument("--sortie", required=True, help="dossier de destination, dans ce dépôt")
    args = parser.parse_args()

    site = Path(args.site).resolve()
    sortie = (RACINE / args.sortie).resolve()
    if RACINE not in sortie.parents:
        parser.exit(1, f"Erreur : la sortie doit rester dans {RACINE}\n")

    commit = git(site, "rev-parse", args.commit)
    page = Path(args.page).as_posix()
    contenu = git(site, "show", f"{commit}:{page}", binaire=True)
    lecteur = BlocsJson()
    lecteur.feed(contenu.decode("utf-8"))

    sortie.mkdir(parents=True, exist_ok=True)
    entrees = []
    for nom in args.blocs:
        identifiant = nom if nom.endswith("-data") else f"{nom}-data"
        if identifiant not in lecteur.blocs:
            disponibles = ", ".join(sorted(lecteur.blocs))
            parser.exit(1, f"Erreur : bloc introuvable : {identifiant}\nBlocs disponibles : {disponibles}\n")
        donnees = json.loads(lecteur.blocs[identifiant])
        cible = sortie / f"{identifiant.removesuffix('-data')}.json"
        texte = json.dumps(donnees, ensure_ascii=False, separators=(",", ":")) + "\n"
        cible.write_text(texte, encoding="utf-8")
        entrees.append({
            "fichier": cible.name,
            "bloc": identifiant,
            "sha256": hashlib.sha256(cible.read_bytes()).hexdigest(),
        })
        print(f"extrait : {identifiant} → {cible.relative_to(RACINE).as_posix()}")

    provenance = {
        "site": "jbrouillon/contours-nc",
        "commit": commit,
        "page": page,
        "page_sha256": hashlib.sha256(contenu).hexdigest(),
        "extrait_le": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "fichiers": entrees,
    }
    (sortie / "provenance.json").write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"provenance : {(sortie / 'provenance.json').relative_to(RACINE).as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
