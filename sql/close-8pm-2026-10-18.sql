-- Move today's open batches to close at 20:00 Bangkok (13:00 UTC) on 18 Oct. Run once, after the v1.34 deploy is live.
update ap_positions set max_hold_until = '2026-10-18T13:00:00Z'
where status in ('open','pending') and max_hold_until > '2026-10-18T13:00:00Z' and opened_at >= '2026-10-18T00:00:00Z' and coin not like '%:r3w' and coin not like '%:revw';
update ap_positions set max_hold_until = '2026-10-24T13:00:00Z'
where status in ('open','pending') and coin like '%:revw';
