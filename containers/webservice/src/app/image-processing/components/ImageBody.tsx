export default function ImageBody() {
  return (
    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800/50 dark:shadow-none dark:inset-ring dark:inset-ring-white/10">
      <div className="px-4 py-6 sm:px-6">
        <h3 className="text-base/7 font-semibold text-gray-900 dark:text-white">
          ML Dataset Preparation Tool
        </h3>
        <p className="mt-1 max-w-2xl text-sm/6 text-gray-500 dark:text-gray-300">
          Streamline image dataset preparation for machine learning
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
              Comprehensive toolkit for managing image datasets, performing preprocessing operations, and training machine learning models with GPU acceleration support.
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Key Features
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1">
                <li>Duplicate detection and quality analysis</li>
                <li>Dataset statistics generation</li>
                <li>Bulk file renaming with integrity verification</li>
                <li>Image transformations and augmentation</li>
                <li>Multi-threaded preprocessing for performance</li>
                <li>CNN model training with transfer learning</li>
              </ul>
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Components
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-white/5">
                  <div className="font-medium">Analysis</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Dataset inspection</div>
                </div>
                <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-white/5">
                  <div className="font-medium">Preprocessing</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Image transforms</div>
                </div>
                <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-white/5">
                  <div className="font-medium">Sorting</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Content organization</div>
                </div>
                <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-white/5">
                  <div className="font-medium">Training</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Model development</div>
                </div>
                <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-white/5">
                  <div className="font-medium">Augmentation</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Data expansion</div>
                </div>
                <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-white/5">
                  <div className="font-medium">Reporting</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Metrics visualization</div>
                </div>
              </div>
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Output Structure
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              <div className="space-y-2">
                <div>
                  <span className="font-medium">analysis.json</span> - Comprehensive dataset statistics and metadata
                </div>
                <div>
                  <span className="font-medium">processing/</span> - Organized folders for processed images
                </div>
                <div>
                  <span className="font-medium">metrics/</span> - Training performance data and metrics
                </div>
                <div>
                  <span className="font-medium">visualizations/</span> - Charts, graphs, and visual reports
                </div>
              </div>
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Requirements
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              <div className="space-y-1">
                <div>Python 3.9 or newer</div>
                <div>CUDA-compatible GPU (optional but recommended)</div>
                <div>8GB+ RAM minimum</div>
                <div>Dependencies managed through requirements.txt</div>
              </div>
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Interface
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              Interactive menu-driven interface (RUNME.py) with access to all six primary scripts. Each script can be run individually or through the main interface for streamlined workflow management.
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
