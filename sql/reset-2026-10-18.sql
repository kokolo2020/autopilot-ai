-- $1,000 reset (18 Oct 2026). Run AFTER the new code is deployed (Netlify shows v1.31 published).
-- 1) Archive everything, 2) clear the live tables. Nothing is lost: copies live in *_archive_1018.
create table if not exists ap_positions_archive_1018 as select * from ap_positions;
create table if not exists ap_daily_snapshots_archive_1018 as select * from ap_daily_snapshots;
create table if not exists ap_carry_archive_1018 as select * from ap_carry;

-- check these counts match before clearing:
select (select count(*) from ap_positions) live, (select count(*) from ap_positions_archive_1018) archived;

delete from ap_positions;
delete from ap_carry;
-- keep ap_daily_snapshots, ap_prices100 and ap_samples as they are (price history only).
