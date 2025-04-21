import { NextRequest } from "next/server"
import { createQuestion } from "@/src/server/utils/quizGenerator"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = Number(searchParams.get("type")) as 1 | 2 | 3 | 4

  const question = await createQuestion(type)

  return Response.json(question)
}
