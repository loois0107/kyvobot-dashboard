import Sidebar from '@/components/Sidebar';

// Route group for every page that uses the generic Sidebar chrome (/profile, /privacy, /terms).
// The landing page ('/') and /dashboard/* live outside this group on purpose - they render their
// own full-screen layout instead.
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar />
      <main className="flex-1 w-full bg-bg-base p-4 md:p-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
