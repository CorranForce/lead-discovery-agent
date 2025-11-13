import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Lead discovery and management
  leads: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getUserLeads } = await import("./db");
      return await getUserLeads(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        companyName: z.string().min(1),
        website: z.string().optional(),
        industry: z.string().optional(),
        companySize: z.string().optional(),
        location: z.string().optional(),
        description: z.string().optional(),
        contactName: z.string().optional(),
        contactTitle: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactLinkedin: z.string().url().optional(),
        contactPhone: z.string().optional(),
        notes: z.string().optional(),
        tags: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createLead } = await import("./db");
        return await createLead({
          ...input,
          userId: ctx.user.id,
        });
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getLeadById } = await import("./db");
        return await getLeadById(input.id, ctx.user.id);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        companyName: z.string().min(1).optional(),
        website: z.string().optional(),
        industry: z.string().optional(),
        companySize: z.string().optional(),
        location: z.string().optional(),
        description: z.string().optional(),
        contactName: z.string().optional(),
        contactTitle: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactLinkedin: z.string().url().optional(),
        contactPhone: z.string().optional(),
        status: z.enum(["new", "contacted", "qualified", "unqualified", "converted"]).optional(),
        score: z.number().min(0).max(100).optional(),
        notes: z.string().optional(),
        tags: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const { updateLead } = await import("./db");
        return await updateLead(id, ctx.user.id, updates);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteLead } = await import("./db");
        return await deleteLead(input.id, ctx.user.id);
      }),
    
    discover: protectedProcedure
      .input(z.object({
        query: z.string().min(1),
        industry: z.string().optional(),
        companySize: z.string().optional(),
        location: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const { createSearchHistory } = await import("./db");
        
        // Build the AI prompt for lead discovery
        const systemPrompt = `You are an expert lead generation assistant. Your task is to generate realistic potential leads based on the user's search criteria. 
        
For each lead, provide:
- Company name
- Website URL
- Industry
- Company size (e.g., "1-10", "11-50", "51-200", "201-500", "500+")
- Location
- Brief company description
- Contact person name (decision maker like CEO, CTO, VP Sales)
- Contact title
- Estimated email (use common patterns like firstname.lastname@company.com)
- LinkedIn profile URL pattern

Return exactly 5 leads in valid JSON format as an array of objects.`;
        
        const userPrompt = `Find leads matching: ${input.query}${
          input.industry ? `\nIndustry: ${input.industry}` : ''
        }${
          input.companySize ? `\nCompany Size: ${input.companySize}` : ''
        }${
          input.location ? `\nLocation: ${input.location}` : ''
        }`;
        
        // Call LLM for lead discovery
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "lead_discovery",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  leads: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        companyName: { type: "string" },
                        website: { type: "string" },
                        industry: { type: "string" },
                        companySize: { type: "string" },
                        location: { type: "string" },
                        description: { type: "string" },
                        contactName: { type: "string" },
                        contactTitle: { type: "string" },
                        contactEmail: { type: "string" },
                        contactLinkedin: { type: "string" },
                      },
                      required: ["companyName", "website", "industry", "companySize", "location", "description", "contactName", "contactTitle", "contactEmail", "contactLinkedin"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["leads"],
                additionalProperties: false,
              },
            },
          },
        });
        
        const content = response.choices[0].message.content;
        const result = JSON.parse(typeof content === 'string' ? content : "{}");
        
        // Save search history
        await createSearchHistory({
          userId: ctx.user.id,
          query: input.query,
          filters: JSON.stringify({ industry: input.industry, companySize: input.companySize, location: input.location }),
          resultsCount: result.leads?.length || 0,
        });
        
        return result.leads || [];
      }),
  }),
  
  searchHistory: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const { getUserSearchHistory } = await import("./db");
        return await getUserSearchHistory(ctx.user.id, input.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;
