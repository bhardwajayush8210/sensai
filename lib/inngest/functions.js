import { db } from "@/lib/prisma";
import { inngest } from "./client";

// ✅ Safe env handling
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  throw new Error("❌ OPENROUTER_API_KEY is not set in environment variables");
}

export const generateIndustryInsights = inngest.createFunction(
  {
    id: "generate-industry-insights",
    name: "Generate Industry Insights",
    triggers: [
      {
        cron: "0 0 * * 0", // Sunday (UTC)
      },
    ],
  },

  async ({ step }) => {
    // ✅ Step 1: Fetch or seed industries
    const industries = await step.run("Fetch industries", async () => {
      let data = await db.industryInsight.findMany({
        select: { industry: true },
      });

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

    // ✅ Step 2: Process industries in parallel
    await Promise.all(
      industries.map(({ industry }) =>
        step.run(`Process ${industry}`, async () => {
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

          try {
            // ✅ Step 3: API call with timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

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
                signal: controller.signal,
              }
            );

            clearTimeout(timeout);

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`OpenRouter API error: ${errorText}`);
            }

            const res = await response.json();

            // ✅ Step 4: Extract and clean response
            const text = res?.choices?.[0]?.message?.content || "";

            const cleanedText = text
              .replace(/```json/g, "")
              .replace(/```/g, "")
              .trim();

            const safeText = cleanedText
              .replace(/,\s*}/g, "}")
              .replace(/,\s*]/g, "]");

            let insights;

            try {
              insights = JSON.parse(safeText);
            } catch (err) {
              console.error(`❌ Invalid JSON for ${industry}:`, safeText);
              return;
            }

            // ✅ Step 5: Basic validation
            if (
              !insights.salaryRanges ||
              !Array.isArray(insights.salaryRanges)
            ) {
              console.error(`❌ Invalid structure for ${industry}`);
              return;
            }

            // ✅ Step 6: Save to DB
            await db.industryInsight.upsert({
              where: { industry },
              update: {
                ...insights,
                lastUpdated: new Date(),
                nextUpdate: new Date(
                  Date.now() + 7 * 24 * 60 * 60 * 1000
                ),
              },
              create: {
                industry,
                ...insights,
                lastUpdated: new Date(),
                nextUpdate: new Date(
                  Date.now() + 7 * 24 * 60 * 60 * 1000
                ),
              },
            });
          } catch (error) {
            console.error(`❌ Failed for ${industry}:`, error);
          }
        })
      )
    );

    return { success: true };
  }
);
