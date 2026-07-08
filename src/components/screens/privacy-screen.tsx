'use client'

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app'
import { motion } from 'framer-motion'
import { useTranslation } from '@/components/providers/language-provider'

export function PrivacyScreen() {
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
          <h1 className="text-lg font-bold">{td('Politique de Confidentialité', 'Privacy Policy')}</h1>
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
            <h2 className="text-base font-bold mb-2">{td('1. Responsable du traitement', '1. Data Controller')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {td('Le responsable du traitement des données personnelles est CourtVision AI, dont le siège social est situé en France. Pour toute question relative à la présente politique, vous pouvez nous contacter à l\'adresse email suivante :', 'The data controller for personal data is CourtVision AI, headquartered in France. For any questions regarding this policy, you can contact us at the following email address:')}{' '}
              <a href="mailto:privacy@courtvision.ai" className="text-orange-500 hover:underline">
                privacy@courtvision.ai
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td('2. Données collectées', '2. Data Collected')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              {td('CourtVision AI collecte les catégories de données suivantes :', 'CourtVision AI collects the following categories of data:')}
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li>
                <strong className="text-foreground">{td("Données d'identification :", 'Identification data:')}</strong> {td('nom, prénom, adresse email, mot de passe hashé.', 'name, first name, email address, hashed password.')}
              </li>
              <li>
                <strong className="text-foreground">{td("Données d'entraînement :", 'Training data:')}</strong> {td('positions, mouvements capturés par la caméra (traités localement et non stockés sur nos serveurs), résultats d\'exercices, scores, répétitions.', 'positions, movements captured by camera (processed locally and not stored on our servers), exercise results, scores, repetitions.')}
              </li>
              <li>
                <strong className="text-foreground">{td('Données de performance :', 'Performance data:')}</strong> {td('historique des séances, statistiques de progression, niveaux, XP, badges, objectifs.', 'session history, progression statistics, levels, XP, badges, goals.')}
              </li>
              <li>
                <strong className="text-foreground">{td('Données de connexion :', 'Connection data:')}</strong> {td('adresse IP, type de navigateur, système d\'exploitation, logs de connexion.', 'IP address, browser type, operating system, connection logs.')}
              </li>
              <li>
                <strong className="text-foreground">{td('Données de paiement :', 'Payment data:')}</strong> {td('informations de facturation traitées par Stripe (nous ne stockons pas de données bancaires).', 'billing information processed by Stripe (we do not store banking data).')}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td('3. Finalités du traitement', '3. Purposes of Processing')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              {td('Vos données personnelles sont utilisées pour :', 'Your personal data is used for:')}
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li>{td("Fournir et améliorer nos services d'entraînement basketball IA", 'Providing and improving our AI basketball training services')}</li>
              <li>{td("Personnaliser votre expérience et vos recommandations d'exercices", 'Personalizing your experience and exercise recommendations')}</li>
              <li>{td('Suivre votre progression et vous attribuer des récompenses (XP, badges)', 'Tracking your progression and assigning rewards (XP, badges)')}</li>
              <li>{td('Assurer le support client et la communication relative au service', 'Providing customer support and service-related communications')}</li>
              <li>{td('Gérer votre abonnement et les facturations via Stripe', 'Managing your subscription and billing via Stripe')}</li>
              <li>{td('Assurer la sécurité et la prévention des fraudes', 'Ensuring security and fraud prevention')}</li>
              <li>{td('Respecter nos obligations légales et réglementaires', 'Complying with our legal and regulatory obligations')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td('4. Base légale', '4. Legal Basis')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {td('Le traitement de vos données repose sur :', 'The processing of your data is based on:')}
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li>
                <strong className="text-foreground">{td('Consentement (Art. 6.1.a RGPD) :', 'Consent (Art. 6.1.a GDPR):')}</strong> {td("pour le traitement des données d'entraînement par caméra et l'utilisation de l'intelligence artificielle.", 'for the processing of camera training data and the use of artificial intelligence.')}
              </li>
              <li>
                <strong className="text-foreground">{td('Exécution du contrat (Art. 6.1.b RGPD) :', 'Contract performance (Art. 6.1.b GDPR):')}</strong> {td('pour la fourniture du service et la gestion de votre compte.', 'for the provision of the service and the management of your account.')}
              </li>
              <li>
                <strong className="text-foreground">{td('Intérêt légitime (Art. 6.1.f RGPD) :', 'Legitimate interest (Art. 6.1.f GDPR):')}</strong> {td("pour l'amélioration de nos services, l'analyse statistique anonymisée et la sécurité de la plateforme.", 'for improving our services, anonymized statistical analysis, and platform security.')}
              </li>
              <li>
                <strong className="text-foreground">{td('Obligation légale (Art. 6.1.c RGPD) :', 'Legal obligation (Art. 6.1.c GDPR):')}</strong> {td('pour le respect des obligations fiscales et comptables.', 'for compliance with tax and accounting obligations.')}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td('5. Durée de conservation', '5. Retention Period')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              {td('Vos données sont conservées selon les durées suivantes :', 'Your data is retained for the following durations:')}
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">{td('Données de compte :', 'Account data:')}</strong> {td('pendant la durée du contrat et 3 ans après la fin de la relation contractuelle.', 'for the duration of the contract and 3 years after the end of the contractual relationship.')}</li>
              <li><strong className="text-foreground">{td("Données d'entraînement :", 'Training data:')}</strong> {td('tant que votre compte est actif, puis supprimées sous 12 mois après suppression du compte.', 'as long as your account is active, then deleted within 12 months after account deletion.')}</li>
              <li><strong className="text-foreground">{td('Données de facturation :', 'Billing data:')}</strong> {td("5 ans à compter de la clôture de l'exercice comptable (obligation légale).", '5 years from the end of the fiscal year (legal obligation).')}</li>
              <li><strong className="text-foreground">{td('Logs de connexion :', 'Connection logs:')}</strong> {td('12 mois maximum.', '12 months maximum.')}</li>
              <li><strong className="text-foreground">{td('Cookies :', 'Cookies:')}</strong> {td('durée maximale de 13 mois.', 'maximum duration of 13 months.')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td("6. Droits de l'utilisateur", '6. User Rights')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              {td('Conformément au RGPD (Articles 15 à 22), vous disposez des droits suivants :', 'In accordance with the GDPR (Articles 15 to 22), you have the following rights:')}
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">{td("Droit d'accès :", 'Right of access:')}</strong> {td('obtenir la confirmation et les informations relatives au traitement de vos données.', 'obtain confirmation and information about the processing of your data.')}</li>
              <li><strong className="text-foreground">{td('Droit de rectification :', 'Right to rectification:')}</strong> {td('corriger des données inexactes ou incomplètes.', 'correct inaccurate or incomplete data.')}</li>
              <li><strong className="text-foreground">{td("Droit à l'effacement :", 'Right to erasure:')}</strong> {td("demander la suppression de vos données (\u00ab droit à l'oubli \u00bb).", "request the deletion of your data ('right to be forgotten').")}</li>
              <li><strong className="text-foreground">{td('Droit à la portabilité :', 'Right to data portability:')}</strong> {td('recevoir vos données dans un format structuré et courant.', 'receive your data in a structured and common format.')}</li>
              <li><strong className="text-foreground">{td("Droit d'opposition :", 'Right to object:')}</strong> {td('vous opposer au traitement de vos données pour des motifs légitimes.', 'object to the processing of your data for legitimate reasons.')}</li>
              <li><strong className="text-foreground">{td('Droit à la limitation :', 'Right to restriction:')}</strong> {td('demander la limitation du traitement dans certaines circonstances.', 'request restriction of processing in certain circumstances.')}</li>
              <li><strong className="text-foreground">{td('Droit de retrait du consentement :', 'Right to withdraw consent:')}</strong> {td('retirer votre consentement à tout moment sans compromettre la licéité du traitement antérieur.', 'withdraw your consent at any time without affecting the lawfulness of prior processing.')}</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              {td('Pour exercer vos droits, contactez-nous à', 'To exercise your rights, contact us at')}{' '}
              <a href="mailto:privacy@courtvision.ai" className="text-orange-500 hover:underline">
                privacy@courtvision.ai
              </a>. {td("Vous disposez également d'un droit de réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés).", 'You also have the right to lodge a complaint with the CNIL (French Data Protection Authority).')}
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td('7. Cookies et technologies similaires', '7. Cookies and Similar Technologies')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {td('CourtVision AI utilise des cookies pour :', 'CourtVision AI uses cookies for:')}
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">{td('Cookies essentiels :', 'Essential cookies:')}</strong> {td('nécessaires au fonctionnement du service (authentification, préférences).', 'necessary for the operation of the service (authentication, preferences).')}</li>
              <li><strong className="text-foreground">{td('Cookies analytiques :', 'Analytics cookies:')}</strong> {td("pour comprendre l'utilisation du service et l'améliorer (anonymisés).", 'to understand and improve service usage (anonymized).')}</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              {td('Vous pouvez gérer vos préférences de cookies via les paramètres de votre navigateur.', 'You can manage your cookie preferences through your browser settings.')}
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td('8. Sous-traitants', '8. Subprocessors')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              {td('Nous faisons appel aux sous-traitants suivants, tous conformes au RGPD :', 'We use the following subprocessors, all GDPR-compliant:')}
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">{td('Hébergement :', 'Hosting:')}</strong> {td('infrastructure cloud sécurisée conforme aux normes de sécurité.', 'secure cloud infrastructure compliant with security standards.')}</li>
              <li><strong className="text-foreground">Stripe :</strong> {td('traitement sécurisé des paiements (certifié PCI DSS Level 1).', 'secure payment processing (PCI DSS Level 1 certified).')}</li>
              <li><strong className="text-foreground">Analytics :</strong> {td("services d'analyse anonymisée pour l'amélioration du service.", 'anonymized analytics services for service improvement.')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td('9. Sécurité des données', '9. Data Security')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {td("Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement en transit (TLS) et au repos, contrôle d'accès strict, authentification sécurisée, audits réguliers de sécurité. Les données biométriques (mouvements) sont traitées localement sur votre appareil et ne sont pas stockées sur nos serveurs.", 'We implement appropriate technical and organizational measures to protect your data: encryption in transit (TLS) and at rest, strict access control, secure authentication, regular security audits. Biometric data (movements) is processed locally on your device and is not stored on our servers.')}
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-2">{td('10. Contact', '10. Contact')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {td('Pour toute question concernant la présente politique de confidentialité, ou pour exercer vos droits, veuillez nous contacter :', 'For any questions regarding this privacy policy, or to exercise your rights, please contact us:')}
            </p>
            <div className="mt-2 rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="text-sm"><strong className="text-foreground">{td('Email :', 'Email:')}</strong>{' '}
                <a href="mailto:privacy@courtvision.ai" className="text-orange-500 hover:underline">privacy@courtvision.ai</a>
              </p>
              <p className="text-sm"><strong className="text-foreground">DPO:</strong> CourtVision AI</p>
            </div>
          </section>
        </article>
      </motion.main>
    </div>
  )
}

export default PrivacyScreen