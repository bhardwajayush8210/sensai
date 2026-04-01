"use server";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const generateAIInsights = async (industry) => {
  const prompt = `
Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
{
  "salaryRanges": [
    { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
  ],
  "growthRate": number,
  "demandLevel": "High" | "Medium" | "Low",
  "topSkills": ["skill1", "skill2"],
  "marketOutlook": "Positive" | "Neutral" | "Negative",
  "keyTrends": ["trend1", "trend2"],
  "recommendedSkills": ["skill1", "skill2"]
}
IMPORTANT:
- Return ONLY valid JSON
- No markdown, no explanation
- Include at least 5 roles
- Include at least 5 skills and trends
- Growth rate should be a percentage number
`;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    }
  );

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const cleanedText = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleanedText);
  } catch (err) {
    console.error("JSON Parse Error:", cleanedText);
    throw new Error("Failed to parse AI response");
  }
};

export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  if (!user.industry) {
    redirect("/onboarding");
  }

  if (!user.industryInsight) {
    const insights = await generateAIInsights(user.industry);

    if (!insights) throw new Error("Failed to generate insights");

    const industryInsight = await db.industryInsight.create({
      data: {
        industry: user.industry,
        ...insights,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return industryInsight;
  }

  return user.industryInsight;
}
