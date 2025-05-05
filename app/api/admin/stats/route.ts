import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get total users count
    const totalUsers = await prisma.user.count()

    // Get total quotes count by type
    const [totalFilmQuotes, totalGameQuotes] = await Promise.all([
      prisma.filmQuote.count(),
      prisma.gameQuote.count()
    ])

    // Get recent activity (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    // Get recent game statistics
    const recentGames = await prisma.gameHistory.findMany({
      where: {
        playedAt: {
          gte: oneDayAgo
        }
      },
      select: {
        userId: true,
        score: true
      }
    })

    // Calculate statistics
    const recentActivity = {
      totalGames: recentGames.length,
      uniquePlayers: new Set(recentGames.map(game => game.userId)).size,
      averageScore: recentGames.length > 0 
        ? Math.round(recentGames.reduce((acc, game) => acc + game.score, 0) / recentGames.length) 
        : 0,
      highestScore: recentGames.length > 0 
        ? Math.max(...recentGames.map(game => game.score)) 
        : 0
    }

    return NextResponse.json({
      totalUsers,
      totalFilmQuotes,
      totalGameQuotes,
      recentActivity
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 