/** 두 Linear 워크스페이스 중 한 곳을 받지 못했을 때, 받은 것만 보여 준다고 알린다. */
export function PartialFailure({ failure }: { failure: string }) {
  return (
    <p role="status" className="text-sm text-muted">
      일부를 받지 못했어요({failure}). 받은 것만 보여 드려요.
    </p>
  )
}
