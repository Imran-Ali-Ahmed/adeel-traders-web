"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CheckIcon, XIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Field } from "@workspace/ui/components/field"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"

import { FieldHint, RequiredLabel } from "@/components/ui-kit/form"
import { api } from "@/lib/api"
import { notifyError, notifySuccess } from "@/lib/notify"

// Same words as the server (approvals.NEEDS_REASON): turning a request down needs a reason.
const needsReason = (action: string) =>
  /reject|send back|return|decline/i.test(action)
const isNo = needsReason

/**
 * The buttons for one waiting document: every action this user may take now (from the server).
 * "Reject" style actions ask for a reason first; the reason goes into the document's history.
 */
export function DecideButtons({
  doctype,
  name,
  title,
  actions,
  size = "default",
}: {
  doctype: string
  name: string
  title: string
  actions: string[]
  size?: "default" | "sm"
}) {
  const queryClient = useQueryClient()
  const [asking, setAsking] = React.useState<string | null>(null)
  const [reason, setReason] = React.useState("")
  const [tried, setTried] = React.useState(false)
  const act = useMutation({
    mutationFn: (v: { action: string; comment?: string }) =>
      api.act({ doctype, name, ...v }),
    onSuccess: (_s, v) => {
      notifySuccess(`${v.action}: ${title}`)
      setAsking(null)
      setReason("")
      setTried(false)
      queryClient.invalidateQueries({ queryKey: ["approvals"] })
      queryClient.invalidateQueries({ queryKey: ["approval", doctype, name] })
    },
    onError: (e) => notifyError(e, "Couldn't save the decision"),
  })
  // "No" first and quiet, "yes" last and primary (one primary button).
  const ordered = [...actions].sort(
    (a, b) => Number(!isNo(a)) - Number(!isNo(b))
  )
  return (
    <>
      <span className="flex flex-wrap gap-2">
        {ordered.map((action) => (
          <Button
            key={action}
            size={size}
            variant={isNo(action) ? "outline" : "default"}
            disabled={act.isPending}
            onClick={() =>
              needsReason(action) ? setAsking(action) : act.mutate({ action })
            }
          >
            {act.isPending && act.variables?.action === action ? (
              <Spinner data-icon="inline-start" />
            ) : isNo(action) ? (
              <XIcon data-icon="inline-start" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            {action}
          </Button>
        ))}
      </span>
      <Dialog
        open={asking !== null}
        onOpenChange={(open) => !open && !act.isPending && setAsking(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {asking}: {title}?
            </DialogTitle>
            <DialogDescription>
              The person who asked sees your reason, and it stays in the
              document&apos;s history.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              setTried(true)
              if (reason.trim() && asking)
                act.mutate({ action: asking, comment: reason.trim() })
            }}
            className="flex flex-col gap-4"
          >
            <Field data-invalid={tried && !reason.trim()}>
              <RequiredLabel htmlFor="decide-reason">Reason</RequiredLabel>
              <Textarea
                id="decide-reason"
                value={reason}
                autoFocus
                onChange={(e) => setReason(e.target.value)}
                placeholder="What should change?"
                aria-invalid={tried && !reason.trim()}
              />
              <FieldHint
                error={
                  tried && !reason.trim()
                    ? "Write a reason, so they know what to change."
                    : undefined
                }
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAsking(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={act.isPending}>
                {act.isPending && <Spinner data-icon="inline-start" />}
                {asking}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
