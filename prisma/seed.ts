import { db } from '../src/lib/db'

const DRILLS = [
  // POCKET BALL (3)
  { name: 'Pocket Dribble Low', nameFr: 'Dribble Bas de Poche', category: 'pocket_ball', difficulty: 'beginner', description: 'Keep the ball in your pocket area with low, controlled dribbles.', descriptionFr: 'Gardez le ballon dans la zone de poche avec des dribbles bas et contrôlés.', instructions: 'Stand in athletic stance. Dribble with your right hand below knee height for 15 seconds, then switch to left. Keep eyes up.', instructionsFr: 'Position athlétique. Dribblez main droite sous le genou pendant 15s, puis changez. Gardez les yeux levés.', durationSec: 30, targetReps: 20, icon: '🏀' },
  { name: 'Crossover Pocket', nameFr: 'Crossover de Poche', category: 'pocket_ball', difficulty: 'intermediate', description: 'Quick crossover dribbles staying in the pocket area.', descriptionFr: 'Dribbles de crossover rapides en restant dans la zone de poche.', instructions: 'Alternate between right and left hand crossover. Keep ball below waist. Perform 10 crossovers per side.', instructionsFr: 'Alternez crossover droite-gauche. Gardez le ballon sous la taille. 10 crossovers par côté.', durationSec: 30, targetReps: 20, icon: '🔄' },
  { name: 'Behind the Back Pocket', nameFr: 'Dans le Dos Poche', category: 'pocket_ball', difficulty: 'advanced', description: 'Behind the back dribble from pocket position.', descriptionFr: 'Dribble dans le dos depuis la position de poche.', instructions: 'From pocket position, swing ball behind your back to opposite hand. Stay low. 10 reps each direction.', instructionsFr: 'Depuis la poche, balancez le ballon dans le dos vers la main opposée. Restez bas. 10 reps par côté.', durationSec: 40, targetReps: 20, icon: '🌀' },

  // SHIFTY (3)
  { name: 'In and Out Dribble', nameFr: 'Dribble Dedans-Dehors', category: 'shifty', difficulty: 'beginner', description: 'In-and-out dribble move to create space.', descriptionFr: 'Mouvement de dribble dedans-dehors pour créer de l\'espace.', instructions: 'Dribble with one hand, push ball in then out. Fake crossover direction. 10 reps each hand.', instructionsFr: 'Dribblez une main, poussez le ballon dedans puis dehors. Faux crossover. 10 reps par main.', durationSec: 30, targetReps: 20, icon: '↔️' },
  { name: 'Hesitation Move', nameFr: 'Mouvement d\'Hésitation', category: 'shifty', difficulty: 'intermediate', description: 'Hesitation dribble to freeze the defender.', descriptionFr: 'Dribble d\'hésitation pour geler le défenseur.', instructions: 'Dribble at speed, suddenly slow down like stopping, then explode forward. 8 reps.', instructionsFr: 'Dribblez vite, ralentissez soudainement, puis explosez vers l\'avant. 8 reps.', durationSec: 35, targetReps: 16, icon: '⏸️' },
  { name: 'Step Back Dribble', nameFr: 'Dribble Step Back', category: 'shifty', difficulty: 'advanced', description: 'Step back move to create shooting space.', descriptionFr: 'Mouvement step back pour créer un espace de tir.', instructions: 'Dribble forward, plant your foot, and step back while maintaining dribble. 8 reps each side.', instructionsFr: 'Dribblez en avant, plantez le pied, reculez en gardant le dribble. 8 reps par côté.', durationSec: 40, targetReps: 16, icon: '🔙' },

  // BALL HANDLING (4)
  { name: 'Two Ball Dribble', nameFr: 'Dribble à Deux Ballons', category: 'ball_handling', difficulty: 'intermediate', description: 'Simultaneous dribbling with two basketballs.', descriptionFr: 'Dribble simultané avec deux ballons.', instructions: 'Dribble one ball per hand simultaneously. Start with same rhythm, then alternate. 30 seconds.', instructionsFr: 'Un ballon par main simultanément. Même rythme d\'abord, puis alternez. 30 secondes.', durationSec: 30, targetReps: 30, icon: '🏀🏀' },
  { name: 'Figure 8 Dribble', nameFr: 'Dribble en 8', category: 'ball_handling', difficulty: 'beginner', description: 'Figure 8 pattern dribbling through legs.', descriptionFr: 'Dribble en pattern 8 entre les jambes.', instructions: 'Dribble in figure 8 pattern through and around your legs. 10 full figure 8s.', instructionsFr: 'Dribblez en 8 entre et autour des jambes. 10 figure 8 complets.', durationSec: 30, targetReps: 10, icon: '♾️' },
  { name: 'Tennis Ball Toss', nameFr: 'Lancé de Balle de Tennis', category: 'ball_handling', difficulty: 'advanced', description: 'Dribble basketball while catching tennis ball tosses.', descriptionFr: 'Dribblez le ballon en attrapant des lancers de balle de tennis.', instructions: 'Dribble with one hand while tossing tennis ball up with other. Catch and toss 15 times per hand.', instructionsFr: 'Dribblez une main tout en lançant la balle de tennis. 15 lancers par main.', durationSec: 40, targetReps: 30, icon: '🎾' },
  { name: 'Pound Dribble Series', nameFr: 'Série de Dribbles Puissants', category: 'ball_handling', difficulty: 'beginner', description: 'Hard, controlled pound dribbles to build hand strength.', descriptionFr: 'Dribbles puissants et contrôlés pour renforcer les mains.', instructions: 'Pound the ball as hard as possible while keeping control. 20 pounds right, 20 left, 20 alternating.', instructionsFr: 'Frappez le ballon fort tout en gardant le contrôle. 20 droite, 20 gauche, 20 alterné.', durationSec: 30, targetReps: 60, icon: '💪' },

  // SPEED CHANGE (3)
  { name: 'Speed Burst Dribble', nameFr: 'Dribble en Éclat', category: 'speed_change', difficulty: 'beginner', description: 'Sudden speed changes while dribbling.', descriptionFr: 'Changements de vitesse soudains en dribblant.', instructions: 'Dribble at 50% speed for 3 seconds, then explode to 100% for 3 seconds. Repeat 5 times.', instructionsFr: 'Dribblez à 50% pendant 3s, puis explosez à 100% pendant 3s. Répétez 5 fois.', durationSec: 35, targetReps: 10, icon: '⚡' },
  { name: 'Stop and Go', nameFr: 'Arrêt et Départ', category: 'speed_change', difficulty: 'intermediate', description: 'Full stop then explosive start while dribbling.', descriptionFr: 'Arrêt complet puis départ explosif en dribblant.', instructions: 'Dribble forward, come to a complete jump stop, then explode in same or new direction. 8 reps.', instructionsFr: 'Dribblez, arrêtez-vous complètement, puis explosez. 8 reps.', durationSec: 35, targetReps: 16, icon: '🛑' },
  { name: 'Change of Pace Crossover', nameFr: 'Crossover Changement de Rythme', category: 'speed_change', difficulty: 'advanced', description: 'Combine crossover with speed change for maximum effectiveness.', descriptionFr: 'Combinez crossover et changement de vitesse.', instructions: 'Slow dribble into quick crossover, then speed burst. Sell the slow with your body. 8 reps each direction.', instructionsFr: 'Dribble lent en crossover rapide, puis éclat. 8 reps par direction.', durationSec: 40, targetReps: 16, icon: '🔄⚡' },

  // DEFENSE (3)
  { name: 'Defensive Slide', nameFr: 'Glissade Défensive', category: 'defense', difficulty: 'beginner', description: 'Lateral defensive slides for proper stance and footwork.', descriptionFr: 'Glissades défensives latérales pour la posture et le placement.', instructions: 'Stay in low defensive stance. Slide laterally 4 steps right, then 4 left. Keep hands up. 10 reps.', instructionsFr: 'Posture basse défensive. Glissez 4 pas droite, 4 gauche. Mains levées. 10 reps.', durationSec: 30, targetReps: 10, icon: '🛡️' },
  { name: 'Closeout Sprint', nameFr: 'Sprint de Fermeture', category: 'defense', difficulty: 'intermediate', description: 'Sprint to close out on a shooter with proper form.', descriptionFr: 'Sprint pour fermer sur un tireur avec bonne forme.', instructions: 'Start at the basket, sprint out to the 3-point line. Chop steps at the end. High hands. 8 reps.', instructionsFr: 'Partez du panier, sprintez jusqu\'à la ligne à 3 pts. Pas chassés à la fin. 8 reps.', durationSec: 30, targetReps: 16, icon: '🏃' },
  { name: 'Shell Drill Reaction', nameFr: 'Drill Coquille Réaction', category: 'defense', difficulty: 'advanced', description: 'Defensive positioning and reaction to ball movement.', descriptionFr: 'Positionnement défensif et réaction au mouvement du ballon.', instructions: 'Get in defensive stance. React to verbal cues (left, right, up, back) with quick movements. 15 reactions.', instructionsFr: 'Posture défensive. Réagissez aux signaux verbaux. 15 réactions.', durationSec: 35, targetReps: 15, icon: '🎯' },

  // SHOOTING (4)
  { name: 'BEEF Form Check', nameFr: 'Vérification Forme BEEF', category: 'shooting', difficulty: 'beginner', description: 'Practice BEEF shooting fundamentals (Balance, Eyes, Elbow, Follow-through).', descriptionFr: 'Pratiquez les fondamentaux BEEF (Équilibre, Yeux, Coude, Suivi).', instructions: 'Go through each BEEF component slowly. Hold each position for 2 seconds. 5 full reps.', instructionsFr: 'Passez par chaque composant BEEF lentement. Maintenez 2s. 5 reps complets.', durationSec: 30, targetReps: 5, icon: '🎯' },
  { name: 'One Motion Shot', nameFr: 'Tir d\'Un Mouvement', category: 'shooting', difficulty: 'intermediate', description: 'Fluid one-motion shooting form for catch and shoot.', descriptionFr: 'Forme de tir fluide d\'un mouvement pour tirer attrapé.', instructions: 'Start in shooting pocket. Bring ball up and release in one fluid motion. Focus on rhythm. 10 shots.', instructionsFr: 'Départ poche de tir. Monte et relâchez en un mouvement fluide. 10 tirs.', durationSec: 35, targetReps: 10, icon: '🚀' },
  { name: 'Free Throw Routine', nameFr: 'Routine de Lancer Franc', category: 'shooting', difficulty: 'beginner', description: 'Consistent free throw shooting routine.', descriptionFr: 'Routine de lancer franc cohérente.', instructions: 'Practice your pre-shot routine, set your feet, breathe, and shoot with proper form. 10 reps.', instructionsFr: 'Routine pré-tir, pieds placés, respirez, tirez. 10 reps.', durationSec: 40, targetReps: 10, icon: '🎟️' },
  { name: 'Off the Dribble Pull-up', nameFr: 'Tir en Dribble', category: 'shooting', difficulty: 'advanced', description: 'Pull-up jumper off the dribble with quick release.', descriptionFr: 'Tir arrêté en dribble avec relâchement rapide.', instructions: 'Dribble 2 times, plant foot, and rise up for pull-up jumper. Quick release. 8 reps each hand.', instructionsFr: 'Dribblez 2 fois, plantez le pied, montez pour le tir. 8 reps par main.', durationSec: 40, targetReps: 16, icon: '🔥' },

  // FOOTWORK (4)
  { name: 'Triple Threat Stance', nameFr: 'Posture Triple Menace', category: 'footwork', difficulty: 'beginner', description: 'Proper triple threat positioning and pivot work.', descriptionFr: 'Positionnement triple menace et pivots.', instructions: 'Get in triple threat. Practice front pivot and reverse pivot. 5 each direction. Stay balanced.', instructionsFr: 'Position triple menace. Pivots avant et arrière. 5 chaque direction.', durationSec: 25, targetReps: 20, icon: '🦶' },
  { name: 'Jab Step Series', nameFr: 'Série de Jab Steps', category: 'footwork', difficulty: 'intermediate', description: 'Jab step moves to create scoring opportunities.', descriptionFr: 'Mouvements de jab step pour créer des occasions.', instructions: 'From triple threat, jab step right, jab left, jab and go. Sell each fake. 6 reps each.', instructionsFr: 'Triple menace, jab droite, jab gauche, jab et go. 6 reps chaque.', durationSec: 30, targetReps: 18, icon: '👆' },
  { name: 'Ladder Agility', nameFr: 'Agilité Échelle', category: 'footwork', difficulty: 'intermediate', description: 'Agility ladder drills for quick feet.', descriptionFr: 'Drills d\'agilité en échelle pour pieds rapides.', instructions: 'Quick feet through ladder pattern. Ickey shuffle: 4 lengths. Focus on staying light on feet.', instructionsFr: 'Pieds rapides en échelle. Ickey shuffle: 4 longueurs. Restez léger.', durationSec: 35, targetReps: 12, icon: '🪜' },
  { name: 'Euro Step Footwork', nameFr: 'Footwork Euro Step', category: 'footwork', difficulty: 'advanced', description: 'Euro step footwork pattern for finishing at the rim.', descriptionFr: 'Pattern de footwork euro step pour finir au panier.', instructions: 'Drive step, wide step right, gather, wide step left. Practice at 50% speed first. 8 reps each direction.', instructionsFr: 'Pas de drive, pas large droit, rassemblez, pas large gauche. 8 reps par direction.', durationSec: 35, targetReps: 16, icon: '🇪🇺' },

  // FINISHING (3)
  { name: 'Layup Form', nameFr: 'Forme de Layup', category: 'finishing', difficulty: 'beginner', description: 'Proper layup footwork and finishing technique.', descriptionFr: 'Placement de pieds et technique de finition pour layup.', instructions: 'Practice 2-step layup footwork. Right hand: left-right. Left hand: right-left. Focus on high release. 8 each side.', instructionsFr: 'Placement 2 pas. Main droite: gauche-droite. Main gauche: droite-gauche. 8 chaque côté.', durationSec: 30, targetReps: 16, icon: '🏅' },
  { name: 'Mocha Finish', nameFr: 'Finition Mocha', category: 'finishing', difficulty: 'intermediate', description: 'Mocha layup finish using the backboard.', descriptionFr: 'Finition layup mocha utilisant le panneau.', instructions: 'Drive middle, finish with extended arm off the glass. Use backboard. 6 reps each side.', instructionsFr: 'Conduisez au centre, finissez bras tendu sur le panneau. 6 reps par côté.', durationSec: 30, targetReps: 12, icon: '☕' },
  { name: 'Reverse Layup', nameFr: 'Layup Renversé', category: 'finishing', difficulty: 'advanced', description: 'Reverse layup finishing on both sides of the basket.', descriptionFr: 'Layup renversé des deux côtés du panier.', instructions: 'Approach from the side, use reverse pivot and finish on opposite side of backboard. 6 reps each side.', instructionsFr: 'Approchez du côté, pivot inverse, finissez de l\'autre côté. 6 reps par côté.', durationSec: 35, targetReps: 12, icon: '🔃' },

  // CONDITIONING (3)
  { name: 'Court Sprints', nameFr: 'Sprints de Terrain', category: 'conditioning', difficulty: 'beginner', description: 'Full court sprint conditioning drill.', descriptionFr: 'Sprint conditionnement sur terrain complet.', instructions: 'Sprint from baseline to baseline and back. Rest 10 seconds. 6 sprints total.', instructionsFr: 'Sprintz de ligne de fond en ligne de fond. Repos 10s. 6 sprints.', durationSec: 45, targetReps: 6, icon: '🏃‍♂️' },
  { name: 'Defensive Shuttle', nameFr: 'Navette Défensive', category: 'conditioning', difficulty: 'intermediate', description: 'Shuttle run with defensive slides.', descriptionFr: 'Course navette avec glissades défensives.', instructions: 'Sprint to free throw line, back. Sprint to half court, back defensive slide. Sprint to 3pt line, back. 4 sets.', instructionsFr: 'Sprint ligne de lancer, retour. Sprint milieu, retour glissé. 4 séries.', durationSec: 50, targetReps: 8, icon: '🔀' },
  { name: 'Burpee to Sprint', nameFr: 'Burpee à Sprint', category: 'conditioning', difficulty: 'advanced', description: 'Burpees followed by immediate sprint for explosive conditioning.', descriptionFr: 'Burpees suivi de sprint immédiat.', instructions: '1 burpee, immediately sprint 10 meters, jog back. Repeat 8 times. Maximum effort.', instructionsFr: '1 burpee, sprintez 10m immédiatement, revenez en jog. 8 fois.', durationSec: 50, targetReps: 8, icon: '💥' },
]

// ─── Seed Helpers ───────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

/**
 * Seed the admin user if it doesn't already exist.
 * Uses env vars for credentials, with sensible defaults for local dev.
 */
async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@bballai.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!'

  const existing = await db.player.findUnique({ where: { email: adminEmail } })
  if (existing) {
    console.log(`  ✓ Admin user already exists: ${adminEmail}`)
    return
  }

  // Use bcryptjs to hash password (same as the auth module)
  const bcrypt = await import('bcryptjs')
  const hashedPassword = await bcrypt.hash(adminPassword, 12)

  await db.player.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Admin',
      role: 'admin',
      emailVerified: true,
      isOnboarded: true,
      onboarding: true,
    },
  })

  console.log(`  ✓ Created admin user: ${adminEmail}`)
}

/**
 * Seed the default drills if the Drill table is empty.
 */
async function seedDrills() {
  const existingCount = await db.drill.count()
  if (existingCount > 0) {
    console.log(`  ✓ Drills table already has ${existingCount} records, skipping`)
    return
  }

  for (const drill of DRILLS) {
    const id = slugify(drill.name) || `drill-${Math.random().toString(36).slice(2)}`

    await db.drill.upsert({
      where: { id },
      update: drill,
      create: {
        id,
        ...drill,
      },
    })
  }

  console.log(`  ✓ Seeded ${DRILLS.length} default drills`)
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Starting database seed...')
  console.log('')

  try {
    await seedAdmin()
    await seedDrills()

    console.log('')
    const playerCount = await db.player.count()
    const drillCount = await db.drill.count()
    console.log('📊 Seed summary:')
    console.log(`  Players: ${playerCount}`)
    console.log(`  Drills:  ${drillCount}`)
    console.log('')
    console.log('✅ Seed completed successfully')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  }
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0))