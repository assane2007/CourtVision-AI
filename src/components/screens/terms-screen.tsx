'use client'

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app'
import { motion } from 'framer-motion'

export function TermsScreen() {
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
          <h1 className="text-lg font-bold">Conditions Générales d&apos;Utilisation</h1>
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
            <h2 className="text-base font-bold mb-2">1. Objet</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Les présentes Conditions Générales d&apos;Utilisation (CGU) régissent
              l&apos;utilisation de l&apos;application CourtVision AI, un service
              d&apos;entraînement basketball assisté par intelligence artificielle.
              En utilisant le service, vous acceptez sans réserve les présentes CGU.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">2. Inscription et compte</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              L&apos;utilisation du service nécessite la création d&apos;un compte.
              Vous vous engagez à fournir des informations exactes et à jour lors
              de votre inscription. Vous êtes seul responsable de la confidentialité
              de vos identifiants de connexion. Toute activité effectuée depuis
              votre compte est réputée réalisée par vous. En cas de détournement
              de votre compte, vous devez nous en informer immédiatement.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">3. Services proposés</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              CourtVision AI propose les services suivants :
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li>Analyse de mouvements par caméra avec retour IA</li>
              <li>Programmes d&apos;entraînement personnalisés</li>
              <li>Suivi de progression et statistiques détaillées</li>
              <li>Coach IA interactif</li>
              <li>Rapports de scout IA</li>
              <li>Plans d&apos;entraînement personnalisés</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Certains services sont réservés aux abonnés Pro et Élite. Les fonctionnalités
              gratuites sont limitées en nombre d&apos;utilisations quotidiennes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">4. Règles d&apos;utilisation</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              En utilisant CourtVision AI, vous vous engagez à :
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li>Utiliser le service conformément à sa finalité d&apos;entraînement sportif</li>
              <li>Ne pas utiliser le service à des fins illégales, frauduleuses ou nuisibles</li>
              <li>Ne pas tenter d&apos;interférer avec le bon fonctionnement de la plateforme</li>
              <li>Ne pas reproduire, distribuer ou modifier le contenu du service sans autorisation</li>
              <li>Respecter les autres utilisateurs de la plateforme</li>
              <li>Ne pas partager vos identifiants de connexion avec des tiers</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Tout manquement à ces règles pourra entraîner la suspension ou la résiliation
              de votre compte sans préavis ni indemnité.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">5. Propriété intellectuelle</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              L&apos;ensemble du contenu de CourtVision AI (interface, algorithmes, textes,
              graphismes, logos, marques) est protégé par le droit de la propriété
              intellectuelle. Toute reproduction, représentation, modification ou
              exploitation, même partielle, est interdite sans autorisation écrite
              préalable. Les données de performance générées par votre utilisation
              du service restent votre propriété.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">6. Responsabilité</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              CourtVision AI est un outil d&apos;assistance à l&apos;entraînement.
              Les analyses et conseils fournis par l&apos;IA sont indicatifs et ne
              sauraient se substituer à l&apos;avis d&apos;un professionnel qualifié.
              CourtVision AI ne saurait être tenu responsable des blessures,
              accidents ou dommages qui pourraient survenir lors de l&apos;utilisation
              du service. L&apos;utilisateur reconnaît pratiquer le basketball à
              ses propres risques et assume l&apos;entière responsabilité de sa
              sécurité physique. CourtVision AI ne garantit pas la disponibilité
              continue et sans interruption du service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">7. Données personnelles</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Le traitement de vos données personnelles est régi par notre{' '}
              <button
                onClick={() => useAppStore.getState().navigate('privacy')}
                className="text-orange-500 hover:underline"
              >
                Politique de Confidentialité
              </button>, qui décrit en détail les données collectées, les finalités
              du traitement, vos droits et les mesures de sécurité mises en œuvre
              conformément au RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">8. Résiliation</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              Vous pouvez résilier votre abonnement à tout moment depuis votre
              espace client ou en nous contactant. Les conditions suivantes
              s&apos;appliquent :
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li>La résiliation prend effet à la fin de la période en cours</li>
              <li>Aucun remboursement n&apos;est effectué pour la période restante</li>
              <li>Vous conservez l&apos;accès aux fonctionnalités gratuites après résiliation</li>
              <li>Vous pouvez demander la suppression de votre compte et de vos données à tout moment</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">9. Modifications</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              CourtVision AI se réserve le droit de modifier les présentes CGU
              à tout moment. Les modifications seront notifiées par email ou via
              l&apos;application. L&apos;utilisation continue du service après
              la publication des modifications constitue une acceptation des nouvelles CGU.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">10. Droit applicable</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Les présentes CGU sont soumises au droit français. En cas de litige,
              les tribunaux français seront seuls compétents. Toutefois, si vous
              êtes un consommateur au sens du droit de l&apos;UE, vous bénéficiez
              de la protection offerte par les lois de consommation applicables
              dans votre pays de résidence.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">11. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pour toute question relative aux présentes CGU, veuillez nous
              contacter à l&apos;adresse email suivante :{' '}
              <a href="mailto:privacy@courtvision.ai" className="text-orange-500 hover:underline">
                privacy@courtvision.ai
              </a>.
            </p>
          </section>
        </article>
      </motion.main>
    </div>
  )
}

export default TermsScreen