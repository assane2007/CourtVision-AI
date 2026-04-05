# Runbook Incident + Rollback (V6)

Derniere mise a jour: 2026-04-04
Scope: API Fastify, routes V6 Arena/Horse/Wearable/Marketplace/NBA, migrations Supabase.

## 1. Detection et triage

1. Verifier la sante API:
   - GET /health
   - Attendu: status=ok, checks.api=ok, checks.database=ok
2. Verifier les erreurs applicatives:
   - Logs API (pino) sur les 15 dernieres minutes
   - Sentry projet API (production)
3. Qualifier severite:
   - SEV1: indisponibilite auth/session/coach ou erreur 5xx massive
   - SEV2: degradation fonctionnelle partielle
   - SEV3: bug mineur avec contournement

## 2. Stabilisation immediate

1. Geler les changements (stop deploy auto).
2. Basculer vers mode degrade:
   - Conserver les routes read-only possibles.
   - Eviter les migrations destructives.
3. Communication:
   - Ouvrir canal incident
   - Publier ETA initiale <= 15 min

## 3. Procedure rollback applicatif

Precondition: commit stable precedent identifie.

1. Identifier le commit de retour:
   - git log --oneline -n 20
2. Revenir au commit stable (via pipeline CI/CD ou revert commit).
3. Redeployer API sur environnement cible.
4. Verifier:
   - /health
   - login/signup
   - endpoints v6 critiques

## 4. Procedure rollback base de donnees

Principe: rollback forward-safe. Eviter DROP irreversible sans sauvegarde.

1. Verifier la migration en cause.
2. Si possible, appliquer migration corrective (forward fix) plutot que rollback destructif.
3. Si rollback indispensable:
   - sauvegarde schema + donnees impactees
   - script de revert versionne
   - execution hors pic trafic
4. Revalider:
   - lecture/ecriture tables critiques
   - RLS/policies

## 5. Checklist validation post-incident

1. API health: ok
2. Auth principale: ok
3. Coach routes: create/message/list/get en 200
4. V6 routes critiques: arena/horse/marketplace/nba health
5. Monitoring: alertes revenues a la normale
6. RCA preliminaire partage en < 24h

## 6. Validation effectuee (2026-04-04)

1. Health API verifie localement: ok
2. Migration coach_conversations appliquee et verifiee
3. E2E coach authentifie revalide
4. Typecheck web/mobile reexecute

## 7. Contacts et escalation

1. Incident Commander: Backend lead
2. DB owner: Supabase owner
3. Mobile/Web owners: app leads
4. Canal communication: #incident-courtvision
