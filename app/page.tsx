import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Scaler AI Persona
        </h1>
        <p className="text-gray-500 mb-8 text-sm">
          Grounded AI assistant for Deepanshu Chaudhary&apos;s resume and public GitHub projects.
        </p>
        <Link
          href="/chat"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Open Chat
        </Link>
      </div>
    </main>
  );
}
