import { MarketplaceService } from '../../services/marketplace.service'

describe('MarketplaceService', () => {
    it('computes creator followers and average rating in creator profile', async () => {
        const creatorRow = {
            id: 'creator-profile-1',
            user_id: 'user-123',
            display_name: 'Coach Prime',
            bio: 'Elite shooting coach',
            avatar_url: 'https://cdn.courtvision.ai/avatar.png',
            verified: true,
            total_earnings: 125000,
            total_sales: 420,
            specialties: ['shooting'],
            credentials: ['FIBA Level 2'],
            created_at: '2026-01-01T00:00:00.000Z',
        }

        const packs = [{ rating: 4.2 }, { rating: 3.8 }, { rating: 5.0 }]

        const supabase = {
            from: jest.fn((table: string) => {
                if (table === 'creator_profiles') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: creatorRow, error: null }),
                    }
                }

                if (table === 'drill_packs') {
                    const query: any = {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn(),
                    }

                    query.eq.mockReturnValueOnce(query)
                    query.eq.mockReturnValueOnce(Promise.resolve({ data: packs, error: null }))
                    return query
                }

                if (table === 'user_follows') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockResolvedValue({ count: 12, error: null }),
                    }
                }

                throw new Error(`Unexpected table: ${table}`)
            }),
        }

        const service = new MarketplaceService(supabase as any)
        const profile = await service.getCreatorProfile('user-123')

        expect(profile).not.toBeNull()
        expect(profile?.followers).toBe(12)
        expect(profile?.publishedPacks).toBe(3)
        expect(profile?.avgRating).toBe(4.3)
        expect(supabase.from).toHaveBeenCalledWith('user_follows')
    })

    it('returns null when creator profile is missing', async () => {
        const supabase = {
            from: jest.fn((table: string) => {
                if (table === 'creator_profiles') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
                    }
                }

                throw new Error(`Unexpected table: ${table}`)
            }),
        }

        const service = new MarketplaceService(supabase as any)
        const profile = await service.getCreatorProfile('missing-user')

        expect(profile).toBeNull()
    })

    it('follows a creator and returns follow state', async () => {
        let userFollowCalls = 0

        const supabase = {
            from: jest.fn((table: string) => {
                if (table === 'creator_profiles') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'creator-1' }, error: null }),
                    }
                }

                if (table === 'user_follows') {
                    userFollowCalls += 1

                    if (userFollowCalls === 1) {
                        return {
                            insert: jest.fn().mockResolvedValue({ error: null }),
                        }
                    }

                    if (userFollowCalls === 2) {
                        return {
                            select: jest.fn().mockReturnThis(),
                            eq: jest.fn().mockReturnThis(),
                            maybeSingle: jest.fn().mockResolvedValue({ data: { follower_id: 'viewer-1' }, error: null }),
                        }
                    }

                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockResolvedValue({ count: 17, error: null }),
                    }
                }

                throw new Error(`Unexpected table: ${table}`)
            }),
        }

        const service = new MarketplaceService(supabase as any)
        const state = await service.followCreator('viewer-1', 'creator-user-1')

        expect(state.isFollowing).toBe(true)
        expect(state.followers).toBe(17)
    })

    it('unfollows a creator and returns follow state', async () => {
        let userFollowCalls = 0

        const supabase = {
            from: jest.fn((table: string) => {
                if (table === 'creator_profiles') {
                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockReturnThis(),
                        maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'creator-1' }, error: null }),
                    }
                }

                if (table === 'user_follows') {
                    userFollowCalls += 1

                    if (userFollowCalls === 1) {
                        const query: any = {
                            delete: jest.fn().mockReturnThis(),
                            eq: jest.fn(),
                        }
                        query.eq.mockReturnValueOnce(query)
                        query.eq.mockReturnValueOnce(Promise.resolve({ error: null }))
                        return query
                    }

                    if (userFollowCalls === 2) {
                        return {
                            select: jest.fn().mockReturnThis(),
                            eq: jest.fn().mockReturnThis(),
                            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                        }
                    }

                    return {
                        select: jest.fn().mockReturnThis(),
                        eq: jest.fn().mockResolvedValue({ count: 16, error: null }),
                    }
                }

                throw new Error(`Unexpected table: ${table}`)
            }),
        }

        const service = new MarketplaceService(supabase as any)
        const state = await service.unfollowCreator('viewer-1', 'creator-user-1')

        expect(state.isFollowing).toBe(false)
        expect(state.followers).toBe(16)
    })
})
