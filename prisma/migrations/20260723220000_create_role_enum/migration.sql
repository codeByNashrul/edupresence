DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'Role'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "Role" AS ENUM (
      'ADMIN',
      'PIMPINAN',
      'GURU',
      'STAFF',
      'ORTU'
    );
  END IF;
END
$$;
