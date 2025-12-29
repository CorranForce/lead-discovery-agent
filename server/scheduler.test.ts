import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import * as cron from "node-cron";

// Mock the reengagement module
vi.mock("../server/reengagement", () => ({
  executeAllUserWorkflows: vi.fn(async (userId: number) => ({
    totalWorkflows: 2,
    successful: 2,
    failed: 0,
    totalLeadsEnrolled: 5,
  })),
}));

describe("Scheduler", () => {
  let scheduler: typeof import("../server/scheduler");
  let reengagement: typeof import("../server/reengagement");

  beforeEach(async () => {
    vi.clearAllMocks();
    // Import fresh modules for each test
    scheduler = await import("../server/scheduler");
    reengagement = await import("../server/reengagement");
  });

  afterEach(() => {
    // Stop all scheduled jobs after each test
    if (scheduler.stopScheduler) {
      scheduler.stopScheduler();
    }
  });

  describe("startScheduler", () => {
    it("should start the daily scheduler without errors", () => {
      expect(() => scheduler.startScheduler()).not.toThrow();
    });

    it("should log scheduler start message", () => {
      const consoleSpy = vi.spyOn(console, "log");
      scheduler.startScheduler();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[Scheduler] Started daily re-engagement workflow scheduler")
      );
    });
  });

  describe("stopScheduler", () => {
    it("should stop all scheduled jobs", () => {
      scheduler.startScheduler();
      expect(() => scheduler.stopScheduler()).not.toThrow();
    });

    it("should log stop message for each job", () => {
      const consoleSpy = vi.spyOn(console, "log");
      scheduler.startScheduler();
      scheduler.stopScheduler();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[Scheduler] Stopped job:")
      );
    });

    it("should handle stopping when no jobs are running", () => {
      expect(() => scheduler.stopScheduler()).not.toThrow();
    });
  });

  describe("executeScheduledWorkflows", () => {
    it("should execute workflows for a specific user", async () => {
      const userId = 1;
      const result = await scheduler.executeScheduledWorkflows(userId);

      expect(reengagement.executeAllUserWorkflows).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        totalWorkflows: 2,
        successful: 2,
        failed: 0,
        totalLeadsEnrolled: 5,
      });
    });

    it("should log execution start and completion", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const userId = 1;

      await scheduler.executeScheduledWorkflows(userId);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[Scheduler] Executing workflows for user ${userId}`)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[Scheduler] Executed 2 workflows for user ${userId}`)
      );
    });

    it("should handle errors during workflow execution", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error");
      const userId = 1;
      const error = new Error("Workflow execution failed");

      vi.mocked(reengagement.executeAllUserWorkflows).mockRejectedValueOnce(error);

      await expect(scheduler.executeScheduledWorkflows(userId)).rejects.toThrow(
        "Workflow execution failed"
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[Scheduler] Error executing workflows for user ${userId}`),
        error
      );
    });

    it("should execute workflows for multiple users independently", async () => {
      const userId1 = 1;
      const userId2 = 2;

      await scheduler.executeScheduledWorkflows(userId1);
      await scheduler.executeScheduledWorkflows(userId2);

      expect(reengagement.executeAllUserWorkflows).toHaveBeenCalledTimes(2);
      expect(reengagement.executeAllUserWorkflows).toHaveBeenCalledWith(userId1);
      expect(reengagement.executeAllUserWorkflows).toHaveBeenCalledWith(userId2);
    });
  });

  describe("scheduleUserWorkflows", () => {
    it("should schedule workflows with valid cron expression", () => {
      const userId = 1;
      const cronExpression = "0 9 * * *"; // Daily at 9 AM

      expect(() => scheduler.scheduleUserWorkflows(userId, cronExpression)).not.toThrow();
    });

    it("should log scheduling confirmation", () => {
      const consoleSpy = vi.spyOn(console, "log");
      const userId = 1;
      const cronExpression = "0 9 * * *";

      scheduler.scheduleUserWorkflows(userId, cronExpression);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[Scheduler] Scheduled workflows for user ${userId} with cron: ${cronExpression}`)
      );
    });

    it("should replace existing schedule for the same user", () => {
      const userId = 1;
      const cronExpression1 = "0 9 * * *";
      const cronExpression2 = "0 18 * * *"; // Daily at 6 PM

      scheduler.scheduleUserWorkflows(userId, cronExpression1);
      expect(() => scheduler.scheduleUserWorkflows(userId, cronExpression2)).not.toThrow();
    });

    it("should handle scheduling for multiple users", () => {
      const userId1 = 1;
      const userId2 = 2;
      const cronExpression = "0 9 * * *";

      expect(() => {
        scheduler.scheduleUserWorkflows(userId1, cronExpression);
        scheduler.scheduleUserWorkflows(userId2, cronExpression);
      }).not.toThrow();
    });

    it("should accept different cron expressions", () => {
      const userId = 1;
      const expressions = [
        "0 9 * * *",      // Daily at 9 AM
        "0 */6 * * *",    // Every 6 hours
        "0 9 * * 1",      // Every Monday at 9 AM
        "0 0 1 * *",      // First day of month at midnight
      ];

      expressions.forEach((expr, index) => {
        expect(() => scheduler.scheduleUserWorkflows(userId + index, expr)).not.toThrow();
      });
    });
  });

  describe("unscheduleUserWorkflows", () => {
    it("should unschedule workflows for a user", () => {
      const userId = 1;
      const cronExpression = "0 9 * * *";

      scheduler.scheduleUserWorkflows(userId, cronExpression);
      expect(() => scheduler.unscheduleUserWorkflows(userId)).not.toThrow();
    });

    it("should log unscheduling confirmation", () => {
      const consoleSpy = vi.spyOn(console, "log");
      const userId = 1;
      const cronExpression = "0 9 * * *";

      scheduler.scheduleUserWorkflows(userId, cronExpression);
      scheduler.unscheduleUserWorkflows(userId);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[Scheduler] Unscheduled workflows for user ${userId}`)
      );
    });

    it("should handle unscheduling when no schedule exists", () => {
      const userId = 999;
      expect(() => scheduler.unscheduleUserWorkflows(userId)).not.toThrow();
    });

    it("should not affect other users' schedules", () => {
      const userId1 = 1;
      const userId2 = 2;
      const cronExpression = "0 9 * * *";

      scheduler.scheduleUserWorkflows(userId1, cronExpression);
      scheduler.scheduleUserWorkflows(userId2, cronExpression);

      scheduler.unscheduleUserWorkflows(userId1);

      // Should not throw - user 2's schedule should still exist
      expect(() => scheduler.unscheduleUserWorkflows(userId2)).not.toThrow();
    });
  });

  describe("Cron Expression Validation", () => {
    it("should validate common cron patterns", () => {
      const userId = 1;
      const validExpressions = [
        "0 9 * * *",      // Daily at 9 AM
        "*/15 * * * *",   // Every 15 minutes
        "0 0 * * 0",      // Weekly on Sunday at midnight
        "0 0 1 * *",      // Monthly on the 1st at midnight
        "0 9-17 * * 1-5", // Weekdays 9 AM to 5 PM
      ];

      validExpressions.forEach(expr => {
        expect(() => scheduler.scheduleUserWorkflows(userId, expr)).not.toThrow();
        scheduler.unscheduleUserWorkflows(userId); // Clean up
      });
    });
  });

  describe("Integration with Re-engagement System", () => {
    it("should call executeAllUserWorkflows when scheduled time arrives", async () => {
      const userId = 1;
      
      // Execute scheduled workflows manually
      await scheduler.executeScheduledWorkflows(userId);

      expect(reengagement.executeAllUserWorkflows).toHaveBeenCalledWith(userId);
    });

    it("should return correct execution results", async () => {
      const userId = 1;
      const mockResult = {
        totalWorkflows: 3,
        successful: 2,
        failed: 1,
        totalLeadsEnrolled: 8,
      };

      vi.mocked(reengagement.executeAllUserWorkflows).mockResolvedValueOnce(mockResult);

      const result = await scheduler.executeScheduledWorkflows(userId);

      expect(result).toEqual(mockResult);
    });

    it("should handle zero workflows gracefully", async () => {
      const userId = 1;
      const mockResult = {
        totalWorkflows: 0,
        successful: 0,
        failed: 0,
        totalLeadsEnrolled: 0,
      };

      vi.mocked(reengagement.executeAllUserWorkflows).mockResolvedValueOnce(mockResult);

      const result = await scheduler.executeScheduledWorkflows(userId);

      expect(result.totalWorkflows).toBe(0);
      expect(result.totalLeadsEnrolled).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection errors", async () => {
      const userId = 1;
      const dbError = new Error("Database connection failed");

      vi.mocked(reengagement.executeAllUserWorkflows).mockRejectedValueOnce(dbError);

      await expect(scheduler.executeScheduledWorkflows(userId)).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should handle workflow execution errors without crashing", async () => {
      const userId = 1;
      const error = new Error("Workflow error");

      vi.mocked(reengagement.executeAllUserWorkflows).mockRejectedValueOnce(error);

      await expect(scheduler.executeScheduledWorkflows(userId)).rejects.toThrow();
      
      // Scheduler should still be operational
      expect(() => scheduler.stopScheduler()).not.toThrow();
    });
  });

  describe("Scheduler Lifecycle", () => {
    it("should handle start-stop-start cycle", () => {
      scheduler.startScheduler();
      scheduler.stopScheduler();
      expect(() => scheduler.startScheduler()).not.toThrow();
      scheduler.stopScheduler();
    });

    it("should handle multiple stop calls", () => {
      scheduler.startScheduler();
      scheduler.stopScheduler();
      expect(() => scheduler.stopScheduler()).not.toThrow();
    });

    it("should handle multiple start calls", () => {
      scheduler.startScheduler();
      expect(() => scheduler.startScheduler()).not.toThrow();
      scheduler.stopScheduler();
    });
  });
});
