import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sendWorkflowExecutionNotification,
  sendBatchWorkflowNotification,
  getDefaultNotificationPreferences,
  validateNotificationPreferences,
  type WorkflowExecutionResult,
  type NotificationPreferences,
} from "./emailNotifications";

// Mock the notification module
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

describe("Email Notifications - Notification Preferences", () => {
  it("should return default notification preferences", () => {
    const defaults = getDefaultNotificationPreferences();
    
    expect(defaults.enabled).toBe(true);
    expect(defaults.onSuccess).toBe(true);
    expect(defaults.onFailure).toBe(true);
    expect(defaults.onPartial).toBe(true);
    expect(defaults.batchNotifications).toBe(false);
  });

  it("should validate and fill missing preferences with defaults", () => {
    const partial: Partial<NotificationPreferences> = {
      enabled: false,
      onSuccess: false,
    };
    
    const validated = validateNotificationPreferences(partial);
    
    expect(validated.enabled).toBe(false);
    expect(validated.onSuccess).toBe(false);
    expect(validated.onFailure).toBe(true); // Default
    expect(validated.onPartial).toBe(true); // Default
    expect(validated.batchNotifications).toBe(false); // Default
  });

  it("should handle empty preferences object", () => {
    const validated = validateNotificationPreferences({});
    const defaults = getDefaultNotificationPreferences();
    
    expect(validated).toEqual(defaults);
  });

  it("should preserve all provided preferences", () => {
    const custom: NotificationPreferences = {
      enabled: false,
      onSuccess: false,
      onFailure: true,
      onPartial: false,
      batchNotifications: true,
    };
    
    const validated = validateNotificationPreferences(custom);
    
    expect(validated).toEqual(custom);
  });
});

describe("Email Notifications - Workflow Execution Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send notification for successful workflow execution", async () => {
    const { notifyOwner } = await import("./_core/notification");
    
    const result: WorkflowExecutionResult = {
      workflowName: "Test Workflow",
      workflowId: 1,
      leadsDetected: 10,
      leadsEnrolled: 8,
      status: "success",
      executedAt: new Date(),
      duration: 5000,
    };
    
    const success = await sendWorkflowExecutionNotification(
      "user@example.com",
      "Test User",
      result
    );
    
    expect(success).toBe(true);
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("✅"),
        title: expect.stringContaining("Test Workflow"),
        title: expect.stringContaining("Completed Successfully"),
        content: expect.stringContaining("Test User"),
        content: expect.stringContaining("Leads Detected: 10"),
        content: expect.stringContaining("Leads Enrolled: 8"),
      })
    );
  });

  it("should send notification for failed workflow execution", async () => {
    const { notifyOwner } = await import("./_core/notification");
    
    const result: WorkflowExecutionResult = {
      workflowName: "Failed Workflow",
      workflowId: 2,
      leadsDetected: 5,
      leadsEnrolled: 0,
      status: "failed",
      errorMessage: "Database connection failed",
      executedAt: new Date(),
    };
    
    const success = await sendWorkflowExecutionNotification(
      "user@example.com",
      "Test User",
      result
    );
    
    expect(success).toBe(true);
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("❌"),
        title: expect.stringContaining("Failed Workflow"),
        title: expect.stringContaining("Failed"),
        content: expect.stringContaining("Database connection failed"),
      })
    );
  });

  it("should send notification for partial success", async () => {
    const { notifyOwner } = await import("./_core/notification");
    
    const result: WorkflowExecutionResult = {
      workflowName: "Partial Workflow",
      workflowId: 3,
      leadsDetected: 10,
      leadsEnrolled: 5,
      status: "partial",
      executedAt: new Date(),
    };
    
    const success = await sendWorkflowExecutionNotification(
      "user@example.com",
      "Test User",
      result
    );
    
    expect(success).toBe(true);
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("⚠️"),
        title: expect.stringContaining("Partial Workflow"),
        title: expect.stringContaining("Completed with Issues"),
        content: expect.stringContaining("Some leads could not be enrolled"),
      })
    );
  });

  it("should not send notification when disabled", async () => {
    const { notifyOwner } = await import("./_core/notification");
    
    const result: WorkflowExecutionResult = {
      workflowName: "Test Workflow",
      workflowId: 1,
      leadsDetected: 10,
      leadsEnrolled: 8,
      status: "success",
      executedAt: new Date(),
    };
    
    const preferences: NotificationPreferences = {
      enabled: false,
      onSuccess: true,
      onFailure: true,
      onPartial: true,
      batchNotifications: false,
    };
    
    const success = await sendWorkflowExecutionNotification(
      "user@example.com",
      "Test User",
      result,
      preferences
    );
    
    expect(success).toBe(false);
    expect(notifyOwner).not.toHaveBeenCalled();
  });

  it("should not send success notification when onSuccess is false", async () => {
    const { notifyOwner } = await import("./_core/notification");
    
    const result: WorkflowExecutionResult = {
      workflowName: "Test Workflow",
      workflowId: 1,
      leadsDetected: 10,
      leadsEnrolled: 8,
      status: "success",
      executedAt: new Date(),
    };
    
    const preferences: NotificationPreferences = {
      enabled: true,
      onSuccess: false,
      onFailure: true,
      onPartial: true,
      batchNotifications: false,
    };
    
    const success = await sendWorkflowExecutionNotification(
      "user@example.com",
      "Test User",
      result,
      preferences
    );
    
    expect(success).toBe(false);
    expect(notifyOwner).not.toHaveBeenCalled();
  });

  it("should not send failure notification when onFailure is false", async () => {
    const { notifyOwner } = await import("./_core/notification");
    
    const result: WorkflowExecutionResult = {
      workflowName: "Test Workflow",
      workflowId: 1,
      leadsDetected: 10,
      leadsEnrolled: 0,
      status: "failed",
      errorMessage: "Error occurred",
      executedAt: new Date(),
    };
    
    const preferences: NotificationPreferences = {
      enabled: true,
      onSuccess: true,
      onFailure: false,
      onPartial: true,
      batchNotifications: false,
    };
    
    const success = await sendWorkflowExecutionNotification(
      "user@example.com",
      "Test User",
      result,
      preferences
    );
    
    expect(success).toBe(false);
    expect(notifyOwner).not.toHaveBeenCalled();
  });

  it("should include duration in notification when provided", async () => {
    const { notifyOwner } = await import("./_core/notification");
    
    const result: WorkflowExecutionResult = {
      workflowName: "Test Workflow",
      workflowId: 1,
      leadsDetected: 10,
      leadsEnrolled: 8,
      status: "success",
      executedAt: new Date(),
      duration: 12500, // 12.5 seconds
    };
    
    await sendWorkflowExecutionNotification(
      "user@example.com",
      "Test User",
      result
    );
    
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Duration: 13s"),
      })
    );
  });

  it("should calculate success rate correctly", async () => {
    const { notifyOwner } = await import("./_core/notification");
    
    const result: WorkflowExecutionResult = {
      workflowName: "Test Workflow",
      workflowId: 1,
      leadsDetected: 10,
      leadsEnrolled: 7,
      status: "success",
      executedAt: new Date(),
    };
    
    await sendWorkflowExecutionNotification(
      "user@example.com",
      "Test User",
      result
    );
    
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Success Rate: 70%"),
      })
    );
  });

  it("should handle zero leads detected", async () => {
    const { notifyOwner } = await import("./_core/notification");
    
    const result: WorkflowExecutionResult = {
      workflowName: "Test Workflow",
      workflowId: 1,
      leadsDetected: 0,
      leadsEnrolled: 0,
      status: "success",
      executedAt: new Date(),
    };
    
    await sendWorkflowExecutionNotification(
      "user@example.com",
      "Test User",
      result
    );
    
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Success Rate: 0%"),
      })
    );
  });
});

describe("Email Notifications - Batch Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send batch notification for multiple workflows", async () => {
    const { notifyOwner } = await import("./_core/notification");
    
    const results: WorkflowExecutionResult[] = [
      {
        workflowName: "Workflow 1",
        workflowId: 1,
        leadsDetected: 10,
        leadsEnrolled: 8,
        status: "success",
        executedAt: new Date(),
      },
      {
        workflowName: "Workflow 2",
        workflowId: 2,
        leadsDetected: 5,
        leadsEnrolled: 0,
        status: "failed",
        errorMessage: "Error occurred",
        executedAt: new Date(),
      },
      {
        workflowName: "Workflow 3",
        workflowId: 3,
        leadsDetected: 8,
        leadsEnrolled: 6,
        status: "partial",
        executedAt: new Date(),
      },
    ];
    
    const preferences: NotificationPreferences = {
      enabled: true,
      onSuccess: true,
      onFailure: true,
      onPartial: true,
      batchNotifications: true,
    };
    
    const success = await sendBatchWorkflowNotification(
      "user@example.com",
      "Test User",
      results,
      preferences
    );
    
    expect(success).toBe(true);
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("Daily Workflow Summary"),
        title: expect.stringContaining("3 workflows"),
        content: expect.stringContaining("Total Workflows: 3"),
        content: expect.stringContaining("Successful: 1"),
        content: expect.stringContaining("Failed: 1"),
        content: expect.stringContaining("Partial: 1"),
        content: expect.stringContaining("Total Leads Detected: 23"),
        content: expect.stringContaining("Total Leads Enrolled: 14"),
      })
    );
  });

  it("should not send batch notification when disabled", async () => {
    const { notifyOwner } = await import("./_core/notification");
    
    const results: WorkflowExecutionResult[] = [
      {
        workflowName: "Workflow 1",
        workflowId: 1,
        leadsDetected: 10,
        leadsEnrolled: 8,
        status: "success",
        executedAt: new Date(),
      },
    ];
    
    const preferences: NotificationPreferences = {
      enabled: true,
      onSuccess: true,
      onFailure: true,
      onPartial: true,
      batchNotifications: false,
    };
    
    const success = await sendBatchWorkflowNotification(
      "user@example.com",
      "Test User",
      results,
      preferences
    );
    
    expect(success).toBe(false);
    expect(notifyOwner).not.toHaveBeenCalled();
  });

  it("should not send batch notification for empty results", async () => {
    const { notifyOwner } = await import("./_core/notification");
    
    const preferences: NotificationPreferences = {
      enabled: true,
      onSuccess: true,
      onFailure: true,
      onPartial: true,
      batchNotifications: true,
    };
    
    const success = await sendBatchWorkflowNotification(
      "user@example.com",
      "Test User",
      [],
      preferences
    );
    
    expect(success).toBe(false);
    expect(notifyOwner).not.toHaveBeenCalled();
  });

  it("should include individual workflow details in batch notification", async () => {
    const { notifyOwner } = await import("./_core/notification");
    
    const results: WorkflowExecutionResult[] = [
      {
        workflowName: "Workflow A",
        workflowId: 1,
        leadsDetected: 10,
        leadsEnrolled: 8,
        status: "success",
        executedAt: new Date(),
      },
      {
        workflowName: "Workflow B",
        workflowId: 2,
        leadsDetected: 5,
        leadsEnrolled: 0,
        status: "failed",
        errorMessage: "Connection timeout",
        executedAt: new Date(),
      },
    ];
    
    const preferences: NotificationPreferences = {
      enabled: true,
      onSuccess: true,
      onFailure: true,
      onPartial: true,
      batchNotifications: true,
    };
    
    await sendBatchWorkflowNotification(
      "user@example.com",
      "Test User",
      results,
      preferences
    );
    
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Workflow A"),
        content: expect.stringContaining("Detected: 10, Enrolled: 8"),
        content: expect.stringContaining("Workflow B"),
        content: expect.stringContaining("Connection timeout"),
      })
    );
  });

  it("should handle all successful workflows in batch", async () => {
    const { notifyOwner } = await import("./_core/notification");
    
    const results: WorkflowExecutionResult[] = [
      {
        workflowName: "Workflow 1",
        workflowId: 1,
        leadsDetected: 10,
        leadsEnrolled: 10,
        status: "success",
        executedAt: new Date(),
      },
      {
        workflowName: "Workflow 2",
        workflowId: 2,
        leadsDetected: 5,
        leadsEnrolled: 5,
        status: "success",
        executedAt: new Date(),
      },
    ];
    
    const preferences: NotificationPreferences = {
      enabled: true,
      onSuccess: true,
      onFailure: true,
      onPartial: true,
      batchNotifications: true,
    };
    
    await sendBatchWorkflowNotification(
      "user@example.com",
      "Test User",
      results,
      preferences
    );
    
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Successful: 2"),
        content: expect.stringContaining("Failed: 0"),
        content: expect.stringContaining("Partial: 0"),
      })
    );
  });
});

describe("Email Notifications - Error Handling", () => {
  it("should handle notification service failure gracefully", async () => {
    const { notifyOwner } = await import("./_core/notification");
    vi.mocked(notifyOwner).mockResolvedValueOnce(false);
    
    const result: WorkflowExecutionResult = {
      workflowName: "Test Workflow",
      workflowId: 1,
      leadsDetected: 10,
      leadsEnrolled: 8,
      status: "success",
      executedAt: new Date(),
    };
    
    const success = await sendWorkflowExecutionNotification(
      "user@example.com",
      "Test User",
      result
    );
    
    expect(success).toBe(false);
  });

  it("should handle notification service exception", async () => {
    const { notifyOwner } = await import("./_core/notification");
    vi.mocked(notifyOwner).mockRejectedValueOnce(new Error("Service unavailable"));
    
    const result: WorkflowExecutionResult = {
      workflowName: "Test Workflow",
      workflowId: 1,
      leadsDetected: 10,
      leadsEnrolled: 8,
      status: "success",
      executedAt: new Date(),
    };
    
    const success = await sendWorkflowExecutionNotification(
      "user@example.com",
      "Test User",
      result
    );
    
    expect(success).toBe(false);
  });
});
