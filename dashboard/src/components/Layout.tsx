import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BroadcastListener } from './BroadcastListener';

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="ms-64 flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      {/* Mounted once for the whole authenticated app — pops a blocking
          modal whenever a new broadcast targeted at the caller arrives. */}
      <BroadcastListener />
    </div>
  );
}
