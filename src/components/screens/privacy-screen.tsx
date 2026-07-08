'use client'

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app'
import { motion } from 'framer-motion'

export function PrivacyScreen() {
  const goBack = useAppStore((s) => s.goBack)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Retour"
            onClick={goBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Politique de Confidentialité</h1>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-lg mx-auto px-5 py-6 pb-10"
      >
        <article className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <p className="text-xs text-muted-foreground">Dernière mise à jour : 7 juillet 2025</p>

          <section>
            <h2 className="text-base font-bold mb-2">1. Responsable du traitement</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Le responsable du traitement des données personnelles est CourtVision AI,
              dont le siège social est situé en France. Pour toute question relative
              à la présente politique, vous pouvez nous contacter à l&apos;adresse
              email suivante :{' '}
              <a href="mailto:privacy@courtvision.ai" className="text-orange-500 hover:underline">
                privacy@courtvision.ai
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">2. Données collectées</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              CourtVision AI collecte les catégories de données suivantes :
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li>
                <strong className="text-foreground">Données d&apos;identification :</strong> nom,
                prénom, adresse email, mot de passe hashé.
              </li>
              <li>
                <strong className="text-foreground">Données d&apos;entraînement :</strong> positions,
                mouvements capturés par la caméra (traités localement et non stockés sur nos serveurs),
                résultats d&apos;exercices, scores, répétitions.
              </li>
              <li>
                <strong className="text-foreground">Données de performance :</strong> historique des
                séances, statistiques de progression, niveaux, XP, badges, objectifs.
              </li>
              <li>
                <strong className="text-foreground">Données de connexion :</strong> adresse IP,
                type de navigateur, système d&apos;exploitation, logs de connexion.
              </li>
              <li>
                <strong className="text-foreground">Données de paiement :</strong> informations
                de facturation traitées par Stripe (nous ne stockons pas de données bancaires).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">3. Finalités du traitement</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              Vos données personnelles sont utilisées pour :
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li>Fournir et améliorer nos services d&apos;entraînement basketball IA</li>
              <li>Personnaliser votre expérience et vos recommandations d&apos;exercices</li>
              <li>Suivre votre progression et vous attribuer des récompenses (XP, badges)</li>
              <li>Assurer le support client et la communication relative au service</li>
              <li>Gérer votre abonnement et les facturations via Stripe</li>
              <li>Assurer la sécurité et la prévention des fraudes</li>
              <li>Respecter nos obligations légales et réglementaires</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">4. Base légale</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Le traitement de vos données repose sur :
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li>
                <strong className="text-foreground">Consentement (Art. 6.1.a RGPD) :</strong> pour
                le traitement des données d&apos;entraînement par caméra et l&apos;utilisation
                de l&apos;intelligence artificielle.
              </li>
              <li>
                <strong className="text-foreground">Exécution du contrat (Art. 6.1.b RGPD) :</strong> pour
                la fourniture du service et la gestion de votre compte.
              </li>
              <li>
                <strong className="text-foreground">Intérêt légitime (Art. 6.1.f RGPD) :</strong> pour
                l&apos;amélioration de nos services, l&apos;analyse statistique anonymisée et la
                sécurité de la plateforme.
              </li>
              <li>
                <strong className="text-foreground">Obligation légale (Art. 6.1.c RGPD) :</strong> pour
                le respect des obligations fiscales et comptables.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">5. Durée de conservation</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              Vos données sont conservées selon les durées suivantes :
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Données de compte :</strong> pendant la durée du contrat et 3 ans après la fin de la relation contractuelle.</li>
              <li><strong className="text-foreground">Données d&apos;entraînement :</strong> tant que votre compte est actif, puis supprimées sous 12 mois après suppression du compte.</li>
              <li><strong className="text-foreground">Données de facturation :</strong> 5 ans à compter de la clôture de l&apos;exercice comptable (obligation légale).</li>
              <li><strong className="text-foreground">Logs de connexion :</strong> 12 mois maximum.</li>
              <li><strong className="text-foreground">Cookies :</strong> durée maximale de 13 mois.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">6. Droits de l&apos;utilisateur</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              Conformément au RGPD (Articles 15 à 22), vous disposez des droits suivants :
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Droit d&apos;accès :</strong> obtenir la confirmation et les informations relatives au traitement de vos données.</li>
              <li><strong className="text-foreground">Droit de rectification :</strong> corriger des données inexactes ou incomplètes.</li>
              <li><strong className="text-foreground">Droit à l&apos;effacement :</strong> demander la suppression de vos données (&laquo; droit à l&apos;oubli &raquo;).</li>
              <li><strong className="text-foreground">Droit à la portabilité :</strong> recevoir vos données dans un format structuré et courant.</li>
              <li><strong className="text-foreground">Droit d&apos;opposition :</strong> vous opposer au traitement de vos données pour des motifs légitimes.</li>
              <li><strong className="text-foreground">Droit à la limitation :</strong> demander la limitation du traitement dans certaines circonstances.</li>
              <li><strong className="text-foreground">Droit de retrait du consentement :</strong> retirer votre consentement à tout moment sans compromettre la licéité du traitement antérieur.</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Pour exercer vos droits, contactez-nous à{' '}
              <a href="mailto:privacy@courtvision.ai" className="text-orange-500 hover:underline">
                privacy@courtvision.ai
              </a>. Vous disposez également d&apos;un droit de réclamation auprès de la CNIL
              (Commission Nationale de l&apos;Informatique et des Libertés).
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">7. Cookies et technologies similaires</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              CourtVision AI utilise des cookies pour :
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Cookies essentiels :</strong> nécessaires au fonctionnement du service (authentification, préférences).</li>
              <li><strong className="text-foreground">Cookies analytiques :</strong> pour comprendre l&apos;utilisation du service et l&apos;améliorer (anonymisés).</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Vous pouvez gérer vos préférences de cookies via les paramètres de votre navigateur.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">8. Sous-traitants</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              Nous faisons appel aux sous-traitants suivants, tous conformes au RGPD :
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Hébergement :</strong> infrastructure cloud sécurisée conforme aux normes de sécurité.</li>
              <li><strong className="text-foreground">Stripe :</strong> traitement sécurisé des paiements (certifié PCI DSS Level 1).</li>
              <li><strong className="text-foreground">Analytics :</strong> services d&apos;analyse anonymisée pour l&apos;amélioration du service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">9. Sécurité des données</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées
              pour protéger vos données : chiffrement en transit (TLS) et au repos,
              contrôle d&apos;accès strict, authentification sécurisée, audits réguliers de sécurité.
              Les données biométriques (mouvements) sont traitées localement sur votre appareil
              et ne sont pas stockées sur nos serveurs.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">10. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pour toute question concernant la présente politique de confidentialité,
              ou pour exercer vos droits, veuillez nous contacter :
            </p>
            <div className="mt-2 rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="text-sm"><strong className="text-foreground">Email :</strong>{' '}
                <a href="mailto:privacy@courtvision.ai" className="text-orange-500 hover:underline">privacy@courtvision.ai</a>
              </p>
              <p className="text-sm"><strong className="text-foreground">DPO :</strong> CourtVision AI</p>
            </div>
          </section>
        </article>
      </motion.main>
    </div>
  )
}

export default PrivacyScreen