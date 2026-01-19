import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  sendEmail,
  sendWelcomeEmail,
  sendPaymentConfirmationEmail,
  sendSubscriptionRenewalEmail,
  sendLeadNotificationEmail,
} from "../services/email";

export const emailRouter = router({
  /**
   * Send a custom email
   */
  sendCustomEmail: protectedProcedure
    .input(
      z.object({
        to: z.string().email().or(z.array(z.string().email())),
        subject: z.string().min(1),
        html: z.string().min(1),
        replyTo: z.string().email().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await sendEmail({
        to: input.to,
        subject: input.subject,
        html: input.html,
        replyTo: input.replyTo,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to send email");
      }

      return result;
    }),

  /**
   * Send welcome email to a user
   */
  sendWelcome: protectedProcedure
    .input(
      z.object({
        to: z.string().email(),
        userName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await sendWelcomeEmail(input.to, input.userName);

      if (!result.success) {
        throw new Error(result.error || "Failed to send welcome email");
      }

      return result;
    }),

  /**
   * Send payment confirmation email
   */
  sendPaymentConfirmation: protectedProcedure
    .input(
      z.object({
        to: z.string().email(),
        userName: z.string(),
        amount: z.number(),
        planName: z.string(),
        receiptUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
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

  /**
   * Send subscription renewal reminder email
   */
  sendSubscriptionRenewal: protectedProcedure
    .input(
      z.object({
        to: z.string().email(),
        userName: z.string(),
        planName: z.string(),
        renewalDate: z.date(),
        amount: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await sendSubscriptionRenewalEmail(
        input.to,
        input.userName,
        input.planName,
        input.renewalDate,
        input.amount
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to send subscription renewal email");
      }

      return result;
    }),

  /**
   * Send lead notification email
   */
  sendLeadNotification: protectedProcedure
    .input(
      z.object({
        to: z.string().email(),
        userName: z.string(),
        leadName: z.string(),
        leadCompany: z.string(),
        leadEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ input }) => {
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
});
