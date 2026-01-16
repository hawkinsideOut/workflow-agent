import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <nav className="border-b bg-white/50 backdrop-blur-sm dark:bg-gray-900/50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Workflow Agent
          </div>
          <div className="flex gap-6">
            <Link
              href="/docs/getting-started"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Docs
            </Link>
            <a
              href="https://github.com/hawkinsideOut/workflow-agent"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Self-Evolving Workflow Management
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Maintain consistent development practices with intelligent
            validation, automated guidelines, and community-driven improvements.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/docs/getting-started"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Get Started
            </Link>
            <a
              href="https://github.com/hawkinsideOut/workflow-agent"
              className="px-8 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors font-semibold"
            >
              View on GitHub
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-xl font-bold mb-2">Intelligent Validation</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Real-time validation of commit messages and branch names with
              helpful suggestions.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="text-3xl mb-4">📚</div>
            <h3 className="text-xl font-bold mb-2">
              Auto-Generated Guidelines
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Project-specific guidelines generated from pre-configured presets
              or custom rules.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="text-3xl mb-4">🔄</div>
            <h3 className="text-xl font-bold mb-2">Self-Improving System</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Community suggestions with moderation and trust scores improve the
              system over time.
            </p>
          </div>
        </div>

        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-8">Quick Start</h2>
          <div className="max-w-2xl mx-auto bg-gray-900 rounded-lg p-6 text-gray-100 font-mono">
            <div className="mb-2">
              <span className="text-gray-500"># Install CLI</span>
            </div>
            <div className="mb-4">npm install -g @workflow/agent</div>
            <div className="mb-2">
              <span className="text-gray-500">
                # Initialize in your project
              </span>
            </div>
            <div className="mb-4">workflow init</div>
            <div className="mb-2">
              <span className="text-gray-500">
                # Start working with validation
              </span>
            </div>
            <div>git commit -m "feat(auth): add oauth support"</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">
              5 Pre-Configured Presets
            </h2>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li className="flex items-center gap-2">
                <span className="text-blue-600">→</span> SaaS Application
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600">→</span> Library/Package
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600">→</span> API Service
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600">→</span> E-commerce Platform
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600">→</span> Content Management
                System
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4">Framework Integration</h2>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li className="flex items-center gap-2">
                <span className="text-purple-600">→</span> Next.js
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-600">→</span> Vite
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-600">→</span> Remix
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-600">→</span> Astro
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-600">→</span> SvelteKit
              </li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="border-t mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>Built with ❤️ by the Workflow Agent team</p>
        </div>
      </footer>
    </div>
  );
}
