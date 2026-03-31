import { db } from "@/lib/prisma";
import { inngest } from "./client";

// OpenRouter API key
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

export const generateIndustryInsights = inngest.createFunction(
  {
    id: "generate-industry-insights",
    name: "Generate Industry Insights",
    triggers: [
      {
        cron: "0 0 * * 0", // Runs every Sunday (UTC)
      },
    ],
  },

  async ({ step }) => {
    // ✅ Step 1: Fetch industries (if empty, seed default ones)
    const industries = await step.run("Fetch industries", async () => {
      let data = await db.industryInsight.findMany({
        select: { industry: true },
      });

      // 🔥 Auto-seed if empty
      if (data.length === 0) {
        const defaultIndustries = [
          "tech-software-development",
          "finance-banking",
          "healthcare-medical",
          "marketing-digital",
          "design-ux-ui",
        ];

        await db.industryInsight.createMany({
          data: defaultIndustries.map((industry) => ({
            industry,
            salaryRanges: [],
            growthRate: 0,
            demandLevel: "Medium",
            topSkills: [],
            marketOutlook: "Neutral",
            keyTrends: [],
            recommendedSkills: [],
            nextUpdate: new Date(),
          })),
          skipDuplicates: true,
        });

        data = defaultIndustries.map((industry) => ({ industry }));
      }

      return data;
    });

    // ✅ Step 2: Loop industries
    for (const { industry } of industries) {
      const prompt = `
Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format:

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
- Growth rate must be a number (e.g., 12.5 NOT "12%")
- Include at least 5 roles
- Include at least 5 skills and trends
`;

      // ✅ Step 3: Call OpenRouter
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
            }
          );

          return await response.json();
        }
      );

      try {
        // ✅ Step 4: Extract response
        const text = res?.choices?.[0]?.message?.content || "";

        const cleanedText = text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        // ✅ Safe JSON parse
        let insights;
        try {
          insights = JSON.parse(cleanedText);
        } catch (err) {
          console.error(`❌ Invalid JSON for ${industry}:`, cleanedText);
          continue;
        }

        // ✅ Step 5: Save to DB (UPSERT = no crash)
        await step.run(`Upsert ${industry} insights`, async () => {
          await db.industryInsight.upsert({
            where: { industry },
            update: {
              ...insights,
              lastUpdated: new Date(),
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            create: {
              industry,
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

    return { success: true };
  }
);
