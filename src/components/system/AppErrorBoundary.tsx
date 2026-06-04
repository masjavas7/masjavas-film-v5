import * as React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error caught by AppErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[radial-gradient(circle_at_35%_30%,rgba(15,23,42,1),#020617)] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[32px] p-8 text-center shadow-2xl space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 border border-rose-500/25 text-rose-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">Terjadi kendala saat membuka halaman ini.</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Kamu bisa coba muat ulang atau kembali ke langkah sebelumnya.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-[11px] font-mono text-rose-300/80 text-left overflow-x-auto max-h-[120px] leading-relaxed">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] py-3 text-sm font-semibold text-white transition duration-200 border border-blue-400/20 shadow-lg shadow-blue-500/15"
              >
                Muat ulang halaman
              </button>
              <button
                onClick={() => window.location.href = "/"}
                className="flex-1 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] py-3 text-sm font-semibold text-slate-200 transition duration-200 border border-white/10"
              >
                Kembali ke Homepage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
