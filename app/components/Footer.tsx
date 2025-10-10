import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t mt-8">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between text-sm text-gray-600">
        <div>
          <Link href="/terms-conditions" className="mr-4 hover:underline">Terms & Conditions</Link>
          <Link href="/privacy-policy" className="hover:underline">Privacy Policy</Link>
        </div>
        <div>© {new Date().getFullYear()} Jai AI</div>
      </div>
    </footer>
  );
}
