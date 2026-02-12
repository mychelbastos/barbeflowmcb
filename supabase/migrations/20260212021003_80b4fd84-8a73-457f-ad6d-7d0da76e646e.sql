
-- ================================================
-- ETAPA 1: Unificar duplicados ANTES de normalizar
-- Usar lógica de canonical inline (sem trigger)
-- ================================================

DO $$
DECLARE
  r RECORD;
  winner_email text;
  winner_birthday date;
  winner_name text;
  removed_count int := 0;
BEGIN
  FOR r IN (
    WITH normalized AS (
      SELECT 
        c.id,
        c.tenant_id,
        c.name,
        c.phone,
        c.email,
        c.birthday,
        c.created_at,
        -- Canonical phone inline
        (CASE
          WHEN length(regexp_replace(c.phone, '\D', '', 'g')) >= 12 
               AND regexp_replace(c.phone, '\D', '', 'g') LIKE '55%'
               AND length(substring(regexp_replace(c.phone, '\D', '', 'g') from 3)) = 10
          THEN substring(regexp_replace(c.phone, '\D', '', 'g') from 3 for 2) || '9' || substring(regexp_replace(c.phone, '\D', '', 'g') from 5)
          WHEN length(regexp_replace(c.phone, '\D', '', 'g')) >= 12 
               AND regexp_replace(c.phone, '\D', '', 'g') LIKE '55%'
          THEN substring(regexp_replace(c.phone, '\D', '', 'g') from 3)
          WHEN length(regexp_replace(c.phone, '\D', '', 'g')) = 10
          THEN substring(regexp_replace(c.phone, '\D', '', 'g') from 1 for 2) || '9' || substring(regexp_replace(c.phone, '\D', '', 'g') from 3)
          ELSE regexp_replace(c.phone, '\D', '', 'g')
        END) as canonical,
        (
          CASE WHEN c.email IS NOT NULL AND c.email != '' THEN 10 ELSE 0 END +
          CASE WHEN c.birthday IS NOT NULL THEN 5 ELSE 0 END +
          CASE WHEN length(c.name) > 10 THEN 3 ELSE 0 END +
          (SELECT count(*) FROM bookings b WHERE b.customer_id = c.id) * 2
        ) as quality_score
      FROM customers c
    ),
    ranked AS (
      SELECT 
        id, tenant_id, canonical, name, email, birthday, quality_score, created_at,
        ROW_NUMBER() OVER (PARTITION BY tenant_id, canonical ORDER BY quality_score DESC, created_at ASC) as rn,
        FIRST_VALUE(id) OVER (PARTITION BY tenant_id, canonical ORDER BY quality_score DESC, created_at ASC) as winner_id
      FROM normalized
    )
    SELECT r2.id as old_id, r2.winner_id, r2.name, r2.email, r2.birthday, r2.canonical
    FROM ranked r2
    WHERE r2.rn > 1
    AND (r2.tenant_id, r2.canonical) IN (
      SELECT tenant_id, canonical FROM ranked GROUP BY tenant_id, canonical HAVING count(*) > 1
    )
  ) LOOP
    -- Enriquecer vencedor
    SELECT email, birthday, name INTO winner_email, winner_birthday, winner_name
    FROM customers WHERE id = r.winner_id;
    
    IF (winner_email IS NULL OR winner_email = '') AND r.email IS NOT NULL AND r.email != '' THEN
      UPDATE customers SET email = r.email WHERE id = r.winner_id;
    END IF;
    
    IF winner_birthday IS NULL AND r.birthday IS NOT NULL THEN
      UPDATE customers SET birthday = r.birthday WHERE id = r.winner_id;
    END IF;
    
    IF length(r.name) > length(winner_name) + 3 THEN
      UPDATE customers SET name = r.name WHERE id = r.winner_id;
    END IF;
    
    -- Migrar todas as dependências
    UPDATE bookings SET customer_id = r.winner_id WHERE customer_id = r.old_id;
    UPDATE customer_packages SET customer_id = r.winner_id WHERE customer_id = r.old_id;
    UPDATE customer_subscriptions SET customer_id = r.winner_id WHERE customer_id = r.old_id;
    UPDATE customer_balance_entries SET customer_id = r.winner_id WHERE customer_id = r.old_id;
    UPDATE recurring_clients SET customer_id = r.winner_id WHERE customer_id = r.old_id;
    
    -- Remover duplicado
    DELETE FROM customers WHERE id = r.old_id;
    
    -- Normalizar telefone do vencedor para canonical
    UPDATE customers SET phone = r.canonical WHERE id = r.winner_id;
    
    removed_count := removed_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Clientes duplicados removidos: %', removed_count;
END $$;

-- ================================================
-- ETAPA 2: Criar trigger de normalização permanente
-- ================================================

CREATE OR REPLACE FUNCTION public.normalize_customer_phone()
RETURNS TRIGGER AS $$
DECLARE
  digits text;
BEGIN
  digits := regexp_replace(NEW.phone, '\D', '', 'g');
  
  IF length(digits) >= 12 AND digits LIKE '55%' THEN
    digits := substring(digits from 3);
  END IF;
  
  IF length(digits) = 10 THEN
    digits := substring(digits from 1 for 2) || '9' || substring(digits from 3);
  END IF;
  
  NEW.phone := digits;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_normalize_customer_phone ON customers;
CREATE TRIGGER trg_normalize_customer_phone
  BEFORE INSERT OR UPDATE OF phone ON customers
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_customer_phone();

-- ================================================
-- ETAPA 3: Normalizar todos os telefones restantes
-- Desabilitar constraint temporariamente não é necessário 
-- porque duplicados já foram removidos
-- ================================================
UPDATE customers SET phone = phone WHERE true;
