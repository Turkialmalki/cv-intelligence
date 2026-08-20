-- ---------------------------------------------------------------------------
-- Private storage bucket for uploaded CV files.
--
-- Used only when CV_FILE_RETENTION_MODE=persistent. In the default
-- `temporary` mode the app parses the upload in memory, persists the
-- extracted text, and never writes the original file here at all.
--
-- The bucket is private. No policies are created for anon or authenticated,
-- so the only way to read an object is through the server with the service
-- role, which can mint a short-lived signed URL when one is genuinely needed.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-uploads',
  'cv-uploads',
  false,
  8388608, -- 8 MB, matching the application-level limit
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ]
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Defence in depth: ensure no policy grants browser roles access to this
-- bucket, even if one is added to storage.objects for another bucket later.
drop policy if exists "cv-uploads no public read"  on storage.objects;
drop policy if exists "cv-uploads no public write" on storage.objects;
