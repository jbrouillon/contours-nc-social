"""Copie des données publiées par le site vers une source de visuels sociaux.

Les sources HTML de ce dépôt sont servies depuis sa racine : elles ne peuvent
pas lire directement les fichiers du dépôt du site. Ce script copie les
fichiers nécessaires dans un dossier ``donnees/`` et écrit ``provenance.json``
(chemin d'origine, commit du site, état du worktree, empreinte SHA-256), pour
que chaque chiffre affiché puisse être relié à sa source.

Exemple, depuis la racine de ce dépôt :

    python scripts/importer_donnees_site.py ^
      --sortie articles/<slug>/donnees ^
      posts/<slug>/data/synthese_province.csv
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SITE_DEFAUT = RACINE.parent / "contours-nc"


def git(site: Path, *arguments: str) -> str:
    resultat = subprocess.run(
        ["git", "-C", str(site), *arguments],
        capture_output=True, text=True, encoding="utf-8", check=False,
    )
    return resultat.stdout.strip() if resultat.returncode == 0 else ""


def sha256(chemin: Path) -> str:
    empreinte = hashlib.sha256()
    with chemin.open("rb") as flux:
        for bloc in iter(lambda: flux.read(1 << 16), b""):
            empreinte.update(bloc)
    return empreinte.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("fichiers", nargs="+", help="chemins relatifs à la racine du site")
    parser.add_argument("--site", default=str(SITE_DEFAUT), help="racine du dépôt du site")
    parser.add_argument("--sortie", required=True, help="dossier de destination, dans ce dépôt")
    args = parser.parse_args()

    site = Path(args.site).resolve()
    sortie = (RACINE / args.sortie).resolve()
    if RACINE not in sortie.parents:
        parser.exit(1, f"Erreur : la sortie doit rester dans {RACINE}\n")
    sortie.mkdir(parents=True, exist_ok=True)

    entrees = []
    for relatif in args.fichiers:
        source = (site / relatif).resolve()
        if site not in source.parents or not source.is_file():
            parser.exit(1, f"Erreur : fichier introuvable dans le site : {relatif}\n")
        cible = sortie / source.name
        shutil.copy2(source, cible)
        modifie = bool(git(site, "status", "--porcelain", "--", relatif))
        entrees.append({
            "fichier": source.name,
            "origine": Path(relatif).as_posix(),
            "sha256": sha256(cible),
            "modifie_localement": modifie,
        })
        print(f"copié : {relatif} → {cible.relative_to(RACINE).as_posix()}")

    provenance = {
        "site": "jbrouillon/contours-nc",
        "commit": git(site, "rev-parse", "HEAD"),
        "importe_le": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "fichiers": entrees,
    }
    (sortie / "provenance.json").write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"provenance : {(sortie / 'provenance.json').relative_to(RACINE).as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
