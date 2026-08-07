/** Standard page heading: serif display title + one muted line + optional action. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1
          className="font-serif text-foreground"
          style={{ fontSize: 32, lineHeight: "38px", fontWeight: 500, letterSpacing: "-0.01em" }}
        >
          {title}
        </h1>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
