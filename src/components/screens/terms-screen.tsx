'use client'

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app'
import { motion } from 'framer-motion'
import { useTranslation } from '@/components/providers/language-provider'

export function TermsScreen() {
  const goBack = useAppStore((s) => s.goBack)
  const { td } = useTranslation()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label={td('Retour', 'Back')}
            onClick={goBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">{td("Conditions Générales d'Utilisation", 'Terms of Service')}</h1>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-lg mx-auto px-5 py-6 pb-10"
      >
        <article className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <p className="text-xs text-muted-foreground">{td('Dernière mise à jour : 7 juillet 2025', 'Last updated: July 7, 2025')}</p>

          <section>
            <h2 className="text-base font-bold mb-2">{td('1. Objet', '1. Purpose')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {td("Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de l'application CourtVision AI, un service d'entraînement basketball assisté par intelligence artificielle. En utilisant le service, vous acceptez sans réserve les présentes CGU.", "These Terms of Service (ToS) govern the use of the CourtVision AI application, an AI-assisted basketball training service. By using the service, you unconditionally accept these ToS.")}
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td('2. Inscription et compte', '2. Registration and Account')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {td("L'utilisation du service nécessite la création d'un compte. Vous vous engagez à fournir des informations exactes et à jour lors de votre inscription. Vous êtes seul responsable de la confidentialité de vos identifiants de connexion. Toute activité effectuée depuis votre compte est réputée réalisée par vous. En cas de détournement de votre compte, vous devez nous en informer immédiatement.", "Using the service requires creating an account. You agree to provide accurate and up-to-date information during registration. You are solely responsible for the confidentiality of your login credentials. Any activity from your account is deemed to be carried out by you. In case of account compromise, you must inform us immediately.")}
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td('3. Services proposés', '3. Services Offered')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              {td('CourtVision AI propose les services suivants :', 'CourtVision AI offers the following services:')}
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li>{td('Analyse de mouvements par caméra avec retour IA', 'Camera-based movement analysis with AI feedback')}</li>
              <li>{td("Programmes d'entraînement personnalisés", 'Personalized training programs')}</li>
              <li>{td('Suivi de progression et statistiques détaillées', 'Progression tracking and detailed statistics')}</li>
              <li>{td('Coach IA interactif', 'Interactive AI coach')}</li>
              <li>{td('Rapports de scout IA', 'AI scout reports')}</li>
              <li>{td("Plans d'entraînement personnalisés", 'Personalized training plans')}</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              {td("Certains services sont réservés aux abonnés Pro et Élite. Les fonctionnalités gratuites sont limitées en nombre d'utilisations quotidiennes.", 'Some services are reserved for Pro and Elite subscribers. Free features are limited in daily usage count.')}
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td("4. Règles d'utilisation", '4. Rules of Use')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              {td('En utilisant CourtVision AI, vous vous engagez à :', 'By using CourtVision AI, you agree to:')}
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li>{td("Utiliser le service conformément à sa finalité d'entraînement sportif", 'Use the service in accordance with its sports training purpose')}</li>
              <li>{td('Ne pas utiliser le service à des fins illégales, frauduleuses ou nuisibles', 'Not use the service for illegal, fraudulent, or harmful purposes')}</li>
              <li>{td("Ne pas tenter d'interférer avec le bon fonctionnement de la plateforme", 'Not attempt to interfere with the proper functioning of the platform')}</li>
              <li>{td('Ne pas reproduire, distribuer ou modifier le contenu du service sans autorisation', 'Not reproduce, distribute, or modify the service content without authorization')}</li>
              <li>{td('Respecter les autres utilisateurs de la plateforme', 'Respect other users of the platform')}</li>
              <li>{td('Ne pas partager vos identifiants de connexion avec des tiers', 'Not share your login credentials with third parties')}</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              {td('Tout manquement à ces règles pourra entraîner la suspension ou la résiliation de votre compte sans préavis ni indemnité.', 'Any breach of these rules may result in the suspension or termination of your account without prior notice or compensation.')}
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td('5. Propriété intellectuelle', '5. Intellectual Property')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {td("L'ensemble du contenu de CourtVision AI (interface, algorithmes, textes, graphismes, logos, marques) est protégé par le droit de la propriété intellectuelle. Toute reproduction, représentation, modification ou exploitation, même partielle, est interdite sans autorisation écrite préalable. Les données de performance générées par votre utilisation du service restent votre propriété.", 'All content of CourtVision AI (interface, algorithms, texts, graphics, logos, trademarks) is protected by intellectual property law. Any reproduction, representation, modification, or exploitation, even partial, is prohibited without prior written authorization. Performance data generated by your use of the service remains your property.')}
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td('6. Responsabilité', '6. Liability')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {td("CourtVision AI est un outil d'assistance à l'entraînement. Les analyses et conseils fournis par l'IA sont indicatifs et ne sauraient se substituer à l'avis d'un professionnel qualifié. CourtVision AI ne saurait être tenu responsable des blessures, accidents ou dommages qui pourraient survenir lors de l'utilisation du service. L'utilisateur reconnaît pratiquer le basketball à ses propres risques et assume l'entière responsabilité de sa sécurité physique. CourtVision AI ne garantit pas la disponibilité continue et sans interruption du service.", 'CourtVision AI is a training assistance tool. The analyses and advice provided by the AI are indicative and cannot replace the advice of a qualified professional. CourtVision AI cannot be held responsible for injuries, accidents, or damages that may occur during the use of the service. The user acknowledges practicing basketball at their own risk and assumes full responsibility for their physical safety. CourtVision AI does not guarantee continuous and uninterrupted availability of the service.')}
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td('7. Données personnelles', '7. Personal Data')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {td('Le traitement de vos données personnelles est régi par notre', 'The processing of your personal data is governed by our')}{' '}
              <button
                onClick={() => useAppStore.getState().navigate('privacy')}
                className="text-orange-500 hover:underline"
              >
                {td('Politique de Confidentialité', 'Privacy Policy')}
              </button>, {td("qui décrit en détail les données collectées, les finalités du traitement, vos droits et les mesures de sécurité mises en œuvre conformément au RGPD.", 'which describes in detail the data collected, the purposes of processing, your rights, and the security measures implemented in accordance with the GDPR.')}
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td('8. Résiliation', '8. Termination')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              {td("Vous pouvez résilier votre abonnement à tout moment depuis votre espace client ou en nous contactant. Les conditions suivantes s'appliquent :", 'You may cancel your subscription at any time from your account area or by contacting us. The following conditions apply:')}
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li>{td('La résiliation prend effet à la fin de la période en cours', 'The termination takes effect at the end of the current period')}</li>
              <li>{td("Aucun remboursement n'est effectué pour la période restante", 'No refund is made for the remaining period')}</li>
              <li>{td("Vous conservez l'accès aux fonctionnalités gratuites après résiliation", 'You retain access to free features after termination')}</li>
              <li>{td('Vous pouvez demander la suppression de votre compte et de vos données à tout moment', 'You can request the deletion of your account and data at any time')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td('9. Modifications', '9. Modifications')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {td("CourtVision AI se réserve le droit de modifier les présentes CGU à tout moment. Les modifications seront notifiées par email ou via l'application. L'utilisation continue du service après la publication des modifications constitue une acceptation des nouvelles CGU.", 'CourtVision AI reserves the right to modify these ToS at any time. Modifications will be notified by email or via the application. Continued use of the service after publication of modifications constitutes acceptance of the new ToS.')}
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td('10. Droit applicable', '10. Applicable Law')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {td("Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux français seront seuls compétents. Toutefois, si vous êtes un consommateur au sens du droit de l'UE, vous bénéficiez de la protection offerte par les lois de consommation applicables dans votre pays de résidence.", 'These ToS are subject to French law. In the event of a dispute, French courts shall have sole jurisdiction. However, if you are a consumer within the meaning of EU law, you benefit from the protection offered by the consumer laws applicable in your country of residence.')}
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td('11. Contact', '11. Contact')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {td("Pour toute question relative aux présentes CGU, veuillez nous contacter à l'adresse email suivante :", 'For any questions regarding these ToS, please contact us at the following email address:')}{' '}
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