export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 dark:from-indigo-950 dark:via-indigo-900 dark:to-violet-950" />
      <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[length:24px_24px]" />
      <div className="absolute -top-24 -right-24 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-24 w-64 sm:w-80 h-64 sm:h-80 rounded-full bg-violet-400/20 blur-3xl pointer-events-none" />

      <div className="relative min-h-dvh flex flex-col justify-center px-3 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {children}
      </div>
    </div>
  );
}
