import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const data = await prisma.gameHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { playedAt: "desc" },
  })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { score } = body

  if (typeof score !== "number") {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 })
  }

  const created = await prisma.gameHistory.create({
    data: {
      userId: session.user.id,
      score,
    },
  })

  return NextResponse.json(created, { status: 201 })
}

