/*
 * Re-mounted on every navigation, so each screen arrives with a quick rise.
 * `backwards` fill (see .route-enter) leaves no transform behind once it ends,
 * so fixed sheets and bottom CTAs inside the page are never re-anchored to it.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-enter flex flex-col flex-1 w-full">{children}</div>;
}
