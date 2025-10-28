import { Loader2 } from "lucide-react";

export const LoadingView = () => {
  return (
    <div className="bg-card p-8 rounded-2xl shadow-xl">
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground text-center">
          A ligar à base de dados...
        </p>
      </div>
    </div>
  );
};
