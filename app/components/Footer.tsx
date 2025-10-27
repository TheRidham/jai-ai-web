import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="shadow border-t border-t-gray-500 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between text-sm text-gray-700">
        <div>
          <Link href="/terms-conditions" className="mr-4 hover:underline">Terms & Conditions</Link>
          <Link href="/privacy-policy" className="hover:underline">Privacy Policy</Link>
        </div>
        <div>© {new Date().getFullYear()} Jai AI. All rights reserved.</div>
      </div>
    </footer>
  );
}
