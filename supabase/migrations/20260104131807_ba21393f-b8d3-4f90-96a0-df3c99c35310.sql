INSERT INTO whatsapp_connections (tenant_id, evolution_instance_name, whatsapp_connected, last_status)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'BarberFlow', false, 'disconnected')
ON CONFLICT (tenant_id) DO UPDATE SET evolution_instance_name = 'BarberFlow', updated_at = now()