import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { trackError } from '@/lib/monitoring'
import crypto from 'crypto'
import { withAuth } from '@/lib/with-auth'

// POST /api/videos/[id]/share — Share a video (generate link, share to feed, share to friends)
export const POST = withAuth(async (_request, session, { params }) => {
  try {

    const { id: videoId } = await params
    const body = await req.json()

    const { action, content, playerIds } = body

    // Verify video ownership
    const video = await db.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        playerId: true,
        title: true,
        isPublic: true,
        thumbnailUrl: true,
        player: {
          select: { name: true, avatar: true },
        },
      },
    })

    if (!video || video.playerId !== session.user.id) {
      return NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 })
    }

    switch (action) {
      case 'generate-link': {
        // Generate a shareable link token
        const token = crypto.randomBytes(16).toString('hex')
        const shareUrl = `${process.env.NEXTAUTH_URL || ''}/share/video/${videoId}?token=${token}`

        // Make video public so it's accessible via link
        await db.video.update({
          where: { id: videoId },
          data: { isPublic: true },
        })

        return NextResponse.json({
          url: shareUrl,
          embedCode: `<iframe src="${shareUrl}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`,
          videoId,
        })
      }

      case 'share-to-feed': {
        // Create a FeedPost for the video
        const postContent = (content || `🏁 ${video.title}`).trim().slice(0, 2000)

        const post = await db.feedPost.create({
          data: {
            playerId: session.user.id,
            content: postContent,
            type: 'video',
            videoId,
          },
        })

        return NextResponse.json({ post }, { status: 201 })
      }

      case 'share-to-friends': {
        // Share video to specific friends (make it visible to them)
        if (!Array.isArray(playerIds) || playerIds.length === 0) {
          return NextResponse.json({ error: 'Liste de joueurs requise' }, { status: 400 })
        }

        // Verify these players are actual friends
        const friendships = await db.friendship.findMany({
          where: {
            status: 'accepted',
            OR: [
              { requesterId: session.user.id, recipientId: { in: playerIds } },
              { recipientId: session.user.id, requesterId: { in: playerIds } },
            ],
          },
        })

        const friendIds = friendships.map(f =>
          f.requesterId === session.user.id ? f.recipientId : f.requesterId
        )

        // Make video temporarily public and track which friends can see it
        // For simplicity, we just make it public (fine-grained sharing would need a separate table)
        await db.video.update({
          where: { id: videoId },
          data: { isPublic: true },
        })

        return NextResponse.json({
          sharedWith: friendIds,
          count: friendIds.length,
        })
      }

      default:
        return NextResponse.json({ error: 'Action invalide. Actions: generate-link, share-to-feed, share-to-friends' }, { status: 400 })
    }
  } catch (error) {
    trackError('[POST /api/videos/[id]/share]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
