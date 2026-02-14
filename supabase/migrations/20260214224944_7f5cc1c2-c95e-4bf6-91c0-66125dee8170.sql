-- Remove the trigger that auto-creates debit on booking completion
DROP TRIGGER IF EXISTS trg_auto_balance_on_complete ON bookings;
DROP FUNCTION IF EXISTS auto_create_balance_entry_on_complete();