import Link from 'next/link';
import { getCurrentUser } from '@/lib/supabase/server';

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link
              href="/projects"
              className="flex items-center text-xl font-bold text-gray-900"
            >
              Issue Tracker
            </Link>
            <div className="ml-10 flex items-center space-x-4">
              <Link
                href="/projects"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Projects
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            {user ? (
              <span className="text-sm text-gray-700">{user.email}</span>
            ) : (
              <Link
                href="/auth/login"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
