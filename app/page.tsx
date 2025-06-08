export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          HR1 Semantic Q&A Assistant
        </h1>
        <p className="text-center text-lg mb-4">
          Coming soon: Ask questions about the HR1 legislative bill using
          AI-powered semantic search.
        </p>
        <p className="text-center text-gray-600">
          Currently setting up data ingestion and vector embeddings...
        </p>
      </div>
    </main>
  );
}
