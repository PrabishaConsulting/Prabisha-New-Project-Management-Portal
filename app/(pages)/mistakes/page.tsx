import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { AlertCircle, ArrowRight, Calendar, FileText, Layers, ShieldCheck, Users } from 'lucide-react'
import { db } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Mistake Library',
  description: 'Read and learn from documented mistakes to improve future outcomes.',
}

const impactVariant: Record<string, string> = {
  LOW: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  HIGH: 'bg-rose-100 text-rose-700 border-rose-200',
}

const statusVariant: Record<string, string> = {
  PENDING: 'border border-dashed border-slate-300 text-slate-600 bg-white',
  REVIEWED: 'bg-sky-100 text-sky-700 border-sky-200',
  ARCHIVED: 'bg-slate-100 text-slate-600 border-slate-200',
}

async function getMistakes() {
  const [mistakes, stats] = await Promise.all([
    db.mistakeLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    db.mistakeLog.groupBy({
      by: ['impact'],
      _count: { impact: true },
    }),
  ])

  const impactStats = stats.reduce<Record<string, number>>((acc, stat) => {
    acc[stat.impact] = stat._count.impact
    return acc
  }, {})

  return { mistakes, impactStats }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export default async function MistakesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  const { mistakes, impactStats } = await getMistakes()

  const total = mistakes.length
  const reviewed = mistakes.filter((item) => item.status === 'REVIEWED').length
  const pending = mistakes.filter((item) => item.status === 'PENDING').length

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">Mistake Learning Library</h1>
          <p className="mt-2 max-w-2xl text-base text-slate-600">
            Explore recorded mistakes, understand their impact, and learn the key actions taken to prevent them
            from happening again.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="bg-slate-50 text-slate-700">
            <Users className="mr-1 h-4 w-4" /> {(session.user as any)?.name || 'Unknown user'}
          </Badge>
          <Link href="/mistakes/new">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
              Log Mistake
            </Button>
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-none bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-base font-semibold uppercase tracking-wide text-white/80">
              <Layers className="mr-2 h-4 w-4" /> Total Mistakes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{total}</CardContent>
          <CardFooter className="text-sm text-white/70">
            Includes all documented mistakes with full details and attachments.
          </CardFooter>
        </Card>

        <Card className="border-none bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-base font-semibold uppercase tracking-wide text-amber-700">
              <ShieldCheck className="mr-2 h-4 w-4" /> Reviewed
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{reviewed}</CardContent>
          <CardFooter className="text-sm text-amber-700">
            Reviewed mistakes have actionable insights recorded and validated.
          </CardFooter>
        </Card>

        <Card className="border-none bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-base font-semibold uppercase tracking-wide text-slate-600">
              <AlertCircle className="mr-2 h-4 w-4" /> Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{pending}</CardContent>
          <CardFooter className="text-sm text-slate-600">
            Pending items need follow-up actions or validation.
          </CardFooter>
        </Card>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {(['LOW', 'MEDIUM', 'HIGH'] as const).map((impact) => (
          <Card key={impact} className="border border-dashed border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <span
                  className={`inline-flex h-6 items-center rounded-full px-3 text-xs font-semibold uppercase ${
                    impactVariant[impact]
                  }`}
                >
                  {impact}
                </span>
                Impact Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">
                {impactStats[impact] ?? 0}
                <span className="ml-2 text-base font-normal text-slate-500">records</span>
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Mistakes classified with <span className="font-medium text-slate-700">{impact.toLowerCase()}</span>{' '}
                impact level.
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Separator />

      <section className="space-y-6">
        {mistakes.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 bg-slate-50">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <Image
                src="/empty-state.svg"
                alt="No mistakes"
                width={180}
                height={180}
                className="opacity-80"
              />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-700">No mistakes logged yet</h2>
                <p className="text-sm text-slate-500">
                  Create the first mistake log to start building a learning repository.
                </p>
              </div>
              <Link href="/mistakes/new">
                <Button className="bg-blue-600 text-white hover:bg-blue-700">
                  Log the first mistake
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          mistakes.map((mistake) => (
            <Card key={mistake.id} className="border border-slate-200 shadow-sm">
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge
                      className={`border text-xs font-semibold uppercase tracking-wide ${
                        impactVariant[mistake.impact]
                      }`}
                    >
                      {mistake.impact}
                    </Badge>
                    <Badge
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        statusVariant[mistake.status]
                      }`}
                    >
                      {mistake.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wide">
                      {mistake.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl font-semibold text-slate-900">
                    {mistake.mistakeIdentified}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> {formatDate(mistake.mistakeDate)}
                    </span>
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {mistake.author?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>
                <Link href={`/mistakes/${mistake.id}`} className="inline-flex items-center text-sm text-blue-600">
                  View full record
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </CardHeader>

              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Root Cause
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">
                      {mistake.rootCause}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Resolution
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">
                      {mistake.resolution}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Key Learnings
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">
                      {mistake.learnings}
                    </p>
                  </div>

                  {Array.isArray(mistake.attachments) && mistake.attachments.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Attachments
                      </h3>
                      <ul className="mt-2 space-y-2 text-sm">
                        {(mistake.attachments as any[]).map((file, index) => (
                          <li key={index}>
                            <Link
                              href={file.url || '#'}
                              target="_blank"
                              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                            >
                              <FileText className="h-4 w-4" />
                              <span>{file.name || file.originalName || `Attachment ${index + 1}`}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <Alert className="border-slate-200 bg-slate-50 text-slate-700">
        <AlertDescription className="flex flex-col gap-2 text-sm leading-relaxed">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
            <AlertCircle className="h-4 w-4" /> Why we document mistakes
          </span>
          Sharing mistakes creates a safe learning environment, improves cross-team transparency, and accelerates
          problem resolution. Use these insights to run retrospectives, craft preventive checklists, and mentor new
          team members.
        </AlertDescription>
      </Alert>
    </div>
  )
}