# SQL Injection Prevention

This application uses **Drizzle ORM** which provides built-in protection against SQL injection through parameterized queries.

## How Drizzle ORM Prevents SQL Injection

Drizzle ORM automatically uses parameterized queries (prepared statements) for all database operations. This means user input is never directly concatenated into SQL strings.

### ✅ SAFE Examples (Using Drizzle ORM)

```typescript
// Safe: Drizzle uses parameterized queries
const user = await db.select().from(users).where(eq(users.email, userEmail));

// Safe: Parameters are properly escaped
const leads = await db.select().from(leads).where(eq(leads.companyName, companyName));

// Safe: Even complex queries are parameterized
const results = await db
  .select()
  .from(users)
  .where(and(
    eq(users.email, email),
    eq(users.role, role)
  ));
```

### ❌ UNSAFE Examples (DO NOT USE)

```typescript
// NEVER do this: Direct string concatenation
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;
await db.execute(query);

// NEVER do this: Template literals with user input
await db.execute(sql`SELECT * FROM users WHERE email = '${userEmail}'`);
```

## Best Practices

1. **Always use Drizzle ORM methods** (`select()`, `insert()`, `update()`, `delete()`)
2. **Never concatenate user input** into SQL strings
3. **Use `eq()`, `like()`, `and()`, `or()`** for conditions - they're automatically parameterized
4. **Validate input** before database operations using our input validation utilities
5. **Use Zod schemas** in tRPC procedures to validate input structure

## Input Validation Layer

Even though Drizzle ORM prevents SQL injection, we still validate input to:
- Detect and block obvious injection attempts
- Sanitize data for display (prevent XSS)
- Ensure data integrity

```typescript
import { validateInput, sanitizeEmail } from "./inputValidation";

// Validate before database operation
const safeEmail = validateInput(userInput, "Email");
const user = await db.select().from(users).where(eq(users.email, safeEmail));
```

## Verification Checklist

- [x] Using Drizzle ORM for all database operations
- [x] No raw SQL string concatenation with user input
- [x] Input validation utilities created
- [x] Zod schemas used in tRPC procedures
- [ ] Regular security audits of database queries
- [ ] Penetration testing for SQL injection vulnerabilities

## Testing SQL Injection Protection

To verify protection, try these test inputs (they should be safely handled):

```
' OR '1'='1
'; DROP TABLE users; --
admin'--
' UNION SELECT * FROM users--
1' AND '1'='1
```

All of these should either:
1. Be detected by input validation and rejected
2. Be safely parameterized by Drizzle ORM and treated as literal strings
