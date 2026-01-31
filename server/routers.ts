import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { billingRouter } from "./routers/billing";

import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    signup: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hashPassword, validatePasswordStrength, validateEmail } = await import("./_core/password");
        const { getUserByEmail } = await import("./db");
        const { getDb } = await import("./db");
        const { users } = await import("../drizzle/schema");
        const jwt = await import("jsonwebtoken");
        const { ENV } = await import("./_core/env");
        
        // Validate email
        const emailValidation = validateEmail(input.email);
        if (!emailValidation.isValid) {
          throw new Error(emailValidation.error);
        }
        
        // Validate password strength
        const passwordValidation = validatePasswordStrength(input.password);
        if (!passwordValidation.isValid) {
          throw new Error(passwordValidation.error);
        }
        
        // Check if user already exists
        const existingUser = await getUserByEmail(input.email);
        if (existingUser) {
          throw new Error("An account with this email already exists");
        }
        
        // Hash password
        const passwordHash = await hashPassword(input.password);
        
        // Create user
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const result = await db.insert(users).values({
          email: input.email,
          passwordHash,
          name: input.name || null,
          loginMethod: "email",
          role: "user",
        });
        
        const userId = Number(result[0].insertId);
        
        // Get the created user
        const { getUserById } = await import("./db");
        const user = await getUserById(userId);
        if (!user) throw new Error("Failed to create user");
        
        // Send email verification
        const { createEmailVerificationToken } = await import("./services/emailVerification");
        await createEmailVerificationToken(user.id, user.email!, user.name || undefined);
        
        // Create session token
        const token = jwt.default.sign(
          { userId: user.id, email: user.email },
          ENV.jwtSecret,
          { expiresIn: "30d" }
        );
        
        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
        
        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          message: "Account created! Please check your email to verify your address.",
        };
      }),
    
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { verifyPassword } = await import("./_core/password");
        const { getUserByEmail } = await import("./db");
        const jwt = await import("jsonwebtoken");
        const { ENV } = await import("./_core/env");
        
        // Get user by email
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password");
        }
        
        // Verify password
        const isValid = await verifyPassword(input.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Invalid email or password");
        }
        
        // Create session token
        const token = jwt.default.sign(
          { userId: user.id, email: user.email },
          ENV.jwtSecret,
          { expiresIn: "30d" }
        );
        
        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
        
        // Update last signed in
        const { getDb } = await import("./db");
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        const db = await getDb();
        if (db) {
          await db.update(users)
            .set({ lastSignedIn: new Date() })
            .where(eq(users.id, user.id));
        }
        
        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        };
      }),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    
    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const { createPasswordResetToken } = await import("./services/passwordReset");
        return await createPasswordResetToken(input.email);
      }),
    
    verifyResetToken: publicProcedure
      .input(z.object({
        token: z.string(),
      }))
      .query(async ({ input }) => {
        const { verifyResetToken } = await import("./services/passwordReset");
        return await verifyResetToken(input.token);
      }),
    
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        const { verifyResetToken, markTokenAsUsed } = await import("./services/passwordReset");
        const { hashPassword, validatePasswordStrength } = await import("./_core/password");
        const { getDb } = await import("./db");
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        // Validate password strength
        const passwordValidation = validatePasswordStrength(input.newPassword);
        if (!passwordValidation.isValid) {
          throw new Error(passwordValidation.error);
        }
        
        // Verify token
        const tokenVerification = await verifyResetToken(input.token);
        if (!tokenVerification.valid || !tokenVerification.userId) {
          throw new Error("Invalid or expired reset token");
        }
        
        // Hash new password
        const passwordHash = await hashPassword(input.newPassword);
        
        // Update user password
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.update(users)
          .set({ passwordHash })
          .where(eq(users.id, tokenVerification.userId));
        
        // Mark token as used
        await markTokenAsUsed(input.token);
        
        return {
          success: true,
          message: "Password reset successfully",
        };
      }),
    
    verifyEmail: publicProcedure
      .input(z.object({
        token: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { verifyEmailToken, markEmailAsVerified } = await import("./services/emailVerification");
        
        // Verify token
        const tokenVerification = await verifyEmailToken(input.token);
        if (!tokenVerification.valid || !tokenVerification.userId) {
          throw new Error("Invalid or expired verification token");
        }
        
        // Mark email as verified
        await markEmailAsVerified(input.token, tokenVerification.userId);
        
        return {
          success: true,
          message: "Email verified successfully",
        };
      }),
    
    resendVerification: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { resendVerificationEmail } = await import("./services/emailVerification");
        return await resendVerificationEmail(ctx.user.id);
      }),
    
    checkEmailVerification: protectedProcedure
      .query(async ({ ctx }) => {
        const { isEmailVerified } = await import("./services/emailVerification");
        const verified = await isEmailVerified(ctx.user.id);
        return { verified };
      }),
  }),
  
  // Account management
  account: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      // User is already loaded in context
      return ctx.user;
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
          .where(eq(users.id, ctx.user.id));
        
        return { success: true };
      }),
    
    updatePreferences: protectedProcedure
      .input(z.object({
        emailNotifications: z.number().min(0).max(1).optional(),
        notifyOnSuccess: z.number().min(0).max(1).optional(),
        notifyOnFailure: z.number().min(0).max(1).optional(),
        notifyOnPartial: z.number().min(0).max(1).optional(),
        batchNotifications: z.number().min(0).max(1).optional(),
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
          .where(eq(users.id, ctx.user.id));
        
        return { success: true };
      }),
    
    getStats: protectedProcedure.query(async ({ ctx }) => {
      // Check if test mode is enabled (useRealData = 0 means test mode)
      const useTestData = ctx.user.useRealData !== 1;
      
      if (useTestData) {
        const { getTestData } = await import("./services/testData");
        const testData = getTestData();
        return {
          totalLeads: testData.leads.length,
          totalConversations: testData.conversations.length,
          totalEmails: testData.analytics.emailsSent,
        };
      }
      
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
      // Check if test mode is enabled
      const useTestData = ctx.user.useRealData !== 1;
      
      if (useTestData) {
        const { getTestData } = await import("./services/testData");
        const testData = getTestData();
        // Transform test leads to match expected format
        return testData.leads.map(lead => ({
          id: lead.id,
          userId: ctx.user.id,
          companyName: lead.companyName,
          website: lead.website,
          industry: lead.industry,
          companySize: `${lead.employeeCount} employees`,
          location: lead.location,
          description: `${lead.industry} company with ${lead.revenue} revenue`,
          contactName: lead.contactName,
          contactTitle: lead.contactTitle,
          contactEmail: lead.contactEmail,
          contactLinkedin: lead.linkedinUrl,
          contactPhone: lead.contactPhone,
          status: lead.status,
          score: lead.score,
          notes: lead.notes,
          tags: lead.industry,
          createdAt: lead.createdAt,
          updatedAt: lead.createdAt,
        }));
      }
      
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
        
        const result = await createLead({
          ...input,
          userId: ctx.user.id,
          score: scoringResult.score,
        });
        
        // Send welcome email if contact email is provided and welcome email automation is enabled
        if (input.contactEmail && input.contactName) {
          const { sendWelcomeEmail } = await import("./services/welcomeEmail");
          const { getDb } = await import("./db");
          const { leads } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          
          // Check if user has welcome email automation enabled (default: enabled)
          const shouldSendWelcome = ctx.user.emailNotifications !== 0; // Reuse emailNotifications setting
          
          if (shouldSendWelcome) {
            try {
              const emailResult = await sendWelcomeEmail({
                to: input.contactEmail,
                leadName: input.contactName,
                leadCompany: input.companyName,
              });
              
              if (emailResult.success) {
                // Mark welcome email as sent
                const db = await getDb();
                if (db) {
                  const insertId = (result as any).insertId;
                  await db.update(leads)
                    .set({ welcomeEmailSent: 1 })
                    .where(eq(leads.id, insertId));
                  
                  // Schedule follow-up email sequence
                  const { scheduleFollowUpEmails } = await import("./services/emailSequenceScheduler");
                  await scheduleFollowUpEmails(insertId);
                }
                console.log(`[Welcome Email] Sent to ${input.contactEmail}`);
              }
            } catch (error) {
              console.error("[Welcome Email] Failed to send:", error);
              // Don't fail the lead creation if email fails
            }
          }
        }
        
        return result;
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
    
    engagementTimeline: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        const { getLeadEngagementTimeline } = await import("./engagementTimeline");
        return await getLeadEngagementTimeline(input.leadId);
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
            
            // Send lead notification email if enabled and leads were found
            if (ctx.user.emailNotifications === 1 && leads.length > 0 && ctx.user.email) {
              try {
                const { sendLeadNotificationEmail } = await import("./services/email");
                const firstLead = leads[0];
                await sendLeadNotificationEmail(
                  ctx.user.email,
                  ctx.user.name || "there",
                  firstLead.contactName,
                  firstLead.companyName,
                  firstLead.contactEmail || undefined
                );
                console.log("[Lead Discovery] Notification email sent to", ctx.user.email);
              } catch (emailError) {
                console.error("[Lead Discovery] Failed to send notification email:", emailError);
              }
            }
            
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
        
        // Send lead notification email if enabled and leads were found
        const leads = result.leads || [];
        if (ctx.user.emailNotifications === 1 && leads.length > 0 && ctx.user.email) {
          try {
            const { sendLeadNotificationEmail } = await import("./services/email");
            const firstLead = leads[0];
            await sendLeadNotificationEmail(
              ctx.user.email,
              ctx.user.name || "there",
              firstLead.contactName,
              firstLead.companyName,
              firstLead.contactEmail || undefined
            );
            console.log("[Lead Discovery] Notification email sent to", ctx.user.email);
          } catch (emailError) {
            console.error("[Lead Discovery] Failed to send notification email:", emailError);
          }
        }
        
        return leads;
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
      // Check if test mode is enabled
      const useTestData = ctx.user.useRealData !== 1;
      
      if (useTestData) {
        const { getTestData } = await import("./services/testData");
        const testData = getTestData();
        // Transform test conversations to match expected format
        return testData.conversations.map(conv => ({
          id: conv.id,
          userId: ctx.user.id,
          leadId: conv.leadId,
          title: conv.subject,
          status: conv.status as 'active' | 'pending' | 'closed' | 'follow_up_needed' | 'won' | 'lost',
          sentiment: 'neutral' as 'positive' | 'neutral' | 'negative',
          summary: `Conversation with ${conv.contactName} - ${conv.messageCount} messages exchanged`,
          notes: `${conv.messageCount} messages`,
          createdAt: conv.lastMessageAt,
          updatedAt: conv.lastMessageAt,
        }));
      }
      
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
        // Check if test mode is enabled
        const useTestData = ctx.user.useRealData !== 1;
        
        if (useTestData) {
          throw new Error("Cannot create conversations in test mode. Toggle off 'Test Data' to create real conversations.");
        }
        
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
    
    // Resend transactional emails
    sendWelcome: protectedProcedure
      .input(z.object({
        to: z.string().email(),
        userName: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { sendWelcomeEmail } = await import("./services/email");
        const result = await sendWelcomeEmail(input.to, input.userName);
        if (!result.success) {
          throw new Error(result.error || "Failed to send welcome email");
        }
        return result;
      }),
    
    sendPaymentConfirmation: protectedProcedure
      .input(z.object({
        to: z.string().email(),
        userName: z.string(),
        amount: z.number(),
        planName: z.string(),
        receiptUrl: z.string().url().optional(),
      }))
      .mutation(async ({ input }) => {
        const { sendPaymentConfirmationEmail } = await import("./services/email");
        const result = await sendPaymentConfirmationEmail(
          input.to,
          input.userName,
          input.amount,
          input.planName,
          input.receiptUrl
        );
        if (!result.success) {
          throw new Error(result.error || "Failed to send payment confirmation email");
        }
        return result;
      }),
    
    sendLeadNotification: protectedProcedure
      .input(z.object({
        to: z.string().email(),
        userName: z.string(),
        leadName: z.string(),
        leadCompany: z.string(),
        leadEmail: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => {
        const { sendLeadNotificationEmail } = await import("./services/email");
        const result = await sendLeadNotificationEmail(
          input.to,
          input.userName,
          input.leadName,
          input.leadCompany,
          input.leadEmail
        );
        if (!result.success) {
          throw new Error(result.error || "Failed to send lead notification email");
        }
        return result;
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

  // Re-engagement workflows
  reengagement: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const { getUserReengagementWorkflows } = await import("./db");
        return await getUserReengagementWorkflows(ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        inactivityDays: z.number().min(1),
        sequenceId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createReengagementWorkflow } = await import("./db");
        await createReengagementWorkflow({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          inactivityDays: input.inactivityDays,
          sequenceId: input.sequenceId,
          isActive: 1,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        inactivityDays: z.number().min(1).optional(),
        sequenceId: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { updateReengagementWorkflow } = await import("./db");
        const { id, ...updates } = input;
        await updateReengagementWorkflow(id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteReengagementWorkflow } = await import("./db");
        await deleteReengagementWorkflow(input.id);
        return { success: true };
      }),

    detectInactive: protectedProcedure
      .input(z.object({ inactivityDays: z.number().min(1) }))
      .query(async ({ ctx, input }) => {
        const { detectInactiveLeads } = await import("./reengagement");
        const inactiveLeadIds = await detectInactiveLeads(ctx.user.id, input.inactivityDays);
        return { inactiveLeadIds, count: inactiveLeadIds.length };
      }),

    execute: protectedProcedure
      .input(z.object({ workflowId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { executeReengagementWorkflow } = await import("./reengagement");
        return await executeReengagementWorkflow(input.workflowId);
      }),

    executeAll: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { executeAllUserWorkflows } = await import("./reengagement");
        return await executeAllUserWorkflows(ctx.user.id);
      }),

    getExecutions: protectedProcedure
      .input(z.object({ workflowId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getWorkflowExecutions } = await import("./db");
        return await getWorkflowExecutions(input.workflowId);
      }),
    
    // Execute workflows on schedule (manual trigger)
    executeScheduled: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { executeScheduledWorkflows } = await import("./scheduler");
        return await executeScheduledWorkflows(ctx.user.id);
      }),
    
    // Schedule workflows for a user with custom cron expression
    scheduleWorkflows: protectedProcedure
      .input(z.object({ 
        cronExpression: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { scheduleUserWorkflows } = await import("./scheduler");
        scheduleUserWorkflows(ctx.user.id, input.cronExpression);
        return { success: true, message: `Workflows scheduled with cron: ${input.cronExpression}` };
      }),
    
    // Remove scheduled workflows for a user
    unscheduleWorkflows: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { unscheduleUserWorkflows } = await import("./scheduler");
        unscheduleUserWorkflows(ctx.user.id);
        return { success: true, message: 'Workflows unscheduled' };
      }),
  }),
  
  // Admin dashboard for scheduled jobs
  admin: router({
    // List all scheduled jobs for current user
    listScheduledJobs: protectedProcedure
      .query(async ({ ctx }) => {
        const { getUserScheduledJobs } = await import("./db");
        return await getUserScheduledJobs(ctx.user.id);
      }),
    
    // Get job statistics and success rates
    getJobStatistics: protectedProcedure
      .query(async ({ ctx }) => {
        const { getJobStatistics } = await import("./db");
        return await getJobStatistics(ctx.user.id);
      }),
    
    // Get execution history for all workflows
    getExecutionHistory: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const { getAllExecutionHistory } = await import("./db");
        return await getAllExecutionHistory(ctx.user.id, input.limit || 50);
      }),
    
    // Pause a scheduled job
    pauseJob: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { updateScheduledJob } = await import("./db");
        await updateScheduledJob(input.jobId, { isActive: 0 });
        return { success: true, message: 'Job paused successfully' };
      }),
    
    // Resume a scheduled job
    resumeJob: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { updateScheduledJob } = await import("./db");
        await updateScheduledJob(input.jobId, { isActive: 1 });
        return { success: true, message: 'Job resumed successfully' };
      }),
    
    // Delete a scheduled job
    deleteJob: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteScheduledJob } = await import("./db");
        await deleteScheduledJob(input.jobId);
        return { success: true, message: 'Job deleted successfully' };
      }),
    
    // Create a new scheduled job
    createJob: protectedProcedure
      .input(z.object({
        jobType: z.string(),
        cronExpression: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createScheduledJob } = await import("./db");
        await createScheduledJob({
          userId: ctx.user.id,
          jobType: input.jobType,
          cronExpression: input.cronExpression,
          isActive: 1,
        });
        
        // Register the job with the scheduler
        const { scheduleUserWorkflows } = await import("./scheduler");
        scheduleUserWorkflows(ctx.user.id, input.cronExpression);
        
        return { success: true, message: 'Job created and scheduled successfully' };
      }),
    
    // ===== User Account Management (Admin Only) =====
    
    // List all users (admin only)
    listUsers: protectedProcedure
      .input(z.object({
        status: z.enum(["all", "active", "inactive", "suspended", "trial"]).optional(),
        tier: z.enum(["all", "free", "basic", "pro", "enterprise"]).optional(),
      }))
      .query(async ({ ctx, input }) => {
        // Check if user is admin
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized: Admin access required");
        }
        
        const { getAllUsers } = await import("./db");
        let allUsers = await getAllUsers();
        
        // Filter by status if provided
        if (input.status && input.status !== "all") {
          allUsers = allUsers.filter(u => u.accountStatus === input.status);
        }
        
        // Filter by tier if provided
        if (input.tier && input.tier !== "all") {
          allUsers = allUsers.filter(u => u.subscriptionTier === input.tier);
        }
        
        return allUsers;
      }),
    
    // Get user details (admin only)
    getUserDetails: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Check if user is admin
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized: Admin access required");
        }
        
        const { getUserById } = await import("./db");
        return await getUserById(input.userId);
      }),
    
    // Update user account status (admin only)
    updateUserStatus: protectedProcedure
      .input(z.object({
        userId: z.number(),
        status: z.enum(["active", "inactive", "suspended", "trial"]),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user is admin
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized: Admin access required");
        }
        
        const { updateUserAccountStatus } = await import("./db");
        await updateUserAccountStatus(input.userId, input.status);
        
        return { success: true, message: `User status updated to ${input.status}` };
      }),
    
    // Update user billing (admin only)
    updateUserBilling: protectedProcedure
      .input(z.object({
        userId: z.number(),
        billingCycle: z.enum(["monthly", "yearly", "none"]).optional(),
        nextBillingDate: z.string().optional(), // ISO date string
        subscriptionTier: z.enum(["free", "basic", "pro", "enterprise"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user is admin
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized: Admin access required");
        }
        
        const { updateUserBilling } = await import("./db");
        
        const updates: any = {};
        if (input.billingCycle) updates.billingCycle = input.billingCycle;
        if (input.subscriptionTier) updates.subscriptionTier = input.subscriptionTier;
        if (input.nextBillingDate) {
          updates.nextBillingDate = new Date(input.nextBillingDate);
        }
        
        await updateUserBilling(input.userId, updates);
        
        return { success: true, message: 'User billing updated successfully' };
      }),
   }),
  
  // Billing
  billing: billingRouter,
  
  // Apollo Usage Monitoring
  apollo: router({
    getUsageSummary: protectedProcedure.query(async ({ ctx }) => {
      const { getUsageSummary } = await import('./services/apolloUsageTracker');
      return await getUsageSummary(ctx.user.id);
    }),
    
    getUsageStats: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getUserUsageStats } = await import('./services/apolloUsageTracker');
        const start = input.startDate ? new Date(input.startDate) : undefined;
        const end = input.endDate ? new Date(input.endDate) : undefined;
        return await getUserUsageStats(ctx.user.id, start, end);
      }),
  }),
});
export type AppRouter = typeof appRouter;
