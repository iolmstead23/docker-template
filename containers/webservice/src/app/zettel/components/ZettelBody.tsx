export default function ZettelBody() {
  return (
    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800/50 dark:shadow-none dark:inset-ring dark:inset-ring-white/10">
      <div className="px-4 py-6 sm:px-6">
        <h3 className="text-base/7 font-semibold text-gray-900 dark:text-white">
          Knowledge Analysis Toolkit
        </h3>
        <p className="mt-1 max-w-2xl text-sm/6 text-gray-500 dark:text-gray-300">
          Process personal notes and generate insights through automated analysis
        </p>
      </div>
      <div className="border-t border-gray-100 dark:border-white/5">
        <dl className="divide-y divide-gray-100 dark:divide-white/5">
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Status
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-400">
                Not Connected
              </span>
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Purpose
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              Two-phase operation for knowledge analysis. Phase 1 analyzes notes and creates cached analysis files. Phase 2 generates markdown reports using the cached data.
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Key Features
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1">
                <li>Document relationship analysis</li>
                <li>Key information extraction</li>
                <li>Markdown report generation</li>
                <li>Sentiment analysis</li>
                <li>Keyword extraction</li>
                <li>Document similarity metrics</li>
              </ul>
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Directory Structure
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              <div className="space-y-2">
                <div>
                  <span className="font-medium">data/</span> - Input notes directory for personal knowledge base
                </div>
                <div>
                  <span className="font-medium">cache/</span> - Auto-generated analysis files directory
                </div>
                <div>
                  <span className="font-medium">reports/</span> - Markdown outputs directory for generated reports
                </div>
              </div>
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Workflow
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Analysis Phase:</span> Processes notes from data/ directory and creates cached analysis files
                </div>
                <div>
                  <span className="font-medium">Report Generation:</span> Creates markdown reports in reports/ directory using cached data
                </div>
              </div>
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Analytics
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Files Processed</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">--</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Content Size</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">--</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Unique Tokens</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">--</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Reports Generated</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">--</div>
                </div>
              </div>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
