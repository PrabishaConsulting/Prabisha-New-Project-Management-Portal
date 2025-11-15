import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Clock,
  Layers,
  ShieldCheck,
  UserCog,
  Users,
  FileText,
  ClipboardList,
  CheckCircle2,
  Pencil,
  Download,
} from 'lucide-react'
import { db } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Mistake Detail',
  description: 'Complete context and learnings for a logged mistake.',
}

const impactVariant: Record<string, string> = {
  LOW: 'bg-emerald-100 text-emerald-700 ',
  MEDIUM: 'bg-amber-100 text-amber-700 ',
  HIGH: 'bg-rose-100 text-rose-700 ',
}

const statusVariant: Record<string, string> = {
  PENDING: '  ',
  REVIEWED: 'bg-sky-100 text-sky-700 ',
  ARCHIVED: '100  ',
}

async function getMistake(id: string) {
  const mistake = await db.mistakeLog.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  if (!mistake) {
    return null
  }

  return {
    ...mistake,
    attachments: Array.isArray(mistake.attachments) ? (mistake.attachments as any[]) : [],
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date)
}

export default async function MistakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }
  const {id} = await params

  if(id === undefined ) return null
  const mistake = await getMistake(id)

  if (!mistake) {
    notFound()
  }

  const userRole = (session.user as any)?.role as string | null
  const isAdmin = Boolean(userRole && ['ADMIN', 'SUPERADMIN'].includes(userRole.toUpperCase()))
  const isAuthor = (session.user as any).id === mistake.authorId

  return (
    <div className=" flex min-h-screen w-full  flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Link href="/mistakes" className="inline-flex items-center text-sm  hover:">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to mistakes
          </Link>
          <h1 className="text-3xl font-bold  md:text-4xl">{mistake.mistakeIdentified}</h1>
          <p className="max-w-2xl text-sm ">
            Review the full context, actions taken, and key learnings for this logged mistake. Admins can manage status
            updates and reviewer notes from this page.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Badge className={`border text-xs font-semibold uppercase tracking-wide ${impactVariant[mistake.impact]}`}>
              {mistake.impact}
            </Badge>
            <Badge className={`text-xs font-semibold uppercase tracking-wide ${statusVariant[mistake.status]}`}>
              {mistake.status}
            </Badge>
            <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wide">
              {mistake.category.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wide">
              <Users className="mr-1 h-3 w-3" /> Submitted by{' '}
              {mistake.author?.name || mistake.author?.email || 'Unassigned'}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild variant="outline">
            <a href={`/api/mistakes/${mistake.id}/pdf`} className="inline-flex items-center gap-2">
              <Download className="h-4 w-4" /> Download PDF
            </a>
          </Button>
          {isAdmin && (
            <>
      
              <Button asChild>
                <Link href={`/mistakes/${mistake.id}/edit`} className="inline-flex items-center gap-2">
                  <Pencil className="h-4 w-4" /> Edit record
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

       <Alert className=" 50 ">
        <AlertDescription className="flex flex-col gap-2 text-sm leading-relaxed">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ">
            <AlertCircle className="h-4 w-4" /> Why reviewer notes matter
          </span>
          Reviewer feedback stays visible to the entire team so everyone can understand the quality gates before
          closing a mistake. Use these notes to inform future training sessions and preventive checklists.
        </AlertDescription>
      </Alert>

      <section className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <Card className="border  shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ">
              <AlertCircle className="h-4 w-4" /> Root cause analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed ">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide ">What happened</h3>
              <p className="mt-2 whitespace-pre-line text-base ">{mistake.rootCause}</p>
            </div>
            <Separator />
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide ">How it was resolved</h3>
              <p className="mt-2 whitespace-pre-line text-base ">{mistake.resolution}</p>
            </div>
            <Separator />
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide ">Key learnings</h3>
              <p className="mt-2 whitespace-pre-line text-base ">{mistake.learnings}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border  shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ">
                <Calendar className="h-4 w-4" /> Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm ">
              <div className="flex items-start gap-3">
                <Clock className="mt-1 h-4 w-4 " />
                <div>
                  <p className="text-xs uppercase tracking-wide ">Mistake Date</p>
                  <p className="font-medium ">{formatDate(mistake.mistakeDate)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Layers className="mt-1 h-4 w-4 " />
                <div>
                  <p className="text-xs uppercase tracking-wide ">Status last updated</p>
                  <p className="font-medium ">{formatDateTime(mistake.updatedAt)}</p>
                </div>
              </div>
              {mistake.reviewer && (
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-4 w-4 " />
                  <div>
                    <p className="text-xs uppercase tracking-wide ">Reviewed by</p>
                    <p className="font-medium ">
                      {mistake.reviewer.name || mistake.reviewer.email}
                    </p>
                    {mistake.reviewNotes && (
                      <p className="mt-1 text-sm ">{mistake.reviewNotes}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border  shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ">
                <FileText className="h-4 w-4" /> Attachments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mistake.attachments.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed  50 py-8 text-center">
                  <Image src="/empty-state.svg" alt="No attachments" width={140} height={140} />
                  <p className="text-sm ">No attachments were provided for this mistake.</p>
                </div>
              ) : (
                <ul className="space-y-3 text-sm">
                  {mistake.attachments.map((file, index) => (
                    <li key={index}
                      className="flex items-center justify-between rounded-lg border   px-3 py-2  shadow-sm">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 " />
                        <div>
                          <p className="font-medium">
                            {file.name || file.originalName || file.fileName || `Attachment ${index + 1}`}
                          </p>
                          {file.size && (
                            <p className="text-xs ">{Math.round(file.size / 1024)} KB</p>
                          )}
                        </div>
                      </div>
                      <Link
                        href={file.url || '#'}
                        target="_blank"
                        className="text-sm font-medium  hover:"
                      >
                        Download
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {(isAdmin || isAuthor) && (
            <Card className="border  shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ">
                  <UserCog className="h-4 w-4" /> Management actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className=" 50 ">
                  <AlertDescription className="flex flex-col gap-1 text-sm leading-relaxed">
                    <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ">
                      <CheckCircle2 className="h-4 w-4" /> Admin controls
                    </span>
                    <span>
                      Status updates, reviewer notes, edits, and deletions are restricted to admin roles. Use the actions
                      below to continue.
                    </span>
                  </AlertDescription>
                </Alert>
                <div className="grid gap-3">
                  {isAdmin ? (
                    <>
                      <Button asChild>
                        <Link href={`/mistakes/${mistake.id}/review`} className="inline-flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4" /> Review &amp; update status
                        </Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link href={`/mistakes/${mistake.id}/edit`} className="inline-flex items-center gap-2">
                          <Pencil className="h-4 w-4" /> Edit mistake entry
                        </Link>
                      </Button>
                      <Alert className="border-red-200 bg-red-50 text-red-700">
                        <AlertDescription className="space-y-1 text-sm">
                          <span className="flex items-center gap-2 font-semibold uppercase tracking-wide">
                            <AlertCircle className="h-4 w-4" /> Delete access
                          </span>
                          <span>
                            Deleting a record permanently removes mistakes and attachments. Only admins can perform this
                            action via the review screen.
                          </span>
                        </AlertDescription>
                      </Alert>
                    </>
                  ) : (
                    <p className="text-sm ">
                      You can review this entry, but only administrators can update or delete mistakes.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

     
    </div>
  )
}