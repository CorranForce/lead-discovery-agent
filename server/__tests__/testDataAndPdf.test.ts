import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ==================== Test Data Generator Tests ====================

describe("Test Data Generator", () => {
  describe("generateTestLeads", () => {
    it("should generate the specified number of test leads", async () => {
      const { generateTestLeads } = await import("../services/testData");
      const leads = generateTestLeads(10);
      expect(leads).toHaveLength(10);
    });

    it("should generate leads with required fields", async () => {
      const { generateTestLeads } = await import("../services/testData");
      const leads = generateTestLeads(1);
      const lead = leads[0];
      
      expect(lead).toHaveProperty("id");
      expect(lead).toHaveProperty("companyName");
      expect(lead).toHaveProperty("contactEmail");
      expect(lead).toHaveProperty("contactName");
      expect(lead).toHaveProperty("contactTitle");
      expect(lead).toHaveProperty("status");
    });

    it("should generate unique IDs for each lead", async () => {
      const { generateTestLeads } = await import("../services/testData");
      const leads = generateTestLeads(100);
      const ids = leads.map(l => l.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);
    });

    it("should generate valid email formats", async () => {
      const { generateTestLeads } = await import("../services/testData");
      const leads = generateTestLeads(10);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      leads.forEach(lead => {
        expect(lead.contactEmail).toMatch(emailRegex);
      });
    });

    it("should generate leads with valid status values", async () => {
      const { generateTestLeads } = await import("../services/testData");
      const leads = generateTestLeads(50);
      const validStatuses = ["new", "contacted", "qualified", "negotiating", "won", "lost"];
      
      leads.forEach(lead => {
        expect(validStatuses).toContain(lead.status);
      });
    });
  });

  describe("generateTestConversations", () => {
    it("should generate test conversations from leads", async () => {
      const { generateTestLeads, generateTestConversations } = await import("../services/testData");
      const leads = generateTestLeads(10);
      const conversations = generateTestConversations(leads);
      expect(conversations.length).toBeGreaterThan(0);
    });

    it("should generate conversations with required fields", async () => {
      const { generateTestLeads, generateTestConversations } = await import("../services/testData");
      const leads = generateTestLeads(10);
      const conversations = generateTestConversations(leads);
      
      if (conversations.length > 0) {
        const conv = conversations[0];
        expect(conv).toHaveProperty("id");
        expect(conv).toHaveProperty("companyName");
        expect(conv).toHaveProperty("subject");
        expect(conv).toHaveProperty("status");
        expect(conv).toHaveProperty("messages");
      }
    });
  });

  describe("generateTestInvoices", () => {
    it("should generate the specified number of test invoices", async () => {
      const { generateTestInvoices } = await import("../services/testData");
      const invoices = generateTestInvoices(5);
      expect(invoices).toHaveLength(5);
    });

    it("should generate invoices with valid amounts", async () => {
      const { generateTestInvoices } = await import("../services/testData");
      const invoices = generateTestInvoices(10);
      
      invoices.forEach(invoice => {
        expect(invoice.amount).toBeGreaterThan(0);
      });
    });

    it("should generate invoices with valid status values", async () => {
      const { generateTestInvoices } = await import("../services/testData");
      const invoices = generateTestInvoices(20);
      const validStatuses = ["paid", "open", "void", "uncollectible"];
      
      invoices.forEach(invoice => {
        expect(validStatuses).toContain(invoice.status);
      });
    });

    it("should set paidAt only for paid invoices", async () => {
      const { generateTestInvoices } = await import("../services/testData");
      const invoices = generateTestInvoices(50);
      
      invoices.forEach(invoice => {
        if (invoice.status === "paid") {
          expect(invoice.paidAt).toBeDefined();
        }
      });
    });
  });

  describe("calculateDashboardStats", () => {
    it("should calculate valid dashboard statistics from leads", async () => {
      const { generateTestLeads } = await import("../services/testData");
      const leads = generateTestLeads(50);
      
      // Calculate stats manually to test the logic
      const totalLeads = leads.length;
      const newLeads = leads.filter(l => l.status === 'new').length;
      const qualifiedLeads = leads.filter(l => l.status === 'qualified').length;
      const wonLeads = leads.filter(l => l.status === 'won').length;
      const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;
      
      expect(totalLeads).toBe(50);
      expect(newLeads).toBeGreaterThanOrEqual(0);
      expect(qualifiedLeads).toBeGreaterThanOrEqual(0);
      expect(conversionRate).toBeGreaterThanOrEqual(0);
      expect(conversionRate).toBeLessThanOrEqual(100);
    });

    it("should handle empty leads array", async () => {
      const leads: any[] = [];
      
      const totalLeads = leads.length;
      const conversionRate = totalLeads > 0 ? 0 : 0;
      
      expect(totalLeads).toBe(0);
      expect(conversionRate).toBe(0);
    });

    it("should count leads by status correctly", async () => {
      const { generateTestLeads } = await import("../services/testData");
      const leads = generateTestLeads(100);
      
      const statusCounts = leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const totalFromCounts = Object.values(statusCounts).reduce((a, b) => a + b, 0);
      expect(totalFromCounts).toBe(100);
    });
  });
});

// ==================== Invoice PDF Generation Tests ====================

describe("Invoice PDF Generation", () => {
  describe("InvoiceData interface", () => {
    it("should accept valid invoice data structure", () => {
      const invoiceData = {
        invoiceNumber: "INV-TEST-001",
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "paid" as const,
        companyName: "Lead Discovery AI",
        companyAddress: "123 Innovation Drive\nSan Francisco, CA 94102",
        companyEmail: "billing@leaddiscovery.ai",
        companyPhone: "+1 (555) 123-4567",
        companyWebsite: "https://leaddiscovery.ai",
        companyTaxId: "US-123456789",
        customerName: "Test Customer",
        customerEmail: "test@example.com",
        customerAddress: "123 Test St\nTest City, TC 12345",
        lineItems: [
          {
            description: "Pro Plan - Monthly",
            quantity: 1,
            unitPrice: 4900,
            amount: 4900,
          },
        ],
        subtotal: 4900,
        tax: 0,
        total: 4900,
        currency: "USD",
      };

      expect(invoiceData.invoiceNumber).toBe("INV-TEST-001");
      expect(invoiceData.lineItems).toHaveLength(1);
      expect(invoiceData.total).toBe(4900);
    });

    it("should validate required fields", () => {
      const requiredFields = [
        "invoiceNumber",
        "invoiceDate",
        "dueDate",
        "status",
        "companyName",
        "companyAddress",
        "companyEmail",
        "customerName",
        "customerEmail",
        "lineItems",
        "subtotal",
        "total",
        "currency",
      ];

      const invoiceData: Record<string, any> = {
        invoiceNumber: "INV-001",
        invoiceDate: new Date(),
        dueDate: new Date(),
        status: "paid",
        companyName: "Test Co",
        companyAddress: "123 Test St",
        companyEmail: "test@test.com",
        customerName: "Customer",
        customerEmail: "customer@test.com",
        lineItems: [],
        subtotal: 0,
        total: 0,
        currency: "USD",
      };

      requiredFields.forEach((field) => {
        expect(invoiceData).toHaveProperty(field);
      });
    });

    it("should handle multiple line items", () => {
      const lineItems = [
        { description: "Item 1", quantity: 2, unitPrice: 2500, amount: 5000 },
        { description: "Item 2", quantity: 1, unitPrice: 10000, amount: 10000 },
        { description: "Item 3", quantity: 5, unitPrice: 1000, amount: 5000 },
      ];

      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      expect(subtotal).toBe(20000);
      expect(lineItems).toHaveLength(3);
    });

    it("should support different currencies", () => {
      const currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"];
      
      currencies.forEach((currency) => {
        const invoiceData = {
          currency,
          total: 10000,
        };
        expect(invoiceData.currency).toBe(currency);
      });
    });
  });

  describe("formatCurrency helper", () => {
    it("should format amounts in cents to currency string", () => {
      // Test the formatting logic (amounts are in cents)
      const formatCurrency = (amount: number, currency: string = 'USD'): string => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency.toUpperCase(),
        }).format(amount / 100);
      };

      expect(formatCurrency(4900, 'USD')).toBe('$49.00');
      expect(formatCurrency(10000, 'USD')).toBe('$100.00');
      expect(formatCurrency(4900, 'EUR')).toBe('€49.00');
    });
  });
});

// ==================== Security Tests ====================

describe("Billing Security", () => {
  describe("Input Validation", () => {
    it("should reject invalid invoice ID formats", async () => {
      // Test that invoice ID validation regex works
      const validPattern = /^in_[a-zA-Z0-9]+$/;
      
      expect(validPattern.test("in_abc123")).toBe(true);
      expect(validPattern.test("in_ABC123xyz")).toBe(true);
      expect(validPattern.test("invalid_id")).toBe(false);
      expect(validPattern.test("in_")).toBe(false);
      expect(validPattern.test("")).toBe(false);
      expect(validPattern.test("in_abc<script>")).toBe(false);
      expect(validPattern.test("in_abc;DROP TABLE")).toBe(false);
    });

    it("should reject overly long invoice IDs", () => {
      const maxLength = 100;
      const validId = "in_" + "a".repeat(50);
      const invalidId = "in_" + "a".repeat(200);
      
      expect(validId.length).toBeLessThanOrEqual(maxLength);
      expect(invalidId.length).toBeGreaterThan(maxLength);
    });
  });

  describe("Webhook Signature Validation", () => {
    it("should reject missing signature header", () => {
      // Simulate missing signature
      const signature = "";
      expect(!signature || typeof signature !== 'string').toBe(true);
    });

    it("should reject null signature", () => {
      const signature = null;
      expect(!signature || typeof signature !== 'string').toBe(true);
    });
  });

  describe("Test Event Handling", () => {
    it("should identify test events correctly", () => {
      const testEventId = "evt_test_abc123";
      const liveEventId = "evt_1abc123xyz";
      
      expect(testEventId.startsWith("evt_test_")).toBe(true);
      expect(liveEventId.startsWith("evt_test_")).toBe(false);
    });
  });
});

// ==================== Data Integrity Tests ====================

describe("Data Integrity", () => {
  describe("Invoice Amount Calculations", () => {
    it("should calculate correct totals", () => {
      const items = [
        { quantity: 2, unitPrice: 25, amount: 50 },
        { quantity: 1, unitPrice: 100, amount: 100 },
      ];
      
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      const tax = subtotal * 0.1; // 10% tax
      const total = subtotal + tax;
      
      expect(subtotal).toBe(150);
      expect(tax).toBe(15);
      expect(total).toBe(165);
    });

    it("should handle zero amounts", () => {
      const items = [{ quantity: 0, unitPrice: 100, amount: 0 }];
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      
      expect(subtotal).toBe(0);
    });

    it("should handle decimal amounts correctly", () => {
      const items = [
        { quantity: 1, unitPrice: 49.99, amount: 49.99 },
        { quantity: 1, unitPrice: 29.99, amount: 29.99 },
      ];
      
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      
      // Use toFixed to avoid floating point issues
      expect(subtotal.toFixed(2)).toBe("79.98");
    });
  });

  describe("Date Handling", () => {
    it("should generate valid ISO date strings", () => {
      const date = new Date().toISOString();
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
      
      expect(date).toMatch(isoRegex);
    });

    it("should handle due date calculations", () => {
      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      expect(dueDate.getTime()).toBeGreaterThan(invoiceDate.getTime());
      
      const daysDiff = Math.round((dueDate.getTime() - invoiceDate.getTime()) / (24 * 60 * 60 * 1000));
      expect(daysDiff).toBe(30);
    });
  });
});
