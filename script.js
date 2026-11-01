// ===============================
// CONFIGURATION - à modifier ici pour les futures mises à jour
// ===============================

// data.json garde la même structure qu'avant : { "noms": [ { "label": "A", "numeros": ["36", "58"] } ] }
// Au chargement, on construit un "annuaire inversé" : numéro -> nom
let annuaire = {};

// Zones de texte sur l'image (coordonnées à récupérer depuis Figma)
const zones = {
    numeroFull:  { x: 947, y: 1022, style: 'P1' }, // ex: BUS058 (centré)
    nom:         { x: 68, y: 1175, style: 'P2' },  // ex: A
    numeroShort: { x: 324, y: 1230, style: 'P2' }, // ex: 058
    dateHeure:   { x: 68, y: 1450, style: 'P2' },  // date/heure auto
};

// ===============================
// INITIALISATION
// ===============================

const canvas = document.getElementById('monCanvas');
const ctx = canvas.getContext('2d');
let imageChargee = false;

const img = new Image();
img.src = 'template-sms.png';
img.onload = function () {
    imageChargee = true;
    ctx.drawImage(img, 0, 0);
};
img.onerror = function () {
    alert("Erreur : impossible de charger l'image template-sms.png");
};

const inputNumero = document.getElementById('inputNumero');
const apercu = document.getElementById('apercu'); // petit texte sous le champ (optionnel)

const toggleClavier = document.getElementById('toggleClavier');

// Évite que le clic sur le bouton fasse perdre le focus au champ
toggleClavier.addEventListener('pointerdown', (e) => e.preventDefault());

toggleClavier.addEventListener('click', () => {
    const estNumerique = inputNumero.inputMode === 'numeric';

    inputNumero.inputMode = estNumerique ? 'text' : 'numeric';
    toggleClavier.textContent = estNumerique ? '123' : 'ABC';

    // Android a besoin d'un petit délai entre le blur et le focus
    // pour afficher le nouveau type de clavier
    inputNumero.blur();
    setTimeout(() => inputNumero.focus(), 50);
});

// Entrée / "Aller" sur le clavier = même chose que cliquer sur "Générer"
inputNumero.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        genererMeme();
        inputNumero.blur(); // ferme le clavier pour voir directement le résultat
    }
});

// Normalise ce que tape l'utilisateur : espaces retirés + minuscules
// ("208A " et "208a" donnent la même clé)
function normaliser(valeur) {
    return valeur.trim().toLowerCase();
}

// Construit l'annuaire inversé à partir de data.json
function construireAnnuaire(noms) {
    annuaire = {};
    noms.forEach(n => {
        n.numeros.forEach(num => {
            const cle = normaliser(num);
            if (annuaire[cle]) {
                console.warn(`Numéro en doublon dans data.json : ${num} (${annuaire[cle].label} et ${n.label})`);
            }
            annuaire[cle] = { label: n.label, numero: num };
        });
    });
}

// Charge data.json
// ⚠️ Nécessite un serveur local (Live Server, etc.), pas file://
async function chargerDonnees() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        construireAnnuaire(data.noms);
    } catch (erreur) {
        console.error('Erreur de chargement du JSON :', erreur);
        alert("Impossible de charger data.json ! Assure-toi d'utiliser un serveur local (Live Server, etc.) et non file://");
    }
}

chargerDonnees();

// Aperçu en direct : dès qu'on tape un numéro connu, on affiche le nom trouvé
if (apercu) {
    inputNumero.addEventListener('input', () => {
        const valeur = normaliser(inputNumero.value);
        if (valeur === '') {
            apercu.textContent = '';
            return;
        }
        const resultat = annuaire[valeur];
        apercu.textContent = resultat ? `${resultat.label}` : 'Ligne non répertoriée';
    });
}

// ===============================
// STYLES DE TEXTE
// ===============================

function appliquerStyle(ctx, style, alignement = 'left') {
    if (style === 'P1') {
        ctx.font = '36px Google Sans Flex, sans-serif';
        ctx.fillStyle = '#131218';
    } else if (style === 'P2') {
        ctx.font = '36px Google Sans Flex, sans-serif';
        ctx.fillStyle = '#E7E8ED';
    }
    ctx.textBaseline = 'top';
    ctx.textAlign = alignement;
}

// ===============================
// DATE / HEURE AUTOMATIQUE
// Format : "Le JJ.MM.AAAA de HH:MM à HH:MM" (2e heure = 1re heure + 1h)
// ===============================

function genererDateHeure() {
    const maintenant = new Date();

    const jj = String(maintenant.getDate()).padStart(2, '0');
    const mm = String(maintenant.getMonth() + 1).padStart(2, '0');
    const aaaa = maintenant.getFullYear();

    const hDebut = String(maintenant.getHours()).padStart(2, '0');
    const minDebut = String(maintenant.getMinutes()).padStart(2, '0');

    const finPeriode = new Date(maintenant.getTime() + 60 * 60 * 1000); // +1h
    const hFin = String(finPeriode.getHours()).padStart(2, '0');
    const minFin = String(finPeriode.getMinutes()).padStart(2, '0');

    return `Le ${jj}.${mm}.${aaaa} de ${hDebut}:${minDebut} à ${hFin}:${minFin}`;
}

// ===============================
// GÉNÉRATION DU MESSAGE
// ===============================

function genererMeme() {
    if (!imageChargee) {
        alert("Attends que l'image soit chargée !");
        return;
    }

    const saisie = normaliser(inputNumero.value);
    if (saisie === '') {
        alert("Entre un numéro !");
        return;
    }

    const resultat = annuaire[saisie];
    if (!resultat) {
        alert(`Le numéro "${inputNumero.value.trim()}" n'existe pas dans la liste.`);
        return;
    }

    // Redessiner l'image de base
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Nom trouvé automatiquement
    appliquerStyle(ctx, zones.nom.style);
    ctx.fillText(resultat.label, zones.nom.x, zones.nom.y);

    // Numéro : version complète (centrée) + version courte
    appliquerStyle(ctx, zones.numeroFull.style, 'center');
    ctx.fillText('BUS' + resultat.numero, zones.numeroFull.x, zones.numeroFull.y);

    appliquerStyle(ctx, zones.numeroShort.style);
    ctx.fillText(resultat.numero, zones.numeroShort.x, zones.numeroShort.y);

    // Date / heure automatique
    appliquerStyle(ctx, zones.dateHeure.style);
    ctx.fillText(genererDateHeure(), zones.dateHeure.x, zones.dateHeure.y);
}

// ===============================
// TÉLÉCHARGEMENT
// ===============================

function telecharger() {
    const link = document.createElement('a');
    link.download = 'ticket-BMG.png';
    link.href = canvas.toDataURL();
    link.click();
}
