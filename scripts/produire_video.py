"""Monte une série de diapositives 9:16 en vidéo MP4 avec une piste musicale.

Les PNG d'un dossier (triés par nom) sont enchaînés par fondus, suivis le cas
échéant d'une vidéo d'outro (logo animé), et la musique est coupée à la durée
totale avec un fondu d'entrée et de sortie. Le résultat
respecte les recommandations de TikTok : 1080 × 1920, H.264, 30 images par
seconde, AAC, `faststart`.

Exemple, depuis la racine de ce dépôt :

    python scripts/produire_video.py ^
      articles/<slug>/vertical-9x16 ^
      --musique articles/<slug>/musique.wav ^
      --sortie articles/<slug>/video/<slug>.mp4 ^
      --durees 3.5,5,6,5,5,5,5,4 ^
      --outro campagnes/lancement-tiktok/contours-nc-outro.mp4

ffmpeg est cherché dans le PATH, puis dans le paquet Python `imageio-ffmpeg`
(`python -m pip install --user imageio-ffmpeg`).
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
LARGEUR, HAUTEUR, IPS = 1080, 1920, 30


def trouver_ffmpeg() -> str:
    chemin = shutil.which("ffmpeg")
    if chemin:
        return chemin
    try:
        import imageio_ffmpeg
    except ImportError as erreur:
        raise SystemExit(
            "ffmpeg introuvable : l'installer ou lancer "
            "« python -m pip install --user imageio-ffmpeg »."
        ) from erreur
    return imageio_ffmpeg.get_ffmpeg_exe()


def durees_par_image(texte: str | None, nombre: int, defaut: float) -> list[float]:
    if not texte:
        return [defaut] * nombre
    valeurs = [float(v) for v in texte.split(",")]
    if len(valeurs) != nombre:
        raise SystemExit(f"{len(valeurs)} durées pour {nombre} images : une durée par image est attendue.")
    if min(valeurs) <= 0:
        raise SystemExit("Les durées doivent être positives.")
    return valeurs


def duree_media(ffmpeg: str, chemin: Path) -> float:
    """Durée d'un fichier audio ou vidéo, lue dans l'en-tête affiché par ffmpeg."""
    sortie = subprocess.run([ffmpeg, "-hide_banner", "-i", str(chemin)], capture_output=True, text=True).stderr
    for ligne in sortie.splitlines():
        ligne = ligne.strip()
        if ligne.startswith("Duration:"):
            heures, minutes, secondes = ligne.split(",")[0].split(": ")[1].split(":")
            return int(heures) * 3600 + int(minutes) * 60 + float(secondes)
    raise SystemExit(f"Durée illisible : {chemin}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("images", help="dossier des PNG 9:16, enchaînés par ordre alphabétique")
    parser.add_argument("--sortie", required=True, help="fichier MP4 à écrire, dans ce dépôt")
    parser.add_argument("--musique", help="piste audio (WAV, MP3…) ; sans elle, la vidéo est muette")
    parser.add_argument("--outro", help="vidéo ajoutée à la fin par un fondu (logo animé), sans son")
    parser.add_argument("--durees", help="durées d'affichage en secondes (point décimal), une par image, séparées par des virgules")
    parser.add_argument("--duree", type=float, default=4.0, help="durée par défaut d'une image (s)")
    parser.add_argument("--fondu", type=float, default=0.5, help="durée des fondus enchaînés (s)")
    parser.add_argument("--volume", type=float, default=0.8, help="gain de la musique (1 = inchangé)")
    parser.add_argument("--force", action="store_true", help="remplacer un fichier existant")
    args = parser.parse_args()

    dossier = (RACINE / args.images).resolve()
    sortie = (RACINE / args.sortie).resolve()
    if RACINE not in sortie.parents:
        raise SystemExit(f"La sortie doit rester dans {RACINE}")
    if sortie.exists() and not args.force:
        raise SystemExit(f"{sortie.relative_to(RACINE)} existe déjà : ajouter --force pour le remplacer.")
    images = sorted(dossier.glob("*.png"))
    if len(images) < 2:
        raise SystemExit(f"Au moins deux PNG sont attendus dans {dossier}.")
    durees = durees_par_image(args.durees, len(images), args.duree)
    fondu = args.fondu
    if fondu * 2 >= min(durees):
        raise SystemExit("Le fondu doit durer moins de la moitié de l'image la plus courte.")
    ffmpeg = trouver_ffmpeg()
    outro = None
    if args.outro:
        outro = (RACINE / args.outro).resolve()
        if not outro.exists():
            raise SystemExit(f"Outro introuvable : {outro}")
        duree_outro = duree_media(ffmpeg, outro)
    total = sum(durees) - fondu * (len(images) - 1)
    if outro:
        total += duree_outro - fondu

    commande = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y"]
    for image, duree in zip(images, durees):
        commande += ["-loop", "1", "-framerate", str(IPS), "-t", f"{duree:.3f}", "-i", str(image)]
    entree_audio = len(images)
    if outro:
        commande += ["-i", str(outro)]
        entree_audio += 1
    if args.musique:
        musique = (RACINE / args.musique).resolve()
        if not musique.exists():
            raise SystemExit(f"Piste introuvable : {musique}")
        # Bouclée si elle est plus courte que la vidéo, coupée sinon.
        commande += ["-stream_loop", "-1", "-i", str(musique)]

    filtres = []
    clips = len(images) + (1 if outro else 0)
    longueurs = durees + ([duree_outro] if outro else [])
    for i in range(clips):
        filtres.append(
            f"[{i}:v]scale={LARGEUR}:{HAUTEUR}:force_original_aspect_ratio=decrease:flags=lanczos,"
            f"pad={LARGEUR}:{HAUTEUR}:(ow-iw)/2:(oh-ih)/2:color=0xf7f1e3,"
            f"setsar=1,fps={IPS},format=yuv420p,settb=AVTB[v{i}]"
        )
    precedent = "v0"
    decalage = 0.0
    for i in range(1, clips):
        decalage += longueurs[i - 1] - fondu
        courant = f"x{i}"
        filtres.append(
            f"[{precedent}][v{i}]xfade=transition=fade:duration={fondu:.3f}:offset={decalage:.3f}[{courant}]"
        )
        precedent = courant
    cartes = ["-map", f"[{precedent}]"]
    if args.musique:
        fin = max(0.0, total - 2.0)
        filtres.append(
            f"[{entree_audio}:a]atrim=0:{total:.3f},asetpts=PTS-STARTPTS,volume={args.volume},"
            f"afade=t=in:st=0:d=0.8,afade=t=out:st={fin:.3f}:d=2[a]"
        )
        cartes += ["-map", "[a]", "-c:a", "aac", "-b:a", "192k", "-ar", "48000"]

    sortie.parent.mkdir(parents=True, exist_ok=True)
    commande += [
        "-filter_complex", ";".join(filtres), *cartes,
        "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
        "-r", str(IPS), "-t", f"{total:.3f}", "-movflags", "+faststart", str(sortie),
    ]
    resultat = subprocess.run(commande, capture_output=True, text=True)
    if resultat.returncode != 0:
        print(resultat.stderr, file=sys.stderr)
        raise SystemExit("ffmpeg a échoué.")
    taille = sortie.stat().st_size / 1e6
    suite = " + outro" if outro else ""
    print(f"écrit : {sortie.relative_to(RACINE)} · {len(images)} images{suite} · {total:.1f} s · {taille:.1f} Mo")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
