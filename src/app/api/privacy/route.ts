import { NextResponse } from 'next/server'

const PRIVACY_POLICY = `# Politique de Confidentialité — CourtVision AI

**Dernière mise à jour : Janvier 2025**

## 1. Responsable du traitement

CourtVision AI est une application d'entraînement au basketball. Le responsable du traitement des données est le développeur de l'application.

## 2. Données collectées

Nous collectons les données suivantes :

- **Données de compte** : nom, adresse e-mail, mot de passe (hashé avec bcrypt)
- **Données d'entraînement** : séances d'entraînement, scores, répétitions, exercices réalisés, durée des séances
- **Données de progression** : expérience (XP), niveau, succès débloqués, série d'entraînement
- **Données cognitives** : scores de réaction et temps de réaction
- **Données de préférences** : position de jeu, objectifs hebdomadaires, paramètres de repos, préférences sonores et tactiles, langue
- **Conversations IA** : messages échangés avec le coach IA

## 3. Finalités du traitement

Vos données sont utilisées exclusivement pour :

- Fournir et améliorer le service d'entraînement
- Suivre votre progression et personnaliser l'expérience
- Calculer les classements et les succès
- Offrir un coaching IA personnalisé
- Améliorer les performances de l'application

## 4. Durée de conservation

- **Données de compte** : conservées tant que votre compte est actif
- **Données d'entraînement** : conservées indéfiniment ou jusqu'à la suppression de votre compte
- **Conversations IA** : conservées 12 mois après la dernière utilisation
- Vous pouvez demander la suppression de vos données à tout moment

## 5. Vos droits (RGPD)

Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :

- **Droit d'accès (Article 15)** : Vous pouvez demander une copie de toutes vos données
- **Droit de rectification (Article 16)** : Vous pouvez corriger vos données inexactes
- **Droit à l'effacement (Article 17)** : Vous pouvez demander la suppression de vos données
- **Droit à la limitation (Article 18)** : Vous pouvez limiter le traitement de vos données
- **Droit à la portabilité (Article 20)** : Vous pouvez exporter vos données dans un format structuré
- **Droit d'opposition (Article 21)** : Vous pouvez vous opposer au traitement de vos données

Pour exercer ces droits, utilisez les options dans les paramètres de l'application ou contactez-nous.

## 6. Cookies et stockage local

L'application utilise le stockage local (localStorage) pour :

- Mémoriser votre préférence de consentement aux cookies
- Sauvegarder le thème (sombre/clair)
- Mettre en cache certaines données pour améliorer la performance

Aucun cookie tiers n'est utilisé. Seuls des cookies essentiels au fonctionnement sont employés.

## 7. Services tiers

L'application n'utilise aucun service tiers de suivi ou d'analyse. Toutes les données sont stockées localement sur nos serveurs sécurisés.

## 8. Sécurité

- Les mots de passe sont hashés avec bcrypt
- Les sessions sont gérées via des tokens JWT sécurisés
- Toutes les communications sont chiffrées (HTTPS)
- L'accès aux données est limité par authentification

## 9. Modifications

Nous nous réservons le droit de modifier cette politique de confidentialité. Toute modification sera notifiée dans l'application.

## 10. Contact

Pour toute question relative à la protection de vos données, veuillez nous contacter via les paramètres de l'application.
`

export async function GET() {
  return new NextResponse(PRIVACY_POLICY, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}