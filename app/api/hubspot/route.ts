import { NextResponse } from "next/server"
import { upsertContact } from "@/lib/hubspot"

export async function POST(request: Request) {
  const body = await request.json()
  const email = body.email

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  try {
    const fullName = body.name || body.firstName || ""
    const [firstName, ...rest] = fullName.trim().split(" ")
    const lastName = rest.join(" ")

    const contact = await upsertContact({
      email,
      firstname: firstName || undefined,
      lastname: lastName || undefined,
      phone: body.phone,
      company: body.company,
      city: body.city,
      lifecyclestage: body.lifecycleStage || "lead",
      fitness_goals: body.fitness_goals || body.fitnessGoals,
      fitness_level: body.fitness_level || body.fitnessLevel,
      trust_score: body.trust_score ?? body.trustScore,
    })

    return NextResponse.json({ success: true, contact })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "HubSpot request failed" },
      { status: 500 },
    )
  }
}
