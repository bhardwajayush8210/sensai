import { db } from "@/lib/prisma";
import { inngest } from "./client";

// ✅ OpenRouter setup
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export const generateIndustryInsights = inngest.createFunction(
  {
    id: "generate-industry-insights", // ✅ REQUIRED
    name: "Generate Industry Insights",
    triggers: [
      {
        cron: "0 0 * * 0", // ✅ FIXED (inside triggers)
      },
    ],
  },

  async ({ event, step }) => {
    // ✅ Fetch industries
    const industries = await step.run("Fetch industries", async () => {
      return await db.industryInsight.findMany({
        select: { industry: true },
      });
    });

    for (const { industry } of industries) {
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
- Return ONLY JSON
- No markdown
- Include at least 5 roles
- Growth rate must be percentage
- Include at least 5 skills and trends
`;

      // ✅ OpenRouter API call (wrapped safely)
      const res = await step.run(
        `Generate insights for ${industry}`,
        async () => {
          const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
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
            },
          );

          return await response.json();
        },
      );

      try {
        // ✅ Extract + clean response
        const text = res?.choices?.[0]?.message?.content || "";

        const cleanedText = text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        const insights = JSON.parse(cleanedText);

        // ✅ Save to DB
        await step.run(`Update ${industry} insights`, async () => {
          await db.industryInsight.update({
            where: { industry },
            data: {
              ...insights,
              lastUpdated: new Date(),
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        });
      } catch (error) {
        console.error(`❌ Failed for ${industry}:`, error);
      }
    }
  },
);
