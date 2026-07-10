import { NextResponse } from 'next/server'

const HTML_PAGE = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Politique de Confidentialit&eacute; &mdash; CourtVision AI</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.7;
      color: #1a1a1a;
      background: #fafafa;
      padding: 1rem;
      max-width: 800px;
      margin: 0 auto;
    }
    @media (prefers-color-scheme: dark) {
      body { color: #e4e4e7; background: #18181b; }
      h1, h2, h3 { color: #f4f4f5; }
      a { color: #fb923c; }
      hr { border-color: #3f3f46; }
      .card { background: #27272a; border-color: #3f3f46; }
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }
    .subtitle { color: #71717a; margin-bottom: 2rem; font-size: 0.875rem; }
    h2 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-top: 2rem;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #f97316;
      display: inline-block;
    }
    h3 {
      font-size: 1rem;
      font-weight: 600;
      margin-top: 1.25rem;
      margin-bottom: 0.5rem;
    }
    p, li { margin-bottom: 0.5rem; }
    ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
    li { margin-bottom: 0.35rem; }
    strong { font-weight: 600; }
    a { color: #ea580c; text-decoration: underline; }
    hr { border: none; border-top: 1px solid #e4e4e7; margin: 2rem 0; }
    .card {
      background: #fff;
      border: 1px solid #e4e4e7;
      border-radius: 0.75rem;
      padding: 1.25rem;
      margin: 1rem 0;
    }
    .badge {
      display: inline-block;
      background: #fff7ed;
      color: #ea580c;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      margin-bottom: 1rem;
    }
    .rights-grid {
      display: grid;
      gap: 0.75rem;
      margin: 1rem 0;
    }
    .right-item {
      padding: 0.75rem;
      border-radius: 0.5rem;
      background: #fff7ed;
      border: 1px solid #fed7aa;
    }
    .right-item strong { color: #ea580c; }
    .footer {
      text-align: center;
      color: #71717a;
      font-size: 0.8rem;
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e4e4e7;
    }
  </style>
</head>
<body>
  <h1>&#128220; Politique de Confidentialit&eacute;</h1>
  <p class="subtitle">Derni&egrave;re mise &agrave; jour : Janvier 2025 &mdash; CourtVision AI</p>

  <span class="badge">RGPD Conforme</span>

  <!-- 1. Responsable du traitement -->
  <h2>1. Responsable du traitement</h2>
  <p>
    CourtVision AI est une application d&rsquo;entra&icirc;nement au basketball d&eacute;velopp&eacute;e
    &agrave; des fins personnelles et &eacute;ducatives. Le responsable du traitement des donn&eacute;es
    est le d&eacute;veloppeur de l&rsquo;application.
  </p>
  <div class="card">
    <strong>Base l&eacute;gale du traitement :</strong> Consentement de l&rsquo;utilisateur
    (Article 6(1)(a) du RGPD) et ex&eacute;cution d&rsquo;un contrat (Article 6(1)(b) du RGPD).
  </div>

  <!-- 2. Données collectées -->
  <h2>2. Donn&eacute;es collect&eacute;es</h2>
  <p>Nous collectons les cat&eacute;gories de donn&eacute;es suivantes :</p>
  <ul>
    <li><strong>Donn&eacute;es de compte</strong> : nom, adresse e-mail, mot de passe (hach&eacute; avec bcrypt)</li>
    <li><strong>Donn&eacute;es d&rsquo;entra&icirc;nement</strong> : s&eacute;ances d&rsquo;entra&icirc;nement, scores, r&eacute;p&eacute;titions, exercices r&eacute;alis&eacute;s, dur&eacute;e des s&eacute;ances</li>
    <li><strong>Donn&eacute;es de progression</strong> : exp&eacute;rience (XP), niveau, succ&egrave;s d&eacute;bloqu&eacute;s, s&eacute;rie d&rsquo;entra&icirc;nement</li>
    <li><strong>Donn&eacute;es cognitives</strong> : scores de r&eacute;action et temps de r&eacute;action</li>
    <li><strong>Donn&eacute;es de pr&eacute;f&eacute;rences</strong> : position de jeu, objectifs hebdomadaires, param&egrave;tres de repos, pr&eacute;f&eacute;rences sonores et tactiles, langue</li>
    <li><strong>Conversations IA</strong> : messages &eacute;chang&eacute;s avec le coach IA pour le coaching personnalis&eacute;</li>
    <li><strong>Exercices personnalis&eacute;s</strong> : exercices cr&eacute;&eacute;s par l&rsquo;utilisateur</li>
    <li><strong>Plans d&rsquo;entra&icirc;nement</strong> : plans cr&eacute;&eacute;s et favoris de l&rsquo;utilisateur</li>
  </ul>

  <!-- 3. Finalités du traitement -->
  <h2>3. Finalit&eacute;s du traitement</h2>
  <p>Vos donn&eacute;es sont utilis&eacute;es exclusivement pour :</p>
  <ul>
    <li>Fournir et am&eacute;liorer le service d&rsquo;entra&icirc;nement basketball</li>
    <li>Suivre votre progression et personnaliser l&rsquo;exp&eacute;rience</li>
    <li>Calculer les classements et les succ&egrave;s</li>
    <li>Offrir un coaching IA personnalis&eacute; (analyse de forme, conseils)</li>
    <li>G&eacute;rer votre compte et vos pr&eacute;f&eacute;rences</li>
  </ul>
  <div class="card">
    <strong>Aucune donn&eacute;e n&rsquo;est utilis&eacute;e &agrave; des fins commerciales, publicitaires ou transmise &agrave; des tiers.</strong>
  </div>

  <!-- 4. Durée de conservation -->
  <h2>4. Dur&eacute;e de conservation</h2>
  <ul>
    <li><strong>Donn&eacute;es de compte</strong> : conserv&eacute;es tant que votre compte est actif</li>
    <li><strong>Donn&eacute;es d&rsquo;entra&icirc;nement</strong> : conserv&eacute;es ind&eacute;finiment ou jusqu&rsquo;&agrave; la suppression de votre compte</li>
    <li><strong>Conversations IA</strong> : conserv&eacute;es 12 mois apr&egrave;s la derni&egrave;re utilisation</li>
    <li><strong>Donn&eacute;es cognitives</strong> : conserv&eacute;es jusqu&rsquo;&agrave; la suppression du compte</li>
  </ul>
  <p>Vous pouvez demander la suppression de vos donn&eacute;es &agrave; tout moment via les param&egrave;tres de l&rsquo;application ou en nous contactant.</p>

  <!-- 5. Vos droits RGPD -->
  <h2>5. Vos droits (RGPD)</h2>
  <p>
    Conform&eacute;ment au R&egrave;glement G&eacute;n&eacute;ral sur la Protection des Donn&eacute;es (RGPD),
    vous disposez des droits suivants :
  </p>
  <div class="rights-grid">
    <div class="right-item">
      <strong>Droit d&rsquo;acc&egrave;s (Article 15)</strong>
      <p>Vous pouvez demander une copie de toutes vos donn&eacute;es personnelles.</p>
    </div>
    <div class="right-item">
      <strong>Droit de rectification (Article 16)</strong>
      <p>Vous pouvez corriger vos donn&eacute;es inexactes directement dans l&rsquo;application.</p>
    </div>
    <div class="right-item">
      <strong>Droit &agrave; l&rsquo;effacement (Article 17)</strong>
      <p>Vous pouvez demander la suppression compl&egrave;te de vos donn&eacute;es via l&rsquo;option &laquo; Supprimer mon compte &raquo; dans votre profil.</p>
    </div>
    <div class="right-item">
      <strong>Droit &agrave; la limitation (Article 18)</strong>
      <p>Vous pouvez limiter le traitement de vos donn&eacute;es en nous contactant.</p>
    </div>
    <div class="right-item">
      <strong>Droit &agrave; la portabilit&eacute; (Article 20)</strong>
      <p>Vous pouvez exporter vos donn&eacute;es dans un format structur&eacute; via l&rsquo;option d&rsquo;export dans les param&egrave;tres.</p>
    </div>
    <div class="right-item">
      <strong>Droit d&rsquo;opposition (Article 21)</strong>
      <p>Vous pouvez vous opposer au traitement de vos donn&eacute;es &agrave; tout moment.</p>
    </div>
  </div>

  <!-- 6. Comment exercer vos droits -->
  <h2>6. Comment exercer vos droits</h2>
  <p>
    Vous pouvez exercer vos droits directement dans l&rsquo;application :
  </p>
  <ul>
    <li><strong>Acc&egrave;s &amp; export</strong> : Param&egrave;tres &rarr; Exporter mes donn&eacute;es</li>
    <li><strong>Rectification</strong> : Modifier votre profil dans les param&egrave;tres</li>
    <li><strong>Effacement</strong> : Profil &rarr; Supprimer mon compte</li>
  </ul>
  <p>
    Pour toute demande, vous pouvez &eacute;galement nous contacter par e-mail &agrave; :
    <strong>privacy@courtvision.ai</strong>
  </p>
  <p>
    Nous r&eacute;pondrons &agrave; votre demande dans un d&eacute;lai d&rsquo;un mois conform&eacute;ment au RGPD.
  </p>

  <!-- 7. Cookies et stockage local -->
  <h2>7. Cookies et stockage local</h2>
  <p>
    L&rsquo;application utilise uniquement des cookies essentiels au fonctionnement. Aucun cookie
    tiers ou de suivi n&rsquo;est utilis&eacute;.
  </p>
  <div class="card">
    <h3>Cookies essentiels utilis&eacute;s :</h3>
    <ul>
      <li><strong>sb-access-token</strong> : Jeton d'acc&egrave;s Supabase pour maintenir votre connexion (HTTP-only, Secure)</li>
      <li><strong>sb-refresh-token</strong> : Jeton de rafra&icirc;chissement Supabase pour renouveler la session</li>
    </ul>
  </div>
  <div class="card">
    <h3>Stockage local (localStorage) :</h3>
    <ul>
      <li>Pr&eacute;f&eacute;rence de consentement aux cookies (accept&eacute; / refus&eacute;)</li>
      <li>Th&egrave;me d&rsquo;affichage (sombre / clair)</li>
      <li>Cache de donn&eacute;es pour am&eacute;liorer les performances</li>
    </ul>
  </div>

  <!-- 8. Services tiers -->
  <h2>8. Services tiers</h2>
  <p>
    L&rsquo;application n&rsquo;utilise actuellement aucun service tiers de suivi, d&rsquo;analyse
    ou de publicit&eacute;. Toutes les donn&eacute;es sont stock&eacute;es localement sur nos serveurs
    s&eacute;curis&eacute;s.
  </p>

  <!-- 9. Sécurité -->
  <h2>9. Mesures de s&eacute;curit&eacute;</h2>
  <p>Nous mettons en &oelig;uvre les mesures suivantes pour prot&eacute;ger vos donn&eacute;es :</p>
  <ul>
    <li><strong>Hachage des mots de passe</strong> : les mots de passe sont hach&eacute;s avec bcrypt (co&ucirc;t 12)</li>
    <li><strong>Sessions s&eacute;curis&eacute;es</strong> : les sessions sont g&eacute;r&eacute;es via des tokens JWT sign&eacute;s</li>
    <li><strong>Chiffrement TLS</strong> : toutes les communications sont chiffr&eacute;es (HTTPS)</li>
    <li><strong>Authentification requise</strong> : l&rsquo;acc&egrave;s aux donn&eacute;es est limit&eacute; par authentification</li>
    <li><strong>Limitation de d&eacute;bit</strong> : protection contre les attaques par force brute</li>
    <li><strong>Protection CSRF</strong> : tokens anti-falsification de requ&ecirc;tes</li>
  </ul>

  <!-- 10. Modifications -->
  <h2>10. Modifications de cette politique</h2>
  <p>
    Nous nous r&eacute;servons le droit de modifier cette politique de confidentialit&eacute;.
    Toute modification sera notifi&eacute;e dans l&rsquo;application. La date de derni&egrave;re
    mise &agrave; jour est indiqu&eacute;e en haut de cette page.
  </p>

  <!-- 11. Contact -->
  <h2>11. Contact</h2>
  <p>
    Pour toute question relative &agrave; la protection de vos donn&eacute;es ou pour
    exercer vos droits, veuillez nous contacter :
  </p>
  <div class="card">
    <p><strong>CourtVision AI</strong></p>
    <p>E-mail : <a href="mailto:privacy@courtvision.ai">privacy@courtvision.ai</a></p>
    <p>Vous pouvez &eacute;galement utiliser les options de votre profil dans l&rsquo;application.</p>
  </div>

  <hr />

  <div class="footer">
    <p>CourtVision AI &mdash; Entra&icirc;nement Basketball Intelligent</p>
    <p>Politique de confidentialit&eacute; conforme au RGPD (R&egrave;glement UE 2016/679)</p>
  </div>
</body>
</html>`

export async function GET() {
  return new NextResponse(HTML_PAGE, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}