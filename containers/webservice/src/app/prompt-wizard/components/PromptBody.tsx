export default function PromptBody() {
  return (
    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800/50 dark:shadow-none dark:inset-ring dark:inset-ring-white/10">
      <div className="px-4 py-6 sm:px-6">
        <h3 className="text-base/7 font-semibold text-gray-900 dark:text-white">
          AI Prompt Management - Coming Soon
        </h3>
        <p className="mt-1 max-w-2xl text-sm/6 text-gray-500 dark:text-gray-300">
          Prompt engineering and management toolkit (In Development)
        </p>
      </div>
      <div className="border-t border-gray-100 dark:border-white/5">
        <dl className="divide-y divide-gray-100 dark:divide-white/5">
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Status
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              <span className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-500">
                Not Yet Deployed
              </span>
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Purpose
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              A comprehensive toolkit for AI prompt engineering, enabling users to create, test, version control, and manage prompt templates for various AI models and use cases.
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Planned Features
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1">
                <li>Prompt template library with categorization</li>
                <li>Version control for prompt iterations</li>
                <li>A/B testing framework for prompt comparison</li>
                <li>Performance analytics and metrics tracking</li>
                <li>Collaborative prompt development tools</li>
                <li>Multi-model compatibility testing</li>
              </ul>
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Development Status
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              Currently in the planning phase. Requirements gathering and architecture design are underway. Expected to begin development after completion of ZettelTK and Image Processing Toolkit containerization.
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Expected Capabilities
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Template Management:</span> Create and organize reusable prompt templates with variable substitution and parameter configuration
                </div>
                <div>
                  <span className="font-medium">Testing Suite:</span> Automated testing framework to evaluate prompt performance across different scenarios and inputs
                </div>
                <div>
                  <span className="font-medium">Analytics Dashboard:</span> Track prompt effectiveness, response quality, and usage patterns with detailed metrics and visualizations
                </div>
                <div>
                  <span className="font-medium">Collaboration:</span> Share prompts, collaborate on improvements, and maintain team libraries of validated prompts
                </div>
              </div>
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Target Use Cases
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-white/5">
                  <div className="font-medium">Content Generation</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Articles, blogs, marketing</div>
                </div>
                <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-white/5">
                  <div className="font-medium">Code Assistance</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Development prompts</div>
                </div>
                <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-white/5">
                  <div className="font-medium">Data Analysis</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Insight extraction</div>
                </div>
                <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-white/5">
                  <div className="font-medium">Customer Support</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Response templates</div>
                </div>
              </div>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
