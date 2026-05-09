-- Add optional time range to period exceptions (null = full day)
alter table period_exceptions add column block_start time;
alter table period_exceptions add column block_end time;

alter table period_exceptions add constraint block_times_both_or_neither
  check ((block_start is null) = (block_end is null));

alter table period_exceptions add constraint block_end_after_start
  check (block_end is null or block_end > block_start);
