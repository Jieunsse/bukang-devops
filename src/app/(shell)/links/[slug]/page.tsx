import { notFound } from 'next/navigation'

import { findReport, REPORTS, ReportView } from '@/widgets/links'

export const dynamicParams = false

export function generateStaticParams() {
  return REPORTS.map(({ slug }) => ({ slug }))
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const report = findReport((await params).slug)
  if (!report) notFound()
  return <ReportView report={report} />
}
