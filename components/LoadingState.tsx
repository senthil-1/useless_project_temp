export default function LoadingState({
  message = "Processing paperwork...",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#172235] bg-[#fffaf0] shadow-[3px_3px_0_#172235]">
        <div className="h-7 w-7 animate-spin rounded-full border-3 border-[#9b1c31] border-t-transparent" />
      </div>
      <p className="mt-4 font-serif text-base font-bold text-[#172235]">
        {message}
      </p>
      <p className="mt-1 text-xs text-[#687386]">
        The Ministry is taking its customary time.
      </p>
    </div>
  );
}
