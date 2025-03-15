import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { hash, compare } from "bcrypt"
import { prisma } from "../../../../lib/prisma"
import { authOptions } from "../../../../lib/auth"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            )
        }

        const body = await req.json()
        const { currentPassword, newPassword } = body

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            )
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { password: true }
        })

        if (!user?.password) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            )
        }

        // Verify current password
        const isValidPassword = await compare(currentPassword, user.password)
        if (!isValidPassword) {
            return NextResponse.json(
                { message: "Current password is incorrect" },
                { status: 400 }
            )
        }

        // Hash new password
        const hashedPassword = await hash(newPassword, 12)

        // Update password in database
        await prisma.user.update({
            where: { email: session.user.email },
            data: { password: hashedPassword }
        })

        return NextResponse.json(
            { message: "Password updated successfully" },
            { status: 200 }
        )
    } catch (error) {
        console.error("[CHANGE_PASSWORD]", error)
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        )
    }
} 