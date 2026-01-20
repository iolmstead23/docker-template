import Link from "next/link";

export default function Body() {
  return (
    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800/50 dark:shadow-none dark:inset-ring dark:inset-ring-white/10">
      <div className="px-4 py-6 sm:px-6">
        <h3 className="text-base/7 font-semibold text-gray-900 dark:text-white">
          Application Overview
        </h3>
        <p className="mt-1 max-w-2xl text-sm/6 text-gray-500 dark:text-gray-300">
          Containerized data processing applications
        </p>
      </div>
      <div className="border-t border-gray-100 dark:border-white/5">
        <dl className="divide-y divide-gray-100 dark:divide-white/5">
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              ZettelTK
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              <p className="mb-2">
                Knowledge analysis toolkit for processing personal notes and generating insights through automated analysis.
              </p>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-400">
                  Not Connected
                </span>
                <Link
                  href="/zettel"
                  className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  View Details →
                </Link>
              </div>
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Image Processing Toolkit
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              <p className="mb-2">
                ML dataset preparation tool for streamlining image dataset management, preprocessing, and model training workflows.
              </p>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-400">
                  Not Connected
                </span>
                <Link
                  href="/image-processing"
                  className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  View Details →
                </Link>
              </div>
            </dd>
          </div>
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Prompt Wizard
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0 dark:text-gray-300">
              <p className="mb-2">
                AI prompt engineering and management toolkit for creating, testing, and organizing prompt templates (In Development).
              </p>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-400">
                  Not Yet Deployed
                </span>
                <Link
                  href="/prompt-wizard"
                  className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  View Details →
                </Link>
              </div>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
