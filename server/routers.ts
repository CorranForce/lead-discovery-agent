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
  
  // Account management
  account: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const { getUserByOpenId } = await import("./db");
      return await getUserByOpenId(ctx.user.openId);
    }),
    
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        bio: z.string().optional(),
        company: z.string().optional(),
        jobTitle: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        location: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(users)
          .set(input)
          .where(eq(users.openId, ctx.user.openId));
        
        return { success: true };
      }),
    
    updatePreferences: protectedProcedure
      .input(z.object({
        emailNotifications: z.number().min(0).max(1).optional(),
        timezone: z.string().optional(),
        useRealData: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(users)
          .set(input)
          .where(eq(users.openId, ctx.user.openId));
        
        return { success: true };
      }),
    
    getStats: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const { leads, conversations, sentEmails } = await import("../drizzle/schema");
      const { eq, count } = await import("drizzle-orm");
      
      const db = await getDb();
      if (!db) return { totalLeads: 0, totalConversations: 0, totalEmails: 0 };
      
      const [leadsCount] = await db.select({ count: count() })
        .from(leads)
        .where(eq(leads.userId, ctx.user.id));
      
      const [conversationsCount] = await db.select({ count: count() })
        .from(conversations)
        .where(eq(conversations.userId, ctx.user.id));
      
      const [emailsCount] = await db.select({ count: count() })
        .from(sentEmails)
        .where(eq(sentEmails.userId, ctx.user.id));
      
      return {
        totalLeads: leadsCount.count,
        totalConversations: conversationsCount.count,
        totalEmails: emailsCount.count,
      };
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
        const { calculateLeadScore } = await import("./leadScoring");
        
        // Calculate initial lead score
        const tempLead = {
          ...input,
          userId: ctx.user.id,
          status: "new" as const,
          score: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;
        
        const scoringResult = calculateLeadScore(tempLead, 0, 0);
        
        return await createLead({
          ...input,
          userId: ctx.user.id,
          score: scoringResult.score,
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
        const { updateLead, getLeadById, getLeadEmailClicks, getLeadEmailOpens, updateLeadScore } = await import("./db");
        const { calculateLeadScore } = await import("./leadScoring");
        
        // Update the lead
        const result = await updateLead(id, ctx.user.id, updates);
        
        // Automatically recalculate score if status or contact info changed
        const shouldRecalculateScore = updates.status || updates.contactEmail || 
          updates.contactPhone || updates.contactLinkedin || updates.contactName || updates.contactTitle;
        
        if (shouldRecalculateScore) {
          try {
            const lead = await getLeadById(id, ctx.user.id);
            if (lead) {
              const clicks = await getLeadEmailClicks(id);
              const opens = await getLeadEmailOpens(id);
              const emailClicks = clicks.length;
              const emailOpens = opens.length;
              
              const scoringResult = calculateLeadScore(lead, emailOpens, emailClicks);
              await updateLeadScore(id, scoringResult.score);
              console.log(`[Score Update] Lead ${id} score updated to ${scoringResult.score} after update`);
            }
          } catch (error) {
            console.error(`[Score Update] Failed to update score for lead ${id}:`, error);
            // Don't fail the mutation if score update fails
          }
        }
        
        return result;
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteLead } = await import("./db");
        return await deleteLead(input.id, ctx.user.id);
      }),
    
    recalculateScore: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getLeadById, updateLead } = await import("./db");
        const { calculateLeadScore } = await import("./leadScoring");
        const { getLeadEmailClicks } = await import("./db");
        
        // Get the lead
        const lead = await getLeadById(input.id, ctx.user.id);
        if (!lead) {
          throw new Error("Lead not found");
        }
        
        // Get engagement data
        const clicks = await getLeadEmailClicks(input.id);
        const emailClicks = clicks.length;
        
        // TODO: Get email opens count when available
        const emailOpens = 0;
        
        // Calculate new score
        const scoringResult = calculateLeadScore(lead, emailOpens, emailClicks);
        
        // Update lead with new score
        await updateLead(input.id, ctx.user.id, { score: scoringResult.score });
        
        return scoringResult;
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
        const { searchOrganizations, convertApolloOrgToLead } = await import("./apollo");
        
        // Check if user wants real data from Apollo.io
        const useRealData = ctx.user.useRealData === 1;
        
        if (useRealData) {
          // Use Apollo.io API for real data
          try {
            const apolloResult = await searchOrganizations({
              query: input.query,
              industry: input.industry,
              companySize: input.companySize,
              location: input.location,
              perPage: 5,
            });
            
            const leads = apolloResult.organizations.map(convertApolloOrgToLead);
            
            // Save search history
            await createSearchHistory({
              userId: ctx.user.id,
              query: input.query,
              industry: input.industry || null,
              companySize: input.companySize || null,
              location: input.location || null,
              filters: JSON.stringify({ industry: input.industry, companySize: input.companySize, location: input.location }),
              resultsCount: leads.length,
            });
            
            return leads;
          } catch (error) {
            console.error("[Apollo API] Error:", error);
            throw new Error("Failed to fetch real lead data from Apollo.io. Please check your API key and try again.");
          }
        }
        
        // Fall back to AI-generated template data
        
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
- LinkedIn profile URL (use realistic format: https://www.linkedin.com/in/firstname-lastname or leave as placeholder text 'LinkedIn Profile' if uncertain)

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
          industry: input.industry || null,
          companySize: input.companySize || null,
          location: input.location || null,
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
    
    // Get only favorite searches
    favorites: protectedProcedure.query(async ({ ctx }) => {
      const { getUserFavoriteSearches } = await import("./db");
      return await getUserFavoriteSearches(ctx.user.id);
    }),
    
    // Toggle favorite status
    toggleFavorite: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { toggleSearchFavorite } = await import("./db");
        const isFavorite = await toggleSearchFavorite(input.id, ctx.user.id);
        return { isFavorite };
      }),
    
    // Delete a single search history entry
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteSearchHistory } = await import("./db");
        await deleteSearchHistory(input.id, ctx.user.id);
        return { success: true };
      }),
    
    // Clear all search history (optionally keep favorites)
    clear: protectedProcedure
      .input(z.object({ keepFavorites: z.boolean().default(true) }))
      .mutation(async ({ ctx, input }) => {
        const { clearUserSearchHistory } = await import("./db");
        await clearUserSearchHistory(ctx.user.id, input.keepFavorites);
        return { success: true };
      }),
  }),
  
  // Sales conversations
  conversations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getUserConversations } = await import("./db");
      return await getUserConversations(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        leadId: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createConversation } = await import("./db");
        return await createConversation({
          ...input,
          userId: ctx.user.id,
        });
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getConversationById } = await import("./db");
        return await getConversationById(input.id, ctx.user.id);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        status: z.enum(["active", "closed", "follow_up_needed", "won", "lost"]).optional(),
        sentiment: z.string().optional(),
        summary: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const { updateConversation } = await import("./db");
        return await updateConversation(id, ctx.user.id, updates);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteConversation } = await import("./db");
        return await deleteConversation(input.id, ctx.user.id);
      }),
  }),
  
  // Messages in conversations
  messages: router({
    list: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getConversationMessages, getConversationById } = await import("./db");
        
        // Verify user owns the conversation
        const conversation = await getConversationById(input.conversationId, ctx.user.id);
        if (!conversation) {
          throw new Error("Conversation not found or access denied");
        }
        
        return await getConversationMessages(input.conversationId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        role: z.enum(["user", "lead", "ai_suggestion"]),
        content: z.string().min(1),
        metadata: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createMessage, getConversationById } = await import("./db");
        
        // Verify user owns the conversation
        const conversation = await getConversationById(input.conversationId, ctx.user.id);
        if (!conversation) {
          throw new Error("Conversation not found or access denied");
        }
        
        return await createMessage(input);
      }),
    
    getAISuggestion: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        context: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getConversationMessages, getConversationById } = await import("./db");
        const { invokeLLM } = await import("./_core/llm");
        
        // Verify user owns the conversation
        const conversation = await getConversationById(input.conversationId, ctx.user.id);
        if (!conversation) {
          throw new Error("Conversation not found or access denied");
        }
        
        // Get conversation history
        const messageHistory = await getConversationMessages(input.conversationId);
        
        // Build context for AI
        const conversationContext = messageHistory
          .filter(m => m.role !== "ai_suggestion")
          .map(m => `${m.role === "user" ? "You" : "Lead"}: ${m.content}`)
          .join("\n");
        
        const systemPrompt = `You are an expert sales assistant helping a sales professional engage with a lead. 
Analyze the conversation and provide:
1. A suggested response that moves the conversation forward
2. Objection handling if the lead raised concerns
3. Next best action recommendations

Be professional, empathetic, and focused on building trust.`;
        
        const userPrompt = `Conversation so far:\n${conversationContext}\n\nAdditional context: ${input.context || "None"}\n\nProvide a suggested response and strategy.`;
        
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });
        
        const content = response.choices[0].message.content;
        const suggestion = typeof content === 'string' ? content : "";
        
        return { suggestion };
      }),
  }),
  
  // Conversation templates
  templates: router({
    listPublic: protectedProcedure.query(async () => {
      const { getPublicTemplates } = await import("./db");
      return await getPublicTemplates();
    }),
    
    listUser: protectedProcedure.query(async ({ ctx }) => {
      const { getUserTemplates } = await import("./db");
      return await getUserTemplates(ctx.user.id);
    }),
  }),
  
  // Email functionality
  email: router({
    // List email templates
    listTemplates: protectedProcedure.query(async ({ ctx }) => {
      const { getPublicEmailTemplates, getUserEmailTemplates } = await import("./db");
      const publicTemplates = await getPublicEmailTemplates();
      const userTemplates = await getUserEmailTemplates(ctx.user.id);
      return [...publicTemplates, ...userTemplates];
    }),
    
    // Send email using Gmail MCP
    send: protectedProcedure
      .input(z.object({
        to: z.string().email(),
        subject: z.string().min(1),
        body: z.string().min(1),
        leadId: z.number().optional(),
        conversationId: z.number().optional(),
        templateId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createSentEmail } = await import("./db");
        const { exec } = await import("child_process");
        const { promisify } = await import("util");
        const execAsync = promisify(exec);
        
        try {
          // First, save the email to get the sentEmailId
          const sentEmailResult = await createSentEmail({
            userId: ctx.user.id,
            leadId: input.leadId,
            conversationId: input.conversationId,
            templateId: input.templateId,
            recipientEmail: input.to,
            subject: input.subject,
            body: input.body,
            status: "sent",
          });
          
          // Get the inserted email ID (type assertion for MySQL result)
          const sentEmailId = (sentEmailResult as any).insertId || 0;
          
          // Wrap links with tracking URLs
          const { wrapLinksWithTracking } = await import("./linkTracker");
          let trackedBody = wrapLinksWithTracking(input.body, sentEmailId, input.leadId);
          
          // Embed tracking pixel for open tracking
          const { embedTrackingPixel, generateTrackingPixelUrl } = await import("./openTracker");
          const trackingPixelUrl = generateTrackingPixelUrl(
            process.env.VITE_FRONTEND_FORGE_API_URL || "http://localhost:3000",
            sentEmailId,
            input.leadId
          );
          trackedBody = embedTrackingPixel(trackedBody, trackingPixelUrl);
          
          // Prepare email data for Gmail MCP (correct format)
          const emailData = {
            messages: [
              {
                to: [input.to],
                subject: input.subject,
                content: trackedBody,
              }
            ]
          };
          
          // Call Gmail MCP to send email
          const mcpCommand = `manus-mcp-cli tool call gmail_send_messages --server gmail --input '${JSON.stringify(emailData).replace(/'/g, "'\\'")}' 2>&1`;
          const { stdout } = await execAsync(mcpCommand);
          
          let gmailMessageId = null;
          try {
            // Parse the MCP response
            const lines = stdout.split('\n');
            const contentLine = lines.find(line => line.includes('"content"'));
            if (contentLine) {
              const match = contentLine.match(/"id":\s*"([^"]+)"/);
              if (match) {
                gmailMessageId = match[1];
              }
            }
          } catch (e) {
            // If we can't parse the response, that's okay
          }
          
          // Update with Gmail message ID if available
          if (gmailMessageId && sentEmailId) {
            const { getDb } = await import("./db");
            const db = await getDb();
            if (db) {
              const { sentEmails } = await import("../drizzle/schema");
              const { eq } = await import("drizzle-orm");
              await db.update(sentEmails)
                .set({ gmailMessageId })
                .where(eq(sentEmails.id, sentEmailId));
            }
          }
          
          return { success: true, messageId: gmailMessageId };
        } catch (error: any) {
          // Track failed email
          await createSentEmail({
            userId: ctx.user.id,
            leadId: input.leadId,
            conversationId: input.conversationId,
            templateId: input.templateId,
            recipientEmail: input.to,
            subject: input.subject,
            body: input.body,
            status: "failed",
          });
          
          throw new Error(`Failed to send email: ${error.message}`);
        }
      }),
    
    // Get sent email history
    history: protectedProcedure
      .input(z.object({ 
        leadId: z.number().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getUserSentEmails, getLeadSentEmails } = await import("./db");
        
        if (input.leadId) {
          return await getLeadSentEmails(input.leadId);
        }
        
        return await getUserSentEmails(ctx.user.id, input.limit);
      }),
    
    // Get engagement overview statistics
    engagementOverview: protectedProcedure
      .input(z.object({
        dateRange: z.enum(['7d', '30d', '90d', 'all']).optional(),
        templateId: z.number().optional(),
        sequenceId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { sentEmails, emailOpens, emailClicks } = await import("../drizzle/schema");
        const { eq, and, gte, sql } = await import("drizzle-orm");
        
        const db = await getDb();
        if (!db) return { totalSent: 0, totalOpens: 0, totalClicks: 0, openRate: 0, clickRate: 0 };
        
        // Calculate date threshold
        let dateThreshold: Date | null = null;
        if (input.dateRange && input.dateRange !== 'all') {
          const days = parseInt(input.dateRange);
          dateThreshold = new Date();
          dateThreshold.setDate(dateThreshold.getDate() - days);
        }
        
        // Build where conditions
        const conditions = [eq(sentEmails.userId, ctx.user.id)];
        if (dateThreshold) {
          conditions.push(gte(sentEmails.sentAt, dateThreshold));
        }
        if (input.templateId) {
          conditions.push(eq(sentEmails.templateId, input.templateId));
        }
        if (input.sequenceId) {
          conditions.push(eq(sentEmails.sequenceId, input.sequenceId));
        }
        
        // Get total sent emails
        const [sentResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(sentEmails)
          .where(and(...conditions));
        
        const totalSent = Number(sentResult?.count || 0);
        
        // Get unique opens count
        const [opensResult] = await db
          .select({ count: sql<number>`count(distinct ${emailOpens.sentEmailId})` })
          .from(emailOpens)
          .leftJoin(sentEmails, eq(emailOpens.sentEmailId, sentEmails.id))
          .where(and(...conditions));
        
        const totalOpens = Number(opensResult?.count || 0);
        
        // Get unique clicks count
        const [clicksResult] = await db
          .select({ count: sql<number>`count(distinct ${emailClicks.sentEmailId})` })
          .from(emailClicks)
          .leftJoin(sentEmails, eq(emailClicks.sentEmailId, sentEmails.id))
          .where(and(...conditions));
        
        const totalClicks = Number(clicksResult?.count || 0);
        
        const openRate = totalSent > 0 ? (totalOpens / totalSent) * 100 : 0;
        const clickRate = totalSent > 0 ? (totalClicks / totalSent) * 100 : 0;
        
        return {
          totalSent,
          totalOpens,
          totalClicks,
          openRate: Math.round(openRate * 10) / 10,
          clickRate: Math.round(clickRate * 10) / 10,
        };
      }),
    
    // Get engagement trends over time
    engagementTrends: protectedProcedure
      .input(z.object({
        dateRange: z.enum(['7d', '30d', '90d']).default('30d'),
      }))
      .query(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { sentEmails, emailOpens, emailClicks } = await import("../drizzle/schema");
        const { eq, and, gte, sql } = await import("drizzle-orm");
        
        const db = await getDb();
        if (!db) return [];
        
        const days = parseInt(input.dateRange);
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);
        
        // Get daily aggregates
        const trends = await db
          .select({
            date: sql<string>`DATE(${sentEmails.sentAt})`,
            sent: sql<number>`count(*)`,
            opens: sql<number>`count(distinct ${emailOpens.sentEmailId})`,
            clicks: sql<number>`count(distinct ${emailClicks.sentEmailId})`,
          })
          .from(sentEmails)
          .leftJoin(emailOpens, eq(sentEmails.id, emailOpens.sentEmailId))
          .leftJoin(emailClicks, eq(sentEmails.id, emailClicks.sentEmailId))
          .where(and(
            eq(sentEmails.userId, ctx.user.id),
            gte(sentEmails.sentAt, dateThreshold)
          ))
          .groupBy(sql`DATE(${sentEmails.sentAt})`);
        
        return trends.map(t => ({
          date: t.date,
          sent: Number(t.sent),
          opens: Number(t.opens),
          clicks: Number(t.clicks),
        }));
      }),
    
    // Get template performance comparison
    templatePerformance: protectedProcedure
      .input(z.object({
        dateRange: z.enum(['7d', '30d', '90d', 'all']).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { sentEmails, emailOpens, emailClicks, emailTemplates } = await import("../drizzle/schema");
        const { eq, and, gte, sql, isNotNull } = await import("drizzle-orm");
        
        const db = await getDb();
        if (!db) return [];
        
        // Calculate date threshold
        let dateThreshold: Date | null = null;
        if (input.dateRange && input.dateRange !== 'all') {
          const days = parseInt(input.dateRange);
          dateThreshold = new Date();
          dateThreshold.setDate(dateThreshold.getDate() - days);
        }
        
        const conditions = [
          eq(sentEmails.userId, ctx.user.id),
          isNotNull(sentEmails.templateId)
        ];
        if (dateThreshold) {
          conditions.push(gte(sentEmails.sentAt, dateThreshold));
        }
        
        const performance = await db
          .select({
            templateId: sentEmails.templateId,
            templateName: emailTemplates.name,
            sent: sql<number>`count(*)`,
            opens: sql<number>`count(distinct ${emailOpens.sentEmailId})`,
            clicks: sql<number>`count(distinct ${emailClicks.sentEmailId})`,
          })
          .from(sentEmails)
          .leftJoin(emailTemplates, eq(sentEmails.templateId, emailTemplates.id))
          .leftJoin(emailOpens, eq(sentEmails.id, emailOpens.sentEmailId))
          .leftJoin(emailClicks, eq(sentEmails.id, emailClicks.sentEmailId))
          .where(and(...conditions))
          .groupBy(sentEmails.templateId, emailTemplates.name);
        
        return performance.map(p => {
          const sent = Number(p.sent);
          const opens = Number(p.opens);
          const clicks = Number(p.clicks);
          return {
            templateId: p.templateId,
            templateName: p.templateName || 'Unnamed Template',
            sent,
            opens,
            clicks,
            openRate: sent > 0 ? Math.round((opens / sent) * 1000) / 10 : 0,
            clickRate: sent > 0 ? Math.round((clicks / sent) * 1000) / 10 : 0,
          };
        });
      }),
    
    // Get sequence performance breakdown
    sequencePerformance: protectedProcedure
      .input(z.object({
        dateRange: z.enum(['7d', '30d', '90d', 'all']).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { sentEmails, emailOpens, emailClicks, emailSequences } = await import("../drizzle/schema");
        const { eq, and, gte, sql, isNotNull } = await import("drizzle-orm");
        
        const db = await getDb();
        if (!db) return [];
        
        // Calculate date threshold
        let dateThreshold: Date | null = null;
        if (input.dateRange && input.dateRange !== 'all') {
          const days = parseInt(input.dateRange);
          dateThreshold = new Date();
          dateThreshold.setDate(dateThreshold.getDate() - days);
        }
        
        const conditions = [
          eq(sentEmails.userId, ctx.user.id),
          isNotNull(sentEmails.sequenceId)
        ];
        if (dateThreshold) {
          conditions.push(gte(sentEmails.sentAt, dateThreshold));
        }
        
        const performance = await db
          .select({
            sequenceId: sentEmails.sequenceId,
            sequenceName: emailSequences.name,
            sent: sql<number>`count(*)`,
            opens: sql<number>`count(distinct ${emailOpens.sentEmailId})`,
            clicks: sql<number>`count(distinct ${emailClicks.sentEmailId})`,
          })
          .from(sentEmails)
          .leftJoin(emailSequences, eq(sentEmails.sequenceId, emailSequences.id))
          .leftJoin(emailOpens, eq(sentEmails.id, emailOpens.sentEmailId))
          .leftJoin(emailClicks, eq(sentEmails.id, emailClicks.sentEmailId))
          .where(and(...conditions))
          .groupBy(sentEmails.sequenceId, emailSequences.name);
        
        return performance.map(p => {
          const sent = Number(p.sent);
          const opens = Number(p.opens);
          const clicks = Number(p.clicks);
          return {
            sequenceId: p.sequenceId,
            sequenceName: p.sequenceName || 'Unnamed Sequence',
            sent,
            opens,
            clicks,
            openRate: sent > 0 ? Math.round((opens / sent) * 1000) / 10 : 0,
            clickRate: sent > 0 ? Math.round((clicks / sent) * 1000) / 10 : 0,
          };
        });
      }),
  }),

  // Email Sequences
  sequences: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getSequencesByUser } = await import("./db");
      return await getSequencesByUser(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        triggerType: z.enum(["manual", "status_change", "time_based"]),
        triggerCondition: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { emailSequences } = await import("../drizzle/schema");
        
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [sequence] = await db.insert(emailSequences).values({
          userId: ctx.user.id,
          name: input.name,
          description: input.description || null,
          triggerType: input.triggerType,
          triggerCondition: input.triggerCondition || null,
        }).$returningId();
        
        return sequence;
      }),

    getSteps: protectedProcedure
      .input(z.object({ sequenceId: z.number() }))
      .query(async ({ input }) => {
        const { getSequenceSteps } = await import("./db");
        return await getSequenceSteps(input.sequenceId);
      }),

    addStep: protectedProcedure
      .input(z.object({
        sequenceId: z.number(),
        stepOrder: z.number(),
        templateId: z.number().optional(),
        subject: z.string(),
        body: z.string(),
        delayDays: z.number().default(0),
        delayHours: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { sequenceSteps } = await import("../drizzle/schema");
        
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.insert(sequenceSteps).values({
          sequenceId: input.sequenceId,
          stepOrder: input.stepOrder,
          templateId: input.templateId || null,
          subject: input.subject,
          body: input.body,
          delayDays: input.delayDays,
          delayHours: input.delayHours,
        });
        
        return { success: true };
      }),

    enrollLead: protectedProcedure
      .input(z.object({
        sequenceId: z.number(),
        leadId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { getDb, getSequenceSteps } = await import("./db");
        const { sequenceEnrollments } = await import("../drizzle/schema");
        
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Get first step to calculate next email time
        const steps = await getSequenceSteps(input.sequenceId);
        const firstStep = steps[0];
        
        const now = new Date();
        const nextEmailTime = firstStep 
          ? new Date(now.getTime() + ((firstStep.delayDays || 0) * 24 * 60 * 60 * 1000) + ((firstStep.delayHours || 0) * 60 * 60 * 1000))
          : now;
        
        await db.insert(sequenceEnrollments).values({
          sequenceId: input.sequenceId,
          leadId: input.leadId,
          currentStep: 0,
          status: "active",
          nextEmailScheduledAt: nextEmailTime,
        });
        
        return { success: true };
      }),

    getEnrollments: protectedProcedure
      .input(z.object({ sequenceId: z.number() }))
      .query(async ({ input }) => {
        const { getSequenceEnrollments } = await import("./db");
        return await getSequenceEnrollments(input.sequenceId);
      }),

    toggleActive: protectedProcedure
      .input(z.object({
        sequenceId: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { emailSequences } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(emailSequences)
          .set({ isActive: input.isActive ? 1 : 0 })
          .where(eq(emailSequences.id, input.sequenceId));
        
        return { success: true };
      }),
  }),

  // Click tracking analytics
  clicks: router({
    // Get all clicks for user's emails
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getAllEmailClicks } = await import("./db");
      return await getAllEmailClicks(ctx.user.id);
    }),
    
    // Get clicks for a specific email
    byEmail: protectedProcedure
      .input(z.object({ sentEmailId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getEmailClicks } = await import("./db");
        return await getEmailClicks(input.sentEmailId);
      }),
    
    // Get clicks for a specific lead
    byLead: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getLeadEmailClicks } = await import("./db");
        return await getLeadEmailClicks(input.leadId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
