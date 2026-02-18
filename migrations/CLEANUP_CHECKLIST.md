# Database Cleanup Checklist

## Quick Reference
📊 **6 unused tables** (43% of schema)  
📉 **~60 unused columns** across active tables  
💾 **Potential savings:** 40% reduction in schema complexity

---

## ✅ Phase 1: Remove Dead Tables (SAFE - Do First)

### Tables to Drop
- [ ] `workspace_activity` - Activity logging (never implemented)
- [ ] `parsed_receipts` - Template parsing results (feature incomplete)
- [ ] `receipt_templates` - Store-specific parsers (hardcoded instead)
- [ ] `receipt_annotations` - User corrections (no UI built)
- [ ] `store_geofences` - Location matching (unused)
- [ ] `receipt_processing_logs` - Pipeline debugging (never populated)

### SQL Script
```sql
-- Run this first (zero risk, no data)
DROP TABLE IF EXISTS receipt_processing_logs CASCADE;
DROP TABLE IF EXISTS receipt_annotations CASCADE;
DROP TABLE IF EXISTS store_geofences CASCADE;
DROP TABLE IF EXISTS parsed_receipts CASCADE;
DROP TABLE IF EXISTS receipt_templates CASCADE;
DROP TABLE IF EXISTS workspace_activity CASCADE;

-- Clean up triggers
DROP TRIGGER IF EXISTS trigger_update_store_stats ON raw_receipts;
DROP TRIGGER IF EXISTS trigger_update_template_perf ON parsed_receipts;
DROP TRIGGER IF EXISTS trigger_log_member_activity ON workspace_members;

-- Clean up functions
DROP FUNCTION IF EXISTS update_store_statistics();
DROP FUNCTION IF EXISTS update_template_performance();
DROP FUNCTION IF EXISTS log_workspace_activity();

-- Clean up views
DROP VIEW IF EXISTS receipt_complete;
DROP VIEW IF EXISTS store_metrics;
```

### Verification
```sql
-- Should return 8 tables (down from 14)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

---

## ⚡ Phase 2: Remove Unused Columns (TEST FIRST)

### expense_reports
```sql
-- Remove: user_email (redundant with user_id)
-- Remove: workspace_id (FK never populated)
ALTER TABLE expense_reports 
  DROP COLUMN IF EXISTS user_email,
  DROP COLUMN IF EXISTS workspace_id;
```

### user_profiles
```sql
-- Remove: user_email (derive from Clerk)
-- Remove: is_admin (no RBAC implemented)
ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS user_email,
  DROP COLUMN IF EXISTS is_admin;
```

### workspaces
```sql
-- Remove: user_id (use owner_id)
-- Remove: description, address, plan_type (features not built)
-- Remove: workspace_type (always 'personal')
ALTER TABLE workspaces
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS plan_type,
  DROP COLUMN IF EXISTS workspace_type;
```

### Testing Checklist
- [ ] Web app: Create expense report
- [ ] Web app: View existing reports
- [ ] Web app: Workspace settings
- [ ] Mobile app: Upload receipt
- [ ] Mobile app: View expenses
- [ ] Mobile app: Workspace switching
- [ ] API: GET /api/mobile/expense-reports
- [ ] API: POST /api/receipts/upload

---

## 🚧 Phase 3: Code Fixes (Required Before Phase 2)

### Fix Ghost Table References
Find and replace `from('receipts')` → `from('expense_items')`:

- [ ] [lib/receipt-processing/orchestrator.ts](../lib/receipt-processing/orchestrator.ts#L765) (2 occurrences)
- [ ] [lib/api/expense-reports.ts](../lib/api/expense-reports.ts#L165) (2 occurrences)  
- [ ] [app/api/account/delete-request/route.ts](../app/api/account/delete-request/route.ts#L85) (2 occurrences)

### Test After Fix
```bash
# Search for any remaining 'receipts' table references
grep -r "from('receipts')" app/ lib/ --include="*.ts"
grep -r 'from("receipts")' app/ lib/ --include="*.ts"
```

---

## 🔄 Phase 4: Unify User Identity (COMPLEX - Do Last)

### Current Problem
Tables use both `user_id` (Clerk ID) and `user_email`:
- `expense_reports` - has both
- `user_profiles` - has both
- `workspaces` - uses `user_id` + `owner_id`
- `raw_receipts` - uses `user_email` only ❌

### Migration Plan
```sql
-- 1. Add user_id to raw_receipts
ALTER TABLE raw_receipts ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 2. Backfill from expense_items → expense_reports
UPDATE raw_receipts rr
SET user_id = (
  SELECT er.user_id 
  FROM expense_items ei
  JOIN expense_reports er ON er.id = ei.report_id
  WHERE ei.raw_receipt_id = rr.id
  LIMIT 1
)
WHERE user_id IS NULL;

-- 3. Update RLS policies to use user_id
DROP POLICY IF EXISTS "raw_receipts_select" ON raw_receipts;
DROP POLICY IF EXISTS "raw_receipts_insert" ON raw_receipts;

CREATE POLICY "raw_receipts_select"
  ON raw_receipts FOR SELECT
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub'));

CREATE POLICY "raw_receipts_insert"
  ON raw_receipts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (auth.jwt()->>'sub'));

-- 4. Drop user_email column
ALTER TABLE raw_receipts DROP COLUMN user_email;
```

### Code Changes Required
Update all queries in:
- [ ] `lib/receipt-processing/raw-storage.ts` - Change `user_email` → `user_id`
- [ ] `lib/receipt-processing/orchestrator.ts` - Pass `userId` not `userEmail`
- [ ] All upload routes - Use `userId` for raw receipts

---

## 📊 Impact Summary

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| Tables | 14 | 8 | 43% |
| Active columns | ~150 | ~90 | 40% |
| RLS policies | 15 | 8 | 47% |
| Triggers | 8 | 3 | 63% |
| Migration SQL | 2500 lines | 1200 lines | 52% |

---

## 🎯 Recommended Order

1. **Week 1:** Phase 1 (Remove dead tables) - LOW RISK
2. **Week 2:** Phase 3 (Fix code references) - MEDIUM RISK  
3. **Week 3:** Phase 2 (Remove unused columns) - MEDIUM RISK
4. **Week 4:** Phase 4 (Unify user identity) - HIGH RISK

**Total estimated time:** 12-16 hours of dev work + testing

---

## 🔒 Safety Checklist

Before running ANY migration:
- [ ] Backup production database
- [ ] Test on staging first  
- [ ] Have rollback plan ready
- [ ] Schedule during low-traffic window
- [ ] Monitor error logs for 48 hours
- [ ] Keep backup for 30 days

---

## Rollback Plans

### Phase 1 Rollback
```sql
-- Re-run migration 010 to restore tables
-- (but they'll be empty)
```

### Phase 2 Rollback  
```sql
-- Re-add columns (data will be lost)
ALTER TABLE expense_reports ADD COLUMN user_email TEXT;
ALTER TABLE user_profiles ADD COLUMN user_email TEXT;
-- etc.
```

### Phase 4 Rollback
```sql
-- Re-add user_email to raw_receipts
ALTER TABLE raw_receipts ADD COLUMN user_email TEXT;
-- Backfill from user_profiles...
```

**Better:** Test thoroughly on staging to avoid needing rollback!

---

See [DATABASE_CLEANUP_ANALYSIS.md](../DATABASE_CLEANUP_ANALYSIS.md) for detailed analysis.
